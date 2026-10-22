import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  type PunchoutBuyer,
  type PunchoutBuyerContractOption,
  type PunchoutBuyerOrganizationOption,
  punchoutBuyersApi,
} from '@/api/punchoutBuyers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/Toaster'
import { isApiError } from '@/lib/api-response'
import {
  type BuyerForm,
  buildPunchoutBuyerPayload,
  EMPTY_BUYER_FORM,
  formFromBuyer,
} from '@/lib/punchout-buyer-form'

interface Props {
  isOpen: boolean
  onClose: () => void
  buyer: PunchoutBuyer | null
  onSaved: () => void
}

type SetField = <K extends keyof BuyerForm>(key: K, value: BuyerForm[K]) => void

const SELECT_CLASS =
  'h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100'

function getSaveErrorMessage(error: unknown, fallback: string): string {
  if (isApiError(error) && error.errors) {
    return Object.values(error.errors).flat()[0] || error.message
  }
  return isApiError(error) ? error.message : fallback
}

function Field({
  label,
  value,
  onChange,
  placeholder = '',
  type = 'text',
  hint,
  autoComplete = 'off',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  hint?: string
  autoComplete?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label className="font-medium text-gray-700 text-xs dark:text-gray-300">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10"
        autoComplete={autoComplete}
      />
      {hint ? <p className="text-gray-400 text-xs">{hint}</p> : null}
    </div>
  )
}

function RelationshipFields({
  form,
  set,
  organizations,
  contracts,
  onOrganizationChange,
}: {
  form: BuyerForm
  set: SetField
  organizations: PunchoutBuyerOrganizationOption[]
  contracts: PunchoutBuyerContractOption[]
  onOrganizationChange: (value: string) => void
}) {
  return (
    <section className="space-y-4">
      <h3 className="font-semibold text-gray-900 text-sm dark:text-white">Relationship</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="font-medium text-gray-700 text-xs dark:text-gray-300">
            Buyer organization <span className="font-normal text-gray-400">(optional)</span>
          </Label>
          <select
            value={form.organizationId}
            onChange={(event) => onOrganizationChange(event.target.value)}
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
        </div>

        <div className="space-y-1.5">
          <Label className="font-medium text-gray-700 text-xs dark:text-gray-300">
            Contract <span className="font-normal text-gray-400">(price list)</span>
          </Label>
          <select
            value={form.contractId}
            onChange={(event) => set('contractId', event.target.value)}
            className={SELECT_CLASS}
          >
            <option value="">No contract (tenant price list)</option>
            {contracts.map((contract) => (
              <option key={contract.id} value={contract.id}>
                {contract.name}
                {contract.code ? ` (${contract.code})` : ''}
                {contract.buyer_name && !form.organizationId ? ` · ${contract.buyer_name}` : ''}
              </option>
            ))}
          </select>
        </div>

        <Field
          label="Name"
          value={form.name}
          onChange={(value) => set('name', value)}
          placeholder="e.g. Acme Procurement"
        />

        <div className="space-y-1.5">
          <Label className="font-medium text-gray-700 text-xs dark:text-gray-300">Buyer code</Label>
          <Input
            value={form.code}
            onChange={(event) => set('code', event.target.value)}
            placeholder="e.g. ACME"
            className="h-10"
            autoComplete="off"
          />
          <p className="text-gray-400 text-xs">Unique for your tenant. Used in reports.</p>
        </div>
      </div>
    </section>
  )
}

function CredentialFields({
  form,
  set,
  buyer,
}: {
  form: BuyerForm
  set: SetField
  buyer: PunchoutBuyer | null
}) {
  return (
    <section className="space-y-4">
      <h3 className="font-semibold text-gray-900 text-sm dark:text-white">
        Protocol and credentials
      </h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="font-medium text-gray-700 text-xs dark:text-gray-300">Protocol</Label>
          <select
            value={form.protocol}
            onChange={(event) => set('protocol', event.target.value as BuyerForm['protocol'])}
            className={SELECT_CLASS}
          >
            <option value="cxml">cXML</option>
            <option value="oci">OCI</option>
            <option value="">Both (any protocol)</option>
          </select>
        </div>

        <label className="flex items-center gap-2 self-end text-gray-700 text-sm dark:text-gray-300">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => set('isActive', event.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Active
        </label>
      </div>

      {form.protocol !== 'oci' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Sender identity"
            value={form.senderIdentity}
            onChange={(value) => set('senderIdentity', value)}
            placeholder="e.g. ACME-NETWORK"
          />
          <Field
            label="From identity"
            value={form.fromIdentity}
            onChange={(value) => set('fromIdentity', value)}
            placeholder="e.g. ACME-BUYER"
          />
          <Field
            label="To identity"
            value={form.toIdentity}
            onChange={(value) => set('toIdentity', value)}
            placeholder="e.g. HTASHOP"
          />
          <Field
            label="Shared secret"
            value={form.sharedSecret}
            onChange={(value) => set('sharedSecret', value)}
            type="password"
            autoComplete="new-password"
            placeholder={
              buyer?.has_shared_secret ? 'Leave blank to keep current' : 'At least 16 characters'
            }
            hint={
              buyer?.has_shared_secret
                ? 'A new secret keeps the previous one valid until you close the overlap.'
                : undefined
            }
          />
        </div>
      ) : null}

      {form.protocol !== 'cxml' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="OCI username"
            value={form.ociUsername}
            onChange={(value) => set('ociUsername', value)}
            placeholder="e.g. acme-oci-user"
          />
          <Field
            label="OCI password"
            value={form.ociPassword}
            onChange={(value) => set('ociPassword', value)}
            type="password"
            autoComplete="new-password"
            placeholder={
              buyer?.has_oci_password ? 'Leave blank to keep current' : 'At least 8 characters'
            }
          />
        </div>
      ) : null}

      <Field
        label="Allowed return domains (optional)"
        value={form.allowedReturnDomains}
        onChange={(value) => set('allowedReturnDomains', value)}
        placeholder="*.acme.example, procurement.acme.example"
        hint="Comma-separated. Wildcards match subdomains only. Empty means any host the setup request names."
      />
    </section>
  )
}

