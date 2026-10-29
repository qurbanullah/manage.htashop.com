import { Check, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { PunchoutBuyer } from '@/api/punchoutBuyers'
import { punchoutBuyersApi } from '@/api/punchoutBuyers'
import { BuyerBrandingStep } from '@/components/punchout/create/steps/BuyerBrandingStep'
import { BuyerDefaultsStep } from '@/components/punchout/create/steps/BuyerDefaultsStep'
import { BuyerDetailsStep } from '@/components/punchout/create/steps/BuyerDetailsStep'
import { BuyerProtocolStep } from '@/components/punchout/create/steps/BuyerProtocolStep'
import { Button } from '@/components/ui/button'
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

const STEPS = [
  { key: 'details', label: 'Buyer Details' },
  { key: 'protocol', label: 'Protocol & Credentials' },
  { key: 'defaults', label: 'Catalog Defaults' },
  { key: 'branding', label: 'Branding' },
]

function getSaveErrorMessage(error: unknown, fallback: string): string {
  if (isApiError(error) && error.errors) {
    return Object.values(error.errors).flat()[0] || error.message
  }
  return isApiError(error) ? error.message : fallback
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: multi-step wizard with step gating and validation
export function PunchoutBuyerModal({ isOpen, onClose, buyer, onSaved }: Props) {
  const { success: showSuccess, error: showError } = useToast()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<BuyerForm>({ ...EMPTY_BUYER_FORM })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setStep(0)
      setForm(buyer ? formFromBuyer(buyer) : { ...EMPTY_BUYER_FORM })
    }
  }, [isOpen, buyer])

  const applyChange = (partial: Partial<BuyerForm>) => setForm((prev) => ({ ...prev, ...partial }))

  // Credentials are only mandatory for new buyers on a single explicit protocol,
  // matching the server-side rules. Blank values on edit keep the stored hash.
  const cxmlActive = form.protocol !== 'oci'
  const ociActive = form.protocol !== 'cxml'
  const secret = form.sharedSecret.trim()
  const ociUsername = form.ociUsername.trim()
  const ociPassword = form.ociPassword.trim()

  const requiresSecret = !buyer && form.protocol === 'cxml'
  const requiresOci = !buyer && form.protocol === 'oci'

  const detailsComplete = form.name.trim() !== '' && form.code.trim() !== ''
  const cxmlComplete =
    !cxmlActive ||
    ((secret.length === 0 || secret.length >= 16) && (secret.length > 0 || !requiresSecret))
  const ociComplete =
    !ociActive ||
    ((ociPassword.length === 0 || ociPassword.length >= 8) &&
      (!requiresOci || (ociUsername !== '' && ociPassword.length >= 8)))
  const protocolComplete = cxmlComplete && ociComplete

  const isStepComplete = (index: number) => {
    if (index === 0) return detailsComplete
    if (index === 1) return protocolComplete
    return true
  }

  const isStepAccessible = (index: number) => {
    for (let i = 0; i < index; i++) {
      if (!isStepComplete(i)) return false
    }
    return true
  }

  const canSubmit = detailsComplete && protocolComplete

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

  const currentComplete = isStepComplete(step)
  const isLastStep = step === STEPS.length - 1
  const isFirstStep = step === 0

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={buyer ? 'Edit Punchout Buyer' : 'Add Punchout Buyer'}
      showCloseButton
      closeOnBackdropClick
      fullScreen
      noPadding
    >
      <div className="mx-auto flex h-full w-full max-w-7xl">
        {/* Left: Step indicator */}
        <div className="hidden w-60 shrink-0 overflow-y-auto border-gray-100 border-r bg-gray-50 p-6 sm:block dark:border-gray-700 dark:bg-gray-800/50">
          <h3 className="mb-1 font-semibold text-gray-900 text-sm dark:text-white">
            Punchout Setup
          </h3>
          <p className="mb-6 text-gray-400 text-xs dark:text-gray-500">
            {buyer ? `Editing ${buyer.name}` : 'Configure a new procurement buyer'}
          </p>
          <div className="space-y-1">
            {STEPS.map((entry, index) => {
              const complete = isStepComplete(index) && isStepAccessible(index)
              const current = index === step
              return (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => {
                    if ((isStepComplete(index) && isStepAccessible(index)) || index < step) {
                      setStep(index)
                    }
                  }}
                  disabled={!isStepComplete(index) && index > step}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                    current
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                      : complete
                        ? 'text-green-700 dark:text-green-400'
                        : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-bold text-xs ${
                      complete
                        ? 'bg-green-500 text-white'
                        : current
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-500 dark:bg-gray-700'
                    }`}
                  >
                    {complete ? <Check className="h-3.5 w-3.5" /> : index + 1}
                  </span>
                  <span className="font-medium">{entry.label}</span>
                </button>
              )
            })}
          </div>

          <div className="mt-6 rounded-lg border border-gray-200 bg-white p-3 text-gray-500 text-xs dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
            <p className="font-medium text-gray-700 dark:text-gray-200">
              {buyer ? 'Editing an existing buyer' : 'New buyer'}
            </p>
            <p className="mt-1">
              {buyer
                ? 'Leave credential fields blank to keep the current stored values.'
                : 'Credentials are required for the protocol you choose.'}
            </p>
          </div>
        </div>

        {/* Right: Content */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile step dots */}
          <div className="flex items-center justify-center gap-2 border-gray-100 border-b px-6 py-3 sm:hidden dark:border-gray-700">
            {STEPS.map((entry, index) => (
              <div
                key={entry.key}
                className={`h-2 w-2 rounded-full ${index <= step ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
              />
            ))}
          </div>

          <div className="flex flex-1 flex-col overflow-y-auto px-6 py-6">
            <p className="mb-4 font-medium text-gray-400 text-xs uppercase tracking-wide sm:hidden">
              Step {step + 1} of {STEPS.length} &mdash; {STEPS[step]?.label}
            </p>

            {step === 0 && <BuyerDetailsStep data={form} onChange={applyChange} />}
            {step === 1 && <BuyerProtocolStep data={form} onChange={applyChange} buyer={buyer} />}
            {step === 2 && <BuyerDefaultsStep data={form} onChange={applyChange} />}
            {step === 3 && <BuyerBrandingStep data={form} onChange={applyChange} />}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 border-gray-100 border-t px-6 py-4 dark:border-gray-700">
            <Button variant="outline" onClick={isFirstStep ? onClose : () => setStep(step - 1)}>
              {isFirstStep ? 'Cancel' : 'Back'}
            </Button>

            {isLastStep ? (
              <Button
                onClick={handleSave}
                disabled={!canSubmit || saving}
                className="inline-flex items-center gap-1"
              >
                {saving ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {buyer ? 'Update Buyer' : 'Create Buyer'}
              </Button>
            ) : (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!currentComplete}
                className="inline-flex items-center gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
