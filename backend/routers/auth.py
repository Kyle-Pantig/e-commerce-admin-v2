from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import sys
from pathlib import Path

# Add parent directory to path to import supabase_client
# This allows importing from the backend root directory
backend_root = Path(__file__).parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from supabase_client import get_supabase_client, get_supabase_admin_client
from supabase import Client
from prisma_client import get_prisma_client
from prisma.models import enums
from prisma import Json
from datetime import datetime, timezone, timedelta
import random
import string
from services.email_service import send_otp_email, send_welcome_email
from models.auth_models import (
    UserCreate,
    UserLogin,
    AuthResponse,
    UserResponse,
    RefreshTokenRequest,
    UserListResponse,
    UserUpdateRequest,
    UserCreateByAdmin,
    DEFAULT_STAFF_PERMISSIONS,
    PERMISSION_MODULES,
)

router = APIRouter(prefix="/auth", tags=["auth"])

security = HTTPBearer()


# ==========================================
# Authentication Dependencies
# ==========================================

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


async def get_current_user_with_db(
    current_user = Depends(get_current_user)
):
    """Get current user with database info (role, permissions)."""
    try:
        prisma = await get_prisma_client()
        db_user = await prisma.user.find_unique(where={"id": current_user.id})
        
        if not db_user:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User not found in database"
            )
        
        return db_user  # Return db_user directly
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Failed to get user info: {str(e)}"
        )


def get_role_string(role) -> str:
    """Helper to get role as string regardless of enum or string type."""
    if role is None:
        return ""
    if hasattr(role, 'value'):
        return str(role.value)
    if hasattr(role, 'name'):
        return str(role.name)
    return str(role).upper()


async def get_current_admin(
    current_user = Depends(get_current_user)
):
    """Verify that the current user is an admin."""
    try:
        prisma = await get_prisma_client()
        db_user = await prisma.user.find_unique(where={"id": current_user.id})
        
        role_str = get_role_string(db_user.role) if db_user else ""
        if not db_user or role_str != "ADMIN":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        return db_user  # Return db_user directly
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Admin verification failed: {str(e)}"
        )


async def get_current_staff(
    current_user = Depends(get_current_user)
):
    """Verify that the current user is an admin or approved staff."""
    try:
        prisma = await get_prisma_client()
        db_user = await prisma.user.find_unique(where={"id": current_user.id})
        
        if not db_user:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User not found"
            )
        
        role_str = get_role_string(db_user.role)
        
        # Admin always has access
        if role_str == "ADMIN":
            return db_user  # Return db_user directly
        
        # Staff must be approved
        if role_str == "STAFF" and db_user.isApproved:
            return db_user  # Return db_user directly
        
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff or admin access required"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Staff verification failed: {str(e)}"
        )


def check_permission(module: str, required_level: str = "view"):
    """
    Factory function to create permission checker dependency.
    
    Usage:
        @router.get("/products")
        async def list_products(user = Depends(check_permission("products", "view"))):
            ...
        
        @router.post("/products")
        async def create_product(user = Depends(check_permission("products", "edit"))):
            ...
    """
    async def permission_checker(current_user = Depends(get_current_user)):
        try:
            prisma = await get_prisma_client()
            db_user = await prisma.user.find_unique(where={"id": current_user.id})
            
            if not db_user:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="User not found"
                )
            
            # Get role as string for comparison (handles both enum and string)
            role_str = get_role_string(db_user.role)
            
            # Admin has full access to everything
            if role_str == "ADMIN":
                return db_user  # Return db_user instead of trying to modify current_user
            
            # Customer has no access to admin features
            if role_str == "CUSTOMER":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied. Admin or staff access required."
                )
            
            # Staff - check specific permissions
            if role_str == "STAFF":
                if not db_user.isApproved:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Your account is pending approval"
                    )
                
                # Get permissions from database (JSON field)
                permissions = db_user.permissions or DEFAULT_STAFF_PERMISSIONS
                
                # Get permission level for the module
                user_permission = permissions.get(module, "none")
                
                # Check if user has required permission level
                permission_hierarchy = {"none": 0, "view": 1, "edit": 2}
                user_level = permission_hierarchy.get(user_permission, 0)
                required = permission_hierarchy.get(required_level, 1)
                
                if user_level < required:
                    if user_level == 0:
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail=f"You don't have access to {module}"
                        )
                    else:
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail=f"You have read-only access to {module}. Edit permission required."
                        )
                
                return db_user  # Return db_user
            
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission check failed: {str(e)}"
            )
    
    return permission_checker


