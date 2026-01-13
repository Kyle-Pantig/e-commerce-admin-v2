from pydantic import BaseModel, Field
from typing import Optional, List


class TaxRuleResponse(BaseModel):
    """Response model for tax rule."""
    id: str
    name: str
    description: Optional[str] = None
    tax_rate: float
    tax_type: str  # PERCENTAGE or FIXED
    is_inclusive: bool
    is_active: bool
    applicable_products: Optional[List[str]] = None
    applicable_categories: Optional[List[str]] = None
    priority: int
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class TaxRuleCreate(BaseModel):
    """Create model for tax rule."""
    name: str = Field(..., min_length=1, max_length=100, description="Rule name")
    description: Optional[str] = Field(None, max_length=500, description="Internal description")
    tax_rate: float = Field(..., ge=0, description="Tax rate (percentage or fixed amount)")
    tax_type: str = Field("PERCENTAGE", description="PERCENTAGE or FIXED")
    is_inclusive: bool = Field(False, description="Whether tax is included in price")
    is_active: bool = Field(True, description="Whether rule is active")
    applicable_products: Optional[List[str]] = Field(None, description="Product IDs this rule applies to")
    applicable_categories: Optional[List[str]] = Field(None, description="Category IDs this rule applies to")
    priority: int = Field(0, ge=0, description="Priority for rule matching")


class TaxRuleUpdate(BaseModel):
    """Update model for tax rule."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    tax_rate: Optional[float] = Field(None, ge=0)
    tax_type: Optional[str] = None
    is_inclusive: Optional[bool] = None
    is_active: Optional[bool] = None
    applicable_products: Optional[List[str]] = None
    applicable_categories: Optional[List[str]] = None
    priority: Optional[int] = Field(None, ge=0)


class TaxRuleListResponse(BaseModel):
    """List response for tax rules."""
    items: List[TaxRuleResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class TaxCalculationRequest(BaseModel):
    """Request model for calculating tax."""
    order_subtotal: float = Field(..., ge=0, description="Order subtotal")
    product_ids: Optional[List[str]] = Field(None, description="Product IDs in the order")


class TaxCalculationResponse(BaseModel):
    """Response model for tax calculation."""
    tax_amount: float
    tax_rate: float
    tax_type: str
    is_inclusive: bool
    rule_name: Optional[str] = None
    message: str
