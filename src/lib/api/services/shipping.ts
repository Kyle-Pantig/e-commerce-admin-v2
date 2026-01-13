import { apiClient, buildQueryString } from "../client"

// Types
export interface ShippingRule {
  id: string
  name: string
  description: string | null
  shipping_fee: number
  free_shipping_threshold: number | null
  is_active: boolean
  applicable_products: string[] | null
  priority: number
  created_at: string | null
  updated_at: string | null
}

export interface ShippingRuleCreate {
  name: string
  description?: string
  shipping_fee: number
  free_shipping_threshold?: number | null
  is_active?: boolean
  applicable_products?: string[]
  priority?: number
}

export interface ShippingRuleUpdate {
  name?: string
  description?: string
  shipping_fee?: number
  free_shipping_threshold?: number | null
  is_active?: boolean
  applicable_products?: string[] | null
  priority?: number
}

export interface ShippingRuleListParams {
  page?: number
  per_page?: number
  search?: string
  is_active?: boolean
}

export interface ShippingRuleListResponse {
  items: ShippingRule[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface ShippingCalculationRequest {
  order_subtotal: number
  product_ids?: string[]
}

export interface ShippingCalculationResponse {
  shipping_fee: number
  is_free_shipping: boolean
  free_shipping_threshold: number | null
  rule_name: string | null
  message: string
}

// API functions
export const shippingApi = {
  /**
   * List shipping rules with pagination and filters
   */
  list: async (params: ShippingRuleListParams = {}): Promise<ShippingRuleListResponse> => {
    const queryString = buildQueryString(params)
    return apiClient.get<ShippingRuleListResponse>(`/shipping${queryString}`)
  },

  /**
   * Get a single shipping rule by ID
   */
  get: async (id: string): Promise<ShippingRule> => {
    return apiClient.get<ShippingRule>(`/shipping/${id}`)
  },

  /**
   * Create a new shipping rule
   */
  create: async (data: ShippingRuleCreate): Promise<ShippingRule> => {
    return apiClient.post<ShippingRule>("/shipping", data)
  },

  /**
   * Update an existing shipping rule
   */
  update: async (id: string, data: ShippingRuleUpdate): Promise<ShippingRule> => {
    return apiClient.patch<ShippingRule>(`/shipping/${id}`, data)
  },

  /**
   * Delete a shipping rule
   */
  delete: async (id: string): Promise<void> => {
    return apiClient.delete(`/shipping/${id}`)
  },

  /**
   * Toggle shipping rule active status
   */
  toggle: async (id: string): Promise<ShippingRule> => {
    return apiClient.post<ShippingRule>(`/shipping/${id}/toggle`)
  },

  /**
   * Calculate shipping for an order
   */
  calculate: async (data: ShippingCalculationRequest): Promise<ShippingCalculationResponse> => {
    return apiClient.post<ShippingCalculationResponse>("/shipping/calculate", data)
  },

  /**
   * Get public shipping info (no auth required)
   */
  getPublicInfo: async (): Promise<ShippingCalculationResponse> => {
    return apiClient.get<ShippingCalculationResponse>("/shipping/public/info")
  },
}

export default shippingApi
