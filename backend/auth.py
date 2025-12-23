from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional
from supabase_client import get_supabase_client, get_supabase_admin_client
from supabase import Client

router = APIRouter(prefix="/auth", tags=["auth"])

security = HTTPBearer()


# Pydantic models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int
    token_type: str = "bearer"
    user: dict


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    user_metadata: Optional[dict] = None
    created_at: Optional[str] = None


class RefreshTokenRequest(BaseModel):
    refresh_token: str


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    supabase: Client = Depends(get_supabase_client)
):
    """Get the current authenticated user from Supabase token."""
    try:
        # Get the user using the access token
        user_response = supabase.auth.get_user(credentials.credentials)
        
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return user_response.user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


# Auth routes
@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserCreate, supabase: Client = Depends(get_supabase_client)):
    """
    Sign up a new user with Supabase.
    """
    try:
        # Prepare user metadata
        metadata = {}
        if user_data.full_name:
            metadata["full_name"] = user_data.full_name
        
        # Sign up user with Supabase
        response = supabase.auth.sign_up({
            "email": user_data.email,
            "password": user_data.password,
            "options": {
                "data": metadata
            }
        })
        
        if not response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create user"
            )
        
        # Auto-confirm email using admin client (bypasses email confirmation requirement)
        # This allows users to login immediately without email confirmation
        try:
            admin_client = get_supabase_admin_client()
            # Update user to confirm email
            admin_client.auth.admin.update_user_by_id(
                response.user.id,
                {"email_confirm": True}
            )
        except Exception:
            # If admin client fails or service role key not set, continue anyway
            # User will need to confirm email manually or disable email confirmation in Supabase dashboard
            pass
        
        # Return auth response
        return AuthResponse(
            access_token=response.session.access_token if response.session else "",
            refresh_token=response.session.refresh_token if response.session else "",
            expires_in=response.session.expires_in if response.session else 3600,
            user={
                "id": response.user.id,
                "email": response.user.email,
                "user_metadata": response.user.user_metadata or {}
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Signup failed: {str(e)}"
        )


@router.post("/login", response_model=AuthResponse)
async def login(user_data: UserLogin, supabase: Client = Depends(get_supabase_client)):
    """
    Login with Supabase and get access token.
    """
    try:
        # Sign in with email and password
        response = supabase.auth.sign_in_with_password({
            "email": user_data.email,
            "password": user_data.password
        })
        
        if not response.user or not response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )
        
        return AuthResponse(
            access_token=response.session.access_token,
            refresh_token=response.session.refresh_token,
            expires_in=response.session.expires_in,
            user={
                "id": response.user.id,
                "email": response.user.email,
                "user_metadata": response.user.user_metadata or {}
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Login failed: {str(e)}"
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user = Depends(get_current_user)):
    """
    Get current authenticated user information from Supabase.
    """
    # Extract full_name from user_metadata
    full_name = None
    if current_user.user_metadata:
        full_name = current_user.user_metadata.get("full_name")
    
    # Convert created_at datetime to string if it exists
    created_at_str = None
    if current_user.created_at:
        if isinstance(current_user.created_at, str):
            created_at_str = current_user.created_at
        else:
            created_at_str = current_user.created_at.isoformat()
    
    return UserResponse(
        id=current_user.id,
        email=current_user.email or "",
        full_name=full_name,
        user_metadata=current_user.user_metadata or {},
        created_at=created_at_str
    )


@router.post("/logout")
async def logout(
    current_user = Depends(get_current_user)
):
    """
    Logout current user from Supabase.
    Note: With Supabase, logout is typically handled client-side.
    This endpoint confirms the logout action.
    """
    return {"message": "Successfully logged out"}


@router.post("/refresh", response_model=AuthResponse)
async def refresh_token(
    request: RefreshTokenRequest,
    supabase: Client = Depends(get_supabase_client)
):
    """
    Refresh access token using Supabase refresh token.
    """
    try:
        response = supabase.auth.refresh_session(request.refresh_token)
        
        if not response.user or not response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )
        
        return AuthResponse(
            access_token=response.session.access_token,
            refresh_token=response.session.refresh_token,
            expires_in=response.session.expires_in,
            user={
                "id": response.user.id,
                "email": response.user.email,
                "user_metadata": response.user.user_metadata or {}
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token refresh failed: {str(e)}"
        )
