"""
Cart Pydantic models for request/response validation.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


# =============================================================================
# Nested Models
# =============================================================================

class CartItemVariant(BaseModel):
    """Variant info for cart item."""
    id: str
    name: str
    sku: Optional[str] = None
    price: Optional[float] = None
    sale_price: Optional[float] = None
    stock: int = 0
    is_active: bool = True
    options: Optional[Dict[str, Any]] = None
    image_url: Optional[str] = None


class CartItemProduct(BaseModel):
    """Product info for cart item response."""
    id: str
    name: str
    slug: str
    base_price: float
    sale_price: Optional[float] = None
    primary_image: Optional[str] = None
    has_variants: bool = False
    stock: int = 0
    status: str = "ACTIVE"


# =============================================================================
# Request Models
# =============================================================================

class AddToCartRequest(BaseModel):
    """Request model for adding item to cart."""
    product_id: str
    variant_id: Optional[str] = None
    quantity: int = Field(default=1, ge=1)
    options: Optional[Dict[str, Any]] = None


class UpdateCartItemRequest(BaseModel):
    """Request model for updating cart item quantity."""
    quantity: int = Field(ge=0)  # 0 means remove


class ChangeCartItemVariantRequest(BaseModel):
    """Request model for changing cart item variant."""
    variant_id: str


class SyncCartRequest(BaseModel):
    """Request model for syncing guest cart to user cart."""
    items: List[AddToCartRequest]


# =============================================================================
# Response Models
# =============================================================================

class CartItemResponse(BaseModel):
    """Response model for a single cart item."""
    id: str
    product_id: str
    variant_id: Optional[str] = None
    quantity: int
    options: Optional[Dict[str, Any]] = None
    price_at_add: float
    product: CartItemProduct
    variant: Optional[CartItemVariant] = None
    # Computed fields
    current_price: float  # Current effective price
    subtotal: float  # quantity * current_price
    price_changed: bool = False  # True if price changed since adding
    created_at: str
    updated_at: str


class CartResponse(BaseModel):
    """Response model for user's cart."""
    id: str
    user_id: str
    items: List[CartItemResponse]
    total_items: int  # Sum of all quantities
    subtotal: float  # Sum of all item subtotals
    created_at: str
    updated_at: str


class AddToCartResponse(BaseModel):
    """Response model for add to cart."""
    message: str
    item: CartItemResponse


class UpdateCartItemResponse(BaseModel):
    """Response model for update cart item."""
    message: str
    item: Optional[CartItemResponse] = None  # None if removed


class RemoveFromCartResponse(BaseModel):
    """Response model for remove from cart."""
    message: str


class CartCountResponse(BaseModel):
    """Response model for cart item count."""
    count: int
    total_quantity: int


class SyncCartResponse(BaseModel):
    """Response model for cart sync."""
    message: str
    synced_count: int
    cart: CartResponse
