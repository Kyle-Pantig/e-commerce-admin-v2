/**
 * Shared API Types
 * 
 * Centralized type definitions for all API responses.
 * Import from '@/lib/api/types'
 */

// =============================================================================
// Pagination
// =============================================================================

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface PaginationParams {
  page?: number
  per_page?: number
}

// =============================================================================
// Bulk Operations
// =============================================================================

export interface BulkOperationResponse {
  message: string
  affected_count: number
}

// =============================================================================
// Category Types
// =============================================================================

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  parent_id: string | null
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  children?: Category[] | null
}

export interface CategoryCreate {
  name: string
  description?: string | null
  image?: string | null
  parent_id?: string | null
  display_order?: number
  is_active?: boolean
}

export interface CategoryUpdate {
  name?: string
  description?: string | null
  image?: string | null
  parent_id?: string | null
  display_order?: number
  is_active?: boolean
}

// =============================================================================
// Attribute Types
// =============================================================================

export type AttributeType = "TEXT" | "NUMBER" | "SELECT" | "BOOLEAN"

export interface Attribute {
  id: string
  name: string
  type: AttributeType
  description: string | null
  is_required: boolean
  is_filterable: boolean
  display_order: number
  is_active: boolean
  validation_rules: Record<string, unknown> | null
  options: string[] | null
  min_length: number | null
  max_length: number | null
  placeholder: string | null
  default_value: string | null
  min_value: number | null
  max_value: number | null
  step: number | null
  unit: string | null
  true_label: string | null
  false_label: string | null
  category_ids: string[]
  created_at: string
  updated_at: string
}

export interface AttributeCreate {
  name: string
  type: AttributeType
  description?: string | null
  is_required?: boolean
  is_filterable?: boolean
  display_order?: number
  is_active?: boolean
  validation_rules?: Record<string, unknown> | null
  options?: string[] | null
  min_length?: number | null
  max_length?: number | null
  placeholder?: string | null
  default_value?: string | null
  min_value?: number | null
  max_value?: number | null
  step?: number | null
  unit?: string | null
  true_label?: string | null
  false_label?: string | null
  category_ids?: string[] | null
}

export interface AttributeUpdate extends Partial<AttributeCreate> {}

export interface AttributeReorderItem {
  id: string
  display_order: number
}

// =============================================================================
// Product Types
// =============================================================================

export type ProductStatus = "DRAFT" | "ACTIVE" | "DISABLED" | "ARCHIVED"

export interface ProductImage {
  id: string
  product_id: string
  url: string
  alt_text: string | null
  display_order: number
  is_primary: boolean
  created_at: string
}

export interface ProductVariant {
  id: string
  product_id: string
  sku: string | null
  name: string
  price: number | null
  sale_price: number | null
  cost_price: number | null
  stock: number
  low_stock_threshold: number | null
  is_active: boolean
  options: Record<string, string> | null
  image_url: string | null
  created_at: string
  updated_at: string
}

export interface ProductAttributeValue {
  id: string
  product_id: string
  attribute_id: string
  value: string
  created_at: string
  updated_at: string
  attribute_name?: string | null
  attribute_type?: string | null
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  short_description: string | null
  sku: string | null
  status: ProductStatus
  base_price: number
  sale_price: number | null
  cost_price: number | null
  category_id: string
  category_name: string | null
  stock: number
  low_stock_threshold: number | null
  track_inventory: boolean
  weight: number | null
  length: number | null
  width: number | null
  height: number | null
  meta_title: string | null
  meta_description: string | null
  is_featured: boolean
  has_variants: boolean
  is_new: boolean
  new_until: string | null
  images: ProductImage[] | null
  variants: ProductVariant[] | null
  attribute_values: ProductAttributeValue[] | null
  created_at: string
  updated_at: string
}

export interface ProductListItem {
  id: string
  name: string
  slug: string
  sku: string | null
  status: ProductStatus
  base_price: number
  sale_price: number | null
  stock: number
  category_id: string
  category_name: string | null
  is_featured: boolean
  has_variants: boolean
  is_new: boolean
  new_until: string | null
  primary_image: string | null
  images: { url: string; alt_text: string | null; is_primary?: boolean; display_order?: number }[] | null
  variants: {
    id: string
    name: string
    sku: string | null
    price: number | null
    sale_price: number | null
    stock: number
    is_active: boolean
    options: Record<string, string> | null
  }[] | null
  created_at: string
  updated_at: string
}

export interface ProductImageCreate {
  url: string
  alt_text?: string | null
  display_order?: number
  is_primary?: boolean
}

export interface ProductVariantCreate {
  sku?: string | null
  name: string
  price?: number | null
  sale_price?: number | null
  cost_price?: number | null
  stock?: number
  low_stock_threshold?: number | null
  is_active?: boolean
  options?: Record<string, unknown> | null
  image_url?: string | null
}

export interface ProductAttributeValueCreate {
  attribute_id: string
  value: string
}

