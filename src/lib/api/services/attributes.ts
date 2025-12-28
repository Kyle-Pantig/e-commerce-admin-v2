/**
 * Attributes API Service
 * 
 * All attribute-related API operations.
 * 
 * Usage:
 *   import { attributesApi } from '@/lib/api'
 *   const attributes = await attributesApi.list()
 */

import { apiClient, buildQueryString } from "../client"
import type {
  Attribute,
  AttributeCreate,
  AttributeUpdate,
  AttributeReorderItem,
  BulkOperationResponse,
} from "../types"

// =============================================================================
// Query Parameters
// =============================================================================

export interface AttributeListParams {
  include_inactive?: boolean
}

export interface AttributeByCategoryParams {
  include_inactive?: boolean
  include_inherited?: boolean
}

// =============================================================================
// API Service
// =============================================================================

export const attributesApi = {
  /**
   * List all attributes
   * @param params - Filter parameters
   */
  list: (params: AttributeListParams = {}): Promise<Attribute[]> => {
    const query = buildQueryString(params as Record<string, unknown>)
    return apiClient.get<Attribute[]>(`/attributes${query}`)
  },

  /**
   * Get a single attribute by ID
   * @param id - Attribute ID
   */
  get: (id: string): Promise<Attribute> => {
    return apiClient.get<Attribute>(`/attributes/${id}`)
  },

  /**
   * Create a new attribute
   * @param data - Attribute data
   */
  create: (data: AttributeCreate): Promise<Attribute> => {
    return apiClient.post<Attribute>("/attributes", data)
  },

  /**
   * Update an existing attribute
   * @param id - Attribute ID
   * @param data - Update data
   */
  update: (id: string, data: AttributeUpdate): Promise<Attribute> => {
    return apiClient.patch<Attribute>(`/attributes/${id}`, data)
  },

  /**
   * Delete an attribute
   * @param id - Attribute ID
   */
  delete: (id: string): Promise<void> => {
    return apiClient.delete<void>(`/attributes/${id}`)
  },

  /**
   * Get all filterable attributes (for storefront filters)
   */
  getFilterable: (): Promise<Attribute[]> => {
    return apiClient.get<Attribute[]>("/attributes/filterable/all")
  },

  /**
   * Get attributes by category (with optional inheritance)
   * @param categoryId - Category ID
   * @param params - Include inactive/inherited options
   */
  getByCategory: (
    categoryId: string,
    params: AttributeByCategoryParams = {}
  ): Promise<Attribute[]> => {
    const query = buildQueryString(params as Record<string, unknown>)
    return apiClient.get<Attribute[]>(`/attributes/category/${categoryId}${query}`)
  },

  /**
   * Toggle attribute active status
   * @param id - Attribute ID
   */
  toggleStatus: (id: string): Promise<Attribute> => {
    return apiClient.patch<Attribute>(`/attributes/${id}/toggle-status`)
  },

  /**
   * Duplicate an attribute
   * @param id - Attribute ID to duplicate
   */
  duplicate: (id: string): Promise<Attribute> => {
    return apiClient.post<Attribute>(`/attributes/${id}/duplicate`)
  },

  /**
   * Bulk reorder attributes
   * @param orders - Array of id and display_order pairs
   */
  bulkReorder: (orders: AttributeReorderItem[]): Promise<BulkOperationResponse> => {
    return apiClient.post<BulkOperationResponse>("/attributes/bulk/reorder", {
      attribute_orders: orders,
    })
  },

  /**
   * Bulk delete attributes
   * @param ids - Array of attribute IDs to delete
   */
  bulkDelete: (ids: string[]): Promise<BulkOperationResponse> => {
    return apiClient.post<BulkOperationResponse>("/attributes/bulk/delete", {
      attribute_ids: ids,
    })
  },

  /**
   * Assign attribute to categories
   * @param id - Attribute ID
   * @param categoryIds - Array of category IDs
   */
  assignToCategories: (id: string, categoryIds: string[]): Promise<Attribute> => {
    return apiClient.post<Attribute>(`/attributes/${id}/assign-categories`, {
      category_ids: categoryIds,
    })
  },

  /**
   * Remove attribute from categories
   * @param id - Attribute ID
   * @param categoryIds - Array of category IDs
   */
  removeFromCategories: (id: string, categoryIds: string[]): Promise<Attribute> => {
    return apiClient.post<Attribute>(`/attributes/${id}/remove-categories`, {
      category_ids: categoryIds,
    })
  },
}

export default attributesApi

