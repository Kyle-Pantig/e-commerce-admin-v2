"""
Pydantic models for category management endpoints.
"""

from pydantic import BaseModel
from typing import Optional, List


class CategoryCreate(BaseModel):
    """Model for creating a new category."""
    name: str
    description: Optional[str] = None
    image: Optional[str] = None
    parent_id: Optional[str] = None
    display_order: int = 0
    is_active: bool = True


class CategoryUpdate(BaseModel):
    """Model for updating an existing category."""
    name: Optional[str] = None
    description: Optional[str] = None
    image: Optional[str] = None
    parent_id: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None


class CategoryResponse(BaseModel):
    """Response model for category data."""
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    image: Optional[str] = None
    parent_id: Optional[str] = None
    display_order: int
    is_active: bool
    created_at: str
    updated_at: str
    children: Optional[List["CategoryResponse"]] = None

    class Config:
        from_attributes = True