export interface ProductCreate {
  name: string
  description?: string | null
  short_description?: string | null
  sku?: string | null
  status?: ProductStatus
  base_price: number
  sale_price?: number | null
  cost_price?: number | null
  category_id: string
  stock?: number
  low_stock_threshold?: number | null
  track_inventory?: boolean
  weight?: number | null
  length?: number | null
  width?: number | null
  height?: number | null
  meta_title?: string | null
  meta_description?: string | null
  is_featured?: boolean
  has_variants?: boolean
  is_new?: boolean
  new_until?: string | null
  images?: ProductImageCreate[]
  variants?: ProductVariantCreate[]
  attribute_values?: ProductAttributeValueCreate[]
}

export interface ProductUpdate extends Partial<ProductCreate> {}

export interface ProductListParams extends PaginationParams {
  category_id?: string
  status?: ProductStatus
  is_featured?: boolean
  min_price?: number
  max_price?: number
  in_stock?: boolean
  search?: string
  sort_by?: string
  sort_order?: "asc" | "desc"
  include_inactive?: boolean
}

// =============================================================================
// User Types
// =============================================================================

export type UserRole = "ADMIN" | "STAFF" | "CUSTOMER"

export type PermissionLevel = "none" | "view" | "edit"

export type PermissionModule = 
  | "products" 
  | "orders" 
  | "inventory" 
  | "categories" 
  | "attributes" 
  | "analytics" 
  | "users"
  | "discounts"

export type StaffPermissions = {
  [K in PermissionModule]?: PermissionLevel
}

export const DEFAULT_STAFF_PERMISSIONS: StaffPermissions = {
  products: "view",
  orders: "view",
  inventory: "view",
  categories: "view",
  attributes: "view",
  analytics: "view",
  users: "none",
  discounts: "view",
}

export const PERMISSION_MODULES: PermissionModule[] = [
  "products",
  "orders",
  "inventory",
  "categories",
  "attributes",
  "analytics",
  "users",
  "discounts",
]

export const PERMISSION_LABELS: Record<PermissionModule, string> = {
  products: "Products",
  orders: "Orders",
  inventory: "Inventory",
  categories: "Categories",
  attributes: "Attributes",
  analytics: "Analytics",
  users: "Users",
  discounts: "Discounts",
}

export interface User {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  is_approved: boolean
  created_at: string | null
  permissions?: StaffPermissions | null
}

export interface UserUpdate {
  is_approved?: boolean
  role?: UserRole
  permissions?: StaffPermissions
}

export interface UserCreate {
  email: string
  password: string
  full_name?: string
  role?: UserRole
  is_approved?: boolean
  permissions?: StaffPermissions
}

// =============================================================================
// Auth Types
// =============================================================================

export interface AuthUser {
  id: string
  email: string
  full_name: string | null
  role: UserRole | null
  is_approved: boolean | null
  user_metadata?: Record<string, unknown>
  created_at: string | null
  permissions?: StaffPermissions | null
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  user: {
    id: string
    email: string
    user_metadata?: Record<string, unknown>
  }
}

// =============================================================================
// Order Types
// =============================================================================

export type OrderStatus = 
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED"
  | "ON_HOLD"

export type PaymentStatus = 
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED"

export type PaymentMethod = 
  | "CASH_ON_DELIVERY"
  | "STRIPE"

export interface OrderItem {
  id: string
  order_id: string
  product_id: string | null
  product_name: string
  product_sku: string | null
  product_image: string | null
  variant_id: string | null
  variant_name: string | null
  variant_options: Record<string, string> | null
  unit_price: number
  quantity: number
  subtotal: number
  created_at: string
}

export interface OrderStatusHistory {
  id: string
  order_id: string
  from_status: OrderStatus | null
  to_status: OrderStatus
  note: string | null
  changed_by: string | null
  created_at: string
}

export interface Order {
  id: string
  order_number: string
  status: OrderStatus
  payment_status: PaymentStatus
  payment_method: PaymentMethod | null
  
  // Customer info
  customer_name: string
  customer_email: string
  customer_phone: string | null
  
  // Shipping address
  shipping_address: string
  shipping_city: string
  shipping_state: string | null
  shipping_zip: string | null
  shipping_country: string
  
  // Billing address
  billing_address: string | null
  billing_city: string | null
  billing_state: string | null
  billing_zip: string | null
  billing_country: string | null
  
  // Totals
  subtotal: number
  shipping_cost: number
  tax_amount: number
  discount_amount: number
  total: number
  
  // Notes
  notes: string | null
  internal_notes: string | null
  tracking_number: string | null
  shipping_carrier: string | null
  
  // Timestamps
  created_at: string
  updated_at: string
  shipped_at: string | null
  delivered_at: string | null
  cancelled_at: string | null
  
  // Relations
  items: OrderItem[]
  status_history: OrderStatusHistory[]
}

export interface OrderListItem {
  id: string
  order_number: string
  status: OrderStatus
  payment_status: PaymentStatus
  payment_method: PaymentMethod | null
  customer_name: string
  customer_email: string
  total: number
  items_count: number
  created_at: string
  updated_at: string
}

