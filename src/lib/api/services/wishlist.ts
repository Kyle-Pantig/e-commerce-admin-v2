/**
 * Wishlist API Service
 * 
 * All wishlist-related API operations for authenticated customers.
 * 
 * Usage:
 *   import { wishlistApi } from '@/lib/api'
 *   const wishlist = await wishlistApi.get()
 */

import { apiClient } from "../client"
import type {
  Wishlist,
  WishlistProductIds,
  WishlistToggleResponse,
  WishlistItem,
} from "../types"

// =============================================================================
// Response Types
// =============================================================================

interface AddToWishlistResponse {
  message: string
  item: WishlistItem
}

interface RemoveFromWishlistResponse {
  message: string
}

interface CheckInWishlistResponse {
  is_in_wishlist: boolean
}

interface WishlistCountResponse {
  count: number
}

// =============================================================================
// API Service
// =============================================================================

export const wishlistApi = {
  /**
   * Get current user's wishlist with all items
   */
  get: (): Promise<Wishlist> => {
    return apiClient.get<Wishlist>("/wishlist")
  },

  /**
   * Get list of product IDs in user's wishlist (lightweight endpoint for UI)
   */
  getProductIds: (): Promise<WishlistProductIds> => {
    return apiClient.get<WishlistProductIds>("/wishlist/product-ids")
  },

  /**
   * Add a product to user's wishlist
   * @param productId - Product ID to add
   */
  add: (productId: string): Promise<AddToWishlistResponse> => {
    return apiClient.post<AddToWishlistResponse>("/wishlist/add", {
      product_id: productId,
    })
  },

  /**
   * Remove a product from user's wishlist
   * @param productId - Product ID to remove
   */
  remove: (productId: string): Promise<RemoveFromWishlistResponse> => {
    return apiClient.delete<RemoveFromWishlistResponse>(
      `/wishlist/remove/${productId}`
    )
  },

  /**
   * Toggle a product in user's wishlist (add if not present, remove if present)
   * @param productId - Product ID to toggle
   */
  toggle: (productId: string): Promise<WishlistToggleResponse> => {
    return apiClient.post<WishlistToggleResponse>(
      `/wishlist/toggle/${productId}`
    )
  },

  /**
   * Check if a product is in user's wishlist
   * @param productId - Product ID to check
   */
  check: (productId: string): Promise<CheckInWishlistResponse> => {
    return apiClient.get<CheckInWishlistResponse>(
      `/wishlist/check/${productId}`
    )
  },

  /**
   * Clear all items from user's wishlist
   */
  clear: (): Promise<RemoveFromWishlistResponse> => {
    return apiClient.delete<RemoveFromWishlistResponse>("/wishlist/clear")
  },

  /**
   * Get the count of items in user's wishlist (ultra-lightweight)
   */
  getCount: (): Promise<WishlistCountResponse> => {
    return apiClient.get<WishlistCountResponse>("/wishlist/count")
  },
}

export default wishlistApi