async def get_current_customer(
    current_user = Depends(get_current_user)
):
    """Get current customer user (for customer-facing endpoints)."""
    try:
        prisma = await get_prisma_client()
        db_user = await prisma.user.find_unique(where={"id": current_user.id})
        
        if not db_user:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User not found"
            )
        
        role_str = get_role_string(db_user.role)
        if not db_user.isApproved and role_str != "ADMIN":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account is pending approval"
            )
        
        return db_user  # Return db_user directly
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Customer verification failed: {str(e)}"
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
        
        # Use admin client to create user directly with email_confirm: True
        # This prevents Supabase from sending confirmation emails
        try:
            admin_client = get_supabase_admin_client()
            # Create user directly with admin client - email is auto-confirmed
            admin_response = admin_client.auth.admin.create_user({
                "email": user_data.email,
                "password": user_data.password,
                "email_confirm": True,  # Auto-confirm email to prevent confirmation email
                "user_metadata": metadata
            })
            
            if not admin_response.user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to create user"
                )
            
            # Admin create_user doesn't return a session, so we need to create one
            # Sign in with password to get a session for the newly created user
            session_response = supabase.auth.sign_in_with_password({
                "email": user_data.email,
                "password": user_data.password
            })
            
            if not session_response.session:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to create session for user"
                )
            
            # Create response object matching the sign_up response structure
            class ResponseObj:
                def __init__(self, user, session):
                    self.user = user
                    self.session = session
            
            response = ResponseObj(admin_response.user, session_response.session)
                
        except Exception as admin_error:
            # If admin client fails, fall back to regular signup
            # This might send a confirmation email, but it's better than failing completely
            print(f"Warning: Admin client failed, using regular signup: {str(admin_error)}")
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
        
        # Try to auto-confirm email after creation
        try:
            admin_client = get_supabase_admin_client()
            admin_client.auth.admin.update_user_by_id(
                response.user.id,
                {"email_confirm": True}
            )
        except Exception as e:
            print(f"Warning: Failed to auto-verify email: {str(e)}")
            pass
        
        # Create user in Prisma database with role USER (needs admin approval)
        prisma = await get_prisma_client()
        db_user_created = False
        
        try:
            # Check if user already exists (might happen if signup was partially completed)
            existing_user = await prisma.user.find_unique(where={"id": response.user.id})
            
            if existing_user:
                # User already exists in database, update if needed
                await prisma.user.update(
                    where={"id": response.user.id},
                    data={
                        "email": response.user.email,
                        "fullName": user_data.full_name,
                        "isApproved": existing_user.isApproved,  # Preserve existing approval status
                    }
                )
                db_user_created = True
                print(f"User {response.user.email} already exists in database, updated")
            else:
                # Create new user in database
                created_user = await prisma.user.create(
                data={
                    "id": response.user.id,
                    "email": response.user.email,
                    "fullName": user_data.full_name,
                        "role": enums.UserRole.CUSTOMER,  # Default to CUSTOMER
                        "isApproved": False  # New users need admin approval
                }
            )
                db_user_created = True
                print(f"Successfully created user in database: {created_user.email} (ID: {created_user.id})")
        except Exception as e:
            # If Prisma fails, log the error and try to recover
            import traceback
            error_msg = str(e)
            print(f"ERROR: Failed to create user in database: {error_msg}")
            traceback.print_exc()
            
            # If it's a duplicate key error, try to find and update the user
            if "unique" in error_msg.lower() or "duplicate" in error_msg.lower():
                try:
                    # Try to find by email instead
                    existing_by_email = await prisma.user.find_unique(where={"email": response.user.email})
                    if existing_by_email:
                        # Update the existing user with the new Supabase ID if different
                        if existing_by_email.id != response.user.id:
                            await prisma.user.update(
                                where={"email": response.user.email},
                                data={"id": response.user.id}
                            )
                            db_user_created = True
                            print(f"Updated existing user with new Supabase ID: {response.user.email}")
                        else:
                            db_user_created = True
                            print(f"User already exists with same ID: {response.user.email}")
                except Exception as e2:
                    print(f"ERROR: Failed to update existing user: {str(e2)}")
                    traceback.print_exc()
            
            # If we still couldn't create the user, raise an error
            # This ensures users are always created in the database
            if not db_user_created:
                # Delete the Supabase user since we can't create in database
                try:
                    admin_client = get_supabase_admin_client()
                    admin_client.auth.admin.delete_user(response.user.id)
                    print(f"Deleted Supabase user {response.user.id} due to database creation failure")
                except Exception as delete_error:
                    print(f"Warning: Failed to delete Supabase user: {str(delete_error)}")
                
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to create user in database: {error_msg}. Please try again."
                )
        
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
    Handles both admin/staff and customer login.
    - Admin/Staff: Must be approved
    - Customer: Must have verified email
    """
    try:
        prisma = await get_prisma_client()
        
        # FIRST: Verify password with Supabase
        response = supabase.auth.sign_in_with_password({
            "email": user_data.email,
            "password": user_data.password
        })

        if not response.user or not response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        # Password is correct - now check user status in our database
        db_user = await prisma.user.find_first(where={"email": user_data.email})
        
        if not db_user:
            db_user = await prisma.user.find_unique(where={"id": response.user.id})

        if db_user:
            role_str = get_role_string(db_user.role)

            # For CUSTOMER users - check email verification AFTER password is validated
            if role_str == "CUSTOMER":
                if not db_user.emailVerified:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Please verify your email first",
                        headers={"X-Email-Unverified": "true"}
                    )
            else:
                # For STAFF/ADMIN - check approval status
                if role_str != "ADMIN" and not db_user.isApproved:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Your account is pending admin approval. Please wait for approval before signing in."
                    )
        else:
            # User exists in Supabase but not in database
            # This shouldn't happen, but handle it gracefully
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account is pending setup. Please contact support."
            )

        # Include role in response for frontend routing
        return AuthResponse(
            access_token=response.session.access_token,
            refresh_token=response.session.refresh_token,
            expires_in=response.session.expires_in,
            user={
                "id": response.user.id,
                "email": response.user.email,
                "user_metadata": {
                    **(response.user.user_metadata or {}),
                    "role": get_role_string(db_user.role) if db_user else "CUSTOMER"
                }
            }
        )
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Login failed: {str(e)}"
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user = Depends(get_current_user)):
    """
    Get current authenticated user information from Supabase and database.
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
    
    # Get user from database to check approval status, role, and permissions
    is_approved = None
    role = None
    permissions = None
    try:
        prisma = await get_prisma_client()
        # Try to find user by ID first
        db_user = await prisma.user.find_unique(where={"id": current_user.id})
        
        if db_user:
            is_approved = db_user.isApproved
            # Access role correctly - it's an enum, get its value
            if hasattr(db_user.role, 'value'):
                role = db_user.role.value
            elif isinstance(db_user.role, str):
                role = db_user.role
            else:
                role = str(db_user.role) if db_user.role else None
            
            # Get permissions for staff users
            if role == "STAFF":
                permissions = db_user.permissions or DEFAULT_STAFF_PERMISSIONS
        else:
            # User exists in Supabase but not in database
            # Try to find by email as fallback
            if not db_user:
                db_user = await prisma.user.find_unique(where={"email": current_user.email})
                if db_user:
                    is_approved = db_user.isApproved
                    if hasattr(db_user.role, 'value'):
                        role = db_user.role.value
                    elif isinstance(db_user.role, str):
                        role = db_user.role
                    else:
                        role = str(db_user.role) if db_user.role else None
                    
                    if role == "STAFF":
                        permissions = db_user.permissions or DEFAULT_STAFF_PERMISSIONS
    except Exception as e:
        # If database lookup fails, continue without role/approval status
        pass
    
    return UserResponse(
        id=current_user.id,
        email=current_user.email or "",
        full_name=full_name,
        user_metadata=current_user.user_metadata or {},
        created_at=created_at_str,
        is_approved=is_approved,
        role=role,
        permissions=permissions
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


# User management routes
@router.get("/users", response_model=list[UserListResponse])
async def list_users(
    current_user = Depends(check_permission("users", "view"))
):
    """
    List all users (admin or staff with users view permission).
    Optimized with DB-level sorting (uses index on createdAt).
    """
    try:
        prisma = await get_prisma_client()
        
        # DB-level sorting - uses index on createdAt
        users = await prisma.user.find_many(
            order={"createdAt": "desc"}
        )
        
        result = []
        for user in users:
            created_at_str = None
            if user.createdAt:
                if isinstance(user.createdAt, str):
                    created_at_str = user.createdAt
                else:
                    created_at_str = user.createdAt.isoformat()
            
            # Handle role enum correctly
            role_value = None
            if hasattr(user.role, 'value'):
                role_value = user.role.value
            elif isinstance(user.role, str):
                role_value = user.role
            else:
                role_value = str(user.role) if user.role else "CUSTOMER"
            
            result.append(UserListResponse(
                id=user.id,
                email=user.email,
                full_name=user.fullName,
                role=role_value or "CUSTOMER",
                is_approved=user.isApproved,
                created_at=created_at_str,
                permissions=user.permissions if role_value == "STAFF" else None
            ))
        
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch users: {str(e)}"
        )


