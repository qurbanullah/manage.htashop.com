import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
import { paths } from "@/routes/paths";
import { OnboardingModal } from "@/components/onboarding/modals/OnboardingModal";

export function ProtectedRoute() {
  const { isAuthenticated, isInitializing, user } = useAuthStore();
  const location = useLocation();

  if (isInitializing) return <Outlet />;
  if (!isAuthenticated) return <Navigate to={paths.login} state={{ from: location }} replace />;

  // Block all protected routes until onboarding is complete
  if (user && !user.onboarding_completed) {
    return (
      <>
        <Outlet />
        <OnboardingModal />
      </>
    );
  }

  return <Outlet />;
}

export function PublicRoute() {
  const { isAuthenticated, isInitializing } = useAuthStore();

  if (isInitializing) return <Outlet />;
  if (isAuthenticated) return <Navigate to={paths.dashboard} replace />;

  return <Outlet />;
}
