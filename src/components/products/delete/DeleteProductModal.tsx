import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DELETE_CONFIRMATION = "DELETE";

interface Props {
  isOpen: boolean;
  productName: string;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function DeleteProductModal({ isOpen, productName, onClose, onConfirm, isLoading = false }: Props) {
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    if (isOpen) setConfirmText("");
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Product"
      maxWidth="md"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={confirmText.trim() !== DELETE_CONFIRMATION || isLoading}
            onClick={onConfirm}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Delete Product"
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          You are about to delete <strong className="text-gray-900 dark:text-white">{productName}</strong>.
          This can be restored by an administrator.
        </p>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Type <span className="font-mono font-semibold">DELETE</span> to confirm
          </Label>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            autoFocus
            className="h-11 font-mono"
          />
        </div>
      </div>
    </Modal>
  );
}
