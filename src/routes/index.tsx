import { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { paths } from "@/routes/paths";
import { AuthRoutes } from "@/routes/auth.routes";
import { PrivateRoutes } from "@/routes/private.routes";
import { PublicRoutes } from "@/routes/public.routes";
import { RootLayout } from "@/components/layouts/RootLayout";
import { PageSpinner } from "@/components/shared/PageSpinner";

export function AppRouter() {
  return (
    <RootLayout>
      <Suspense fallback={<PageSpinner />}>
        <Routes>
          <Route path={paths.root} element={<Navigate to={paths.login} replace />} />
          {AuthRoutes()}
          {PrivateRoutes()}
          {PublicRoutes()}
        </Routes>
      </Suspense>
    </RootLayout>
  );
}
