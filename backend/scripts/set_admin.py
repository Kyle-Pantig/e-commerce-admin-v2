"""
Script to set kylepantig@gmail.com as ADMIN in the database.
Run this script to set the initial admin user.
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
backend_root = Path(__file__).parent.parent
sys.path.insert(0, str(backend_root))

from prisma_client import get_prisma_client, disconnect_prisma
from supabase_client import get_supabase_admin_client
from prisma import Prisma
from prisma.models import enums


async def set_admin():
    """Set kylepantig@gmail.com as ADMIN."""
    email = "kylepantig@gmail.com"
    
    try:
        prisma = await get_prisma_client()
        supabase_admin = get_supabase_admin_client()
        
        # Get user from Supabase auth
        try:
            users_response = supabase_admin.auth.admin.list_users()
            # The response is a list of users
            users_list = users_response if isinstance(users_response, list) else getattr(users_response, 'users', users_response)
            supabase_user = None
            for user in users_list:
                if hasattr(user, 'email') and user.email == email:
                    supabase_user = user
                    break
            
            if not supabase_user:
                print(f"[ERROR] User {email} not found in Supabase authentication.")
                print("  Please create the user in Supabase first.")
                return False
            
            supabase_user_id = supabase_user.id
            print(f"[SUCCESS] Found user in Supabase: {supabase_user_id}")
            
        except Exception as e:
            print(f"[ERROR] Error fetching user from Supabase: {e}")
            import traceback
            traceback.print_exc()
            return False
        
        # Check if user exists in database
        user = await prisma.user.find_unique(where={"email": email})
        
        if user:
            # Update existing user to ADMIN
            updated_user = await prisma.user.update(
                where={"email": email},
                data={"role": enums.UserRole.ADMIN}
            )
            print(f"[SUCCESS] Updated {email} to ADMIN role")
            print(f"  User ID: {updated_user.id}")
            print(f"  Role: {updated_user.role}")
        else:
            # Create new user as ADMIN
            created_user = await prisma.user.create(
                data={
                    "id": supabase_user_id,
                    "email": email,
                    "fullName": supabase_user.user_metadata.get("full_name") if supabase_user.user_metadata else None,
                    "role": enums.UserRole.ADMIN
                }
            )
            print(f"[SUCCESS] Created {email} as ADMIN")
            print(f"  User ID: {created_user.id}")
            print(f"  Role: {created_user.role}")
            
    except Exception as e:
        print(f"[ERROR] Error setting admin: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        await disconnect_prisma()
    
    return True


if __name__ == "__main__":
    success = asyncio.run(set_admin())
    sys.exit(0 if success else 1)

