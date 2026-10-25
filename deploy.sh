#!/usr/bin/env bash
#
# Build the manage image and roll the Swarm service onto it.
#
# This runs ON THE SWARM MANAGER, normally arriving over stdin from
# .github/workflows/deploy.yml:
#
#   ssh "$USER@$HOST" "cd '$APP_DIR' && bash -s" < deploy.sh
#
# The manager keeps the checkout this builds from; the script updates it first, so
# what is built is what was pushed. The stack itself (networks, secrets, db, redis,
# typesense, haproxy) is deployed separately — see deploy/ — and this only moves one
# service.
#
# nginx.conf is also registered as the Docker config `manage_nginx_conf`. Configs
# are immutable, so editing nginx.conf does not change a running stack; the script
# compares the two and warns when they differ.
#
# VITE_* values are compiled from .env.production during `docker build`. That file
# is gitignored and must exist on the manager; `--no-build` will not pick up a
# change to it.
#
#   ./deploy.sh --no-build      roll the existing image (already built)
#   ./deploy.sh --no-smoke      skip the post-rollout check
#   ./deploy.sh --help
#
# Environment:
#
#   APP_DIR              checkout to build from (defaults to this script's directory)
#   BRANCH               branch to deploy (default: main)
#   STACK_NAME           (default: htashop)
#   SERVICE_NAME         (default: manage)
#   SMOKE_URL            e.g. https://manage.htashop.com/
#
set -euo pipefail

BRANCH="${BRANCH:-main}"
STACK_NAME="${STACK_NAME:-htashop}"
SERVICE_NAME="${SERVICE_NAME:-manage}"

SWARM_SERVICE_NAME="${STACK_NAME}_${SERVICE_NAME}"
IMAGE_NAME="${STACK_NAME}-${SERVICE_NAME}:latest"
NGINX_CONFIG_NAME="${SERVICE_NAME}_nginx_conf"

DO_BUILD=1
DO_SMOKE=1

step()  { printf '\n\033[1;34m==>\033[0m \033[1m%s\033[0m\n' "$1"; }
info()  { printf '    %s\n' "$1"; }
warn()  { printf '\033[1;33mwarning:\033[0m %s\n' "$1" >&2; }
die()   { printf '\033[1;31merror:\033[0m %s\n' "$1" >&2; exit 1; }

# set -e aborts without a message when a command substitution or a guard fails.
# That is indistinguishable from a hang or a Ctrl-C, so report the line. The
# trap captures $LINENO/$BASH_COMMAND/$? itself, before calling the function,
# so the reported line is the failing command's line rather than the helper's.
report_error() {
    local line="$1" command="$2" status="$3"
    printf "\033[1;31merror:\033[0m %s failed at line %s (exit %s)\n    %s\n" \
        "${0##*/}" "$line" "$status" "$command" >&2
    exit "$status"
}
trap 'report_error "$LINENO" "$BASH_COMMAND" "$?"' ERR

usage() {
    cat <<'USAGE'
Build the manage image and roll the Swarm service onto it.

  --no-build   skip the build and roll the existing image
  --no-smoke   skip the post-rollout smoke test
  -h, --help   show this message

With no options this updates the checkout, builds, rolls the service and checks it.
USAGE
    exit 0
}

for argument in "$@"; do
    case "$argument" in
        --no-build) DO_BUILD=0 ;;
        --no-smoke) DO_SMOKE=0 ;;
        -h|--help)  usage ;;
        *)          die "unknown option: $argument (try --help)" ;;
    esac
done

# Where this script lives. It normally arrives over stdin, in which case there is no
# path to derive and the caller is expected to have changed into the checkout.
if [ -n "${BASH_SOURCE[0]:-}" ] && [ -f "${BASH_SOURCE[0]}" ]; then
    SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
else
    SCRIPT_DIR="$PWD"
fi

APP_DIR="${APP_DIR:-$SCRIPT_DIR}"

# ---------------------------------------------------------------------------
# Preflight
#
# Everything checkable is checked before the service is touched: a failed rollout
# costs a rollback and a window of reduced capacity.
# ---------------------------------------------------------------------------

step "Checking the environment"

