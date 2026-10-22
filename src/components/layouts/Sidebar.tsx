import {
  ChevronDown,
  ClipboardList,
  Handshake,
  LayoutGrid,
  Package,
  Settings,
  ShoppingCart,
  TicketPercent,
  Warehouse,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { paths } from '@/routes/paths'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

const PRIMARY_ITEMS = [
  { to: paths.dashboard, label: 'Dashboard', icon: LayoutGrid },
  { to: paths.products, label: 'Products', icon: ShoppingCart },
  { to: paths.orders, label: 'Orders', icon: ClipboardList },
]

/**
 * Less frequently used pages are grouped under a collapsible accordion so the
 * primary navigation stays focused (industry-standard pattern for admin UIs).
 */
const MANAGEMENT_ITEMS = [
  { to: paths.warehouses, label: 'Warehouses', icon: Warehouse },
  { to: paths.coupons, label: 'Discounts', icon: TicketPercent },
  { to: paths.punchoutBuyers, label: 'Punchout Buyers', icon: Handshake },
]

function isActivePath(pathname: string, to: string): boolean {
  return pathname === to || pathname.startsWith(`${to}/`)
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation()

  // The accordion is user-controlled only — closed by default.
  const [managementOpen, setManagementOpen] = useState(false)

  const managementActive = MANAGEMENT_ITEMS.some((item) => isActivePath(location.pathname, item.to))
  const settingsActive = isActivePath(location.pathname, paths.settings)

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 cursor-default bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-gray-200 border-r bg-white lg:static lg:z-0 dark:border-gray-700 dark:bg-gray-800',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          'transition-transform duration-200'
        )}
      >
        {/* Mobile close */}
        <div className="flex h-14 items-center justify-between border-gray-200 border-b px-4 lg:hidden dark:border-gray-700">
          <span className="font-semibold text-gray-900 text-sm dark:text-white">Navigation</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {PRIMARY_ITEMS.map((item) => {
            const active = isActivePath(location.pathname, item.to)
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 font-medium text-sm transition-colors',
                  active
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                    : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            )
          })}

          {/* Management accordion */}
          <div>
            <button
              type="button"
              onClick={() => setManagementOpen((v) => !v)}
              className={cn(
                'flex w-full items-center justify-between rounded-lg px-3 py-2.5 font-medium text-sm transition-colors',
                managementActive
                  ? 'text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50'
              )}
            >
              <span className="flex items-center gap-3">
                <Package className="h-5 w-5 shrink-0" />
                Management
              </span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 shrink-0 transition-transform duration-200',
                  managementOpen ? 'rotate-180' : ''
                )}
              />
            </button>

            {managementOpen && (
              <div className="mt-1 ml-3 space-y-1 border-gray-100 border-l pl-3 dark:border-gray-700">
                {MANAGEMENT_ITEMS.map((item) => {
                  const active = isActivePath(location.pathname, item.to)
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 font-medium text-sm transition-colors',
                        active
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                          : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50'
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Settings */}
          <Link
            to={paths.settings}
            onClick={onClose}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 font-medium text-sm transition-colors',
              settingsActive
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50'
            )}
          >
            <Settings className="h-5 w-5 shrink-0" />
            Settings
          </Link>
        </nav>
      </aside>
    </>
  )
}