@router.patch("/users/{user_id}/approval", response_model=UserListResponse)
async def update_user_approval(
    user_id: str,
    update_data: UserUpdateRequest,
    current_admin = Depends(get_current_admin)
):
    """
    Update user approval status, role, and permissions (admin only).
    """
    try:
        prisma = await get_prisma_client()
        
        # Check if user exists
        user = await prisma.user.find_unique(where={"id": user_id})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Prevent admin from changing their own approval status
        if user_id == current_admin.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot change your own approval status"
            )
        
        # Update approval status and/or role
        update_dict = {}
        if update_data.is_approved is not None:
            # Prevent declining an already approved user
            if user.isApproved and not update_data.is_approved:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot decline an already approved user. Use 'Update Role' to change their role instead."
                )
            update_dict["isApproved"] = update_data.is_approved
        
        if update_data.role:
            # Validate role value
            valid_roles = ["ADMIN", "STAFF", "CUSTOMER"]
            if update_data.role.upper() not in valid_roles:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}"
                )
            
            role_upper = update_data.role.upper()
            if role_upper == "ADMIN":
                update_dict["role"] = enums.UserRole.ADMIN
            elif role_upper == "STAFF":
                update_dict["role"] = enums.UserRole.STAFF
                # Set default permissions for new staff if not provided
                if not update_data.permissions and not user.permissions:
                    update_dict["permissions"] = Json(DEFAULT_STAFF_PERMISSIONS)
            else:
                update_dict["role"] = enums.UserRole.CUSTOMER
                # Clear permissions for non-staff users
                update_dict["permissions"] = None
        
        # Update permissions (only valid for STAFF role)
        if update_data.permissions:
            # Validate that user is or will be STAFF
            target_role = update_data.role.upper() if update_data.role else (
                user.role.value if hasattr(user.role, 'value') else str(user.role)
            )
            if target_role != "STAFF":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Permissions can only be set for STAFF role"
                )
            
            # Validate permission values
            valid_levels = ["none", "view", "edit"]
            for module, level in update_data.permissions.items():
                if module not in PERMISSION_MODULES:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Invalid permission module: {module}. Valid modules: {', '.join(PERMISSION_MODULES)}"
                    )
                if level not in valid_levels:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Invalid permission level for {module}: {level}. Must be: {', '.join(valid_levels)}"
                    )
                # Staff can never have edit permission for users
                if module == "users" and level == "edit":
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Staff cannot have edit permission for users"
                    )
            
            update_dict["permissions"] = Json(update_data.permissions) if update_data.permissions else None
        
        if not update_dict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No update data provided"
            )
        
        updated_user = await prisma.user.update(
            where={"id": user_id},
            data=update_dict
        )
        
        created_at_str = None
        if updated_user.createdAt:
            if isinstance(updated_user.createdAt, str):
                created_at_str = updated_user.createdAt
            else:
                created_at_str = updated_user.createdAt.isoformat()
        
        # Handle role enum correctly
        role_value = None
        if hasattr(updated_user.role, 'value'):
            role_value = updated_user.role.value
        elif isinstance(updated_user.role, str):
            role_value = updated_user.role
        else:
            role_value = str(updated_user.role) if updated_user.role else "CUSTOMER"
        
        return UserListResponse(
            id=updated_user.id,
            email=updated_user.email,
            full_name=updated_user.fullName,
            role=role_value or "CUSTOMER",
            is_approved=updated_user.isApproved,
            created_at=created_at_str,
            permissions=updated_user.permissions if role_value == "STAFF" else None
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update user: {str(e)}"
        )


