/**
 * Category Dialog Component
 * 
 * Reusable dialog for creating and editing categories.
 */

"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CategoryForm } from "./category-form"
import type { Category, CategoryCreate, CategoryUpdate } from "@/lib/api/types"

export interface CategoryDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void
  /** Category to edit (undefined for create mode) */
  category?: Category | null
  /** All categories (for parent selection) */
  categories: Category[]
  /** Callback when form is submitted */
  onSubmit: (data: CategoryCreate | CategoryUpdate) => void
  /** Callback when dialog is cancelled */
  onCancel?: () => void
  /** Whether the form is loading */
  isLoading?: boolean
}

export function CategoryDialog({
  open,
  onOpenChange,
  category,
  categories,
  onSubmit,
  onCancel,
  isLoading = false,
}: CategoryDialogProps) {
  const isEditMode = !!category
  const availableCategories = isEditMode
    ? categories.filter((c) => c.id !== category.id)
    : categories

  const handleSubmit = (data: CategoryCreate | CategoryUpdate) => {
    onSubmit({
      ...data,
      parent_id: data.parent_id || undefined,
    })
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    } else {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl!">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Category" : "Create Category"}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update category information."
              : "Create a new category. Categories can have subcategories."}
          </DialogDescription>
        </DialogHeader>
        {(!isEditMode || category) && (
          <CategoryForm
            categories={availableCategories}
            category={category || undefined}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isLoading}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

