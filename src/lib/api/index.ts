/**
 * API Module - Main Entry Point
 * 
 * Centralized API client and services for all backend operations.
 * Import everything you need from '@/lib/api'
 * 
 * @example
 * // Import services
 * import { categoriesApi, productsApi, attributesApi, usersApi } from '@/lib/api'
 * 
 * // Use services
 * const categories = await categoriesApi.list()
 * const products = await productsApi.list({ page: 1, per_page: 20 })
 * 
 * @example
 * // Import types
 * import type { Product, Category, Attribute } from '@/lib/api'
 * 
 * @example
 * // Import client for custom requests
 * import { apiClient } from '@/lib/api'
 * const data = await apiClient.get<CustomType>('/custom-endpoint')
 */

// =============================================================================
// Core Client
// =============================================================================

export { apiClient, API_URL, ApiClientError, getAccessToken, buildQueryString } from "./client"
export type { ApiError, RequestConfig } from "./client"

// =============================================================================
// Services
// =============================================================================

export { categoriesApi, flattenCategories, getAllCategoryIds } from "./services/categories"
export type { CategoryListParams } from "./services/categories"

export { attributesApi } from "./services/attributes"
export type { AttributeListParams, AttributeByCategoryParams } from "./services/attributes"

export { productsApi } from "./services/products"
export type { ProductListResponse } from "./services/products"

export { usersApi, authApi } from "./services/users"

export { ordersApi } from "./services/orders"
export type { OrderListResponse } from "./services/orders"

// =============================================================================
// Types - Re-export all types for convenience
// =============================================================================

export type {
  // Pagination
  PaginatedResponse,
  PaginationParams,
  BulkOperationResponse,

  // Categories
  Category,
  CategoryCreate,
  CategoryUpdate,

  // Attributes
  AttributeType,
  Attribute,
  AttributeCreate,
  AttributeUpdate,
  AttributeReorderItem,

  // Products
  ProductStatus,
  ProductImage,
  ProductVariant,
  ProductAttributeValue,
  Product,
  ProductListItem,
  ProductImageCreate,
  ProductVariantCreate,
  ProductAttributeValueCreate,
  ProductCreate,
  ProductUpdate,
  ProductListParams,

  // Users
  UserRole,
  User,
  UserUpdate,
  AuthUser,
  AuthResponse,

  // Orders
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  OrderItem,
  OrderStatusHistory,
  Order,
  OrderListItem,
  OrderItemCreate,
  OrderCreate,
  OrderUpdate,
  OrderStatusUpdate,
  OrderListParams,
  OrderStats,
} from "./types"