@router.post("/users", response_model=UserListResponse)
async def create_user_by_admin(
    user_data: UserCreateByAdmin,
    current_admin = Depends(get_current_admin),
    supabase: Client = Depends(get_supabase_client)
):
    """
    Create a new user (admin only).
    Admin can specify role and approval status.
    """
    try:
        # Validate role
        valid_roles = ["ADMIN", "STAFF", "CUSTOMER"]
        role_upper = user_data.role.upper()
        if role_upper not in valid_roles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}"
            )
        
        # Prepare user metadata
        metadata = {}
        if user_data.full_name:
            metadata["full_name"] = user_data.full_name
        
        # Create user in Supabase with admin client
        admin_client = get_supabase_admin_client()
        admin_response = admin_client.auth.admin.create_user({
            "email": user_data.email,
            "password": user_data.password,
            "email_confirm": True,
            "user_metadata": metadata
        })
        
        if not admin_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create user in Supabase"
            )
        
        # Determine role enum
        if role_upper == "ADMIN":
            db_role = enums.UserRole.ADMIN
        elif role_upper == "STAFF":
            db_role = enums.UserRole.STAFF
        else:
            db_role = enums.UserRole.CUSTOMER
        
        # Set permissions for staff
        permissions = None
        if role_upper == "STAFF":
            if user_data.permissions:
                # Validate permissions
                valid_levels = ["none", "view", "edit"]
                for module, level in user_data.permissions.items():
                    if module not in PERMISSION_MODULES:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Invalid permission module: {module}"
                        )
                    if level not in valid_levels:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Invalid permission level for {module}: {level}"
                        )
                    if module == "users" and level == "edit":
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Staff cannot have edit permission for users"
                        )
                permissions = user_data.permissions
            else:
                permissions = DEFAULT_STAFF_PERMISSIONS
        
        # Create user in database
        prisma = await get_prisma_client()
        created_user = await prisma.user.create(
            data={
                "id": admin_response.user.id,
                "email": user_data.email,
                "fullName": user_data.full_name,
                "role": db_role,
                "isApproved": user_data.is_approved,
                "permissions": Json(permissions) if permissions else None
            }
        )
        
        created_at_str = created_user.createdAt.isoformat() if created_user.createdAt else None
        
        return UserListResponse(
            id=created_user.id,
            email=created_user.email,
            full_name=created_user.fullName,
            role=role_upper,
            is_approved=created_user.isApproved,
            created_at=created_at_str,
            permissions=permissions if role_upper == "STAFF" else None
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {str(e)}"
        )


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_admin = Depends(get_current_admin)
):
    """
    Delete a user (admin only).
    Also deletes the user from Supabase auth.
    """
    try:
        # Prevent admin from deleting themselves
        if user_id == current_admin.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete your own account"
            )
        
        prisma = await get_prisma_client()
        
        # Check if user exists
        user = await prisma.user.find_unique(where={"id": user_id})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Delete from Supabase auth using admin client
        # We need to find the user by email since Supabase ID may differ from our database ID
        try:
            admin_client = get_supabase_admin_client()
            
            # Find the Supabase user by email
            users_response = admin_client.auth.admin.list_users()
            supabase_user = next(
                (u for u in users_response if u.email == user.email),
                None
            )
            
            if supabase_user:
                admin_client.auth.admin.delete_user(supabase_user.id)
                print(f"Deleted Supabase user {supabase_user.id} ({user.email})")
            else:
                print(f"Warning: User {user.email} not found in Supabase Auth")
        except Exception as e:
            # Log but continue with database deletion
            print(f"Warning: Failed to delete user from Supabase: {str(e)}")
        
        # Delete from database
        await prisma.user.delete(where={"id": user_id})
        
        return {"message": "User deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete user: {str(e)}"
        )


