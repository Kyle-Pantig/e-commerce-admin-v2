import * as z from "zod"

/**
 * Attribute types enum
 */
export const AttributeType = z.enum(["TEXT", "NUMBER", "SELECT", "BOOLEAN"])
export type AttributeTypeEnum = z.infer<typeof AttributeType>

/**
 * Base attribute schema with common fields
 */
const baseAttributeSchema = z.object({
  name: z
    .string()
    .min(1, "Attribute name is required")
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  type: AttributeType,
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional(),
  is_required: z.boolean(),
  is_filterable: z.boolean(),
  display_order: z
    .number()
    .int("Display order must be a whole number")
    .min(0, "Display order cannot be negative"),
  is_active: z.boolean(),
  category_ids: z
    .array(z.string())
    .optional()
    .nullable(),
})

/**
 * TEXT type specific fields
 */
const textFieldsSchema = z.object({
  min_length: z
    .number()
    .int("Min length must be a whole number")
    .min(0, "Min length cannot be negative")
    .optional()
    .nullable(),
  max_length: z
    .number()
    .int("Max length must be a whole number")
    .min(1, "Max length must be at least 1")
    .optional()
    .nullable(),
  placeholder: z
    .string()
    .max(200, "Placeholder must be less than 200 characters")
    .optional()
    .nullable(),
  default_value: z
    .string()
    .max(500, "Default value must be less than 500 characters")
    .optional()
    .nullable(),
})

/**
 * NUMBER type specific fields
 */
const numberFieldsSchema = z.object({
  min_value: z
    .number()
    .optional()
    .nullable(),
  max_value: z
    .number()
    .optional()
    .nullable(),
  step: z
    .number()
    .positive("Step must be a positive number")
    .optional()
    .nullable(),
  unit: z
    .string()
    .max(50, "Unit must be less than 50 characters")
    .optional()
    .nullable(),
})

/**
 * BOOLEAN type specific fields
 */
const booleanFieldsSchema = z.object({
  true_label: z
    .string()
    .max(50, "True label must be less than 50 characters")
    .optional()
    .nullable(),
  false_label: z
    .string()
    .max(50, "False label must be less than 50 characters")
    .optional()
    .nullable(),
})

/**
 * SELECT type specific fields
 */
const selectFieldsSchema = z.object({
  options: z
    .array(z.string().min(1, "Option cannot be empty"))
    .optional()
    .nullable(),
})

/**
 * Complete attribute form validation schema
 * Combines all type-specific fields (without refinements to avoid validation loops)
 */
export const attributeSchema = baseAttributeSchema
  .merge(textFieldsSchema)
  .merge(numberFieldsSchema)
  .merge(booleanFieldsSchema)
  .merge(selectFieldsSchema)

export type AttributeFormData = z.infer<typeof attributeSchema>

/**
 * Attribute update schema (all fields optional)
 */
export const attributeUpdateSchema = baseAttributeSchema
  .merge(textFieldsSchema)
  .merge(numberFieldsSchema)
  .merge(booleanFieldsSchema)
  .merge(selectFieldsSchema)
  .partial()

export type AttributeUpdateData = z.infer<typeof attributeUpdateSchema>

/**
 * Bulk reorder attributes schema
 */
export const attributeReorderSchema = z.object({
  attribute_orders: z.array(
    z.object({
      id: z.string().uuid("Invalid attribute ID"),
      display_order: z.number().int().min(0),
    })
  ).min(1, "At least one attribute order is required"),
})

export type AttributeReorderData = z.infer<typeof attributeReorderSchema>

/**
 * Bulk delete attributes schema
 */
export const attributeBulkDeleteSchema = z.object({
  attribute_ids: z
    .array(z.string().uuid("Invalid attribute ID"))
    .min(1, "At least one attribute ID is required"),
})

export type AttributeBulkDeleteData = z.infer<typeof attributeBulkDeleteSchema>

/**
 * Category assignment schema
 */
export const attributeCategoryAssignmentSchema = z.object({
  category_ids: z
    .array(z.string().uuid("Invalid category ID"))
    .min(1, "At least one category ID is required"),
})

export type AttributeCategoryAssignmentData = z.infer<typeof attributeCategoryAssignmentSchema>

