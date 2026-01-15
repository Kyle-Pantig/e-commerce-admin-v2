/**
 * Products API Service
 * 
 * All product-related API operations.
 * 
 * Usage:
 *   import { productsApi } from '@/lib/api'
 *   const { items, total } = await productsApi.list({ page: 1 })
 */

import { apiClient, buildQueryString } from "../client"
import type {
  Product,
  ProductListItem,
  ProductCreate,
  ProductUpdate,
  ProductListParams,
  ProductImage,
  ProductImageCreate,
  ProductVariant,
  ProductVariantCreate,
  ProductStatus,
  PaginatedResponse,
  BulkOperationResponse,
  Attribute,
} from "../types"

// =============================================================================
// Response Types
// =============================================================================

export type ProductListResponse = PaginatedResponse<ProductListItem>

// =============================================================================
// API Service
// =============================================================================

// Public product list params (for store)
export interface PublicProductListParams {
  page?: number
  per_page?: number
  category_slug?: string
  is_featured?: boolean
  is_new?: boolean
  search?: string
  sort_by?: "created_at" | "name" | "base_price" | "price" | "newest"
  sort_order?: "asc" | "desc"
}

export const productsApi = {
  /**
   * List products with pagination and filters
   * @param params - Query parameters
   */
  list: (params: ProductListParams = {}): Promise<ProductListResponse> => {
    const query = buildQueryString({
      page: params.page ?? 1,
      per_page: params.per_page ?? 20,
      include_inactive: params.include_inactive ?? true,
      ...params,
    } as Record<string, unknown>)
    return apiClient.get<ProductListResponse>(`/products${query}`)
  },

  /**
   * List active products (public, no auth required)
   * Supports filtering by category slug (includes child categories)
   * @param params - Query parameters
   */
  listPublic: (params: PublicProductListParams = {}): Promise<ProductListResponse> => {
    const query = buildQueryString({
      page: params.page ?? 1,
      per_page: params.per_page ?? 20,
      ...params,
    } as Record<string, unknown>)
    return apiClient.get<ProductListResponse>(`/products/public${query}`, { skipAuth: true })
  },

  /**
   * Get a single product by slug (public, no auth required)
   * @param slug - Product slug
   */
  getPublicBySlug: (slug: string): Promise<Product> => {
    return apiClient.get<Product>(`/products/public/${slug}`, { skipAuth: true })
  },

  /**
   * Get a single product by ID
   * @param id - Product ID
   */
  get: (id: string): Promise<Product> => {
    return apiClient.get<Product>(`/products/${id}`)
  },

  /**
   * Get a single product by slug
   * @param slug - Product slug
   */
  getBySlug: (slug: string): Promise<Product> => {
    return apiClient.get<Product>(`/products/slug/${slug}`)
  },

  /**
   * Create a new product
   * @param data - Product data
   */
  create: (data: ProductCreate): Promise<Product> => {
    return apiClient.post<Product>("/products", data)
  },

  /**
   * Update an existing product
   * @param id - Product ID
   * @param data - Update data
   */
  update: (id: string, data: ProductUpdate): Promise<Product> => {
    return apiClient.patch<Product>(`/products/${id}`, data)
  },

  /**
   * Delete a product
   * @param id - Product ID
   */
  delete: (id: string): Promise<void> => {
    return apiClient.delete<void>(`/products/${id}`)
  },

  /**
   * Update product stock
   * @param id - Product ID
   * @param stock - New stock value
   */
  updateStock: (id: string, stock: number): Promise<Product> => {
    return apiClient.patch<Product>(`/products/${id}/stock`, { stock })
  },

  /**
   * Bulk update product status
   * @param productIds - Array of product IDs
   * @param status - New status
   */
  bulkUpdateStatus: (
    productIds: string[],
    status: ProductStatus
  ): Promise<BulkOperationResponse> => {
    return apiClient.post<BulkOperationResponse>("/products/bulk/status", {
      product_ids: productIds,
      status,
    })
  },

  /**
   * Bulk delete products
   * @param productIds - Array of product IDs
   */
  bulkDelete: (productIds: string[]): Promise<BulkOperationResponse> => {
    return apiClient.post<BulkOperationResponse>("/products/bulk/delete", {
      product_ids: productIds,
    })
  },

  /**
   * Get category attributes for product form
   * @param categoryId - Category ID
   */
  getCategoryAttributes: (categoryId: string): Promise<Attribute[]> => {
    return apiClient.get<Attribute[]>(`/products/category/${categoryId}/attributes`)
  },

  // =========================================================================
  // Image Operations
  // =========================================================================

  /**
   * Add image to product
   * @param productId - Product ID
   * @param data - Image data
   */
  addImage: (productId: string, data: ProductImageCreate): Promise<ProductImage> => {
    return apiClient.post<ProductImage>(`/products/${productId}/images`, data)
  },

  /**
   * Update product image
   * @param productId - Product ID
   * @param imageId - Image ID
   * @param data - Update data
   */
  updateImage: (
    productId: string,
    imageId: string,
    data: Partial<ProductImageCreate>
  ): Promise<ProductImage> => {
    return apiClient.patch<ProductImage>(`/products/${productId}/images/${imageId}`, data)
  },

  /**
   * Delete product image
   * @param productId - Product ID
   * @param imageId - Image ID
   */
  deleteImage: (productId: string, imageId: string): Promise<void> => {
    return apiClient.delete<void>(`/products/${productId}/images/${imageId}`)
  },

  // =========================================================================
  // Variant Operations
  // =========================================================================

  /**
   * Add variant to product
   * @param productId - Product ID
   * @param data - Variant data
   */
  addVariant: (productId: string, data: ProductVariantCreate): Promise<ProductVariant> => {
    return apiClient.post<ProductVariant>(`/products/${productId}/variants`, data)
  },

  /**
   * Update product variant
   * @param productId - Product ID
   * @param variantId - Variant ID
   * @param data - Update data
   */
  updateVariant: (
    productId: string,
    variantId: string,
    data: Partial<ProductVariantCreate>
  ): Promise<ProductVariant> => {
    return apiClient.patch<ProductVariant>(
      `/products/${productId}/variants/${variantId}`,
      data
    )
  },

  /**
   * Delete product variant
   * @param productId - Product ID
   * @param variantId - Variant ID
   */
  deleteVariant: (productId: string, variantId: string): Promise<void> => {
    return apiClient.delete<void>(`/products/${productId}/variants/${variantId}`)
  },
}

export default productsApi

