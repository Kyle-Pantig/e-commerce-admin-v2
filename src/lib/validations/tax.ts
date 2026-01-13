import { z } from "zod"

export const taxRuleFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  description: z.string().max(500).optional().nullable(),
  tax_rate: z.number().min(0, "Tax rate must be 0 or greater"),
  tax_type: z.enum(["PERCENTAGE", "FIXED"]).default("PERCENTAGE"),
  is_inclusive: z.boolean().default(false),
  is_active: z.boolean(),
  applicable_products: z.array(z.string()).optional(),
  applicable_categories: z.array(z.string()).optional(),
  priority: z.number().int().min(0),
})

export type TaxRuleFormData = z.infer<typeof taxRuleFormSchema>
