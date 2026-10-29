import { KeyRound, ShieldAlert, ShieldCheck } from 'lucide-react'
import type { PunchoutBuyer } from '@/api/punchoutBuyers'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { BuyerForm } from '@/lib/punchout-buyer-form'
import { BuyerField, BuyerStepHeader } from './BuyerField'

interface Props {
  data: BuyerForm
  onChange: (data: Partial<BuyerForm>) => void
  buyer: PunchoutBuyer | null
}

const PROTOCOL_OPTIONS = [
  { value: 'cxml', label: 'cXML', description: 'Setup requests over cXML' },
  { value: 'oci', label: 'OCI', description: 'SAP OCI catalog transfer' },
  { value: '', label: 'Both', description: 'Accept either protocol' },
] as const

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: protocol-specific credential sections
export function BuyerProtocolStep({ data, onChange, buyer }: Props) {
  const showCxml = data.protocol !== 'oci'
  const showOci = data.protocol !== 'cxml'

  const secret = data.sharedSecret.trim()
  const secretTooShort = showCxml && secret.length > 0 && secret.length < 16
  const secretMissing = data.protocol === 'cxml' && !buyer && secret.length === 0

  const ociUsername = data.ociUsername.trim()
  const ociPassword = data.ociPassword.trim()
  const ociPasswordTooShort = showOci && ociPassword.length > 0 && ociPassword.length < 8
  const ociMissing = data.protocol === 'oci' && !buyer && (ociUsername === '' || ociPassword === '')

  return (
    <div className="space-y-5">
      <BuyerStepHeader
        icon={KeyRound}
        title="Protocol & Credentials"
        description="Choose how this buyer talks to your storefront and set its authentication"
        tone="amber"
      />

      <div className="space-y-1.5">
        <Label className="font-medium text-gray-700 text-sm dark:text-gray-300">
          Protocol <span className="ml-1 text-red-500">*</span>
        </Label>
        <div className="grid gap-2 sm:grid-cols-3">
          {PROTOCOL_OPTIONS.map((option) => {
            const active = data.protocol === option.value
            return (
              <button
                key={option.value || 'both'}
                type="button"
                onClick={() => onChange({ protocol: option.value })}
                className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                  active
                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500 dark:border-blue-500 dark:bg-blue-900/20'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                }`}
              >
                <span
                  className={`block font-semibold text-sm ${
                    active ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-200'
                  }`}
                >
                  {option.label}
                </span>
                <span className="mt-0.5 block text-gray-400 text-xs dark:text-gray-500">
                  {option.description}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {showCxml ? (
        <section className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm dark:text-white">cXML identities</h3>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-500 text-xs dark:bg-gray-700 dark:text-gray-300">
              cXML
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <BuyerField
              label="Sender identity"
              value={data.senderIdentity}
              onChange={(value) => onChange({ senderIdentity: value })}
              placeholder="e.g. ACME-NETWORK"
            />
            <BuyerField
              label="From identity"
              value={data.fromIdentity}
              onChange={(value) => onChange({ fromIdentity: value })}
              placeholder="e.g. ACME-BUYER"
            />
            <BuyerField
              label="To identity"
              value={data.toIdentity}
              onChange={(value) => onChange({ toIdentity: value })}
              placeholder="e.g. HTASHOP"
            />
            <BuyerField
              label="Shared secret"
              value={data.sharedSecret}
              onChange={(value) => onChange({ sharedSecret: value })}
              type="password"
              autoComplete="new-password"
              required={data.protocol === 'cxml' && !buyer}
              placeholder={
                buyer?.has_shared_secret ? 'Leave blank to keep current' : 'At least 16 characters'
              }
              hint={
                buyer?.has_shared_secret
                  ? 'A new secret keeps the previous one valid until you close the overlap.'
                  : undefined
              }
              error={
                secretTooShort
                  ? 'Shared secret must be at least 16 characters.'
                  : secretMissing
                    ? 'A shared secret is required when creating a cXML buyer.'
                    : undefined
              }
            />
          </div>

          <p className="flex items-start gap-1.5 text-gray-400 text-xs dark:text-gray-500">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Identities are matched case-insensitively; the shared secret is stored hashed.
          </p>
        </section>
      ) : null}

      {showOci ? (
        <section className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm dark:text-white">OCI credentials</h3>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-500 text-xs dark:bg-gray-700 dark:text-gray-300">
              OCI
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <BuyerField
              label="OCI username"
              value={data.ociUsername}
              onChange={(value) => onChange({ ociUsername: value })}
              placeholder="e.g. acme-oci-user"
              required={data.protocol === 'oci' && !buyer}
              error={ociMissing && ociUsername === '' ? 'An OCI username is required.' : undefined}
            />
            <BuyerField
              label="OCI password"
              value={data.ociPassword}
              onChange={(value) => onChange({ ociPassword: value })}
              type="password"
              autoComplete="new-password"
              required={data.protocol === 'oci' && !buyer}
              placeholder={
                buyer?.has_oci_password ? 'Leave blank to keep current' : 'At least 8 characters'
              }
              error={
                ociPasswordTooShort
                  ? 'OCI password must be at least 8 characters.'
                  : ociMissing && ociPassword === ''
                    ? 'An OCI password is required.'
                    : undefined
              }
            />
          </div>
        </section>
      ) : null}

      <div className="space-y-1.5">
        <Label className="font-medium text-gray-700 text-sm dark:text-gray-300">
          Allowed return domains <span className="ml-1 font-normal text-gray-400">(optional)</span>
        </Label>
        <Textarea
          value={data.allowedReturnDomains}
          onChange={(event) => onChange({ allowedReturnDomains: event.target.value })}
          placeholder={'*.acme.example\nprocurement.acme.example'}
          rows={3}
          className="resize-none"
        />
        <p className="text-gray-400 text-xs dark:text-gray-500">
          One domain per line, or comma-separated. Wildcards match subdomains only. Empty means any
          host the setup request names.
        </p>
      </div>

      {secretMissing || ociMissing ? (
        <p className="flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700 text-xs dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          New buyers need credentials for the selected protocol before you can continue.
        </p>
      ) : null}
    </div>
  )
}
