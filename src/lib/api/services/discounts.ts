import { apiClient, buildQueryString } from "../client"

// Types
export type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT"

export interface DiscountCode {
  id: string
  code: string
  description: string | null
  discount_type: DiscountType
  discount_value: number
  minimum_order_amount: number | null
  maximum_discount: number | null
  usage_limit: number | null
  usage_limit_per_user: number | null
  usage_count: number
  is_active: boolean
  start_date: string | null
  end_date: string | null
  auto_apply: boolean
  show_badge: boolean
  applicable_products: string[] | null
  applicable_variants: string[] | null
  applicable_categories: string[] | null
  created_at: string | null
  updated_at: string | null
  created_by: string | null
}

export interface DiscountCodeCreate {
  code: string
  description?: string
  discount_type: DiscountType
  discount_value: number
  minimum_order_amount?: number
  maximum_discount?: number
  usage_limit?: number
  usage_limit_per_user?: number
  is_active?: boolean
  start_date?: string
  end_date?: string
  auto_apply?: boolean
  show_badge?: boolean
  applicable_products?: string[]
  applicable_variants?: string[]
  applicable_categories?: string[]
}

export interface DiscountCodeUpdate {
  code?: string
  description?: string
  discount_type?: DiscountType
  discount_value?: number
  minimum_order_amount?: number
  maximum_discount?: number
  usage_limit?: number
  usage_limit_per_user?: number
  is_active?: boolean
  start_date?: string
  end_date?: string
  auto_apply?: boolean
  show_badge?: boolean
  applicable_products?: string[]
  applicable_variants?: string[]
  applicable_categories?: string[]
}

export interface DiscountCodeListParams {
  page?: number
  per_page?: number
  search?: string
  is_active?: boolean
}

export interface DiscountCodeListResponse {
  items: DiscountCode[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface DiscountValidationRequest {
  code: string
  order_subtotal: number
  user_id?: string
  product_ids?: string[]
  category_ids?: string[]
}

export interface DiscountValidationResponse {
  valid: boolean
  code: string | null
  discount_id: string | null
  discount_type: DiscountType | null
  discount_value: number | null
  discount_amount: number | null
  message: string
}

// API functions
export const discountsApi = {
  /**
   * List discount codes with pagination and filters
   */
  list: async (params: DiscountCodeListParams = {}): Promise<DiscountCodeListResponse> => {
    const queryString = buildQueryString(params as Record<string, unknown>)
    return apiClient.get<DiscountCodeListResponse>(`/discounts${queryString}`)
  },

  /**
   * Get a single discount code by ID
   */
  get: async (id: string): Promise<DiscountCode> => {
    return apiClient.get<DiscountCode>(`/discounts/${id}`)
  },

  /**
   * Get a discount code by its code string
   */
  getByCode: async (code: string): Promise<DiscountCode> => {
    return apiClient.get<DiscountCode>(`/discounts/code/${code}`)
  },

  /**
   * Create a new discount code
   */
  create: async (data: DiscountCodeCreate): Promise<DiscountCode> => {
    return apiClient.post<DiscountCode>("/discounts", data)
  },

  /**
   * Update an existing discount code
   */
  update: async (id: string, data: DiscountCodeUpdate): Promise<DiscountCode> => {
    return apiClient.patch<DiscountCode>(`/discounts/${id}`, data)
  },

  /**
   * Delete a discount code
   */
  delete: async (id: string): Promise<void> => {
    return apiClient.delete(`/discounts/${id}`)
  },

  /**
   * Toggle discount code active status
   */
  toggle: async (id: string): Promise<DiscountCode> => {
    return apiClient.post<DiscountCode>(`/discounts/${id}/toggle`)
  },

  /**
   * Validate a discount code for an order
   */
  validate: async (data: DiscountValidationRequest): Promise<DiscountValidationResponse> => {
    return apiClient.post<DiscountValidationResponse>("/discounts/validate", data)
  },

  /**
   * Get auto-apply discounts for a specific product/variant (public endpoint)
   */
  getProductDiscounts: async (productId: string, variantId?: string): Promise<DiscountCode[]> => {
    const query = variantId ? `?variant_id=${variantId}` : ""
    return apiClient.get<DiscountCode[]>(`/discounts/product/${productId}${query}`, { skipAuth: true })
  },

  /**
   * Get all active auto-apply discounts with badges (public endpoint - for store and admin)
   */
  getAutoApplyDiscounts: async (): Promise<DiscountCode[]> => {
    return apiClient.get<DiscountCode[]>("/discounts/auto-apply/all", { skipAuth: true })
  },
}

export default discountsApi

