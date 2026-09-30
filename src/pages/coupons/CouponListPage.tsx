import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Ban,
  CalendarClock,
  CalendarX,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  Receipt,
  Repeat,
  Search,
  TicketPercent,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type Column } from "@/components/ui/data-table";
import { StatsCard } from "@/components/ui/stats-card";
import { Modal } from "@/components/ui/modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/Toaster";
import { isApiError } from "@/lib/api-response";
import { paths } from "@/routes/paths";
import {
  COUPON_ACTIVE_FILTERS,
  COUPON_TYPE_FILTERS,
  couponsApi,
  type Coupon,
  type CouponRedemption,
  type CouponSortField,
  type CouponSortOrder,
  type CouponStatus,
  type CouponType,
} from "@/api/coupons";

const PER_PAGE = 15;

const STATUS_STYLES: Record<CouponStatus, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  inactive: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  expired: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  exhausted: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
};

function CouponStatusBadge({ status }: { status: CouponStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"}`}
    >
      {status}
    </span>
  );
}

/** The scope is read-only context — the server already decided it for us. */
function scopeLabel(coupon: Coupon): string {
  if (coupon.scope === "organization") return "Your organization";
  if (coupon.scope === "tenant") return "Your tenant";
  return "Global";
}

function formatDiscount(coupon: Coupon): string {
  const amount = coupon.value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return coupon.type === "percent" ? `${amount}%` : amount;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function CouponListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success: showSuccess, error: showError } = useToast();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [type, setType] = useState("");
  const [active, setActive] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<CouponSortField>("created_at");
  const [order, setOrder] = useState<CouponSortOrder>("desc");
  const [redemptionsFor, setRedemptionsFor] = useState<Coupon | null>(null);

  // Debounce the search box so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [search]);

  const listQuery = useQuery({
    queryKey: ["coupons", debouncedSearch, type, active, page, sort, order],
    queryFn: () =>
      couponsApi.list({
        search: debouncedSearch || undefined,
        type: type ? (type as CouponType) : undefined,
        is_active: active ? (active as "0" | "1") : undefined,
        page,
        per_page: PER_PAGE,
        sort,
        order,
      }),
  });

  const statsQuery = useQuery({
    queryKey: ["coupons", "statistics"],
    queryFn: () => couponsApi.statistics(),
  });

  const coupons = listQuery.data?.data ?? [];
  const pagination = listQuery.data?.pagination;
  const stats = statsQuery.data;

  // No active membership means no scope to manage codes in — the API says so
  // with a 403, which is a state, not a failure to retry.
  const listError = listQuery.error;
  const noScope = isApiError(listError) && listError.status === 403;

  const hasFilters = Boolean(debouncedSearch || type || active);

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setType("");
    setActive("");
    setPage(1);
  };

  const handleSort = (key: string, nextOrder: CouponSortOrder) => {
    setSort(key as CouponSortField);
    setOrder(nextOrder);
    setPage(1);
  };

  const handleDelete = async (coupon: Coupon) => {
    if (!confirm(`Delete discount code "${coupon.code}"?`)) return;
    try {
      await couponsApi.remove(coupon.uuid);
      showSuccess("Discount code deleted");
    } catch (e) {
      if (isApiError(e) && e.status === 404) {
        showError("That discount code no longer exists");
      } else {
        showError(isApiError(e) ? e.message : "Failed to delete discount code");
      }
    } finally {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
    }
  };

  const columns: Column<Coupon>[] = useMemo(
    () => [
      {
        key: "code",
        label: "Code",
        sortable: true,
        render: (_: unknown, row: Coupon) => (
          <div>
            <p className="font-mono font-semibold text-gray-900 dark:text-white">{row.code}</p>
            {row.label && <p className="text-xs text-gray-400">{row.label}</p>}
          </div>
        ),
      },
      {
        key: "description",
        label: "Description",
        render: (_: unknown, row: Coupon) => (
          <div className="min-w-40">
            <p className="text-gray-900 dark:text-white">{row.description}</p>
            <p className="text-xs text-gray-400">{row.type_label}</p>
          </div>
        ),
      },
      {
        key: "status",
        label: "Status",
        render: (_: unknown, row: Coupon) => <CouponStatusBadge status={row.status} />,
      },
      {
        key: "scope",
        label: "Scope",
        render: (_: unknown, row: Coupon) => (
          <span className="text-sm text-gray-600 dark:text-gray-300">{scopeLabel(row)}</span>
        ),
      },
      {
        key: "usage",
        label: "Usage",
        sortable: true,
        sortKey: "used_count",
        render: (_: unknown, row: Coupon) => (
          <div>
            <p className="text-gray-900 dark:text-white">
              {row.used_count}
              <span className="text-gray-400"> / {row.usage_limit === null ? "∞" : row.usage_limit}</span>
            </p>
            <p className="text-xs text-gray-400">
              {row.usage_limit === null ? "Unlimited" : `${row.remaining ?? 0} left`}
            </p>
          </div>
        ),
      },
      {
        key: "window",
        label: "Window",
        sortable: true,
        sortKey: "starts_at",
        render: (_: unknown, row: Coupon) => (
          <div className="whitespace-nowrap text-xs">
            <p className="text-gray-600 dark:text-gray-300">{formatDate(row.starts_at)}</p>
            <p className="text-gray-400">to {formatDate(row.ends_at)}</p>
          </div>
        ),
      },
      {
        key: "redemptions_count",
        label: "Redeemed",
        className: "text-center",
        render: (_: unknown, row: Coupon) => (
          <span className="text-gray-900 dark:text-white">{row.redemptions_count ?? 0}</span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Discount codes</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Create and manage the codes your store accepts at checkout
          </p>
        </div>
        <Button
          onClick={() => navigate(paths.couponCreate)}
          className="inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Add code
        </Button>
      </div>

      {!noScope && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatsCard
            title="Total codes"
            value={stats?.total ?? 0}
            icon={TicketPercent}
            iconClassName="bg-blue-100 dark:bg-blue-900/30 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400"
            description="All time"
          />
          <StatsCard
            title="Active now"
            value={stats?.active ?? 0}
            icon={CheckCircle2}
            iconClassName="bg-emerald-100 dark:bg-emerald-900/30 [&>svg]:text-emerald-600 dark:[&>svg]:text-emerald-400"
            description="Redeemable right now"
          />
          <StatsCard
            title="Scheduled"
            value={stats?.scheduled ?? 0}
            icon={CalendarClock}
            iconClassName="bg-violet-100 dark:bg-violet-900/30 [&>svg]:text-violet-600 dark:[&>svg]:text-violet-400"
            description="Starts in the future"
          />
          <StatsCard
            title="Expired"
            value={stats?.expired ?? 0}
            icon={CalendarX}
            iconClassName="bg-red-100 dark:bg-red-900/30 [&>svg]:text-red-600 dark:[&>svg]:text-red-400"
            description="Past the end date"
          />
          <StatsCard
            title="Exhausted"
            value={stats?.exhausted ?? 0}
            icon={Ban}
            iconClassName="bg-amber-100 dark:bg-amber-900/30 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400"
            description="Usage limit reached"
          />
          <StatsCard
            title="Redemptions"
            value={stats?.redemptions ?? 0}
            icon={Repeat}
            iconClassName="bg-teal-100 dark:bg-teal-900/30 [&>svg]:text-teal-600 dark:[&>svg]:text-teal-400"
            description="Discounts applied"
          />
        </div>
      )}

      {noScope ? (
        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <EmptyState
            icon={TicketPercent}
            title="No store assigned"
            description="Your account isn't linked to an active organization or tenant, so there are no discount codes to manage yet."
          />
        </div>
      ) : (
        <>
          {/* Search & filters */}
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                autoComplete="off"
                spellCheck={false}
                placeholder="Search by code or label..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 pl-10"
              />
            </div>

            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 lg:w-48 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            >
              {COUPON_TYPE_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={active}
              onChange={(e) => {
                setActive(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 lg:w-44 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            >
              {COUPON_ACTIVE_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {hasFilters && (
              <Button variant="ghost" onClick={clearFilters} className="inline-flex items-center gap-2">
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>

          {/* Table / empty state */}
          {!listQuery.isLoading && coupons.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              <EmptyState
                icon={TicketPercent}
                title={hasFilters ? "No codes match your filters" : "No discount codes yet"}
                description={
                  hasFilters
                    ? "Try adjusting or clearing your filters."
                    : "Create your first code to offer a discount at checkout."
                }
                action={
                  hasFilters
                    ? { label: "Clear filters", onClick: clearFilters }
                    : { label: "Add code", onClick: () => navigate(paths.couponCreate) }
                }
              />
            </div>
          ) : (
            <DataTable
              data={coupons}
              columns={columns}
              loading={listQuery.isLoading}
              error={
                listError && !noScope
                  ? isApiError(listError)
                    ? listError.message
                    : "Failed to load discount codes"
                  : null
              }
              currentPage={pagination?.current_page ?? 1}
              totalPages={pagination?.last_page ?? 1}
              pageSize={pagination?.per_page ?? PER_PAGE}
              totalItems={pagination?.total}
              onPageChange={setPage}
              sortKey={sort}
              sortOrder={order}
              onSortChange={handleSort}
              emptyMessage="No discount codes found"
              getRowId={(row) => row.uuid}
              actions={(row) => (
                <div className="flex justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => setRedemptionsFor(row)}
                    title="View redemptions"
                    className="rounded p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  >
                    <Receipt className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`${paths.coupons}/${row.uuid}`)}
                    title="Edit"
                    className="rounded p-1.5 text-gray-400 hover:text-blue-500"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(row)}
                    title="Delete"
                    className="rounded p-1.5 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            />
          )}
        </>
      )}

      {redemptionsFor && (
        <CouponRedemptionsModal coupon={redemptionsFor} onClose={() => setRedemptionsFor(null)} />
      )}
    </div>
  );
}

/** Redemptions for a single code, loaded lazily while the modal is open. */
function CouponRedemptionsModal({ coupon, onClose }: { coupon: Coupon; onClose: () => void }) {
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["coupons", coupon.uuid, "redemptions", page],
    queryFn: () => couponsApi.redemptions(coupon.uuid, { page, per_page: 10 }),
  });

  const redemptions: CouponRedemption[] = data?.data ?? [];
  const pagination = data?.pagination;
  const notFound = isApiError(error) && error.status === 404;
  const lastPage = pagination?.last_page ?? 1;

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Redemptions for ${coupon.code}`}
      description={`${formatDiscount(coupon)} · ${scopeLabel(coupon)}`}
      maxWidth="3xl"
    >
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : notFound ? (
        <p className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
          This discount code is no longer available.
        </p>
      ) : isError ? (
        <p className="py-10 text-center text-sm text-red-600 dark:text-red-400">
          {isApiError(error) ? error.message : "Failed to load redemptions."}
        </p>
      ) : redemptions.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
          This code hasn't been redeemed yet.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {redemptions.map((redemption) => (
              <TableRow key={redemption.uuid}>
                <TableCell>
                  {redemption.guest ? (
                    <span className="text-gray-500 dark:text-gray-400">Guest</span>
                  ) : (
                    <div>
                      <p className="text-gray-900 dark:text-white">{redemption.user_name ?? "—"}</p>
                      {redemption.user_email && (
                        <p className="text-xs text-gray-400">{redemption.user_email}</p>
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell>{redemption.order_number ?? "—"}</TableCell>
                <TableCell>
                  {redemption.currency} {redemption.amount.toLocaleString("en-US")}
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                  {formatDate(redemption.created_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {lastPage > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Page {pagination?.current_page ?? 1} of {lastPage}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= lastPage}
              onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
