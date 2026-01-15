import { z } from "zod"

export const orderItemSchema = z.object({
  product_id: z.string().optional().nullable(),
  product_name: z.string().min(1, "Product name is required"),
  product_sku: z.string().optional().nullable(),
  product_image: z.string().optional().nullable(),
  variant_id: z.string().optional().nullable(),
  variant_name: z.string().optional().nullable(),
  variant_options: z.record(z.string(), z.string()).optional().nullable(),
  unit_price: z.number().min(0, "Price must be positive"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
})

export const orderFormSchema = z.object({
  customer_name: z.string().min(1, "Customer name is required"),
  customer_email: z.string().email("Invalid email address"),
  customer_phone: z.string().optional(),
  
  shipping_address: z.string().min(1, "Shipping address is required"),
  shipping_city: z.string().min(1, "City is required"),
  shipping_state: z.string().optional(),
  shipping_zip: z.string().optional(),
  shipping_country: z.string().min(1, "Country is required"),
  
  same_as_shipping: z.boolean().default(true),
  billing_address: z.string().optional(),
  billing_city: z.string().optional(),
  billing_state: z.string().optional(),
  billing_zip: z.string().optional(),
  billing_country: z.string().optional(),
  
  payment_method: z.enum(["CASH_ON_DELIVERY", "STRIPE"]).optional(),
  
  shipping_cost: z.number().min(0).default(0),
  tax_amount: z.number().min(0).default(0),
  discount_amount: z.number().min(0).default(0),
  
  notes: z.string().optional(),
  internal_notes: z.string().optional(),
  
  items: z.array(orderItemSchema).min(1, "At least one item is required"),
})

export type OrderItemFormValues = z.infer<typeof orderItemSchema>
export type OrderFormValues = z.infer<typeof orderFormSchema>

