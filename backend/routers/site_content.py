from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from prisma import Json

from prisma_client import get_prisma_client
from models.site_content_models import (
    SiteContentResponse,
    SiteContentCreate,
    SiteContentUpdate,
    SiteContentListResponse,
)
from routers.auth import check_permission, get_current_user

router = APIRouter(prefix="/site-content", tags=["site-content"])


# Helper to convert Prisma model to response
def to_response(item) -> SiteContentResponse:
    return SiteContentResponse(
        id=item.id,
        key=item.key,
        title=item.title,
        content=item.content,
        is_active=item.isActive,
        created_at=item.createdAt,
        updated_at=item.updatedAt,
        updated_by=item.updatedBy,
    )


@router.get("", response_model=SiteContentListResponse)
async def list_site_content(
    is_active: Optional[bool] = None,
    current_user = Depends(check_permission("products", "view")),
):
    """List all site content items"""
    prisma = await get_prisma_client()
    
    where = {}
    if is_active is not None:
        where["isActive"] = is_active
    
    items = await prisma.sitecontent.find_many(
        where=where,
        order={"key": "asc"},
    )
    
    return SiteContentListResponse(
        items=[to_response(item) for item in items],
        total=len(items),
    )


@router.get("/public/{key}")
async def get_public_site_content(key: str):
    """Get active site content for public display (no auth required)"""
    prisma = await get_prisma_client()
    
    item = await prisma.sitecontent.find_unique(where={"key": key})
    
    if not item or not item.isActive:
        return {"content": None}
    
    return {"content": item.content}


@router.get("/{key}", response_model=SiteContentResponse)
async def get_site_content(
    key: str,
    current_user = Depends(check_permission("products", "view")),
):
    """Get site content by key"""
    prisma = await get_prisma_client()
    
    item = await prisma.sitecontent.find_unique(where={"key": key})
    
    if not item:
        raise HTTPException(status_code=404, detail="Site content not found")
    
    return to_response(item)


@router.post("", response_model=SiteContentResponse)
async def create_site_content(
    data: SiteContentCreate,
    current_user = Depends(check_permission("products", "edit")),
):
    """Create new site content"""
    prisma = await get_prisma_client()
    
    # Check if key already exists
    existing = await prisma.sitecontent.find_unique(where={"key": data.key})
    if existing:
        raise HTTPException(status_code=400, detail="Site content with this key already exists")
    
    item = await prisma.sitecontent.create(
        data={
            "key": data.key,
            "title": data.title,
            "content": Json(data.content) if data.content else Json({}),
            "isActive": data.is_active,
            "updatedBy": current_user.id,
        }
    )
    
    return to_response(item)


@router.patch("/{key}", response_model=SiteContentResponse)
async def update_site_content(
    key: str,
    data: SiteContentUpdate,
    current_user = Depends(check_permission("products", "edit")),
):
    """Update site content by key"""
    prisma = await get_prisma_client()
    
    # Check if exists
    existing = await prisma.sitecontent.find_unique(where={"key": key})
    if not existing:
        raise HTTPException(status_code=404, detail="Site content not found")
    
    # Build update data
    update_data = {"updatedBy": current_user.id}
    fields_set = data.model_fields_set
    
    if "title" in fields_set:
        update_data["title"] = data.title
    if "content" in fields_set and data.content is not None:
        update_data["content"] = Json(data.content)
    if "is_active" in fields_set and data.is_active is not None:
        update_data["isActive"] = data.is_active
    
    item = await prisma.sitecontent.update(
        where={"key": key},
        data=update_data,
    )
    
    return to_response(item)


@router.delete("/{key}")
async def delete_site_content(
    key: str,
    current_user = Depends(check_permission("products", "edit")),
):
    """Delete site content by key"""
    prisma = await get_prisma_client()
    
    # Check if exists
    existing = await prisma.sitecontent.find_unique(where={"key": key})
    if not existing:
        raise HTTPException(status_code=404, detail="Site content not found")
    
    await prisma.sitecontent.delete(where={"key": key})
    
    return {"message": "Site content deleted successfully"}


@router.post("/{key}/toggle", response_model=SiteContentResponse)
async def toggle_site_content(
    key: str,
    current_user = Depends(check_permission("products", "edit")),
):
    """Toggle site content active status"""
    prisma = await get_prisma_client()
    
    item = await prisma.sitecontent.find_unique(where={"key": key})
    if not item:
        raise HTTPException(status_code=404, detail="Site content not found")
    
    updated = await prisma.sitecontent.update(
        where={"key": key},
        data={
            "isActive": not item.isActive,
            "updatedBy": current_user.id,
        },
    )
    
    return to_response(updated)


@router.put("/{key}", response_model=SiteContentResponse)
async def upsert_site_content(
    key: str,
    data: SiteContentUpdate,
    current_user = Depends(check_permission("products", "edit")),
):
    """Create or update site content by key"""
    prisma = await get_prisma_client()
    
    # Build update data - only include fields that are set
    update_data = {"updatedBy": current_user.id}
    if data.title is not None:
        update_data["title"] = data.title
    if data.content is not None:
        update_data["content"] = Json(data.content)
    if data.is_active is not None:
        update_data["isActive"] = data.is_active
    
    item = await prisma.sitecontent.upsert(
        where={"key": key},
        data={
            "create": {
                "key": key,
                "title": data.title,
                "content": Json(data.content) if data.content else Json({}),
                "isActive": data.is_active if data.is_active is not None else True,
                "updatedBy": current_user.id,
            },
            "update": update_data,
        },
    )
    
    return to_response(item)
