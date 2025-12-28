from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any
from datetime import datetime
from enum import Enum


class OrderStatus(str, Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    PROCESSING = "PROCESSING"
    SHIPPED = "SHIPPED"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"
    REFUNDED = "REFUNDED"
    ON_HOLD = "ON_HOLD"


class PaymentStatus(str, Enum):
    PENDING = "PENDING"
    PAID = "PAID"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"
    PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED"


class PaymentMethod(str, Enum):
    CASH_ON_DELIVERY = "CASH_ON_DELIVERY"
    CREDIT_CARD = "CREDIT_CARD"
    DEBIT_CARD = "DEBIT_CARD"
    BANK_TRANSFER = "BANK_TRANSFER"
    DIGITAL_WALLET = "DIGITAL_WALLET"
    OTHER = "OTHER"


# ==========================================
# Order Item Models
# ==========================================

class OrderItemCreate(BaseModel):
    product_id: Optional[str] = None
    product_name: str
    product_sku: Optional[str] = None
    product_image: Optional[str] = None
    variant_id: Optional[str] = None
    variant_name: Optional[str] = None
    variant_options: Optional[dict] = None
    unit_price: float = Field(..., gt=0)
    quantity: int = Field(..., gt=0)


class OrderItemResponse(BaseModel):
    id: str
    order_id: str
    product_id: Optional[str]
    product_name: str
    product_sku: Optional[str]
    product_image: Optional[str]
    variant_id: Optional[str]
    variant_name: Optional[str]
    variant_options: Optional[dict]
    unit_price: float
    quantity: int
    subtotal: float
    created_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# Order Status History Models
# ==========================================

class OrderStatusHistoryResponse(BaseModel):
    id: str
    order_id: str
    from_status: Optional[OrderStatus]
    to_status: OrderStatus
    note: Optional[str]
    changed_by: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# Order Models
# ==========================================

class OrderCreate(BaseModel):
    # Customer info
    customer_name: str = Field(..., min_length=1, max_length=255)
    customer_email: EmailStr
    customer_phone: Optional[str] = None
    
    # Shipping address
    shipping_address: str = Field(..., min_length=1)
    shipping_city: str = Field(..., min_length=1)
    shipping_state: Optional[str] = None
    shipping_zip: Optional[str] = None
    shipping_country: str = "Philippines"
    
    # Billing address (optional)
    billing_address: Optional[str] = None
    billing_city: Optional[str] = None
    billing_state: Optional[str] = None
    billing_zip: Optional[str] = None
    billing_country: Optional[str] = None
    
    # Payment
    payment_method: Optional[PaymentMethod] = PaymentMethod.CASH_ON_DELIVERY
    
    # Costs
    shipping_cost: float = 0
    tax_amount: float = 0
    discount_amount: float = 0
    
    # Notes
    notes: Optional[str] = None
    internal_notes: Optional[str] = None
    
    # Order items
    items: List[OrderItemCreate] = Field(..., min_length=1)


class OrderUpdate(BaseModel):
    # Customer info (optional updates)
    customer_name: Optional[str] = None
    customer_email: Optional[EmailStr] = None
    customer_phone: Optional[str] = None
    
    # Shipping address
    shipping_address: Optional[str] = None
    shipping_city: Optional[str] = None
    shipping_state: Optional[str] = None
    shipping_zip: Optional[str] = None
    shipping_country: Optional[str] = None
    
    # Billing address
    billing_address: Optional[str] = None
    billing_city: Optional[str] = None
    billing_state: Optional[str] = None
    billing_zip: Optional[str] = None
    billing_country: Optional[str] = None
    
    # Payment
    payment_method: Optional[PaymentMethod] = None
    payment_status: Optional[PaymentStatus] = None
    
    # Costs
    shipping_cost: Optional[float] = None
    tax_amount: Optional[float] = None
    discount_amount: Optional[float] = None
    
    # Notes
    notes: Optional[str] = None
    internal_notes: Optional[str] = None
    
    # Tracking
    tracking_number: Optional[str] = None
    shipping_carrier: Optional[str] = None


class OrderStatusUpdate(BaseModel):
    status: OrderStatus
    note: Optional[str] = None


class OrderResponse(BaseModel):
    id: str
    order_number: str
    status: OrderStatus
    payment_status: PaymentStatus
    payment_method: Optional[PaymentMethod]
    
    # Customer info
    customer_name: str
    customer_email: str
    customer_phone: Optional[str]
    
    # Shipping address
    shipping_address: str
    shipping_city: str
    shipping_state: Optional[str]
    shipping_zip: Optional[str]
    shipping_country: str
    
    # Billing address
    billing_address: Optional[str]
    billing_city: Optional[str]
    billing_state: Optional[str]
    billing_zip: Optional[str]
    billing_country: Optional[str]
    
    # Totals
    subtotal: float
    shipping_cost: float
    tax_amount: float
    discount_amount: float
    total: float
    
    # Notes
    notes: Optional[str]
    internal_notes: Optional[str]
    tracking_number: Optional[str]
    shipping_carrier: Optional[str]
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    shipped_at: Optional[datetime]
    delivered_at: Optional[datetime]
    cancelled_at: Optional[datetime]
    
    # Relations
    items: List[OrderItemResponse] = []
    status_history: List[OrderStatusHistoryResponse] = []

    class Config:
        from_attributes = True


class OrderListResponse(BaseModel):
    """Simplified order for list view"""
    id: str
    order_number: str
    status: OrderStatus
    payment_status: PaymentStatus
    payment_method: Optional[PaymentMethod]
    customer_name: str
    customer_email: str
    total: float
    items_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# Pagination Models
# ==========================================

class OrderListParams(BaseModel):
    page: int = 1
    per_page: int = 20
    status: Optional[OrderStatus] = None
    payment_status: Optional[PaymentStatus] = None
    search: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    sort_by: str = "created_at"
    sort_order: str = "desc"


class PaginatedOrderResponse(BaseModel):
    items: List[OrderListResponse]
    total: int
    page: int
    per_page: int
    total_pages: int



