"""
Wishlist API Router

Handles all wishlist-related endpoints for authenticated customers.
Optimized for performance with minimal database queries.
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional

from prisma_client import get_prisma_client
from routers.auth import get_current_user
from models.wishlist_models import (
    WishlistResponse,
    WishlistItemResponse,
    WishlistItemProduct,
    WishlistItemVariant,
    WishlistItemImage,
    WishlistProductIdsResponse,
    AddToWishlistRequest,
    AddToWishlistResponse,
    RemoveFromWishlistResponse,
    WishlistToggleResponse,
)

router = APIRouter(prefix="/wishlist", tags=["Wishlist"])


def build_wishlist_item_response(item) -> WishlistItemResponse:
    """Build a wishlist item response from database item."""
    product = item.product
    
    # Get primary image and all images
    primary_image = None
    images = None
    if hasattr(product, 'images') and product.images:
        # Build images list sorted by display_order, primary first
        sorted_images = sorted(
            product.images,
            key=lambda img: (0 if img.isPrimary else 1, img.displayOrder or 0)
        )
        images = [
            WishlistItemImage(
                id=img.id,
                url=img.url,
                alt_text=img.altText,
                display_order=img.displayOrder or 0,
                is_primary=img.isPrimary,
            )
            for img in sorted_images
        ]
        # Get primary image URL
        primary_img = next((img for img in product.images if img.isPrimary), None)
        if primary_img:
            primary_image = primary_img.url
        elif product.images:
            primary_image = product.images[0].url
    
    # Build variants list if product has variants
    variants = None
    if product.hasVariants and hasattr(product, 'variants') and product.variants:
        variants = [
            WishlistItemVariant(
                id=v.id,
                name=v.name,
                sku=v.sku,
                price=v.price,
                sale_price=v.salePrice,
                stock=v.stock,
                is_active=v.isActive,
                options=v.options if v.options else None,
            )
            for v in product.variants
        ]
    
    return WishlistItemResponse(
        id=item.id,
        product_id=item.productId,
        product=WishlistItemProduct(
            id=product.id,
            name=product.name,
            slug=product.slug,
            base_price=product.basePrice,
            sale_price=product.salePrice,
            primary_image=primary_image,
            images=images,
            is_new=product.isNew,
            has_variants=product.hasVariants,
            stock=product.stock,
            status=product.status,
            variants=variants,
        ),
        created_at=item.createdAt.isoformat() if item.createdAt else "",
    )


async def get_or_create_wishlist_id(prisma, user_id: str) -> str:
    """Get user's wishlist ID or create one. Returns just the ID for fast operations."""
    # Try to find existing wishlist (minimal query)
    wishlist = await prisma.wishlist.find_unique(
        where={"userId": user_id}
    )
    
    if wishlist:
        return wishlist.id
    
    # Create new wishlist
    wishlist = await prisma.wishlist.create(
        data={"userId": user_id}
    )
    return wishlist.id


