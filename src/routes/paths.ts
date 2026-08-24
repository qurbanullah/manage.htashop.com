/**
 * Route path constants — single source of truth.
 * Every `<Link>`, `navigate()`, and `<Route path>` references these.
 */
export const paths = {
  root: "/",

  // Auth
  login: "/login",
  register: "/register",
  checkAccount: "/check-account",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",

  // Public (no auth guard, no redirect)
  verifyEmail: "/verify-email",

  // Protected
  dashboard: "/dashboard",
  products: "/products",
  warehouses: "/warehouses",
  manufacturers: "/manufacturers",
  brands: "/brands",
  orders: "/orders",
  orderDetail: "/orders/:uuid",
  settings: "/settings",
} as const;
