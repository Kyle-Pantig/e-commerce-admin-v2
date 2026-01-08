from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


class DiscountType(str, Enum):
    PERCENTAGE = "PERCENTAGE"
    FIXED_AMOUNT = "FIXED_AMOUNT"


class DiscountCodeCreate(BaseModel):
    code: str = Field(..., min_length=3, max_length=50)
    description: Optional[str] = None
    discount_type: DiscountType = DiscountType.PERCENTAGE
    discount_value: float = Field(..., gt=0)
    minimum_order_amount: Optional[float] = Field(None, ge=0)
    maximum_discount: Optional[float] = Field(None, gt=0)
    usage_limit: Optional[int] = Field(None, gt=0)
    usage_limit_per_user: Optional[int] = Field(None, gt=0)
    is_active: bool = True
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    auto_apply: bool = False  # Auto-apply discount to products
    show_badge: bool = True   # Show discount badge on products
    applicable_products: Optional[List[str]] = None  # Product IDs
    applicable_variants: Optional[List[str]] = None  # Variant IDs for specific variants
    applicable_categories: Optional[List[str]] = None

    @field_validator('code')
    @classmethod
    def code_uppercase(cls, v: str) -> str:
        return v.upper().strip().replace(' ', '')

    @field_validator('discount_value')
    @classmethod
    def validate_discount_value(cls, v: float, info) -> float:
        # For percentage, must be between 0 and 100
        if info.data.get('discount_type') == DiscountType.PERCENTAGE and v > 100:
            raise ValueError('Percentage discount cannot exceed 100%')
        return v


class DiscountCodeUpdate(BaseModel):
    code: Optional[str] = Field(None, min_length=3, max_length=50)
    description: Optional[str] = None
    discount_type: Optional[DiscountType] = None
    discount_value: Optional[float] = Field(None, gt=0)
    minimum_order_amount: Optional[float] = Field(None, ge=0)
    maximum_discount: Optional[float] = Field(None, gt=0)
    usage_limit: Optional[int] = Field(None, gt=0)
    usage_limit_per_user: Optional[int] = Field(None, gt=0)
    is_active: Optional[bool] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    auto_apply: Optional[bool] = None
    show_badge: Optional[bool] = None
    applicable_products: Optional[List[str]] = None
    applicable_variants: Optional[List[str]] = None
    applicable_categories: Optional[List[str]] = None

    @field_validator('code')
    @classmethod
    def code_uppercase(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return v.upper().strip().replace(' ', '')


class DiscountCodeResponse(BaseModel):
    id: str
    code: str
    description: Optional[str] = None
    discount_type: str
    discount_value: float
    minimum_order_amount: Optional[float] = None
    maximum_discount: Optional[float] = None
    usage_limit: Optional[int] = None
    usage_limit_per_user: Optional[int] = None
    usage_count: int = 0
    is_active: bool = True
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    auto_apply: bool = False
    show_badge: bool = True
    applicable_products: Optional[List[str]] = None
    applicable_variants: Optional[List[str]] = None
    applicable_categories: Optional[List[str]] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    created_by: Optional[str] = None

    class Config:
        from_attributes = True


class DiscountCodeListResponse(BaseModel):
    items: List[DiscountCodeResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class DiscountValidationRequest(BaseModel):
    code: str
    order_subtotal: float
    user_id: Optional[str] = None
    product_ids: Optional[List[str]] = None
    category_ids: Optional[List[str]] = None


class DiscountValidationResponse(BaseModel):
    valid: bool
    code: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    discount_amount: Optional[float] = None  # Actual calculated discount
    message: str