cd "$APP_DIR" || die "cannot enter $APP_DIR"
[ -f Dockerfile ]  || die "$APP_DIR has no Dockerfile, so it is not the build context"
[ -f package.json ] || die "$APP_DIR does not look like the application (no package.json)"
[ -f nginx.conf ]  || die "$APP_DIR has no nginx.conf, so the stack config cannot be compared"
# .env.production is gitignored (it holds the API URL), so it must be provisioned
# on the manager; the Dockerfile fails the build when it is missing.
[ -f .env.production ] || die "$APP_DIR has no .env.production.
  It is gitignored and must exist on the manager before the image can be built."

command -v git >/dev/null 2>&1 || die "git not found"
command -v docker >/dev/null 2>&1 || die "docker not found"

docker info >/dev/null 2>&1 || die "cannot talk to the Docker daemon"

SWARM_STATE="$(docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null || echo unknown)"
[ "$SWARM_STATE" = "active" ] \
    || die "this node is not part of a Swarm ($SWARM_STATE), so there is no service to roll"

# Checked before building: a missing service or a bad NAME would otherwise be
# discovered after several minutes of building.
docker service inspect "$SWARM_SERVICE_NAME" >/dev/null 2>&1 \
    || die "no service named '$SWARM_SERVICE_NAME'.
  The stack must be deployed first (see deploy/), or STACK_NAME/SERVICE_NAME are wrong."

EXPECTED_REPLICAS="$(docker service inspect "$SWARM_SERVICE_NAME" \
    --format '{{.Spec.Mode.Replicated.Replicas}}' 2>/dev/null || echo '?')"

git remote get-url origin >/dev/null 2>&1 \
    || die "$APP_DIR has no 'origin' remote, so it is not the application's checkout"

info "app:     $APP_DIR"
info "service: $SWARM_SERVICE_NAME ($EXPECTED_REPLICAS replicas)"
info "image:   $IMAGE_NAME"
info "branch:  $BRANCH"

# ---------------------------------------------------------------------------
# Code
#
# Fast-forward only. The manager is a build host, not a place to keep local work;
# if it somehow has commits, stop rather than discard something that exists nowhere
# else.
# ---------------------------------------------------------------------------

step "Updating the checkout"

git fetch --prune origin "$BRANCH"

if [ "$(git rev-parse HEAD)" = "$(git rev-parse "origin/$BRANCH")" ]; then
    info "already at $(git rev-parse --short HEAD)"
else
    git merge --ff-only "origin/$BRANCH" \
        || die "origin/$BRANCH cannot be fast-forwarded. The checkout has commits that are not on the remote; reconcile them before deploying."
    info "now at $(git log -1 --format='%h %s')"
fi

DIRTY="$(git status --porcelain)" || DIRTY=""
if [ -n "$DIRTY" ]; then
    warn "the checkout has uncommitted changes; the image will not match what was pushed"
    printf '%s\n' "$DIRTY" | sed 's/^/    /' >&2
fi

# ---------------------------------------------------------------------------
# Nginx config drift
#
# manage_nginx_conf is a Docker *config* and therefore immutable. Rolling the
# service does not apply an edited nginx.conf: the task mounts the config that
# was registered when the stack was deployed. Say so loudly rather than letting
# a security-header change look deployed when it is not.
# ---------------------------------------------------------------------------

step "Comparing the nginx config"

# Advisory only, so no failure in here may abort the build: the hashes decide
# whether to warn, nothing else. Every step tolerates failure explicitly.
CONFIG_FOUND=0
LOCAL_HASH="$(sha256sum nginx.conf 2>/dev/null | awk '{print $1}')" || LOCAL_HASH=""

if [ -z "$LOCAL_HASH" ]; then
    warn "could not hash nginx.conf; skipping the config comparison"
