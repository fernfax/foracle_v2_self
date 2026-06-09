"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** e.g. "Delete this policy?" */
  title: string;
  /** One-line consequence. */
  description?: React.ReactNode;
  /** Red confirm button label, e.g. "Delete policy". */
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
}

/**
 * ConfirmDialog — the ONE shared destructive confirmation for every delete
 * across the five portfolio pages. Alert-icon tile + "Delete this X?" + one-line
 * consequence + Cancel / red Delete. Matches the app's existing AlertDialog copy
 * pattern (red `#E05555` action, specific past-tense label).
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-start gap-3 text-left">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-[rgba(224,85,85,0.12)] text-[#E05555] dark:text-[#E07070]">
              <AlertTriangle className="size-[18px]" />
            </span>
            <div className="space-y-1.5">
              <AlertDialogTitle>{title}</AlertDialogTitle>
              {description ? (
                <AlertDialogDescription>{description}</AlertDialogDescription>
              ) : null}
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-[#E05555] text-white hover:bg-[#E05555]/90"
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