# ==========================================
# OTP-Based Signup (For Customers)
# ==========================================

from pydantic import BaseModel, EmailStr
from typing import Optional

class SignupWithOtpRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None

class VerifyOtpRequest(BaseModel):
    email: EmailStr
    code: str

class ResendOtpRequest(BaseModel):
    email: EmailStr
    type: str = "SIGNUP"  # SIGNUP or PASSWORD_RESET


def generate_otp() -> str:
    """Generate a 6-digit OTP code."""
    return ''.join(random.choices(string.digits, k=6))


@router.post("/signup-with-otp")
async def signup_with_otp(data: SignupWithOtpRequest):
    """
    Start signup process:
    1. Create user in Supabase (email_confirm: false)
    2. Create user in our database (emailVerified: false)
    3. Send OTP email
    """
    prisma = await get_prisma_client()
    
    # Check if email already exists in users table with verified email
    existing_user = await prisma.user.find_first(
        where={"email": data.email}
    )
    
    if existing_user and existing_user.emailVerified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists"
        )
    
    # Check if there's a recent OTP for this email (rate limiting)
    existing_otp = await prisma.otpverification.find_first(
        where={
            "email": data.email,
            "type": "SIGNUP",
            "verified": False,
        },
        order={"createdAt": "desc"}
    )
    
    if existing_otp:
        time_since_created = datetime.now(timezone.utc) - existing_otp.createdAt.replace(tzinfo=timezone.utc)
        if time_since_created < timedelta(seconds=60):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Please wait before requesting a new code"
            )
    
    # Create user in Supabase with email_confirm: true
    # We track verification ourselves in our database (emailVerified field)
    # This allows Supabase login to work, but our backend checks emailVerified
    admin_client = get_supabase_admin_client()
    
    try:
        # Check if user exists in Supabase
        supabase_users = admin_client.auth.admin.list_users()
        supabase_user = next((u for u in supabase_users if u.email == data.email), None)
        
        if supabase_user:
            # User exists in Supabase - update password
            admin_client.auth.admin.update_user_by_id(
                supabase_user.id,
                {
                    "password": data.password,
                    "user_metadata": {"full_name": data.full_name},
                }
            )
            supabase_id = supabase_user.id
        else:
            # Create new user in Supabase (email confirmed in Supabase)
            # We handle our own email verification via OTP in our database
            response = admin_client.auth.admin.create_user({
                "email": data.email,
                "password": data.password,
                "email_confirm": True,  # Allow Supabase login - we check emailVerified in our DB
                "user_metadata": {"full_name": data.full_name}
            })
            supabase_id = response.user.id
    except Exception as e:
        print(f"Supabase user creation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create account. Please try again."
        )
    
    # Create or update user in our database
    if not existing_user:
        try:
            await prisma.user.create(
                data={
                    "id": supabase_id,
                    "email": data.email,
                    "fullName": data.full_name,
                    "phone": data.phone,
                    "role": "CUSTOMER",
                    "isApproved": True,  # Customers are auto-approved after OTP
                    "emailVerified": False,
                }
            )
        except Exception as e:
            print(f"Error creating user in database: {e}")
            # May already exist, try to update
            existing_user = await prisma.user.find_first(where={"email": data.email})
    
    if existing_user:
        # Update existing unverified user
        await prisma.user.update(
            where={"id": existing_user.id},
            data={
                "fullName": data.full_name,
                "phone": data.phone,
            }
        )
    
    # Delete old OTP records for this email
    await prisma.otpverification.delete_many(
        where={"email": data.email, "type": "SIGNUP"}
    )
    
    # Generate OTP
    otp_code = generate_otp()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    # Store OTP
    await prisma.otpverification.create(
        data={
            "email": data.email,
            "code": otp_code,
            "type": "SIGNUP",
            "expiresAt": expires_at,
            "verified": False,
            "attempts": 0,
        }
    )
    
    # Send OTP email
    email_sent = await send_otp_email(data.email, otp_code, "SIGNUP")
    
    if not email_sent:
        print(f"Warning: Failed to send OTP email to {data.email}")
    
    return {
        "message": "Verification code sent to your email",
        "email": data.email,
        "expires_in_minutes": 10,
    }