else
    for config_name in "${STACK_NAME}_${NGINX_CONFIG_NAME}" "$NGINX_CONFIG_NAME"; do
        docker config inspect "$config_name" >/dev/null 2>&1 || continue

        CONFIG_FOUND=1
        DEPLOYED_HASH="$(docker config inspect "$config_name" \
            --format '{{.Spec.Data}}' 2>/dev/null \
            | base64 -d 2>/dev/null \
            | sha256sum 2>/dev/null \
            | awk '{print $1}')" || DEPLOYED_HASH=""

        if [ -z "$DEPLOYED_HASH" ]; then
            warn "$config_name exists but its contents could not be read; cannot compare nginx.conf"
        elif [ "$LOCAL_HASH" = "$DEPLOYED_HASH" ]; then
            info "$config_name matches nginx.conf"
        else
            warn "nginx.conf differs from the registered config '$config_name'"
            warn "Docker configs are immutable, so this rollout keeps the old nginx config."
            warn "Register a new config (deploy/scripts/create-configs.sh with a new name)"
            warn "and redeploy the stack, or scale the service to zero first."
        fi
    done
fi

if [ "$CONFIG_FOUND" -eq 0 ]; then
    warn "no config named '$NGINX_CONFIG_NAME' or '${STACK_NAME}_${NGINX_CONFIG_NAME}'; the stack may not be deployed yet"
fi

# ---------------------------------------------------------------------------
# Build
#
# Tagged with the commit as well as 'latest' so a rollback is a one-liner:
#   docker service update --force --image $IMAGE_NAME:<sha> $SWARM_SERVICE_NAME
# ---------------------------------------------------------------------------

SHORT_SHA="$(git rev-parse --short HEAD)"
BUILD_TAG="${STACK_NAME}-${SERVICE_NAME}:${SHORT_SHA}"

if [ "$DO_BUILD" -eq 1 ]; then
    step "Building $BUILD_TAG"

    docker build -t "$IMAGE_NAME" -t "$BUILD_TAG" .

    info "built $BUILD_TAG"
else
    step "Skipping the build"
    warn "rolling $IMAGE_NAME; changes to source or .env.production are NOT included"
    info "rolling $IMAGE_NAME, whatever it currently points at"
fi

# ---------------------------------------------------------------------------
# Roll out
# ---------------------------------------------------------------------------

step "Rolling $SWARM_SERVICE_NAME"

docker service update --force --image "$IMAGE_NAME" "$SWARM_SERVICE_NAME"

docker service ps "$SWARM_SERVICE_NAME" \
    --filter desired-state=running \
    --format 'table {{.Name}}\t{{.Node}}\t{{.CurrentState}}' \
    || warn "could not read the service's tasks"

RUNNING="$(docker service ps "$SWARM_SERVICE_NAME" \
    --filter desired-state=running --format '{{.CurrentState}}' 2>/dev/null \
    | grep -c '^Running' || true)"

info "$RUNNING of ${EXPECTED_REPLICAS} replicas running"

if [ "$EXPECTED_REPLICAS" != "?" ] && [ "$RUNNING" -lt "$EXPECTED_REPLICAS" ]; then
    die "only $RUNNING of $EXPECTED_REPLICAS replicas are running.
  The rollout reported success but the service is short — check:
    docker service ps $SWARM_SERVICE_NAME
    docker service logs $SWARM_SERVICE_NAME --tail 100"
fi

# ---------------------------------------------------------------------------
# Verify
# ---------------------------------------------------------------------------

if [ "$DO_SMOKE" -eq 1 ] && [ -n "${SMOKE_URL:-}" ]; then
    step "Smoke testing $SMOKE_URL"

    SMOKE_OK=0
    for attempt in 1 2 3 4 5; do
        if curl -fsS --max-time 10 -o /dev/null "$SMOKE_URL"; then
            SMOKE_OK=1
            break
        fi

        info "attempt $attempt did not answer; retrying in 5s"
        sleep 5
    done

    if [ "$SMOKE_OK" -eq 1 ]; then
        info "answered"
    else
        warn "$SMOKE_URL did not answer cleanly after 5 attempts"
        warn "the service is running, so this is more likely the proxy than the app:"
        warn "  docker service logs ${STACK_NAME}_haproxy --tail 50"
    fi
elif [ "$DO_SMOKE" -eq 1 ]; then
    info "no SMOKE_URL set, so nothing was checked from outside"
fi

# ---------------------------------------------------------------------------
# Housekeeping
# ---------------------------------------------------------------------------

step "Pruning dangling images"
docker image prune -f || warn "could not prune images"

step "Deployed ${SWARM_SERVICE_NAME} at ${SHORT_SHA}"
