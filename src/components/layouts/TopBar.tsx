import { Bell, ChevronDown, LogOut, Menu, Settings, User } from 'lucide-react'
import { useState } from 'react'
import { Logo } from '@/components/shared/Logo'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { useAuth } from '@/hooks/auth/useAuth'

function getUserInitials(
  user: { first_name?: string | null; last_name?: string | null; name?: string | null } | null
): string {
  if (!user) return 'U'
  if (user.first_name && user.last_name) {
    return (user.first_name.charAt(0) + user.last_name.charAt(0)).toUpperCase()
  }
  if (user.first_name) return user.first_name.charAt(0).toUpperCase()
  if (user.last_name) return user.last_name.charAt(0).toUpperCase()
  return user.name?.charAt(0)?.toUpperCase() ?? 'U'
}

interface TopBarProps {
  onToggleSidebar: () => void
}

export function TopBar({ onToggleSidebar }: TopBarProps) {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-gray-200 border-b bg-white px-4 dark:border-gray-700 dark:bg-gray-800">
      {/* Mobile menu toggle */}
      <button
        type="button"
        onClick={onToggleSidebar}
        className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 lg:hidden dark:text-gray-400 dark:hover:bg-gray-700"
        aria-label="Toggle sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Brand */}
      <div className="flex items-center gap-2">
        <Logo width={120} />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Notifications */}
      <button
        type="button"
        className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
      >
        <Bell className="h-5 w-5" />
      </button>

      {/* Theme */}
      <ThemeToggle />

      {/* User dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 rounded-lg p-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {user?.avatar_urls?.medium || user?.avatar_url ? (
            <img
              src={
                (user.avatar_urls?.medium || user.avatar_url || '').startsWith('http')
                  ? user.avatar_urls?.medium || user.avatar_url || ''
                  : `https://cdn.htashop.com/${user.avatar_urls?.medium || user.avatar_url || ''}`
              }
              alt={user.name ?? 'User'}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 font-medium text-white text-xs">
              {getUserInitials(user)}
            </div>
          )}
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </button>

        {menuOpen && (
          <>
            <button
              type="button"
              aria-label="Close menu"
              className="fixed inset-0 z-40 cursor-default"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
              <div className="border-gray-100 border-b px-4 py-3 dark:border-gray-700">
                <p className="font-medium text-gray-900 text-sm dark:text-white">{user?.name}</p>
                <p className="truncate text-gray-500 text-xs dark:text-gray-400">{user?.email}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-gray-700 text-sm hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                <User className="h-4 w-4 text-gray-400" />
                Profile
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-gray-700 text-sm hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                <Settings className="h-4 w-4 text-gray-400" />
                Settings
              </button>
              <div className="border-gray-100 border-t dark:border-gray-700" />
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  logout()
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-red-600 text-sm hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
