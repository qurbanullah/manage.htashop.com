import { lazy } from "react";
import { Route } from "react-router-dom";
import { paths } from "@/routes/paths";
import { AuthLayout } from "@/components/layouts/AuthLayout";

const VerifyEmail = lazy(() => import("@/pages/auth/VerifyEmail"));
const NotFound = lazy(() => import("@/pages/error/NotFound"));

/**
 * Public routes — no auth guard, no redirect.
 * Also includes the catch-all 404.
 */
export function PublicRoutes() {
  return (
    <Route element={<AuthLayout />}>
      <Route path={paths.verifyEmail} element={<VerifyEmail />} />
      <Route path="*" element={<NotFound />} />
    </Route>
  );
}
