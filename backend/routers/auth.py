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
from models.auth_models import (
    UserCreate,
    UserLogin,
    AuthResponse,
    UserResponse,
    RefreshTokenRequest,
    UserListResponse,
    UserUpdateRequest,
)

router = APIRouter(prefix="/auth", tags=["auth"])

security = HTTPBearer()


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


async def get_current_admin(
    current_user = Depends(get_current_user)
):
    """Verify that the current user is an admin."""
    try:
        prisma = await get_prisma_client()
        db_user = await prisma.user.find_unique(where={"id": current_user.id})
        
        if not db_user or db_user.role != enums.UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        return current_user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Admin verification failed: {str(e)}"
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
                        "role": enums.UserRole.USER,  # Default to USER, admin can approve later
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
    Only approved users (or admins) can login.
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
        
        # Check if user is approved in database
        try:
            prisma = await get_prisma_client()
            db_user = await prisma.user.find_unique(where={"id": response.user.id})
            
            if db_user:
                # Check approval status (admins are always approved)
                if db_user.role != enums.UserRole.ADMIN and not db_user.isApproved:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Your account is pending admin approval. Please wait for approval before signing in."
                    )
            else:
                # User exists in Supabase but not in database
                # This shouldn't happen, but handle it gracefully
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Your account is pending admin approval. Please wait for approval before signing in."
                )
        except HTTPException:
            # Re-raise HTTP exceptions (like approval errors)
            raise
        except Exception as db_error:
            # If database check fails, deny login for security
            # Better to be strict than allow unapproved users
            print(f"Error checking user approval status: {str(db_error)}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unable to verify account status. Please contact support."
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
    
    # Get user from database to check approval status and role
    is_approved = None
    role = None
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
        role=role
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
    current_user = Depends(get_current_user)
):
    """
    List all users (read-only for all authenticated users).
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
                role_value = str(user.role) if user.role else "USER"
            
            result.append(UserListResponse(
                id=user.id,
                email=user.email,
                full_name=user.fullName,
                role=role_value or "USER",
                is_approved=user.isApproved,
                created_at=created_at_str
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
    Update user approval status (admin only).
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
            if update_data.role.upper() not in ["USER", "ADMIN"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid role. Must be USER or ADMIN"
                )
            update_dict["role"] = enums.UserRole.ADMIN if update_data.role.upper() == "ADMIN" else enums.UserRole.USER
        
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
            role_value = str(updated_user.role) if updated_user.role else "USER"
        
        return UserListResponse(
            id=updated_user.id,
            email=updated_user.email,
            full_name=updated_user.fullName,
            role=role_value or "USER",
            is_approved=updated_user.isApproved,
            created_at=created_at_str
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
        try:
            admin_client = get_supabase_admin_client()
            admin_client.auth.admin.delete_user(user_id)
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

