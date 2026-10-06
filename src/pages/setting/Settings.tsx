import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronRight,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Plus,
  Shield,
  Star,
  Trash2,
  User,
} from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { type AddressData, addressesApi } from '@/api/addresses'
import { AddressModal } from '@/components/addresses/AddressModal'
import { AvatarUpload } from '@/components/shared/AvatarUpload'
import { PageHeader } from '@/components/ui'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/auth'

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: legacy settings page
export function Settings() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('account')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [addressModalOpen, setAddressModalOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<AddressData | null>(null)
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: addresses = [], isLoading: addressesLoading } = useQuery({
    queryKey: ['addresses', 'user'],
    queryFn: () => addressesApi.list('user'),
  })

  const openAddAddress = () => {
    setEditingAddress(null)
    setAddressModalOpen(true)
  }

  const openEditAddress = (address: AddressData) => {
    setEditingAddress(address)
    setAddressModalOpen(true)
  }

  const handleDeleteAddress = async (address: AddressData) => {
    setDeletingAddressId(address.uuid)
    try {
      await addressesApi.remove(address.uuid)
      await queryClient.invalidateQueries({ queryKey: ['addresses', 'user'] })
    } catch {
      // non-fatal: keep the list as-is
    } finally {
      setDeletingAddressId(null)
    }
  }

  const handleSetPrimary = async (address: AddressData) => {
    try {
      await addressesApi.setPrimary(address.uuid)
      await queryClient.invalidateQueries({ queryKey: ['addresses', 'user'] })
    } catch {
      // non-fatal
    }
  }

  const tabs = [
    {
      id: 'account',
      label: 'Account',
      icon: User,
      description: 'Profile and user information',
    },
    {
      id: 'email',
      label: 'Email Management',
      icon: Mail,
      description: 'Manage your email addresses',
    },
    {
      id: 'privacy',
      label: 'Privacy & Security',
      icon: Shield,
      description: 'Control your data and security',
    },
    {
      id: 'addresses',
      label: 'Addresses',
      icon: MapPin,
      description: 'Manage your shipping and billing addresses',
    },
  ]

  const handleDeleteAccount = async () => {
    setDeleteLoading(true)
    setDeleteError(null)

    try {
      const response = await api
        .post('user/delete-account')
        .json<{ success: boolean; message: string }>()

      if (response.success) {
        logout()
        navigate('/', { replace: true })
      }
    } catch (error: unknown) {
      console.error('Failed to delete account:', error)
      setDeleteError(
        error instanceof Error
          ? error.message || 'Failed to delete account. Please try again.'
          : 'Failed to delete account. Please try again.'
      )
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-360 space-y-6 px-3 sm:px-6">
      <PageHeader title="Settings" description="Manage your account and preferences." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
        {/* Mobile nav dropdown */}
        <div className="lg:hidden">
          <button
            type="button"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 font-medium text-gray-700 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            <span>{tabs.find((t) => t.id === activeTab)?.label}</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${mobileNavOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {mobileNavOpen && (
            <div className="mt-2 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    type="button"
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id)
                      setMobileNavOpen(false)
                    }}
                    className={`flex w-full items-center gap-3 px-4 py-3 font-medium text-sm transition-colors ${
                      isActive
                        ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                        : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Desktop Sidebar */}
        <div className="hidden lg:col-span-3 lg:block">
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="border-gray-200 border-b p-4 dark:border-gray-700">
              <h2 className="font-semibold text-gray-500 text-xs uppercase tracking-wider dark:text-gray-400">
                Preferences
              </h2>
            </div>
            <nav className="p-2">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    type="button"
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`group flex w-full items-start rounded-lg p-3 transition-all duration-200 ${
                      isActive
                        ? 'border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                        : 'border border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <div
                      className={`mr-3 rounded-lg p-2 transition-colors ${
                        isActive
                          ? 'bg-green-500 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:group-hover:bg-gray-600'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-semibold text-sm ${
                            isActive
                              ? 'text-green-900 dark:text-green-100'
                              : 'text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {tab.label}
                        </span>
                        {isActive && (
                          <ChevronRight className="h-4 w-4 text-green-600 dark:text-green-400" />
                        )}
                      </div>
                      <p
                        className={`mt-0.5 text-xs ${
                          isActive
                            ? 'text-green-700 dark:text-green-300'
                            : 'text-gray-500 dark:text-gray-500'
                        }`}
                      >
                        {tab.description}
                      </p>
                    </div>
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-9">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            {activeTab === 'account' && (
              <div className="p-4 sm:p-6 lg:p-8">
                <div className="mb-6 sm:mb-8">
                  <h2 className="mb-2 font-bold text-gray-900 text-xl sm:text-2xl dark:text-white">
                    Account Information
                  </h2>
                  <p className="text-gray-600 text-sm dark:text-gray-400">
                    View your system account details and profile information
                  </p>
                </div>

                <div className="space-y-4 sm:space-y-6">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-6 dark:border-gray-700 dark:bg-gray-900/50">
                    <AvatarUpload />
                  </div>

                  <div className="flex items-start rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-5 dark:border-gray-700 dark:bg-gray-900/50">
                    <div className="mr-3 shrink-0 rounded-lg bg-white p-2.5 sm:mr-4 dark:bg-gray-800">
                      <User className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="mb-1 block font-semibold text-gray-500 text-xs uppercase tracking-wider dark:text-gray-400">
                        Full Name
                      </span>
                      <p className="font-medium text-gray-900 text-sm sm:text-base dark:text-white">
                        {user?.name || 'Not set'}
                      </p>
                    </div>
                  </div>

                  {user?.roles && user.roles.length > 0 && (
                    <div className="flex items-start rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-5 dark:border-gray-700 dark:bg-gray-900/50">
                      <div className="mr-3 shrink-0 rounded-lg bg-white p-2.5 sm:mr-4 dark:bg-gray-800">
                        <Shield className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <span className="mb-2 block font-semibold text-gray-500 text-xs uppercase tracking-wider dark:text-gray-400">
                          User Roles
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {user.roles.map((role) => {
                            const roleLabel = typeof role === 'string' ? role : role.name
                            return (
                              <span
                                key={roleLabel}
                                className="inline-flex items-center rounded-full bg-gradient-to-r from-blue-500 to-blue-600 px-2.5 py-1 font-medium text-white text-xs shadow-sm sm:px-3"
                              >
                                {roleLabel}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-5 dark:border-gray-700 dark:bg-gray-900/50">
                    <div className="mr-3 shrink-0 rounded-lg bg-white p-2.5 sm:mr-4 dark:bg-gray-800">
                      <Calendar className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <span className="mb-1 block font-semibold text-gray-500 text-xs uppercase tracking-wider dark:text-gray-400">
                        Member Since
                      </span>
                      <p className="font-medium text-gray-900 text-sm sm:text-base dark:text-white">
                        {user?.created_at
                          ? new Date(user.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'email' && (
              <div className="p-4 sm:p-6 lg:p-8">
                <div className="mb-6 sm:mb-8">
                  <h2 className="mb-2 font-bold text-gray-900 text-xl sm:text-2xl dark:text-white">
                    Email Management
                  </h2>
                  <p className="text-gray-600 text-sm dark:text-gray-400">
                    Manage your email addresses and preferences
                  </p>
                </div>

                <div className="space-y-4 sm:space-y-6">
                  <div className="flex items-start rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-5 dark:border-gray-700 dark:bg-gray-900/50">
                    <div className="mr-3 shrink-0 rounded-lg bg-white p-2.5 sm:mr-4 dark:bg-gray-800">
                      <Mail className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="mb-1 block font-semibold text-gray-500 text-xs uppercase tracking-wider dark:text-gray-400">
                        Primary Email Address
                      </span>
                      <p className="break-all font-medium text-gray-900 text-sm sm:text-base dark:text-white">
                        {user?.email || 'Not set'}
                      </p>
                      <p className="mt-1 text-gray-500 text-xs dark:text-gray-400">
                        Used for login and system communications
                      </p>
                    </div>
                  </div>

                  <div className="border-gray-200 border-t pt-4 sm:pt-6 dark:border-gray-700">
                    <div className="mb-4 sm:mb-6">
                      <h3 className="mb-2 font-semibold text-base text-gray-900 sm:text-lg dark:text-white">
                        Email Addresses
                      </h3>
                      <p className="text-gray-600 text-sm dark:text-gray-400">
                        Manage multiple email addresses for login and communications.
                      </p>
                    </div>
                    <p className="text-gray-500 text-sm dark:text-gray-400">
                      Email management coming soon.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="p-4 sm:p-6 lg:p-8">
                <div className="mb-6 sm:mb-8">
                  <h2 className="mb-2 font-bold text-gray-900 text-xl sm:text-2xl dark:text-white">
                    Privacy & Security
                  </h2>
                  <p className="text-gray-600 text-sm dark:text-gray-400">
                    Control your privacy settings and security preferences
                  </p>
                </div>

                <div className="space-y-6 sm:space-y-8">
                  <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 sm:p-6 dark:border-red-900/50 dark:bg-red-900/10">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="shrink-0 rounded-lg bg-red-100 p-2.5 dark:bg-red-900/30">
                        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="mb-2 font-semibold text-base text-red-900 sm:text-lg dark:text-red-100">
                          Delete Account
                        </h3>
                        <p className="mb-4 text-red-700 text-sm dark:text-red-300">
                          Permanently delete your account and all associated data. This action
                          cannot be easily undone, but you can request account recovery within 30
                          days by contacting support.
                        </p>

                        {deleteError && (
                          <div className="mb-4 rounded-lg border border-red-300 bg-red-100 p-3 text-red-800 text-sm dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
                            {deleteError}
                          </div>
                        )}

                        {!showDeleteConfirm ? (
                          <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(true)}
                            className="inline-flex items-center rounded-lg border-2 border-red-300 bg-white px-4 py-2 font-semibold text-red-700 text-sm hover:bg-red-50 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete My Account
                          </button>
                        ) : (
                          <div className="rounded-lg border-2 border-red-300 bg-white p-3 sm:p-4 dark:border-red-800 dark:bg-red-900/20">
                            <p className="mb-3 font-semibold text-red-900 text-sm sm:mb-4 dark:text-red-100">
                              Are you absolutely sure? This will:
                            </p>
                            <ul className="mb-3 ml-5 list-disc space-y-1 text-red-800 text-sm sm:mb-4 dark:text-red-200">
                              <li>Delete your account and profile information</li>
                              <li>Remove access to all your manuscripts and submissions</li>
                              <li>Cancel any pending reviews or editorial assignments</li>
                              <li>You can request recovery within 30 days via support</li>
                            </ul>
                            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                              <button
                                type="button"
                                onClick={handleDeleteAccount}
                                disabled={deleteLoading}
                                className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 font-semibold text-sm text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-700 dark:hover:bg-red-800"
                              >
                                {deleteLoading ? (
                                  <>
                                    <svg
                                      aria-hidden="true"
                                      className="mr-2 h-4 w-4 animate-spin"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                    >
                                      <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                      />
                                      <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                      />
                                    </svg>
                                    Deleting...
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Yes, Delete My Account
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowDeleteConfirm(false)
                                  setDeleteError(null)
                                }}
                                disabled={deleteLoading}
                                className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'addresses' && (
              <div className="p-4 sm:p-6 lg:p-8">
                <div className="mb-6 flex flex-wrap items-start justify-between gap-3 sm:mb-8">
                  <div>
                    <h2 className="mb-2 font-bold text-gray-900 text-xl sm:text-2xl dark:text-white">
                      Addresses
                    </h2>
                    <p className="text-gray-600 text-sm dark:text-gray-400">
                      Manage your shipping and billing addresses
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={openAddAddress}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-sm text-white shadow-sm transition-colors hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                    Add Address
                  </button>
                </div>

                {addressesLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="rounded-xl border border-gray-200 border-dashed p-8 text-center dark:border-gray-700">
                    <MapPin className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
                    <p className="mt-3 font-medium text-gray-700 text-sm dark:text-gray-200">
                      No addresses yet
                    </p>
                    <p className="mt-1 text-gray-500 text-sm dark:text-gray-400">
                      Add a shipping or billing address to get started.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* biome-ignore lint/complexity/noExcessiveCognitiveComplexity: legacy address card markup */}
                    {addresses.map((address) => (
                      <div
                        key={address.uuid}
                        className="relative rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900/40"
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 font-medium text-blue-700 text-xs capitalize dark:bg-blue-900/30 dark:text-blue-300">
                              {address.type}
                            </span>
                            {address.is_primary && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 font-medium text-amber-700 text-xs dark:bg-amber-900/30 dark:text-amber-300">
                                <Star className="h-3 w-3" />
                                Primary
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditAddress(address)}
                              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                              aria-label="Edit address"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAddress(address)}
                              disabled={deletingAddressId === address.uuid}
                              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                              aria-label="Delete address"
                            >
                              {deletingAddressId === address.uuid ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        <p className="font-semibold text-gray-900 text-sm dark:text-white">
                          {address.label || address.contact_name || 'Address'}
                        </p>
                        <p className="mt-1 text-gray-600 text-sm dark:text-gray-300">
                          {address.address_line_1}
                          {address.address_line_2 ? `, ${address.address_line_2}` : ''}
                        </p>
                        <p className="text-gray-600 text-sm dark:text-gray-300">
                          {[address.city, address.state, address.postal_code]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                        <p className="text-gray-500 text-sm dark:text-gray-400">
                          {address.country?.name ?? ''}
                        </p>
                        {address.contact_name && (
                          <p className="mt-2 text-gray-500 text-xs dark:text-gray-400">
                            {address.contact_name}
                            {address.phone ? ` · ${address.phone}` : ''}
                          </p>
                        )}
                        {!address.is_primary && (
                          <button
                            type="button"
                            onClick={() => handleSetPrimary(address)}
                            className="mt-3 inline-flex items-center gap-1 font-medium text-blue-600 text-xs hover:text-blue-700 dark:text-blue-400"
                          >
                            <Star className="h-3 w-3" />
                            Set as primary
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <AddressModal
        isOpen={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['addresses', 'user'] })}
        address={editingAddress}
        addressableType="user"
      />
    </div>
  )
}
