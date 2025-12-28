from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from supabase import Client
from supabase_client import get_supabase_client, get_supabase_admin_client
from prisma_client import get_prisma_client
from routers.auth import get_current_user, get_current_admin
from models.category_models import (
    CategoryCreate,
    CategoryUpdate,
    CategoryResponse,
)
import re

router = APIRouter(prefix="/categories", tags=["categories"])


# Helper function to generate slug from name
def generate_slug(name: str) -> str:
    """Generate a URL-friendly slug from a category name."""
    # Convert to lowercase and replace spaces with hyphens
    slug = name.lower().strip()
    # Remove special characters except hyphens
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    # Replace spaces and multiple hyphens with single hyphen
    slug = re.sub(r'[\s-]+', '-', slug)
    # Remove leading/trailing hyphens
    slug = slug.strip('-')
    return slug


# Helper function to ensure unique slug
async def ensure_unique_slug(base_slug: str, exclude_id: Optional[str] = None) -> str:
    """Ensure the slug is unique by appending a number if needed."""
    prisma = await get_prisma_client()
    slug = base_slug
    counter = 1
    
    while True:
        existing = await prisma.category.find_unique(where={"slug": slug})
        if not existing or (exclude_id and existing.id == exclude_id):
            break
        slug = f"{base_slug}-{counter}"
        counter += 1
    
    return slug


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    category_data: CategoryCreate,
    current_admin = Depends(get_current_admin)
):
    """
    Create a new category (admin only).
    """
    try:
        prisma = await get_prisma_client()
        
        # Generate slug from name
        base_slug = generate_slug(category_data.name)
        slug = await ensure_unique_slug(base_slug)
        
        # Validate parent_id if provided
        if category_data.parent_id:
            parent = await prisma.category.find_unique(where={"id": category_data.parent_id})
            if not parent:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Parent category not found"
                )
        
        # Create category
        category = await prisma.category.create(
            data={
                "name": category_data.name,
                "slug": slug,
                "description": category_data.description,
                "image": category_data.image,
                "parentId": category_data.parent_id,
                "displayOrder": category_data.display_order,
                "isActive": category_data.is_active,
            }
        )
        
        # Format dates
        created_at_str = category.createdAt.isoformat() if category.createdAt else None
        updated_at_str = category.updatedAt.isoformat() if category.updatedAt else None
        
        return CategoryResponse(
            id=category.id,
            name=category.name,
            slug=category.slug,
            description=category.description,
            image=category.image,
            parent_id=category.parentId,
            display_order=category.displayOrder,
            is_active=category.isActive,
            created_at=created_at_str or "",
            updated_at=updated_at_str or "",
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create category: {str(e)}"
        )


@router.get("", response_model=List[CategoryResponse])
async def list_categories(
    include_inactive: bool = False,
    current_user = Depends(get_current_user)
):
    """
    List all categories (all authenticated users can read).
    Optimized with database-level sorting and efficient child loading.
    """
    try:
        prisma = await get_prisma_client()
        
        # Build where clause
        where_clause = {}
        if not include_inactive:
            where_clause["isActive"] = True
        
        # Fetch all categories with DB-level sorting (uses index on displayOrder, name)
        categories = await prisma.category.find_many(
            where=where_clause,
            include={
                "children": {
                    "where": where_clause if not include_inactive else {},
                    "order_by": [
                        {"displayOrder": "asc"},
                        {"name": "asc"}
                    ]
                }
            },
            order=[
                {"displayOrder": "asc"},
                {"name": "asc"}
            ]
        )
        
        # Build response with nested children (already sorted from DB)
        def build_category_response(category):
            created_at_str = category.createdAt.isoformat() if category.createdAt else ""
            updated_at_str = category.updatedAt.isoformat() if category.updatedAt else ""
            
            children = None
            if hasattr(category, 'children') and category.children:
                # Children already sorted by DB query
                children = [build_category_response(child) for child in category.children]
            
            return CategoryResponse(
                id=category.id,
                name=category.name,
                slug=category.slug,
                description=category.description,
                image=category.image,
                parent_id=category.parentId,
                display_order=category.displayOrder,
                is_active=category.isActive,
                created_at=created_at_str,
                updated_at=updated_at_str,
                children=children,
            )
        
        # Only return root categories (parentId is null) - tree structure
        result = [build_category_response(cat) for cat in categories if not cat.parentId]
        
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch categories: {str(e)}"
        )