export interface OrderItemCreate {
  product_id?: string | null
  product_name: string
  product_sku?: string | null
  product_image?: string | null
  variant_id?: string | null
  variant_name?: string | null
  variant_options?: Record<string, string> | null
  unit_price: number
  quantity: number
}

export interface OrderCreate {
  user_id?: string | null  // Link order to authenticated user
  
  customer_name: string
  customer_email: string
  customer_phone?: string | null
  
  shipping_address: string
  shipping_city: string
  shipping_state?: string | null
  shipping_zip?: string | null
  shipping_country?: string
  
  billing_address?: string | null
  billing_city?: string | null
  billing_state?: string | null
  billing_zip?: string | null
  billing_country?: string | null
  
  payment_method?: PaymentMethod
  
  shipping_cost?: number
  tax_amount?: number
  discount_amount?: number
  discount_code_id?: string | null
  
  notes?: string | null
  internal_notes?: string | null
  
  items: OrderItemCreate[]
}

export interface OrderUpdate {
  customer_name?: string
  customer_email?: string
  customer_phone?: string | null
  
  shipping_address?: string
  shipping_city?: string
  shipping_state?: string | null
  shipping_zip?: string | null
  shipping_country?: string
  
  billing_address?: string | null
  billing_city?: string | null
  billing_state?: string | null
  billing_zip?: string | null
  billing_country?: string | null
  
  payment_method?: PaymentMethod
  payment_status?: PaymentStatus
  
  shipping_cost?: number
  tax_amount?: number
  discount_amount?: number
  
  notes?: string | null
  internal_notes?: string | null
  
  tracking_number?: string | null
  shipping_carrier?: string | null
}

export interface OrderStatusUpdate {
  status: OrderStatus
  note?: string | null
}

export interface OrderListParams extends PaginationParams {
  status?: OrderStatus
  payment_status?: PaymentStatus
  search?: string
  date_from?: string
  date_to?: string
  sort_by?: "created_at" | "updated_at" | "total" | "order_number"
  sort_order?: "asc" | "desc"
}

export interface OrderStats {
  total_orders: number
  todays_orders: number
  total_revenue: number
  by_status: {
    pending: number
    confirmed: number
    processing: number
    shipped: number
    delivered: number
    cancelled: number
  }
  by_payment_status: {
    pending: number
    paid: number
  }
}

// =============================================================================
// Wishlist Types
// =============================================================================

export interface WishlistItemVariant {
  id: string
  name: string
  sku: string | null
  price: number | null
  sale_price: number | null
  stock: number
  is_active: boolean
  options: Record<string, string> | null
}

export interface WishlistItemImage {
  id: string
  url: string
  alt_text: string | null
  display_order: number
  is_primary: boolean
}

export interface WishlistItemProduct {
  id: string
  name: string
  slug: string
  base_price: number
  sale_price: number | null
  primary_image: string | null
  images: WishlistItemImage[] | null
  is_new: boolean
  has_variants: boolean
  stock: number
  status: string
  variants: WishlistItemVariant[] | null
}

export interface WishlistItem {
  id: string
  product_id: string
  product: WishlistItemProduct
  created_at: string
}

export interface Wishlist {
  id: string
  user_id: string
  items: WishlistItem[]
  total_items: number
  created_at: string
  updated_at: string
}

export interface WishlistProductIds {
  product_ids: string[]
}

export interface WishlistToggleResponse {
  message: string
  is_in_wishlist: boolean
  item: WishlistItem | null
}

// =============================================================================
// Cart Types
// =============================================================================

export interface CartItemVariant {
  id: string
  name: string
  sku: string | null
  price: number | null
  sale_price: number | null
  stock: number
  is_active: boolean
  options: Record<string, string> | null
  image_url: string | null
}

export interface CartItemProduct {
  id: string
  name: string
  slug: string
  base_price: number
  sale_price: number | null
  primary_image: string | null
  has_variants: boolean
  stock: number
  status: string
}

export interface CartItem {
  id: string
  product_id: string
  variant_id: string | null
  quantity: number
  options: Record<string, unknown> | null
  price_at_add: number
  product: CartItemProduct
  variant: CartItemVariant | null
  current_price: number
  subtotal: number
  price_changed: boolean
  created_at: string
  updated_at: string
}

export interface Cart {
  id: string
  user_id: string
  items: CartItem[]
  total_items: number
  subtotal: number
  created_at: string
  updated_at: string
}

export interface AddToCartRequest {
  product_id: string
  variant_id?: string | null
  quantity?: number
  options?: Record<string, unknown> | null
}

export interface CartCountResponse {
  count: number
  total_quantity: number
}

export interface SyncCartRequest {
  items: AddToCartRequest[]
}

export interface SyncCartResponse {
  message: string
  synced_count: number
  cart: Cart
}

// Local storage cart item (for guest users)
export interface LocalCartItem {
  product_id: string
  variant_id: string | null
  quantity: number
  options: Record<string, unknown> | null
  added_at: string
}

