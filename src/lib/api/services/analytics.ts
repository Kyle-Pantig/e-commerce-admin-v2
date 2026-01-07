/**
 * Analytics API Service
 * Provides methods for fetching analytics data for the dashboard
 */

import { apiClient } from "../client"

// Types for analytics data
export interface DashboardAnalytics {
  revenue: {
    total: number
    today: number
    this_week: number
    this_month: number
    last_month: number
    growth_percent: number
  }
  orders: {
    total: number
    today: number
    this_week: number
    this_month: number
    last_month: number
    growth_percent: number
    by_status: {
      pending: number
      processing: number
      shipped: number
      delivered: number
      cancelled: number
    }
  }
  products: {
    total: number
    active: number
    low_stock: number
    out_of_stock: number
  }
  customers: {
    total: number
    new_this_month: number
    growth_percent: number
  }
  categories: {
    total: number
  }
}

export interface SalesChartData {
  date: string
  revenue: number
  orders: number
}

export interface TopProduct {
  id: string
  name: string
  slug: string
  price: number
  stock: number
  image: string | null
  total_sold: number
  total_revenue: number
}

export interface LowStockProduct {
  id: string
  name: string
  slug: string
  sku: string | null
  stock: number
  low_stock_threshold: number
  image: string | null
  status: "out_of_stock" | "low_stock"
}

export interface RecentOrder {
  id: string
  order_number: string
  customer_name: string
  customer_email: string
  total: number
  status: string
  payment_status: string
  created_at: string
}

export interface OrderStatusDistribution {
  status: string
  count: number
  label: string
}

// Analytics API methods
export const analyticsApi = {
  /**
   * Get comprehensive dashboard analytics
   */
  getDashboard: async (): Promise<DashboardAnalytics> => {
    return apiClient.get<DashboardAnalytics>("/analytics/dashboard")
  },

  /**
   * Get sales chart data
   */
  getSalesChart: async (period: "7d" | "30d" | "90d" = "30d"): Promise<SalesChartData[]> => {
    return apiClient.get<SalesChartData[]>(`/analytics/sales-chart?period=${period}`)
  },

  /**
   * Get top selling products
   */
  getTopProducts: async (limit: number = 5): Promise<TopProduct[]> => {
    return apiClient.get<TopProduct[]>(`/analytics/top-products?limit=${limit}`)
  },

  /**
   * Get low stock products
   */
  getLowStock: async (threshold: number = 10, limit: number = 10): Promise<LowStockProduct[]> => {
    return apiClient.get<LowStockProduct[]>(`/analytics/low-stock?threshold=${threshold}&limit=${limit}`)
  },

  /**
   * Get recent orders
   */
  getRecentOrders: async (limit: number = 5): Promise<RecentOrder[]> => {
    return apiClient.get<RecentOrder[]>(`/analytics/recent-orders?limit=${limit}`)
  },

  /**
   * Get order status distribution
   */
  getOrderStatusDistribution: async (): Promise<OrderStatusDistribution[]> => {
    return apiClient.get<OrderStatusDistribution[]>("/analytics/order-status-distribution")
  },
}

