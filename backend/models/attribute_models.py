"""
Pydantic models for attribute management endpoints.
"""

from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from enum import Enum


class AttributeType(str, Enum):
    TEXT = "TEXT"
    NUMBER = "NUMBER"
    SELECT = "SELECT"
    BOOLEAN = "BOOLEAN"


class AttributeCreate(BaseModel):
    """Model for creating a new attribute."""
    name: str
    type: AttributeType
    description: Optional[str] = None
    is_required: bool = False
    is_filterable: bool = False
    display_order: int = 0
    is_active: bool = True
    
    # Validation rules (JSON)
    validation_rules: Optional[Dict[str, Any]] = None
    
    # For SELECT type: options as list
    options: Optional[List[str]] = None
    
    # For TEXT type
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    placeholder: Optional[str] = None
    default_value: Optional[str] = None
    
    # For NUMBER type
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    step: Optional[float] = 1.0
    unit: Optional[str] = None
    
    # For BOOLEAN type
    true_label: Optional[str] = "Yes"
    false_label: Optional[str] = "No"
    
    # Category assignments
    category_ids: Optional[List[str]] = None


class AttributeUpdate(BaseModel):
    """Model for updating an existing attribute."""
    name: Optional[str] = None
    type: Optional[AttributeType] = None
    description: Optional[str] = None
    is_required: Optional[bool] = None
    is_filterable: Optional[bool] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None
    validation_rules: Optional[Dict[str, Any]] = None
    options: Optional[List[str]] = None
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    placeholder: Optional[str] = None
    default_value: Optional[str] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    step: Optional[float] = None
    unit: Optional[str] = None
    true_label: Optional[str] = None
    false_label: Optional[str] = None
    category_ids: Optional[List[str]] = None


class AttributeResponse(BaseModel):
    """Response model for attribute data."""
    id: str
    name: str
    type: str
    description: Optional[str] = None
    is_required: bool
    is_filterable: bool
    display_order: int
    is_active: bool
    validation_rules: Optional[Dict[str, Any]] = None
    options: Optional[List[str]] = None
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    placeholder: Optional[str] = None
    default_value: Optional[str] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    step: Optional[float] = None
    unit: Optional[str] = None
    true_label: Optional[str] = None
    false_label: Optional[str] = None
    category_ids: Optional[List[str]] = None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class AttributeOrderItem(BaseModel):
    """Single item for bulk reorder operation."""
    id: str
    display_order: int


class AttributeBulkReorder(BaseModel):
    """Request model for bulk reordering attributes."""
    attribute_orders: List[AttributeOrderItem]


class AttributeCategoryAssignment(BaseModel):
    """Request model for assigning/removing categories."""
    category_ids: List[str]


class AttributeBulkDelete(BaseModel):
    """Request model for bulk deleting attributes."""
    attribute_ids: List[str]


class BulkOperationResponse(BaseModel):
    """Response for bulk operations."""
    message: str
    affected_count: int


