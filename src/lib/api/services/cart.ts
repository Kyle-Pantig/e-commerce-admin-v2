/**
 * Cart API Service
 * 
 * All cart-related API operations for authenticated customers.
 * 
 * Usage:
 *   import { cartApi } from '@/lib/api'
 *   const cart = await cartApi.get()
 */

import { apiClient } from "../client"
import type {
  Cart,
  CartItem,
  AddToCartRequest,
  CartCountResponse,
  SyncCartRequest,
  SyncCartResponse,
} from "../types"

// =============================================================================
// Response Types
// =============================================================================

interface AddToCartResponse {
  message: string
  item: CartItem
}

interface UpdateCartItemResponse {
  message: string
  item: CartItem | null
}

interface RemoveFromCartResponse {
  message: string
}

// =============================================================================
// API Service
// =============================================================================

export const cartApi = {
  /**
   * Get current user's cart with all items
   */
  get: (): Promise<Cart> => {
    return apiClient.get<Cart>("/cart")
  },

  /**
   * Add a product to user's cart
   */
  add: (request: AddToCartRequest): Promise<AddToCartResponse> => {
    return apiClient.post<AddToCartResponse>("/cart/add", request)
  },

  /**
   * Update cart item quantity
   * @param itemId - Cart item ID
   * @param quantity - New quantity (0 to remove)
   */
  updateItem: (itemId: string, quantity: number): Promise<UpdateCartItemResponse> => {
    return apiClient.patch<UpdateCartItemResponse>(`/cart/item/${itemId}`, {
      quantity,
    })
  },

  /**
   * Change cart item variant
   * @param itemId - Cart item ID
   * @param variantId - New variant ID
   */
  changeVariant: (itemId: string, variantId: string): Promise<UpdateCartItemResponse> => {
    return apiClient.patch<UpdateCartItemResponse>(`/cart/item/${itemId}/variant`, {
      variant_id: variantId,
    })
  },

  /**
   * Remove an item from cart
   * @param itemId - Cart item ID
   */
  removeItem: (itemId: string): Promise<RemoveFromCartResponse> => {
    return apiClient.delete<RemoveFromCartResponse>(`/cart/item/${itemId}`)
  },

  /**
   * Clear all items from cart
   */
  clear: (): Promise<RemoveFromCartResponse> => {
    return apiClient.delete<RemoveFromCartResponse>("/cart/clear")
  },

  /**
   * Get cart count (lightweight)
   */
  getCount: (): Promise<CartCountResponse> => {
    return apiClient.get<CartCountResponse>("/cart/count")
  },

  /**
   * Sync guest cart to user's cart (after login)
   */
  sync: (request: SyncCartRequest): Promise<SyncCartResponse> => {
    return apiClient.post<SyncCartResponse>("/cart/sync", request)
  },
}

export default cartApi
