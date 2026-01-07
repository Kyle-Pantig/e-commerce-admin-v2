"""
Inventory Management Models
Provides models for stock adjustments, history tracking, and bulk operations
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum
from datetime import datetime


class StockAdjustmentType(str, Enum):
    INCREASE = "INCREASE"
    DECREASE = "DECREASE"
    SALE = "SALE"
    RETURN = "RETURN"
    RESTOCK = "RESTOCK"
    CORRECTION = "CORRECTION"
    DAMAGE = "DAMAGE"
    EXPIRED = "EXPIRED"
    TRANSFER_IN = "TRANSFER_IN"
    TRANSFER_OUT = "TRANSFER_OUT"
    INITIAL = "INITIAL"


# ==========================================
# Stock Adjustment Models
# ==========================================

class StockAdjustmentCreate(BaseModel):
    """Create a stock adjustment"""
    product_id: Optional[str] = None
    variant_id: Optional[str] = None
    type: StockAdjustmentType
    quantity: int = Field(..., description="Positive for increase, negative for decrease")
    reason: Optional[str] = None
    notes: Optional[str] = None


class StockAdjustmentResponse(BaseModel):
    """Stock adjustment response"""
    id: str
    product_id: Optional[str] = None
    variant_id: Optional[str] = None
    type: StockAdjustmentType
    quantity: int
    previous_stock: int
    new_stock: int
    order_id: Optional[str] = None
    reason: Optional[str] = None
    notes: Optional[str] = None
    adjusted_by: Optional[str] = None
    created_at: datetime
    
    # Related data
    product_name: Optional[str] = None
    variant_name: Optional[str] = None
    
    class Config:
        from_attributes = True


class StockHistoryResponse(BaseModel):
    """Paginated stock history response"""
    items: List[StockAdjustmentResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


# ==========================================
# Bulk Operations Models
# ==========================================

class BulkStockAdjustmentItem(BaseModel):
    """Single item in a bulk stock adjustment"""
    product_id: Optional[str] = None
    variant_id: Optional[str] = None
    quantity: int


class BulkStockAdjustmentCreate(BaseModel):
    """Create multiple stock adjustments at once"""
    type: StockAdjustmentType
    items: List[BulkStockAdjustmentItem] = Field(..., min_length=1)
    reason: Optional[str] = None
    notes: Optional[str] = None


class BulkStockAdjustmentResponse(BaseModel):
    """Response for bulk stock adjustment"""
    success_count: int
    failed_count: int
    adjustments: List[StockAdjustmentResponse]
    errors: List[dict] = []


# ==========================================
# Stock Reports Models
# ==========================================

class StockSummary(BaseModel):
    """Overall stock summary"""
    total_products: int
    total_variants: int
    total_stock_value: float
    low_stock_count: int
    out_of_stock_count: int
    overstocked_count: int


class ProductStockReport(BaseModel):
    """Stock report for a single product"""
    id: str
    name: str
    slug: str
    sku: Optional[str] = None
    stock: int
    low_stock_threshold: Optional[int] = None
    has_variants: bool
    status: str  # "in_stock", "low_stock", "out_of_stock"
    image: Optional[str] = None
    
    # Variant breakdown if applicable
    variants: Optional[List[dict]] = None
    
    # Stock value
    base_price: float
    stock_value: float
    
    # Recent activity
    last_adjustment: Optional[datetime] = None
    adjustments_this_month: int = 0


class StockMovementReport(BaseModel):
    """Stock movement summary for a period"""
    period_start: datetime
    period_end: datetime
    
    # Totals
    total_in: int
    total_out: int
    net_change: int
    
    # By type
    by_type: dict  # {type: count}
    
    # Top products
    top_products_in: List[dict]
    top_products_out: List[dict]


class LowStockAlert(BaseModel):
    """Low stock alert item"""
    id: str
    type: str  # "product" or "variant"
    product_id: str
    variant_id: Optional[str] = None
    name: str
    slug: str  # Product slug for URL navigation
    sku: Optional[str] = None
    current_stock: int
    threshold: int
    status: str  # "low_stock" or "out_of_stock"
    image: Optional[str] = None
    days_until_stockout: Optional[int] = None  # Based on average sales


class LowStockAlertsResponse(BaseModel):
    """Low stock alerts response"""
    alerts: List[LowStockAlert]
    total_low_stock: int
    total_out_of_stock: int
    critical_count: int  # Items that need immediate attention