function DefaultsFields({ form, set }: { form: BuyerForm; set: SetField }) {
  const toggle = (key: keyof BuyerForm, label: string) => (
    <label className="flex items-center gap-2 text-gray-700 text-sm dark:text-gray-300">
      <input
        type="checkbox"
        checked={Boolean(form[key])}
        onChange={(event) => set(key, event.target.checked as BuyerForm[typeof key])}
        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      {label}
    </label>
  )

  return (
    <section className="space-y-4">
      <h3 className="font-semibold text-gray-900 text-sm dark:text-white">
        Defaults and presentation
      </h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Currency"
          value={form.defaultCurrency}
          onChange={(value) => set('defaultCurrency', value)}
          placeholder="USD"
          hint="ISO 4217, three letters."
        />
        <Field
          label="Locale"
          value={form.defaultLocale}
          onChange={(value) => set('defaultLocale', value)}
          placeholder="en"
          hint="e.g. en, ur, de."
        />
        <Field
          label="Max line items"
          value={form.maxLineItems}
          onChange={(value) => set('maxLineItems', value)}
          type="number"
        />
        <Field
          label="Max quantity per line"
          value={form.maxQuantityPerLine}
          onChange={(value) => set('maxQuantityPerLine', value)}
          type="number"
        />
        <Field
          label="Branding primary color"
          value={form.primaryColor}
          onChange={(value) => set('primaryColor', value)}
          placeholder="#0f172a"
        />
        <Field
          label="Branding logo URL"
          value={form.logoUrl}
          onChange={(value) => set('logoUrl', value)}
          type="url"
          placeholder="https://cdn.htashop.com/..."
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {toggle('hidePrices', 'Hide prices in the UI')}
        {toggle('allowReviews', 'Allow reviews')}
        {toggle('customerPartNumberRequired', 'Require customer part number')}
      </div>
    </section>
  )
}

export function PunchoutBuyerModal({ isOpen, onClose, buyer, onSaved }: Props) {
  const { success: showSuccess, error: showError } = useToast()
  const [form, setForm] = useState<BuyerForm>(EMPTY_BUYER_FORM)
  const [saving, setSaving] = useState(false)

  const optionsQuery = useQuery({
    queryKey: ['punchout-buyer-options', form.organizationId],
    queryFn: () =>
      punchoutBuyersApi.options({
        organization_id: form.organizationId ? Number(form.organizationId) : undefined,
      }),
    enabled: isOpen,
    staleTime: 30_000,
  })

  useEffect(() => {
    if (isOpen) {
      setForm(buyer ? formFromBuyer(buyer) : EMPTY_BUYER_FORM)
    }
  }, [isOpen, buyer])

  const set: SetField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const options = optionsQuery.data
  const requiresNewSecret =
    !buyer && form.protocol === 'cxml' && form.sharedSecret.trim().length === 0
  const requiresNewOciPassword =
    !buyer &&
    form.protocol === 'oci' &&
    (form.ociUsername.trim() === '' || form.ociPassword.trim() === '')

  const canSubmit =
    Boolean(form.name.trim()) &&
    Boolean(form.code.trim()) &&
    !requiresNewSecret &&
    !requiresNewOciPassword

  const handleSave = async () => {
    if (!canSubmit) return
    setSaving(true)
    try {
      const payload = buildPunchoutBuyerPayload(form)
      if (buyer) {
        await punchoutBuyersApi.update(buyer.uuid, payload)
        showSuccess('Punchout buyer updated')
      } else {
        await punchoutBuyersApi.create(payload)
        showSuccess('Punchout buyer created')
      }
      onSaved()
      onClose()
    } catch (error) {
      showError(getSaveErrorMessage(error, 'Failed to save punchout buyer'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={buyer ? 'Edit Punchout Buyer' : 'Add Punchout Buyer'}
      description="Credentials, contract pricing, return-domain policy and presentation for one procurement buyer."
      maxWidth="4xl"
    >
      <div className="max-h-[65vh] space-y-6 overflow-y-auto pr-1">
        <RelationshipFields
          form={form}
          set={set}
          organizations={options?.organizations ?? []}
          contracts={options?.contracts ?? []}
          onOrganizationChange={(value) =>
            setForm((prev) => ({ ...prev, organizationId: value, contractId: '' }))
          }
        />
        <CredentialFields form={form} set={set} buyer={buyer} />
        <DefaultsFields form={form} set={set} />
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!canSubmit || saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {buyer ? 'Update' : 'Create'}
        </Button>
      </div>
    </Modal>
  )
}
