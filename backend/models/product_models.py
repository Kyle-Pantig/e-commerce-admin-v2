"""
Pydantic models for product management endpoints.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime


class ProductStatus(str, Enum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    DISABLED = "DISABLED"
    ARCHIVED = "ARCHIVED"


# ==========================================
# Product Image Models
# ==========================================

class ProductImageCreate(BaseModel):
    """Model for creating a product image."""
    url: str
    alt_text: Optional[str] = None
    display_order: int = 0
    is_primary: bool = False


class ProductImageUpdate(BaseModel):
    """Model for updating a product image."""
    url: Optional[str] = None
    alt_text: Optional[str] = None
    display_order: Optional[int] = None
    is_primary: Optional[bool] = None


class ProductImageResponse(BaseModel):
    """Response model for product image."""
    id: str
    product_id: str
    url: str
    alt_text: Optional[str] = None
    display_order: int
    is_primary: bool
    created_at: str

    class Config:
        from_attributes = True


# ==========================================
# Product Variant Models
# ==========================================

class ProductVariantCreate(BaseModel):
    """Model for creating a product variant."""
    sku: Optional[str] = None
    name: str  # e.g., "Red - Large"
    price: Optional[float] = None
    sale_price: Optional[float] = None
    cost_price: Optional[float] = None
    stock: int = 0
    low_stock_threshold: Optional[int] = None
    is_active: bool = True
    options: Optional[Dict[str, str]] = None  # {"color": "Red", "size": "Large"}
    image_url: Optional[str] = None


class ProductVariantUpdate(BaseModel):
    """Model for updating a product variant."""
    sku: Optional[str] = None
    name: Optional[str] = None
    price: Optional[float] = None
    sale_price: Optional[float] = None
    cost_price: Optional[float] = None
    stock: Optional[int] = None
    low_stock_threshold: Optional[int] = None
    is_active: Optional[bool] = None
    options: Optional[Dict[str, str]] = None
    image_url: Optional[str] = None


class ProductVariantResponse(BaseModel):
    """Response model for product variant."""
    id: str
    product_id: str
    sku: Optional[str] = None
    name: str
    price: Optional[float] = None
    sale_price: Optional[float] = None
    cost_price: Optional[float] = None
    stock: int
    low_stock_threshold: Optional[int] = None
    is_active: bool
    options: Optional[Dict[str, str]] = None
    image_url: Optional[str] = None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


# ==========================================
# Product Attribute Value Models
# ==========================================

class ProductAttributeValueCreate(BaseModel):
    """Model for creating a product attribute value."""
    attribute_id: str
    value: str  # Stored as string, frontend handles type conversion


class ProductAttributeValueUpdate(BaseModel):
    """Model for updating a product attribute value."""
    value: str


class ProductAttributeValueResponse(BaseModel):
    """Response model for product attribute value."""
    id: str
    product_id: str
    attribute_id: str
    value: str
    created_at: str
    updated_at: str
    
    # Include attribute details for display
    attribute_name: Optional[str] = None
    attribute_type: Optional[str] = None

    class Config:
        from_attributes = True


# ==========================================
# Product Models
# ==========================================

class ProductCreate(BaseModel):
    """Model for creating a new product."""
    name: str
    description: Optional[str] = None
    short_description: Optional[str] = None
    sku: Optional[str] = None
    status: ProductStatus = ProductStatus.DRAFT
    
    # Pricing
    base_price: float = Field(..., gt=0)
    sale_price: Optional[float] = None
    cost_price: Optional[float] = None
    
    # Category
    category_id: str
    
    # Inventory
    stock: int = 0
    low_stock_threshold: Optional[int] = None
    track_inventory: bool = True
    
    # Physical properties
    weight: Optional[float] = None
    length: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    
    # SEO
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    
    # Flags
    is_featured: bool = False
    has_variants: bool = False
    is_new: bool = True  # Default to True for new products
    new_until: Optional[datetime] = None  # Auto-expire "new" status after this date
    
    # Nested data for creation
    images: Optional[List[ProductImageCreate]] = None
    variants: Optional[List[ProductVariantCreate]] = None
    attribute_values: Optional[List[ProductAttributeValueCreate]] = None


class ProductUpdate(BaseModel):
    """Model for updating an existing product."""
    name: Optional[str] = None
    description: Optional[str] = None
    short_description: Optional[str] = None
    sku: Optional[str] = None
    status: Optional[ProductStatus] = None
    
    # Pricing
    base_price: Optional[float] = None
    sale_price: Optional[float] = None
    cost_price: Optional[float] = None
    
    # Category
    category_id: Optional[str] = None
    
    # Inventory
    stock: Optional[int] = None
    low_stock_threshold: Optional[int] = None
    track_inventory: Optional[bool] = None
    
    # Physical properties
    weight: Optional[float] = None
    length: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    
    # SEO
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    
    # Flags
    is_featured: Optional[bool] = None
    has_variants: Optional[bool] = None
    is_new: Optional[bool] = None
    new_until: Optional[datetime] = None
    
    # Nested data updates
    attribute_values: Optional[List[ProductAttributeValueCreate]] = None
    variants: Optional[List[ProductVariantCreate]] = None
    images: Optional[List[ProductImageCreate]] = None


class ProductResponse(BaseModel):
    """Response model for product data."""
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    short_description: Optional[str] = None
    sku: Optional[str] = None
    status: str
    
    # Pricing
    base_price: float
    sale_price: Optional[float] = None
    cost_price: Optional[float] = None
    
    # Category
    category_id: str
    category_name: Optional[str] = None
    
    # Inventory
    stock: int
    low_stock_threshold: Optional[int] = None
    track_inventory: bool
    
    # Physical properties
    weight: Optional[float] = None
    length: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    
    # SEO
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    
    # Flags
    is_featured: bool
    has_variants: bool
    is_new: bool = False
    new_until: Optional[str] = None
    
    # Nested data
    images: Optional[List[ProductImageResponse]] = None
    variants: Optional[List[ProductVariantResponse]] = None
    attribute_values: Optional[List[ProductAttributeValueResponse]] = None
    
    # Timestamps
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class ProductVariantListItem(BaseModel):
    """Variant data for product list (includes name, options for display)."""
    id: str
    name: str
    sku: Optional[str] = None
    price: Optional[float] = None
    sale_price: Optional[float] = None
    stock: int
    is_active: bool
    options: Optional[Dict[str, Any]] = None  # e.g., {"Size": "L", "Color": "Red"}

    class Config:
        from_attributes = True


class ProductListImageItem(BaseModel):
    """Minimal image data for product list."""
    url: str
    alt_text: Optional[str] = None
    is_primary: bool = False
    display_order: int = 0


class ProductListResponse(BaseModel):
    """Response model for product list with minimal data."""
    id: str
    name: str
    slug: str
    sku: Optional[str] = None
    status: str
    base_price: float
    sale_price: Optional[float] = None
    stock: int
    category_id: str
    category_name: Optional[str] = None
    is_featured: bool
    has_variants: bool
    is_new: bool = False
    new_until: Optional[str] = None
    primary_image: Optional[str] = None
    images: Optional[List[ProductListImageItem]] = None  # All images for slideshow
    variants: Optional[List["ProductVariantListItem"]] = None  # For stock calculation
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


# ==========================================
# Bulk Operation Models
# ==========================================

class ProductBulkStatusUpdate(BaseModel):
    """Request model for bulk status update."""
    product_ids: List[str]
    status: ProductStatus


class ProductBulkDelete(BaseModel):
    """Request model for bulk deleting products."""
    product_ids: List[str]


class ProductStockUpdate(BaseModel):
    """Request model for updating product stock."""
    stock: int
    reason: Optional[str] = None  # For audit trail


class BulkOperationResponse(BaseModel):
    """Response for bulk operations."""
    message: str
    affected_count: int


# ==========================================
# Filter and Query Models
# ==========================================

class ProductFilterParams(BaseModel):
    """Filter parameters for product listing."""
    category_id: Optional[str] = None
    status: Optional[ProductStatus] = None
    is_featured: Optional[bool] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    in_stock: Optional[bool] = None
    search: Optional[str] = None
    sort_by: str = "created_at"
    sort_order: str = "desc"
    page: int = 1
    per_page: int = 20


class PaginatedProductResponse(BaseModel):
    """Paginated response for product listing."""
    items: List[ProductListResponse]
    total: int
    page: int
    per_page: int
    total_pages: int

