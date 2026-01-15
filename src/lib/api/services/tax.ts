import { apiClient, buildQueryString } from "../client"

// Types
export interface TaxRule {
  id: string
  name: string
  description: string | null
  tax_rate: number
  tax_type: "PERCENTAGE" | "FIXED"
  is_inclusive: boolean
  is_active: boolean
  applicable_products: string[] | null
  applicable_categories: string[] | null
  priority: number
  created_at: string | null
  updated_at: string | null
}

export interface TaxRuleCreate {
  name: string
  description?: string
  tax_rate: number
  tax_type?: "PERCENTAGE" | "FIXED"
  is_inclusive?: boolean
  is_active?: boolean
  applicable_products?: string[]
  applicable_categories?: string[]
  priority?: number
}

export interface TaxRuleUpdate {
  name?: string
  description?: string | null
  tax_rate?: number
  tax_type?: "PERCENTAGE" | "FIXED"
  is_inclusive?: boolean
  is_active?: boolean
  applicable_products?: string[] | null
  applicable_categories?: string[] | null
  priority?: number
}

export interface TaxRuleListParams {
  page?: number
  per_page?: number
  search?: string
  is_active?: boolean
}

export interface TaxRuleListResponse {
  items: TaxRule[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface TaxCalculationRequest {
  order_subtotal: number
  product_ids?: string[]
}

export interface TaxCalculationResponse {
  tax_amount: number
  tax_rate: number
  tax_type: string
  is_inclusive: boolean
  rule_name: string | null
  message: string
}

// API functions
export const taxApi = {
  /**
   * List tax rules with pagination and filters
   */
  list: async (params: TaxRuleListParams = {}): Promise<TaxRuleListResponse> => {
    const queryString = buildQueryString(params as Record<string, unknown>)
    return apiClient.get<TaxRuleListResponse>(`/tax${queryString}`)
  },

  /**
   * Get a single tax rule by ID
   */
  get: async (id: string): Promise<TaxRule> => {
    return apiClient.get<TaxRule>(`/tax/${id}`)
  },

  /**
   * Create a new tax rule
   */
  create: async (data: TaxRuleCreate): Promise<TaxRule> => {
    return apiClient.post<TaxRule>("/tax", data)
  },

  /**
   * Update an existing tax rule
   */
  update: async (id: string, data: TaxRuleUpdate): Promise<TaxRule> => {
    return apiClient.patch<TaxRule>(`/tax/${id}`, data)
  },

  /**
   * Delete a tax rule
   */
  delete: async (id: string): Promise<void> => {
    return apiClient.delete(`/tax/${id}`)
  },

  /**
   * Toggle tax rule active status
   */
  toggle: async (id: string): Promise<TaxRule> => {
    return apiClient.post<TaxRule>(`/tax/${id}/toggle`)
  },

  /**
   * Calculate tax for an order
   */
  calculate: async (data: TaxCalculationRequest): Promise<TaxCalculationResponse> => {
    return apiClient.post<TaxCalculationResponse>("/tax/calculate", data)
  },

  /**
   * Get public tax info (no auth required)
   */
  getPublicInfo: async (): Promise<TaxCalculationResponse> => {
    return apiClient.get<TaxCalculationResponse>("/tax/public/info")
  },
}

export default taxApi
