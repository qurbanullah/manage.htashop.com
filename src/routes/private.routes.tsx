import { lazy } from "react";
import { Route } from "react-router-dom";
import { paths } from "@/routes/paths";
import { AppLayout } from "@/components/layouts/AppLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

const Dashboard = lazy(() => import("@/pages/dashboard/Dashboard"));
const ProductsPage = lazy(() => import("@/pages/products/ProductsListPage"));
const ProductDetailPage = lazy(() => import("@/pages/products/ProductDetailPage"));
const WarehousesPage = lazy(() => import("@/pages/warehouses/WarehousesPage"));
const ManufacturersPage = lazy(() => import("@/pages/manufacturers/ManufacturersPage"));
const BrandsPage = lazy(() => import("@/pages/brands/BrandsPage"));
const CouponListPage = lazy(() => import("@/pages/coupons/CouponListPage"));
const CouponFormPage = lazy(() => import("@/pages/coupons/CouponFormPage"));
const OrdersPage = lazy(() => import("@/pages/orders/OrdersPage"));
const OrderDetailPage = lazy(() => import("@/pages/orders/OrderDetailPage"));
const Settings = lazy(() =>
  import("@/pages/setting/Settings").then((m) => ({ default: m.Settings })),
);

export function PrivateRoutes() {
  return (
    <Route element={<ProtectedRoute />}>
      <Route element={<AppLayout />}>
        <Route path={paths.dashboard} element={<Dashboard />} />
        <Route path={paths.products} element={<ProductsPage />} />
        <Route path={`${paths.products}/:slugUuid`} element={<ProductDetailPage />} />
        <Route path={paths.warehouses} element={<WarehousesPage />} />
        <Route path={paths.manufacturers} element={<ManufacturersPage />} />
        <Route path={paths.brands} element={<BrandsPage />} />
        <Route path={paths.coupons} element={<CouponListPage />} />
        <Route path={paths.couponCreate} element={<CouponFormPage />} />
        <Route path={paths.couponDetail} element={<CouponFormPage />} />
        <Route path={paths.orders} element={<OrdersPage />} />
        <Route path={`${paths.orders}/:uuid`} element={<OrderDetailPage />} />
        <Route path={paths.settings} element={<Settings />} />
      </Route>
    </Route>
  );
}
