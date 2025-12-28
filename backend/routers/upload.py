from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from typing import Optional
from supabase import Client
from supabase_client import get_supabase_admin_client
from routers.auth import get_current_user
import uuid
from datetime import datetime

router = APIRouter(prefix="/upload", tags=["upload"])


@router.post("/image", status_code=status.HTTP_201_CREATED)
async def upload_image(
    file: UploadFile = File(...),
    folder: Optional[str] = "categories",
    bucket: Optional[str] = "categories",
    product_id: Optional[str] = None,
    current_user = Depends(get_current_user)
):
    """
    Upload an image to Supabase Storage (authenticated users only).
    
    Args:
        file: The image file to upload
        folder: The folder in storage (default: "categories")
        bucket: The storage bucket to use (default: "categories", can be "products")
        product_id: Optional product ID to organize images under products/{product_id}/
    
    Returns:
        The public URL of the uploaded image
    """
    try:
        # Validate file type
        allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type. Allowed types: {', '.join(allowed_types)}"
            )
        
        # Validate file size (max 1MB for all uploads)
        max_size = 1 * 1024 * 1024  # 1MB
        file_content = await file.read()
        if len(file_content) > max_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size exceeds maximum limit of 1MB"
            )
        
        # Generate unique filename
        file_extension = file.filename.split(".")[-1] if "." in file.filename else "jpg"
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        
        # Build file path - organize by product_id if provided for products bucket
        if bucket == "products" and product_id:
            # Organize: products/{product_id}/{filename}
            file_path = f"{product_id}/{unique_filename}"
        else:
            # Default: {folder}/{filename}
            file_path = f"{folder}/{unique_filename}"
        
        # Upload to Supabase Storage
        admin_client = get_supabase_admin_client()
        
        # Use specified bucket (categories or products)
        bucket_name = bucket if bucket in ["categories", "products"] else "categories"
        
        # Ensure the bucket exists (create if it doesn't)
        try:
            # Try to get bucket info to check if it exists
            admin_client.storage.from_(bucket_name).list()
        except Exception:
            # If bucket doesn't exist, we'll handle it in the upload
            pass
        
        # Upload file
        try:
            upload_response = admin_client.storage.from_(bucket_name).upload(
                file_path,
                file_content,
                file_options={
                    "content-type": file.content_type,
                }
            )
        except Exception as upload_error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload file: {str(upload_error)}"
            )
        
        # Get public URL
        try:
            public_url_response = admin_client.storage.from_(bucket_name).get_public_url(file_path)
        except Exception as url_error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get public URL for uploaded file: {str(url_error)}"
            )
        
        return {
            "url": public_url_response,
            "path": file_path,
            "filename": unique_filename,
            "size": len(file_content),
            "content_type": file.content_type
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload image: {str(e)}"
        )


@router.delete("/image/{file_path:path}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_image(
    file_path: str,
    bucket: Optional[str] = "categories",
    current_user = Depends(get_current_user)
):
    """
    Delete an image from Supabase Storage (authenticated users only).
    
    Args:
        file_path: The path to the file in storage (e.g., "categories/uuid.jpg" or "product-id/uuid.jpg")
        bucket: The storage bucket (default: "categories", can be "products")
    """
    try:
        admin_client = get_supabase_admin_client()
        
        # Use specified bucket
        bucket_name = bucket if bucket in ["categories", "products"] else "categories"
        
        # Delete file
        delete_response = admin_client.storage.from_(bucket_name).remove([file_path])
        
        if delete_response.get("error"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete file: {delete_response['error']}"
            )
        
        return
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete image: {str(e)}"
        )

