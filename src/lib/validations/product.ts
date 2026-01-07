import { z } from "zod"

// Product status enum
export const ProductStatus = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  DISABLED: "DISABLED",
  ARCHIVED: "ARCHIVED",
} as const

export type ProductStatusEnum = (typeof ProductStatus)[keyof typeof ProductStatus]

// Product image schema
export const productImageSchema = z.object({
  url: z.string().url("Must be a valid URL"),
  alt_text: z.string().optional().nullable(),
  display_order: z.number().int().min(0).default(0),
  is_primary: z.boolean().default(false),
})

export type ProductImageFormData = z.infer<typeof productImageSchema>

// Product variant schema
export const productVariantSchema = z.object({
  sku: z.string().optional().nullable(),
  name: z.string().min(1, "Variant name is required"),
  price: z.number().positive().optional().nullable(),
  sale_price: z.number().positive().optional().nullable(),
  stock: z.number().int().min(0).default(0),
  low_stock_threshold: z.number().int().min(0).optional().nullable(),
  is_active: z.boolean().default(true),
  options: z.record(z.string(), z.string()).optional().nullable(),
  image_url: z.string().url().optional().nullable(),
})

export type ProductVariantFormData = z.infer<typeof productVariantSchema>

// Product attribute value schema
export const productAttributeValueSchema = z.object({
  attribute_id: z.string().min(1, "Attribute is required"),
  value: z.string(),
})

export type ProductAttributeValueFormData = z.infer<typeof productAttributeValueSchema>

// Main product schema (input type for form)
export const productSchema = z.object({
  name: z.string().min(1, "Product name is required").max(255),
  description: z.string().optional().nullable(),
  short_description: z.string().max(500).optional().nullable(),
  sku: z.string().max(100).optional().nullable(),
  status: z.enum(["DRAFT", "ACTIVE", "DISABLED", "ARCHIVED"]),
  
  // Pricing
  base_price: z.number().positive("Base price must be greater than 0"),
  sale_price: z.number().positive().optional().nullable(),
  cost_price: z.number().positive().optional().nullable(),
  
  // Category
  category_id: z.string().min(1, "Category is required"),
  
  // Inventory
  stock: z.number().int().min(0),
  low_stock_threshold: z.number().int().min(0).optional().nullable(),
  track_inventory: z.boolean(),
  
  // Physical properties
  weight: z.number().positive().optional().nullable(),
  length: z.number().positive().optional().nullable(),
  width: z.number().positive().optional().nullable(),
  height: z.number().positive().optional().nullable(),
  
  // SEO
  meta_title: z.string().max(70).optional().nullable(),
  meta_description: z.string().max(160).optional().nullable(),
  
  // Flags
  is_featured: z.boolean(),
  has_variants: z.boolean(),
  is_new: z.boolean(),
  new_until: z.string().optional().nullable(),
  
  // Nested data
  images: z.array(productImageSchema).optional(),
  variants: z.array(productVariantSchema).optional(),
  attribute_values: z.array(productAttributeValueSchema).optional(),
})

export type ProductFormData = z.infer<typeof productSchema>

// Product update schema (all fields optional)
export const productUpdateSchema = productSchema.partial()

export type ProductUpdateFormData = z.infer<typeof productUpdateSchema>

// Bulk operations
export const productBulkStatusSchema = z.object({
  product_ids: z.array(z.string()).min(1, "Select at least one product"),
  status: z.enum(["DRAFT", "ACTIVE", "DISABLED", "ARCHIVED"]),
})

export const productBulkDeleteSchema = z.object({
  product_ids: z.array(z.string()).min(1, "Select at least one product"),
})

// Stock update
export const productStockUpdateSchema = z.object({
  stock: z.number().int().min(0),
  reason: z.string().optional(),
})