@router.post("/verify-otp")
async def verify_otp(data: VerifyOtpRequest):
    """
    Verify OTP and complete signup.
    Confirms the email in Supabase after successful verification.
    """
    prisma = await get_prisma_client()
    
    # Find the OTP record
    otp_record = await prisma.otpverification.find_first(
        where={
            "email": data.email,
            "type": "SIGNUP",
            "verified": False,
        },
        order={"createdAt": "desc"}
    )
    
    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No pending verification found. Please sign up again."
        )
    
    # Check if expired
    if otp_record.expiresAt.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please request a new one."
        )
    
    # Check attempts
    if otp_record.attempts >= 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Too many failed attempts. Please request a new code."
        )
    
    # Verify code
    if otp_record.code != data.code:
        # Increment attempts
        await prisma.otpverification.update(
            where={"id": otp_record.id},
            data={"attempts": otp_record.attempts + 1}
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code"
        )
    
    # Delete all OTP records for this email (cleanup)
    await prisma.otpverification.delete_many(
        where={"email": data.email, "type": "SIGNUP"}
    )
    
    # Get user from database
    user = await prisma.user.find_first(where={"email": data.email})
    
    # Confirm email in Supabase
    try:
        admin_client = get_supabase_admin_client()
        if user:
            admin_client.auth.admin.update_user_by_id(
                user.id,
                {"email_confirm": True}
            )
    except Exception as e:
        print(f"Warning: Failed to confirm email in Supabase: {e}")
    
    # Update user as email verified in our database
    if user:
        await prisma.user.update(
            where={"id": user.id},
            data={
                "emailVerified": True,
                "emailVerifiedAt": datetime.now(timezone.utc),
            }
        )
        
        # Send welcome email
        await send_welcome_email(data.email, user.fullName)
    
    return {
        "message": "Email verified successfully! You can now log in.",
        "verified": True,
    }


