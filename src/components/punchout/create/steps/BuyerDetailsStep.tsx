import { useQuery } from '@tanstack/react-query'
import { Building2, Loader2 } from 'lucide-react'
import { punchoutBuyersApi } from '@/api/punchoutBuyers'
import { Label } from '@/components/ui/label'
import type { BuyerForm } from '@/lib/punchout-buyer-form'
import { BuyerField, BuyerStepHeader, SELECT_CLASS } from './BuyerField'

interface Props {
  data: BuyerForm
  onChange: (data: Partial<BuyerForm>) => void
}

export function BuyerDetailsStep({ data, onChange }: Props) {
  const optionsQuery = useQuery({
    queryKey: ['punchout-buyer-options', data.organizationId],
    queryFn: () =>
      punchoutBuyersApi.options({
        organization_id: data.organizationId ? Number(data.organizationId) : undefined,
      }),
    staleTime: 30_000,
  })

  const organizations = optionsQuery.data?.organizations ?? []
  const contracts = optionsQuery.data?.contracts ?? []

  return (
    <div className="space-y-5">
      <BuyerStepHeader
        icon={Building2}
        title="Buyer Details"
        description="Identify the procurement system and link it to your account records"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <BuyerField
          label="Name"
          value={data.name}
          onChange={(value) => onChange({ name: value })}
          placeholder="e.g. Acme Procurement"
          required
        />

        <BuyerField
          label="Buyer code"
          value={data.code}
          onChange={(value) => onChange({ code: value })}
          placeholder="e.g. ACME"
          hint="Unique for your tenant. Used in reports."
          mono
          required
        />

        <div className="space-y-1.5">
          <Label className="font-medium text-gray-700 text-sm dark:text-gray-300">
            Buyer organization <span className="ml-1 font-normal text-gray-400">(optional)</span>
          </Label>
          <select
            value={data.organizationId}
            onChange={(event) => onChange({ organizationId: event.target.value, contractId: '' })}
            className={SELECT_CLASS}
          >
            <option value="">No organization</option>
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
                {organization.type ? ` · ${organization.type}` : ''}
              </option>
            ))}
          </select>
          <p className="text-gray-400 text-xs dark:text-gray-500">
            Buyers inherit the organization&apos;s catalogue scope.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="font-medium text-gray-700 text-sm dark:text-gray-300">
            Contract <span className="font-normal text-gray-400">(price list)</span>
          </Label>
          <select
            value={data.contractId}
            onChange={(event) => onChange({ contractId: event.target.value })}
            className={SELECT_CLASS}
            disabled={optionsQuery.isLoading}
          >
            <option value="">No contract (tenant price list)</option>
            {contracts.map((contract) => (
              <option key={contract.id} value={contract.id}>
                {contract.name}
                {contract.code ? ` (${contract.code})` : ''}
                {contract.buyer_name && !data.organizationId ? ` · ${contract.buyer_name}` : ''}
              </option>
            ))}
          </select>
          {optionsQuery.isLoading ? (
            <p className="flex items-center gap-1 text-gray-400 text-xs">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading contracts…
            </p>
          ) : (
            <p className="text-gray-400 text-xs dark:text-gray-500">
              Contract prices apply to every order placed by this buyer.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={data.isActive}
            onChange={(event) => onChange({ isActive: event.target.checked })}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span>
            <span className="block font-medium text-gray-700 text-sm dark:text-gray-200">
              Active
            </span>
            <span className="block text-gray-400 text-xs dark:text-gray-500">
              Inactive buyers cannot start new punchout sessions. Existing sessions finish normally.
            </span>
          </span>
        </label>
      </div>
    </div>
  )
}
