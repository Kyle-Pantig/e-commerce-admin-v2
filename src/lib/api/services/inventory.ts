import { apiClient } from "../client"

// Types
export type StockAdjustmentType = 
  | "INCREASE"
  | "DECREASE"
  | "SALE"
  | "RETURN"
  | "RESTOCK"
  | "CORRECTION"
  | "DAMAGE"
  | "EXPIRED"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "INITIAL"

export interface StockAdjustment {
  id: string
  product_id: string | null
  variant_id: string | null
  type: StockAdjustmentType
  quantity: number
  previous_stock: number
  new_stock: number
  order_id: string | null
  reason: string | null
  notes: string | null
  adjusted_by: string | null
  created_at: string
  product_name: string | null
  variant_name: string | null
}

export interface StockAdjustmentCreate {
  product_id?: string | null
  variant_id?: string | null
  type: StockAdjustmentType
  quantity: number
  reason?: string | null
  notes?: string | null
}

export interface BulkStockAdjustmentItem {
  product_id?: string | null
  variant_id?: string | null
  quantity: number
}

export interface BulkStockAdjustmentCreate {
  type: StockAdjustmentType
  items: BulkStockAdjustmentItem[]
  reason?: string | null
  notes?: string | null
}

export interface StockHistoryResponse {
  items: StockAdjustment[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface BulkStockAdjustmentResponse {
  success_count: number
  failed_count: number
  adjustments: StockAdjustment[]
  errors: Array<{ item: BulkStockAdjustmentItem; error: string }>
}

export interface StockSummary {
  total_products: number
  total_variants: number
  total_stock_value: number
  low_stock_count: number
  out_of_stock_count: number
  overstocked_count: number
}

export interface ProductStockReport {
  id: string
  name: string
  slug: string
  sku: string | null
  stock: number
  low_stock_threshold: number | null
  has_variants: boolean
  status: "in_stock" | "low_stock" | "out_of_stock"
  image: string | null
  variants: Array<{
    id: string
    name: string
    sku: string | null
    stock: number
    low_stock_threshold: number
    status: string
  }> | null
  base_price: number
  stock_value: number
  last_adjustment: string | null
  adjustments_this_month: number
}

export interface StockMovementReport {
  period_start: string
  period_end: string
  total_in: number
  total_out: number
  net_change: number
  by_type: Record<string, number>
  top_products_in: Array<{ id: string; name: string; in: number; out: number }>
  top_products_out: Array<{ id: string; name: string; in: number; out: number }>
}

export interface LowStockAlert {
  id: string
  type: "product" | "variant"
  product_id: string
  variant_id: string | null
  name: string
  slug: string
  sku: string | null
  current_stock: number
  threshold: number
  status: "low_stock" | "out_of_stock"
  image: string | null
  days_until_stockout: number | null
}

export interface LowStockAlertsResponse {
  alerts: LowStockAlert[]
  total_low_stock: number
  total_out_of_stock: number
  critical_count: number
}

export interface QuickUpdateResponse {
  success: boolean
  previous_stock: number
  new_stock: number
  change: number
}

// Helper to build query string
function buildQueryString(params?: Record<string, unknown>): string {
  if (!params) return ""
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value))
    }
  })
  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ""
}

// API Service
export const inventoryApi = {
  // Stock Adjustments
  createAdjustment: async (data: StockAdjustmentCreate): Promise<StockAdjustment> => {
    return apiClient.post("/inventory/adjust", data)
  },

  bulkAdjust: async (data: BulkStockAdjustmentCreate): Promise<BulkStockAdjustmentResponse> => {
    return apiClient.post("/inventory/bulk-adjust", data)
  },

  // Stock History
  getHistory: async (params?: {
    product_id?: string
    variant_id?: string
    type?: StockAdjustmentType
    start_date?: string
    end_date?: string
    page?: number
    per_page?: number
  }): Promise<StockHistoryResponse> => {
    return apiClient.get(`/inventory/history${buildQueryString(params)}`)
  },

  getProductHistory: async (
    productId: string,
    params?: {
      include_variants?: boolean
      page?: number
      per_page?: number
    }
  ): Promise<StockHistoryResponse> => {
    return apiClient.get(`/inventory/history/${productId}${buildQueryString(params)}`)
  },

  // Stock Summary & Reports
  getSummary: async (): Promise<StockSummary> => {
    return apiClient.get("/inventory/summary")
  },

  getProductReports: async (params?: {
    status_filter?: "in_stock" | "low_stock" | "out_of_stock"
    sort_by?: "stock" | "name" | "value"
    sort_order?: "asc" | "desc"
    limit?: number
  }): Promise<ProductStockReport[]> => {
    return apiClient.get(`/inventory/reports/products${buildQueryString(params)}`)
  },

  getMovementReport: async (days?: number): Promise<StockMovementReport> => {
    return apiClient.get(`/inventory/reports/movements${buildQueryString({ days })}`)
  },

  // Low Stock Alerts
  getLowStockAlerts: async (params?: {
    threshold?: number
    include_out_of_stock?: boolean
  }): Promise<LowStockAlertsResponse> => {
    return apiClient.get(`/inventory/alerts/low-stock${buildQueryString(params)}`)
  },

  // Quick Update
  quickUpdate: async (
    productId: string,
    newStock: number,
    variantId?: string,
    reason?: string
  ): Promise<QuickUpdateResponse> => {
    const params: Record<string, string | number> = { new_stock: newStock }
    if (variantId) params.variant_id = variantId
    if (reason) params.reason = reason
    
    return apiClient.patch(`/inventory/quick-update/${productId}${buildQueryString(params)}`)
  },
}

