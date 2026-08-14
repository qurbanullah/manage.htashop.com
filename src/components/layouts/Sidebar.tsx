import { Link, useLocation } from "react-router-dom";
import { paths } from "@/routes/paths";
import { cn } from "@/lib/utils";
import { Package, ClipboardList, Settings, ShoppingCart, Warehouse, Factory, Tag, X } from "lucide-react";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  { to: paths.dashboard, label: "Dashboard", icon: Package },
  { to: paths.products, label: "Products", icon: ShoppingCart },
  { to: paths.warehouses, label: "Warehouses", icon: Warehouse },
  { to: paths.manufacturers, label: "Manufacturers", icon: Factory },
  { to: paths.brands, label: "Brands", icon: Tag },
  { to: "/punchout", label: "Punchout", icon: ClipboardList },
  { to: paths.orders, label: "Orders", icon: ShoppingCart },
  { to: paths.settings, label: "Settings", icon: Settings },
];

export function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 lg:static lg:z-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          "transition-transform duration-200",
        )}
      >
        {/* Mobile close */}
        <div className="flex h-14 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-700 lg:hidden">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">Navigation</span>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                    : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50",
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
