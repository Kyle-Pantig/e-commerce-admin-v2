/**
 * Attribute Dialog Component
 * 
 * Reusable dialog for creating and editing attributes.
 */

"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AttributeForm } from "./attribute-form"
import type { Attribute, AttributeCreate, AttributeUpdate, Category } from "@/lib/api/types"

export interface AttributeDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void
  /** Attribute to edit (undefined for create mode) */
  attribute?: Attribute | null
  /** All categories (for assignment) */
  categories: Category[]
  /** Callback when form is submitted */
  onSubmit: (data: AttributeCreate | AttributeUpdate) => void
  /** Callback when dialog is cancelled */
  onCancel?: () => void
  /** Whether the form is loading */
  isLoading?: boolean
  /** Whether categories are loading */
  isCategoriesLoading?: boolean
}

export function AttributeDialog({
  open,
  onOpenChange,
  attribute,
  categories,
  onSubmit,
  onCancel,
  isLoading = false,
  isCategoriesLoading = false,
}: AttributeDialogProps) {
  const isEditMode = !!attribute

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    } else {
      onOpenChange(false)
    }
  }

  const handleSubmit = (data: AttributeCreate | AttributeUpdate) => {
    onSubmit(data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl!">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Attribute" : "Create Attribute"}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update attribute information."
              : "Create a new attribute. Attributes can be assigned to categories and used in product forms."}
          </DialogDescription>
        </DialogHeader>
        <AttributeForm
          categories={categories}
          attribute={attribute || undefined}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
          isCategoriesLoading={isCategoriesLoading}
        />
      </DialogContent>
    </Dialog>
  )
}