@router.get("", response_model=WishlistResponse)
async def get_wishlist(current_user=Depends(get_current_user)):
    """Get current user's wishlist with all items."""
    try:
        prisma = await get_prisma_client()
        
        # Single optimized query - only load what we need
        wishlist = await prisma.wishlist.find_unique(
            where={"userId": current_user.id},
            include={
                "items": {
                    "include": {
                        "product": {
                            "include": {
                                "images": True,
                                "variants": {
                                    "where": {"isActive": True}  # Only active variants
                                }
                            }
                        }
                    },
                    "order_by": {"createdAt": "desc"}
                }
            }
        )
        
        # If no wishlist, return empty
        if not wishlist:
            return WishlistResponse(
                id="",
                user_id=current_user.id,
                items=[],
                total_items=0,
                created_at="",
                updated_at="",
            )
        
        # Filter out items with deleted/inactive products
        valid_items = [
            item for item in wishlist.items 
            if item.product and item.product.status == "ACTIVE"
        ]
        
        return WishlistResponse(
            id=wishlist.id,
            user_id=wishlist.userId,
            items=[build_wishlist_item_response(item) for item in valid_items],
            total_items=len(valid_items),
            created_at=wishlist.createdAt.isoformat() if wishlist.createdAt else "",
            updated_at=wishlist.updatedAt.isoformat() if wishlist.updatedAt else "",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get wishlist: {str(e)}")


@router.get("/product-ids", response_model=WishlistProductIdsResponse)
async def get_wishlist_product_ids(current_user=Depends(get_current_user)):
    """Get list of product IDs in user's wishlist (lightweight endpoint for UI)."""
    try:
        prisma = await get_prisma_client()
        
        # Direct query on WishlistItem - more efficient than going through Wishlist
        wishlist = await prisma.wishlist.find_unique(
            where={"userId": current_user.id}
        )
        
        if not wishlist:
            return WishlistProductIdsResponse(product_ids=[])
        
        # Get just the product IDs
        items = await prisma.wishlistitem.find_many(
            where={"wishlistId": wishlist.id}
        )
        
        return WishlistProductIdsResponse(
            product_ids=[item.productId for item in items]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get wishlist: {str(e)}")


@router.post("/add", response_model=AddToWishlistResponse)
async def add_to_wishlist(
    request: AddToWishlistRequest,
    current_user=Depends(get_current_user)
):
    """Add a product to user's wishlist."""
    try:
        prisma = await get_prisma_client()
        
        # Get wishlist ID (creates if needed)
        wishlist_id = await get_or_create_wishlist_id(prisma, current_user.id)
        
        # Check if item already exists using unique constraint
        existing_item = await prisma.wishlistitem.find_unique(
            where={
                "wishlistId_productId": {
                    "wishlistId": wishlist_id,
                    "productId": request.product_id
                }
            }
        )
        
        if existing_item:
            raise HTTPException(status_code=400, detail="Product already in wishlist")
        
        # Verify product exists and is active (single query)
        product = await prisma.product.find_unique(
            where={"id": request.product_id}
        )
        
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        if product.status != "ACTIVE":
            raise HTTPException(status_code=400, detail="Product is not available")
        
        # Add item and load product data in one query
        item = await prisma.wishlistitem.create(
            data={
                "wishlistId": wishlist_id,
                "productId": request.product_id
            },
            include={
                "product": {
                    "include": {
                        "images": True,
                        "variants": {"where": {"isActive": True}}
                    }
                }
            }
        )
        
        return AddToWishlistResponse(
            message="Product added to wishlist",
            item=build_wishlist_item_response(item)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add to wishlist: {str(e)}")


@router.delete("/remove/{product_id}", response_model=RemoveFromWishlistResponse)
async def remove_from_wishlist(
    product_id: str,
    current_user=Depends(get_current_user)
):
    """Remove a product from user's wishlist."""
    try:
        prisma = await get_prisma_client()
        
        # Get wishlist ID first
        wishlist = await prisma.wishlist.find_unique(
            where={"userId": current_user.id}
        )
        
        if not wishlist:
            raise HTTPException(status_code=404, detail="Wishlist not found")
        
        # Use unique constraint for direct delete (no find_first needed)
        try:
            await prisma.wishlistitem.delete(
                where={
                    "wishlistId_productId": {
                        "wishlistId": wishlist.id,
                        "productId": product_id
                    }
                }
            )
        except Exception:
            raise HTTPException(status_code=404, detail="Product not in wishlist")
        
        return RemoveFromWishlistResponse(message="Product removed from wishlist")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to remove from wishlist: {str(e)}")


@router.post("/toggle/{product_id}", response_model=WishlistToggleResponse)
async def toggle_wishlist(
    product_id: str,
    current_user=Depends(get_current_user)
):
    """Toggle a product in user's wishlist (add if not present, remove if present)."""
    try:
        prisma = await get_prisma_client()
        
        # Get or create wishlist ID (lightweight)
        wishlist_id = await get_or_create_wishlist_id(prisma, current_user.id)
        
        # Check if item exists using unique constraint (fast index lookup)
        existing_item = await prisma.wishlistitem.find_unique(
            where={
                "wishlistId_productId": {
                    "wishlistId": wishlist_id,
                    "productId": product_id
                }
            }
        )
        
        if existing_item:
            # Remove from wishlist - no need to fetch product data
            await prisma.wishlistitem.delete(where={"id": existing_item.id})
            return WishlistToggleResponse(
                message="Product removed from wishlist",
                is_in_wishlist=False,
                item=None
            )
        else:
            # Verify product exists and is active before adding
            product = await prisma.product.find_unique(
                where={"id": product_id}
            )
            
            if not product:
                raise HTTPException(status_code=404, detail="Product not found")
            
            if product.status != "ACTIVE":
                raise HTTPException(status_code=400, detail="Product is not available")
            
            # Add to wishlist with full product data for response
            item = await prisma.wishlistitem.create(
                data={
                    "wishlistId": wishlist_id,
                    "productId": product_id
                },
                include={
                    "product": {
                        "include": {
                            "images": True,
                            "variants": {"where": {"isActive": True}}
                        }
                    }
                }
            )
            
            return WishlistToggleResponse(
                message="Product added to wishlist",
                is_in_wishlist=True,
                item=build_wishlist_item_response(item)
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to toggle wishlist: {str(e)}")


@router.get("/check/{product_id}")
async def check_in_wishlist(
    product_id: str,
    current_user=Depends(get_current_user)
):
    """Check if a product is in user's wishlist."""
    try:
        prisma = await get_prisma_client()
        
        # Get wishlist ID
        wishlist = await prisma.wishlist.find_unique(
            where={"userId": current_user.id}
        )
        
        if not wishlist:
            return {"is_in_wishlist": False}
        
        # Use unique constraint for fast lookup
        item = await prisma.wishlistitem.find_unique(
            where={
                "wishlistId_productId": {
                    "wishlistId": wishlist.id,
                    "productId": product_id
                }
            }
        )
        
        return {"is_in_wishlist": item is not None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check wishlist: {str(e)}")


@router.delete("/clear", response_model=RemoveFromWishlistResponse)
async def clear_wishlist(current_user=Depends(get_current_user)):
    """Clear all items from user's wishlist."""
    try:
        prisma = await get_prisma_client()
        
        wishlist = await prisma.wishlist.find_unique(
            where={"userId": current_user.id}
        )
        
        if not wishlist:
            return RemoveFromWishlistResponse(message="Wishlist is already empty")
        
        await prisma.wishlistitem.delete_many(
            where={"wishlistId": wishlist.id}
        )
        
        return RemoveFromWishlistResponse(message="Wishlist cleared")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear wishlist: {str(e)}")


@router.get("/count")
async def get_wishlist_count(current_user=Depends(get_current_user)):
    """Get the count of items in user's wishlist (ultra-lightweight endpoint)."""
    try:
        prisma = await get_prisma_client()
        
        wishlist = await prisma.wishlist.find_unique(
            where={"userId": current_user.id}
        )
        
        if not wishlist:
            return {"count": 0}
        
        count = await prisma.wishlistitem.count(
            where={"wishlistId": wishlist.id}
        )
        
        return {"count": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get wishlist count: {str(e)}")
