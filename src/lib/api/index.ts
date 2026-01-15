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
export type { ProductListResponse, PublicProductListParams } from "./services/products"

export { usersApi, authApi } from "./services/users"

// Permission constants
export { 
  DEFAULT_STAFF_PERMISSIONS, 
  PERMISSION_MODULES, 
  PERMISSION_LABELS 
} from "./types"

export { ordersApi } from "./services/orders"
export type { OrderListResponse } from "./services/orders"

export { inventoryApi } from "./services/inventory"
export type {
  StockAdjustmentType,
  StockAdjustment,
  StockAdjustmentCreate,
  BulkStockAdjustmentItem,
  BulkStockAdjustmentCreate,
  StockHistoryResponse,
  BulkStockAdjustmentResponse,
  StockSummary,
  ProductStockReport,
  StockMovementReport,
  LowStockAlert,
  LowStockAlertsResponse,
  QuickUpdateResponse,
} from "./services/inventory"

export { discountsApi } from "./services/discounts"
export type {
  DiscountType,
  DiscountCode,
  DiscountCodeCreate,
  DiscountCodeUpdate,
  DiscountCodeListParams,
  DiscountCodeListResponse,
  DiscountValidationRequest,
  DiscountValidationResponse,
} from "./services/discounts"

export { shippingApi } from "./services/shipping"
export type {
  ShippingRule,
  ShippingRuleCreate,
  ShippingRuleUpdate,
  ShippingRuleListParams,
  ShippingRuleListResponse,
  ShippingCalculationRequest,
  ShippingCalculationResponse,
} from "./services/shipping"

export { taxApi } from "./services/tax"
export type {
  TaxRule,
  TaxRuleCreate,
  TaxRuleUpdate,
  TaxRuleListParams,
  TaxRuleListResponse,
  TaxCalculationRequest,
  TaxCalculationResponse,
} from "./services/tax"

export { 
  siteContentApi, 
  CONTENT_KEYS, 
  getBannerButtons,
  titleSizeClasses,
  subtitleSizeClasses,
  buttonSizeClasses,
  previewTitleSizeClasses,
  previewSubtitleSizeClasses,
  previewButtonSizeClasses,
} from "./services/site-content"
export type {
  TextSize,
  ButtonSize,
  BannerButton,
  BannerItem,
  HeroBannersContent,
  AnnouncementContent,
  FeaturedCategoryItem,
  FeaturedCategoriesContent,
  SiteContent,
  SiteContentCreate,
  SiteContentUpdate,
  SiteContentListResponse,
} from "./services/site-content"

export { wishlistApi } from "./services/wishlist"

export { cartApi } from "./services/cart"

export { addressesApi } from "./services/addresses"
export type {
  AddressType,
  UserAddress,
  UserAddressCreate,
  UserAddressUpdate,
} from "./services/addresses"

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

  // Users & Permissions
  UserRole,
  PermissionLevel,
  PermissionModule,
  StaffPermissions,
  User,
  UserUpdate,
  UserCreate,
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

  // Wishlist
  WishlistItemProduct,
  WishlistItem,
  Wishlist,
  WishlistProductIds,
  WishlistToggleResponse,

  // Cart
  CartItemVariant,
  CartItemProduct,
  CartItem,
  Cart,
  AddToCartRequest,
  CartCountResponse,
  SyncCartRequest,
  SyncCartResponse,
  LocalCartItem,
} from "./types"
