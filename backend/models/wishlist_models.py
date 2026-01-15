"""
Wishlist Pydantic models for request/response validation.
"""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class WishlistItemVariant(BaseModel):
    """Variant info for wishlist item product."""
    id: str
    name: str
    sku: Optional[str] = None
    price: Optional[float] = None
    sale_price: Optional[float] = None
    stock: int = 0
    is_active: bool = True
    options: Optional[dict] = None


class WishlistItemImage(BaseModel):
    """Image info for wishlist item product."""
    id: str
    url: str
    alt_text: Optional[str] = None
    display_order: int = 0
    is_primary: bool = False


class WishlistItemProduct(BaseModel):
    """Product info for wishlist item response."""
    id: str
    name: str
    slug: str
    base_price: float
    sale_price: Optional[float] = None
    primary_image: Optional[str] = None
    images: Optional[List[WishlistItemImage]] = None
    is_new: bool = False
    has_variants: bool = False
    stock: int = 0
    status: str = "ACTIVE"
    variants: Optional[List[WishlistItemVariant]] = None


class WishlistItemResponse(BaseModel):
    """Response model for a single wishlist item."""
    id: str
    product_id: str
    product: WishlistItemProduct
    created_at: str


class WishlistResponse(BaseModel):
    """Response model for user's wishlist."""
    id: str
    user_id: str
    items: List[WishlistItemResponse]
    total_items: int
    created_at: str
    updated_at: str


class WishlistProductIdsResponse(BaseModel):
    """Response model for list of product IDs in wishlist."""
    product_ids: List[str]


class AddToWishlistRequest(BaseModel):
    """Request model for adding product to wishlist."""
    product_id: str


class AddToWishlistResponse(BaseModel):
    """Response model for add to wishlist."""
    message: str
    item: WishlistItemResponse


class RemoveFromWishlistResponse(BaseModel):
    """Response model for remove from wishlist."""
    message: str


class WishlistToggleResponse(BaseModel):
    """Response model for toggling wishlist item."""
    message: str
    is_in_wishlist: bool
    item: Optional[WishlistItemResponse] = None
