"""
Pydantic models for authentication and user management endpoints.
"""

from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Literal
from enum import Enum


# ==========================================
# Role and Permission Enums
# ==========================================

class UserRole(str, Enum):
    """User roles in the system."""
    ADMIN = "ADMIN"       # Full access to everything
    STAFF = "STAFF"       # Controlled permissions per module
    CUSTOMER = "CUSTOMER" # E-commerce customer


class PermissionLevel(str, Enum):
    """Permission levels for staff users."""
    NONE = "none"   # No access
    VIEW = "view"   # Read-only access
    EDIT = "edit"   # Full CRUD access


# Permission modules that can be controlled
PERMISSION_MODULES = [
    "products",     # Product management
    "orders",       # Order management
    "inventory",    # Stock/inventory management
    "categories",   # Category management
    "attributes",   # Attribute management
    "analytics",    # Analytics and reports
    "users",        # User management (view only for staff)
]

# Default permissions for new staff users (view-only for everything)
DEFAULT_STAFF_PERMISSIONS = {
    "products": "view",
    "orders": "view",
    "inventory": "view",
    "categories": "view",
    "attributes": "view",
    "analytics": "view",
    "users": "none",
}


# ==========================================
# Permission Models
# ==========================================

class StaffPermissions(BaseModel):
    """Permissions configuration for staff users."""
    products: PermissionLevel = PermissionLevel.VIEW
    orders: PermissionLevel = PermissionLevel.VIEW
    inventory: PermissionLevel = PermissionLevel.VIEW
    categories: PermissionLevel = PermissionLevel.VIEW
    attributes: PermissionLevel = PermissionLevel.VIEW
    analytics: PermissionLevel = PermissionLevel.VIEW
    users: PermissionLevel = PermissionLevel.NONE  # Staff can never edit users

    class Config:
        use_enum_values = True


# ==========================================
# Auth Models
# ==========================================

class UserCreate(BaseModel):
    """Model for user registration."""
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    role: Optional[str] = None  # Admin can specify role when creating users


class UserLogin(BaseModel):
    """Model for user login."""
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    """Response model for authentication endpoints."""
    access_token: str
    refresh_token: str
    expires_in: int
    token_type: str = "bearer"
    user: dict


class UserResponse(BaseModel):
    """Response model for user information."""
    id: str
    email: str
    full_name: Optional[str] = None
    user_metadata: Optional[dict] = None
    created_at: Optional[str] = None
    is_approved: Optional[bool] = None
    role: Optional[str] = None
    permissions: Optional[Dict[str, str]] = None  # Staff permissions


class RefreshTokenRequest(BaseModel):
    """Model for token refresh request."""
    refresh_token: str


class UserListResponse(BaseModel):
    """Response model for user list."""
    id: str
    email: str
    full_name: Optional[str] = None
    role: str
    is_approved: bool
    created_at: Optional[str] = None
    permissions: Optional[Dict[str, str]] = None  # Staff permissions


class UserUpdateRequest(BaseModel):
    """Model for updating user approval status, role, and permissions."""
    is_approved: Optional[bool] = None
    role: Optional[str] = None
    permissions: Optional[Dict[str, str]] = None  # For STAFF role


class UserCreateByAdmin(BaseModel):
    """Model for admin creating a new user."""
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    role: str = "CUSTOMER"
    is_approved: bool = False
    permissions: Optional[Dict[str, str]] = None  # For STAFF role

