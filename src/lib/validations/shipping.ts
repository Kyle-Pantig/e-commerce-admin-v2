import { z } from "zod"

export const shippingRuleFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  description: z.string().max(500).optional().nullable(),
  shipping_fee: z.number().min(0, "Shipping fee must be 0 or greater"),
  free_shipping_threshold: z.number().min(0, "Threshold must be 0 or greater").optional().nullable(),
  is_active: z.boolean(),
  applicable_products: z.array(z.string()).optional(),
  priority: z.number().int().min(0),
})

export type ShippingRuleFormData = z.infer<typeof shippingRuleFormSchema>
