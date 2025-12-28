"""
Pydantic models for authentication and user management endpoints.
"""

from pydantic import BaseModel, EmailStr
from typing import Optional


class UserCreate(BaseModel):
    """Model for user registration."""
    email: EmailStr
    password: str
    full_name: Optional[str] = None


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


class UserUpdateRequest(BaseModel):
    """Model for updating user approval status and role."""
    is_approved: Optional[bool] = None
    role: Optional[str] = None