@router.post("/resend-otp")
async def resend_otp(data: ResendOtpRequest):
    """
    Resend OTP code.
    """
    prisma = await get_prisma_client()
    
    # Check if user exists
    user = await prisma.user.find_first(where={"email": data.email})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email"
        )
    
    if data.type == "SIGNUP" and user.emailVerified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already verified"
        )
    
    # Check rate limit
    last_otp = await prisma.otpverification.find_first(
        where={
            "email": data.email,
            "type": data.type,
        },
        order={"createdAt": "desc"}
    )
    
    if last_otp:
        time_since_created = datetime.now(timezone.utc) - last_otp.createdAt.replace(tzinfo=timezone.utc)
        if time_since_created < timedelta(seconds=60):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Please wait before requesting a new code"
            )
    
    # Delete old OTP records for this email and type
    await prisma.otpverification.delete_many(
        where={"email": data.email, "type": data.type}
    )
    
    # Generate new OTP
    otp_code = generate_otp()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    # Create new OTP record
    await prisma.otpverification.create(
        data={
            "email": data.email,
            "code": otp_code,
            "type": data.type,
            "expiresAt": expires_at,
            "verified": False,
            "attempts": 0,
        }
    )
    
    # Send OTP email
    await send_otp_email(data.email, otp_code, data.type)
    
    return {
        "message": "Verification code sent to your email",
        "email": data.email,
        "expires_in_minutes": 10,
    }

