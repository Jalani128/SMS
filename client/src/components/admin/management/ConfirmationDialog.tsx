import React, { useState } from 'react';
import { Dialog } from '../../ui/Dialog';
import { Button } from '../../ui/Button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<void> | void;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: 'default' | 'destructive' | 'outline' | 'secondary';
  requireReason?: boolean;
  reasonPlaceholder?: string;
  isDestructive?: boolean;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm Action',
  confirmVariant = 'destructive',
  requireReason = false,
  reasonPlaceholder = 'Please provide an administrative reason or notes for this action...',
  isDestructive = true,
}) => {
  const [reason, setReason] = useState('');
  const [confirmedCheck, setConfirmedCheck] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      await onConfirm(reason);
      setReason('');
      setConfirmedCheck(false);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => {
        if (!isSubmitting) {
          setReason('');
          setConfirmedCheck(false);
          onClose();
        }
      }}
      title={title}
      description="Administrative status change verification"
      className="max-w-md"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            onClick={handleConfirm}
            disabled={isSubmitting || (isDestructive && !confirmedCheck) || (requireReason && !reason.trim())}
          >
            {isSubmitting ? 'Processing...' : confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 py-2">
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div className="text-sm">
            <p className="font-medium text-foreground">{title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{message}</p>
          </div>
        </div>

        {requireReason && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Administrative Reason <span className="text-destructive">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={reasonPlaceholder}
              rows={3}
              className="w-full rounded-md border border-input bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        )}

        {isDestructive && (
          <label className="flex items-start gap-2.5 cursor-pointer rounded-lg border p-2.5 hover:bg-muted/30 transition-colors">
            <input
              type="checkbox"
              checked={confirmedCheck}
              onChange={(e) => setConfirmedCheck(e.target.checked)}
              className="mt-0.5 rounded border-muted-foreground text-primary focus:ring-primary"
            />
            <span className="text-xs text-muted-foreground select-none">
              I understand this will change active user access while preserving all historical academic, financial, and attendance records.
            </span>
          </label>
        )}
      </div>
    </Dialog>
  );
};
