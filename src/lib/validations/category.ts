import * as z from "zod"

/**
 * Category form validation schema
 */
export const categorySchema = z.object({
  name: z
    .string()
    .min(1, "Category name is required")
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional(),
  image: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
  parent_id: z
    .string()
    .uuid("Invalid parent category")
    .optional()
    .nullable(),
  display_order: z
    .number()
    .int("Display order must be a whole number")
    .min(0, "Display order cannot be negative"),
  is_active: z
    .boolean(),
})

export type CategoryFormData = z.infer<typeof categorySchema>

/**
 * Category update schema (all fields optional except what's being updated)
 */
export const categoryUpdateSchema = categorySchema.partial()

export type CategoryUpdateData = z.infer<typeof categoryUpdateSchema>

/**
 * Bulk reorder categories schema
 */
export const categoryReorderSchema = z.object({
  category_orders: z.array(
    z.object({
      id: z.string().uuid("Invalid category ID"),
      display_order: z.number().int().min(0),
    })
  ).min(1, "At least one category order is required"),
})

export type CategoryReorderData = z.infer<typeof categoryReorderSchema>

