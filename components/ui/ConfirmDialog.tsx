"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "danger" : "primary"}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {destructive && (
        <div className="flex items-start gap-3 rounded border border-loss-border bg-loss-bg p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-loss-text" />
          <p className="text-2xs text-loss-text">
            This action cannot be undone. Please confirm before continuing.
          </p>
        </div>
      )}
    </Modal>
  );
}