@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(
    category_id: str,
    current_user = Depends(get_current_user)
):
    """
    Get a single category by ID (all authenticated users can read).
    """
    try:
        prisma = await get_prisma_client()
        
        category = await prisma.category.find_unique(
            where={"id": category_id},
            include={"children": True, "parent": True}
        )
        
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )
        
        created_at_str = category.createdAt.isoformat() if category.createdAt else ""
        updated_at_str = category.updatedAt.isoformat() if category.updatedAt else ""
        
        children = None
        if hasattr(category, 'children') and category.children:
            children = [
                CategoryResponse(
                    id=child.id,
                    name=child.name,
                    slug=child.slug,
                    description=child.description,
                    image=child.image,
                    parent_id=child.parentId,
                    display_order=child.displayOrder,
                    is_active=child.isActive,
                    created_at=child.createdAt.isoformat() if child.createdAt else "",
                    updated_at=child.updatedAt.isoformat() if child.updatedAt else "",
                )
                for child in category.children
            ]
        
        return CategoryResponse(
            id=category.id,
            name=category.name,
            slug=category.slug,
            description=category.description,
            image=category.image,
            parent_id=category.parentId,
            display_order=category.displayOrder,
            is_active=category.isActive,
            created_at=created_at_str,
            updated_at=updated_at_str,
            children=children,
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch category: {str(e)}"
        )


@router.patch("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: str,
    category_data: CategoryUpdate,
    current_admin = Depends(get_current_admin)
):
    """
    Update a category (admin only).
    """
    try:
        prisma = await get_prisma_client()
        
        # Check if category exists
        existing = await prisma.category.find_unique(where={"id": category_id})
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )
        
        # Validate parent_id if provided
        if category_data.parent_id is not None:
            if category_data.parent_id == category_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Category cannot be its own parent"
                )
            if category_data.parent_id:
                parent = await prisma.category.find_unique(where={"id": category_data.parent_id})
                if not parent:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Parent category not found"
                    )
        
        # Prepare update data
        update_data = {}
        if category_data.name is not None:
            update_data["name"] = category_data.name
            # Regenerate slug if name changed
            base_slug = generate_slug(category_data.name)
            update_data["slug"] = await ensure_unique_slug(base_slug, exclude_id=category_id)
        if category_data.description is not None:
            update_data["description"] = category_data.description
        if category_data.image is not None:
            update_data["image"] = category_data.image
        if category_data.parent_id is not None:
            update_data["parentId"] = category_data.parent_id
        if category_data.display_order is not None:
            update_data["displayOrder"] = category_data.display_order
        if category_data.is_active is not None:
            update_data["isActive"] = category_data.is_active
        
        # Update category
        updated = await prisma.category.update(
            where={"id": category_id},
            data=update_data
        )
        
        created_at_str = updated.createdAt.isoformat() if updated.createdAt else ""
        updated_at_str = updated.updatedAt.isoformat() if updated.updatedAt else ""
        
        return CategoryResponse(
            id=updated.id,
            name=updated.name,
            slug=updated.slug,
            description=updated.description,
            image=updated.image,
            parent_id=updated.parentId,
            display_order=updated.displayOrder,
            is_active=updated.isActive,
            created_at=created_at_str,
            updated_at=updated_at_str,
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update category: {str(e)}"
        )


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: str,
    current_admin = Depends(get_current_admin)
):
    """
    Delete a category (admin only).
    Optimized with count query instead of fetching all children.
    """
    try:
        prisma = await get_prisma_client()
        
        # Check if category exists
        category = await prisma.category.find_unique(where={"id": category_id})
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )
        
        # Check if category has children (using count is more efficient than find_many)
        children_count = await prisma.category.count(where={"parentId": category_id})
        if children_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete category with subcategories. Please delete or reassign subcategories first."
            )
        
        # Delete category
        await prisma.category.delete(where={"id": category_id})
        
        return
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete category: {str(e)}"
        )

