import { z } from "zod"

export const discountFormSchema = z.object({
  code: z.string().min(3, "Code must be at least 3 characters").max(50),
  description: z.string().optional(),
  discount_type: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
  discount_value: z.coerce.number().positive("Discount value must be positive"),
  minimum_order_amount: z.coerce.number().min(0).optional().nullable(),
  maximum_discount: z.coerce.number().positive().optional().nullable(),
  usage_limit: z.coerce.number().int().positive().optional().nullable(),
  usage_limit_per_user: z.coerce.number().int().positive().optional().nullable(),
  is_active: z.boolean().default(true),
  auto_apply: z.boolean().default(false),
  show_badge: z.boolean().default(true),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  applicable_products: z.array(z.string()).optional().nullable(),
  applicable_variants: z.array(z.string()).optional().nullable(),
}).refine((data) => {
  if (data.discount_type === "PERCENTAGE" && data.discount_value > 100) {
    return false
  }
  return true
}, {
  message: "Percentage discount cannot exceed 100%",
  path: ["discount_value"],
})

export type DiscountFormData = z.infer<typeof discountFormSchema>

