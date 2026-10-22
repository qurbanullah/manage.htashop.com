import { KeyRound, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { type PunchoutBuyer, punchoutBuyersApi } from '@/api/punchoutBuyers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/Toaster'
import { isApiError } from '@/lib/api-response'

interface Props {
  buyer: PunchoutBuyer | null
  onClose: () => void
  onRotated: () => void
}

export function RotatePunchoutSecretModal({ buyer, onClose, onRotated }: Props) {
  const { success: showSuccess, error: showError } = useToast()
  const [sharedSecret, setSharedSecret] = useState('')
  const [keepPrevious, setKeepPrevious] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (buyer) {
      setSharedSecret('')
      setKeepPrevious(true)
    }
  }, [buyer])

  const canSubmit = sharedSecret.trim().length >= 16

  const handleRotate = async () => {
    if (!buyer || !canSubmit) return
    setSaving(true)
    try {
      await punchoutBuyersApi.rotateSecret(buyer.uuid, sharedSecret.trim(), keepPrevious)
      showSuccess('Shared secret rotated')
      onRotated()
      onClose()
    } catch (error) {
      showError(isApiError(error) ? error.message : 'Failed to rotate the shared secret')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={Boolean(buyer)}
      onClose={onClose}
      title="Rotate shared secret"
      description={buyer ? `Rotate the cXML secret for ${buyer.name}.` : undefined}
      maxWidth="lg"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-900/40 dark:bg-blue-950/30">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
          <p className="text-blue-900 dark:text-blue-100">
            The buyer can keep using the previous secret until you rotate again with the overlap
            option off. Rotate, switch the buyer, then close the window.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="font-medium text-gray-700 text-xs dark:text-gray-300">
            New shared secret
          </Label>
          <Input
            type="password"
            value={sharedSecret}
            onChange={(event) => setSharedSecret(event.target.value)}
            placeholder="At least 16 characters"
            className="h-10"
            autoComplete="new-password"
          />
        </div>

        <label className="flex items-center gap-2 text-gray-700 text-sm dark:text-gray-300">
          <input
            type="checkbox"
            checked={keepPrevious}
            onChange={(event) => setKeepPrevious(event.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Keep the previous secret valid during the rollout
        </label>

        {buyer?.has_previous_shared_secret ? (
          <p className="text-amber-700 text-xs dark:text-amber-300">
            An overlap secret is already active. Rotating again replaces it.
          </p>
        ) : null}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleRotate} disabled={!canSubmit || saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Rotate secret
        </Button>
      </div>
    </Modal>
  )
}
