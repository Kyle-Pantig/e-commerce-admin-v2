/**
 * Orders API Service
 *
 * Handles all order-related API operations.
 */

import { apiClient, buildQueryString } from "../client"
import type {
  Order,
  OrderListItem,
  OrderCreate,
  OrderUpdate,
  OrderStatusUpdate,
  OrderListParams,
  OrderStats,
  PaginatedResponse,
} from "../types"

// =============================================================================
// Types
// =============================================================================

export interface OrderListResponse extends PaginatedResponse<OrderListItem> {}

// =============================================================================
// Orders API
// =============================================================================

export const ordersApi = {
  /**
   * List orders with pagination and filters
   */
  list: (params?: OrderListParams): Promise<OrderListResponse> => {
    const queryString = buildQueryString((params || {}) as Record<string, unknown>)
    return apiClient.get<OrderListResponse>(`/orders${queryString}`)
  },

  /**
   * Get order by ID
   */
  get: (id: string): Promise<Order> => {
    return apiClient.get<Order>(`/orders/${id}`)
  },

  /**
   * Get order by order number
   */
  getByOrderNumber: (orderNumber: string): Promise<Order> => {
    return apiClient.get<Order>(`/orders/by-number/${orderNumber}`)
  },

  /**
   * Create a new order
   */
  create: (data: OrderCreate): Promise<Order> => {
    return apiClient.post<Order>("/orders", data)
  },

  /**
   * Update an order
   */
  update: (id: string, data: OrderUpdate): Promise<Order> => {
    return apiClient.patch<Order>(`/orders/${id}`, data)
  },

  /**
   * Update order status
   */
  updateStatus: (id: string, data: OrderStatusUpdate): Promise<Order> => {
    return apiClient.patch<Order>(`/orders/${id}/status`, data)
  },

  /**
   * Delete an order
   */
  delete: (id: string): Promise<void> => {
    return apiClient.delete(`/orders/${id}`)
  },

  /**
   * Get order statistics
   */
  getStats: (): Promise<OrderStats> => {
    return apiClient.get<OrderStats>("/orders/stats")
  },
}
