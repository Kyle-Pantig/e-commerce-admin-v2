/**
 * Reusable Delete Confirmation Dialog
 * 
 * A standardized delete confirmation dialog used across all tables.
 * Uses AlertDialog which prevents accidental closing by clicking outside.
 * 
 * @example
 * <DeleteConfirmDialog
 *   open={deleteDialogOpen}
 *   onOpenChange={setDeleteDialogOpen}
 *   title="Delete Product"
 *   itemName={selectedProduct?.name}
 *   onConfirm={handleDelete}
 *   isDeleting={deleteMutation.isPending}
 *   warning={selectedProduct?.hasVariants ? "This product has variants" : undefined}
 * />
 */

"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export interface DeleteConfirmDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void
  /** Dialog title (e.g., "Delete Product") */
  title: string
  /** Name of the item being deleted (displayed in description) */
  itemName?: string | null
  /** Callback when delete is confirmed */
  onConfirm: () => void
  /** Whether delete operation is in progress */
  isDeleting?: boolean
  /** Optional warning message (e.g., "This category has subcategories") */
  warning?: string | React.ReactNode
  /** Optional description override */
  description?: string
  /** Whether delete button should be disabled (e.g., if item has dependencies) */
  disabled?: boolean
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  itemName,
  onConfirm,
  isDeleting = false,
  warning,
  description,
  disabled = false,
}: DeleteConfirmDialogProps) {
  const defaultDescription = itemName
    ? `Are you sure you want to delete "${itemName}"? This action cannot be undone.`
    : "Are you sure you want to delete this item? This action cannot be undone."

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description || defaultDescription}
            {warning && (
              <span className="block mt-2 text-destructive">
                {typeof warning === "string" ? warning : warning}
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              onConfirm()
            }}
            disabled={isDeleting || disabled}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
