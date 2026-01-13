from pydantic import BaseModel, Field
from typing import Optional, List


class ShippingRuleResponse(BaseModel):
    """Response model for shipping rule."""
    id: str
    name: str
    description: Optional[str] = None
    shipping_fee: float
    free_shipping_threshold: Optional[float] = None
    is_active: bool
    applicable_products: Optional[List[str]] = None
    priority: int
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class ShippingRuleCreate(BaseModel):
    """Create model for shipping rule."""
    name: str = Field(..., min_length=1, max_length=100, description="Rule name")
    description: Optional[str] = Field(None, max_length=500, description="Internal description")
    shipping_fee: float = Field(..., ge=0, description="Shipping fee in pesos")
    free_shipping_threshold: Optional[float] = Field(None, ge=0, description="Order amount for free shipping")
    is_active: bool = Field(True, description="Whether rule is active")
    applicable_products: Optional[List[str]] = Field(None, description="Product IDs this rule applies to")
    priority: int = Field(0, ge=0, description="Priority for rule matching")


class ShippingRuleUpdate(BaseModel):
    """Update model for shipping rule."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    shipping_fee: Optional[float] = Field(None, ge=0)
    free_shipping_threshold: Optional[float] = Field(None, ge=0)
    is_active: Optional[bool] = None
    applicable_products: Optional[List[str]] = None
    priority: Optional[int] = Field(None, ge=0)


class ShippingRuleListResponse(BaseModel):
    """List response for shipping rules."""
    items: List[ShippingRuleResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class ShippingCalculationRequest(BaseModel):
    """Request model for calculating shipping cost."""
    order_subtotal: float = Field(..., ge=0, description="Order subtotal")
    product_ids: Optional[List[str]] = Field(None, description="Product IDs in the order")


class ShippingCalculationResponse(BaseModel):
    """Response model for shipping calculation."""
    shipping_fee: float
    is_free_shipping: bool
    free_shipping_threshold: Optional[float] = None
    rule_name: Optional[str] = None
    message: str
