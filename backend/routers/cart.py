"""
Cart API Router

Handles all cart-related endpoints for authenticated customers.
Optimized for performance with minimal database queries.
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional

from prisma_client import get_prisma_client
from routers.auth import get_current_user
from models.cart_models import (
    CartResponse,
    CartItemResponse,
    CartItemProduct,
    CartItemVariant,
    AddToCartRequest,
    AddToCartResponse,
    UpdateCartItemRequest,
    UpdateCartItemResponse,
    ChangeCartItemVariantRequest,
    RemoveFromCartResponse,
    CartCountResponse,
    SyncCartRequest,
    SyncCartResponse,
)

router = APIRouter(prefix="/cart", tags=["Cart"])


def get_effective_price(product, variant=None) -> float:
    """Calculate the effective price for a product/variant."""
    if variant:
        # Variant pricing
        if variant.salePrice and variant.salePrice > 0:
            return variant.salePrice
        if variant.price and variant.price > 0:
            return variant.price
    # Product pricing
    if product.salePrice and product.salePrice > 0:
        return product.salePrice
    return product.basePrice


def build_cart_item_response(item) -> CartItemResponse:
    """Build a cart item response from database item."""
    product = item.product
    variant = item.variant
    
    # Get primary image
    primary_image = None
    if hasattr(product, 'images') and product.images:
        primary_img = next((img for img in product.images if img.isPrimary), None)
        if primary_img:
            primary_image = primary_img.url
        elif product.images:
            primary_image = product.images[0].url
    
    # Build variant response
    variant_response = None
    if variant:
        variant_response = CartItemVariant(
            id=variant.id,
            name=variant.name,
            sku=variant.sku,
            price=variant.price,
            sale_price=variant.salePrice,
            stock=variant.stock,
            is_active=variant.isActive,
            options=variant.options if variant.options else None,
            image_url=variant.imageUrl,
        )
    
    # Calculate current price
    current_price = get_effective_price(product, variant)
    subtotal = current_price * item.quantity
    price_changed = abs(current_price - item.priceAtAdd) > 0.01
    
    return CartItemResponse(
        id=item.id,
        product_id=item.productId,
        variant_id=item.variantId,
        quantity=item.quantity,
        options=item.options if item.options else None,
        price_at_add=item.priceAtAdd,
        product=CartItemProduct(
            id=product.id,
            name=product.name,
            slug=product.slug,
            base_price=product.basePrice,
            sale_price=product.salePrice,
            primary_image=primary_image,
            has_variants=product.hasVariants,
            stock=product.stock,
            status=product.status,
        ),
        variant=variant_response,
        current_price=current_price,
        subtotal=subtotal,
        price_changed=price_changed,
        created_at=item.createdAt.isoformat() if item.createdAt else "",
        updated_at=item.updatedAt.isoformat() if item.updatedAt else "",
    )


async def get_or_create_cart_id(prisma, user_id: str) -> str:
    """Get user's cart ID or create one. Returns just the ID for fast operations."""
    cart = await prisma.cart.find_unique(where={"userId": user_id})
    
    if cart:
        return cart.id
    
    cart = await prisma.cart.create(data={"userId": user_id})
    return cart.id


@router.get("", response_model=CartResponse)
async def get_cart(current_user=Depends(get_current_user)):
    """Get current user's cart with all items."""
    try:
        prisma = await get_prisma_client()
        
        cart = await prisma.cart.find_unique(
            where={"userId": current_user.id},
            include={
                "items": {
                    "include": {
                        "product": {
                            "include": {
                                "images": True
                            }
                        },
                        "variant": True
                    },
                    "order_by": {"createdAt": "desc"}
                }
            }
        )
        
        if not cart:
            return CartResponse(
                id="",
                user_id=current_user.id,
                items=[],
                total_items=0,
                subtotal=0.0,
                created_at="",
                updated_at="",
            )
        
        # Filter out items with deleted/inactive products
        valid_items = [
            item for item in cart.items 
            if item.product and item.product.status == "ACTIVE"
        ]
        
        items_response = [build_cart_item_response(item) for item in valid_items]
        total_items = sum(item.quantity for item in items_response)
        subtotal = sum(item.subtotal for item in items_response)
        
        return CartResponse(
            id=cart.id,
            user_id=cart.userId,
            items=items_response,
            total_items=total_items,
            subtotal=subtotal,
            created_at=cart.createdAt.isoformat() if cart.createdAt else "",
            updated_at=cart.updatedAt.isoformat() if cart.updatedAt else "",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get cart: {str(e)}")


@router.post("/add", response_model=AddToCartResponse)
async def add_to_cart(
    request: AddToCartRequest,
    current_user=Depends(get_current_user)
):
    """Add a product to user's cart."""
    try:
        prisma = await get_prisma_client()
        
        # Get or create cart
        cart_id = await get_or_create_cart_id(prisma, current_user.id)
        
        # Verify product exists and is active
        product = await prisma.product.find_unique(
            where={"id": request.product_id},
            include={"images": True}
        )
        
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        if product.status != "ACTIVE":
            raise HTTPException(status_code=400, detail="Product is not available")
        
        # Verify variant if provided
        variant = None
        if request.variant_id:
            variant = await prisma.productvariant.find_unique(
                where={"id": request.variant_id}
            )
            if not variant:
                raise HTTPException(status_code=404, detail="Variant not found")
            if not variant.isActive:
                raise HTTPException(status_code=400, detail="Variant is not available")
            if variant.productId != request.product_id:
                raise HTTPException(status_code=400, detail="Variant does not belong to product")
        
        # Check stock
        available_stock = variant.stock if variant else product.stock
        if available_stock < request.quantity:
            raise HTTPException(status_code=400, detail=f"Only {available_stock} items available")
        
        # Calculate price at add time
        price_at_add = get_effective_price(product, variant)
        
        # Check if item already exists in cart
        # Query all items for this product and filter by variant
        cart_items = await prisma.cartitem.find_many(
            where={
                "cartId": cart_id,
                "productId": request.product_id,
            }
        )
        
        # Find matching item (with same variant or both null)
        existing_item = None
        for item in cart_items:
            if item.variantId == request.variant_id:
                existing_item = item
                break
        
        if existing_item:
            # Update quantity
            new_quantity = existing_item.quantity + request.quantity
            if new_quantity > available_stock:
                raise HTTPException(status_code=400, detail=f"Cannot add more. Only {available_stock} items available")
            
            item = await prisma.cartitem.update(
                where={"id": existing_item.id},
                data={
                    "quantity": new_quantity,
                    "priceAtAdd": price_at_add  # Update price
                },
                include={
                    "product": {"include": {"images": True}},
                    "variant": True
                }
            )
            message = "Cart updated"
        else:
            # Create new cart item using Prisma relation connections
            create_data = {
                "cart": {"connect": {"id": cart_id}},
                "product": {"connect": {"id": request.product_id}},
                "quantity": request.quantity,
                "priceAtAdd": price_at_add
            }
            
            # Only include variant connection if provided
            if request.variant_id:
                create_data["variant"] = {"connect": {"id": request.variant_id}}
            
            item = await prisma.cartitem.create(
                data=create_data,
                include={
                    "product": {"include": {"images": True}},
                    "variant": True
                }
            )
            message = "Added to cart"
        
        return AddToCartResponse(
            message=message,
            item=build_cart_item_response(item)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add to cart: {str(e)}")


@router.patch("/item/{item_id}", response_model=UpdateCartItemResponse)
async def update_cart_item(
    item_id: str,
    request: UpdateCartItemRequest,
    current_user=Depends(get_current_user)
):
    """Update cart item quantity. Set quantity to 0 to remove."""
    try:
        prisma = await get_prisma_client()
        
        # Get cart
        cart = await prisma.cart.find_unique(where={"userId": current_user.id})
        if not cart:
            raise HTTPException(status_code=404, detail="Cart not found")
        
        # Find item and verify ownership
        item = await prisma.cartitem.find_unique(
            where={"id": item_id},
            include={
                "product": {"include": {"images": True}},
                "variant": True
            }
        )
        
        if not item or item.cartId != cart.id:
            raise HTTPException(status_code=404, detail="Item not found in cart")
        
        if request.quantity == 0:
            # Remove item
            await prisma.cartitem.delete(where={"id": item_id})
            return UpdateCartItemResponse(message="Item removed from cart", item=None)
        
        # Check stock
        available_stock = item.variant.stock if item.variant else item.product.stock
        if request.quantity > available_stock:
            raise HTTPException(status_code=400, detail=f"Only {available_stock} items available")
        
        # Update quantity
        updated_item = await prisma.cartitem.update(
            where={"id": item_id},
            data={"quantity": request.quantity},
            include={
                "product": {"include": {"images": True}},
                "variant": True
            }
        )
        
        return UpdateCartItemResponse(
            message="Cart updated",
            item=build_cart_item_response(updated_item)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update cart: {str(e)}")


@router.patch("/item/{item_id}/variant", response_model=UpdateCartItemResponse)
async def change_cart_item_variant(
    item_id: str,
    request: ChangeCartItemVariantRequest,
    current_user=Depends(get_current_user)
):
    """Change the variant of a cart item."""
    try:
        prisma = await get_prisma_client()
        
        # Get cart
        cart = await prisma.cart.find_unique(where={"userId": current_user.id})
        if not cart:
            raise HTTPException(status_code=404, detail="Cart not found")
        
        # Find item and verify ownership
        item = await prisma.cartitem.find_unique(
            where={"id": item_id},
            include={"product": True, "variant": True}
        )
        
        if not item or item.cartId != cart.id:
            raise HTTPException(status_code=404, detail="Item not found in cart")
        
        # Verify new variant exists and belongs to the same product
        new_variant = await prisma.productvariant.find_unique(
            where={"id": request.variant_id}
        )
        
        if not new_variant:
            raise HTTPException(status_code=404, detail="Variant not found")
        
        if new_variant.productId != item.productId:
            raise HTTPException(status_code=400, detail="Variant does not belong to this product")
        
        if not new_variant.isActive:
            raise HTTPException(status_code=400, detail="Variant is not available")
        
        # Check if this variant already exists in cart
        existing_with_variant = await prisma.cartitem.find_first(
            where={
                "cartId": cart.id,
                "productId": item.productId,
                "variantId": request.variant_id,
                "id": {"not": item_id}  # Exclude current item
            }
        )
        
        if existing_with_variant:
            # Merge quantities and delete current item
            new_quantity = min(existing_with_variant.quantity + item.quantity, new_variant.stock)
            await prisma.cartitem.update(
                where={"id": existing_with_variant.id},
                data={"quantity": new_quantity}
            )
            await prisma.cartitem.delete(where={"id": item_id})
            
            # Return the merged item
            merged_item = await prisma.cartitem.find_unique(
                where={"id": existing_with_variant.id},
                include={
                    "product": {"include": {"images": True}},
                    "variant": True
                }
            )
            return UpdateCartItemResponse(
                message="Items merged",
                item=build_cart_item_response(merged_item)
            )
        
        # Check stock for new variant
        if item.quantity > new_variant.stock:
            raise HTTPException(status_code=400, detail=f"Only {new_variant.stock} available for this variant")
        
        # Calculate new price
        price_at_add = get_effective_price(item.product, new_variant)
        
        # Update variant
        updated_item = await prisma.cartitem.update(
            where={"id": item_id},
            data={
                "variant": {"connect": {"id": request.variant_id}},
                "priceAtAdd": price_at_add
            },
            include={
                "product": {"include": {"images": True}},
                "variant": True
            }
        )
        
        return UpdateCartItemResponse(
            message="Variant updated",
            item=build_cart_item_response(updated_item)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to change variant: {str(e)}")


@router.delete("/item/{item_id}", response_model=RemoveFromCartResponse)
async def remove_from_cart(
    item_id: str,
    current_user=Depends(get_current_user)
):
    """Remove an item from cart."""
    try:
        prisma = await get_prisma_client()
        
        # Get cart
        cart = await prisma.cart.find_unique(where={"userId": current_user.id})
        if not cart:
            raise HTTPException(status_code=404, detail="Cart not found")
        
        # Verify item belongs to user's cart
        item = await prisma.cartitem.find_unique(where={"id": item_id})
        if not item or item.cartId != cart.id:
            raise HTTPException(status_code=404, detail="Item not found in cart")
        
        await prisma.cartitem.delete(where={"id": item_id})
        
        return RemoveFromCartResponse(message="Item removed from cart")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to remove from cart: {str(e)}")


@router.delete("/clear", response_model=RemoveFromCartResponse)
async def clear_cart(current_user=Depends(get_current_user)):
    """Clear all items from cart."""
    try:
        prisma = await get_prisma_client()
        
        cart = await prisma.cart.find_unique(where={"userId": current_user.id})
        
        if not cart:
            return RemoveFromCartResponse(message="Cart is already empty")
        
        await prisma.cartitem.delete_many(where={"cartId": cart.id})
        
        return RemoveFromCartResponse(message="Cart cleared")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear cart: {str(e)}")


@router.get("/count", response_model=CartCountResponse)
async def get_cart_count(current_user=Depends(get_current_user)):
    """Get cart item count (lightweight endpoint)."""
    try:
        prisma = await get_prisma_client()
        
        cart = await prisma.cart.find_unique(where={"userId": current_user.id})
        
        if not cart:
            return CartCountResponse(count=0, total_quantity=0)
        
        items = await prisma.cartitem.find_many(where={"cartId": cart.id})
        
        count = len(items)
        total_quantity = sum(item.quantity for item in items)
        
        return CartCountResponse(count=count, total_quantity=total_quantity)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get cart count: {str(e)}")


@router.post("/sync", response_model=SyncCartResponse)
async def sync_cart(
    request: SyncCartRequest,
    current_user=Depends(get_current_user)
):
    """
    Sync guest cart (from localStorage) to user's cart.
    Called after user logs in to merge their guest cart items.
    """
    try:
        prisma = await get_prisma_client()
        
        if not request.items:
            # Get existing cart
            cart = await prisma.cart.find_unique(
                where={"userId": current_user.id},
                include={
                    "items": {
                        "include": {
                            "product": {"include": {"images": True}},
                            "variant": True
                        }
                    }
                }
            )
            
            if not cart:
                return SyncCartResponse(
                    message="No items to sync",
                    synced_count=0,
                    cart=CartResponse(
                        id="",
                        user_id=current_user.id,
                        items=[],
                        total_items=0,
                        subtotal=0.0,
                        created_at="",
                        updated_at="",
                    )
                )
            
            items_response = [build_cart_item_response(item) for item in cart.items if item.product]
            return SyncCartResponse(
                message="No items to sync",
                synced_count=0,
                cart=CartResponse(
                    id=cart.id,
                    user_id=cart.userId,
                    items=items_response,
                    total_items=sum(i.quantity for i in items_response),
                    subtotal=sum(i.subtotal for i in items_response),
                    created_at=cart.createdAt.isoformat() if cart.createdAt else "",
                    updated_at=cart.updatedAt.isoformat() if cart.updatedAt else "",
                )
            )
        
        cart_id = await get_or_create_cart_id(prisma, current_user.id)
        synced_count = 0
        
        for item_request in request.items:
            try:
                # Verify product
                product = await prisma.product.find_unique(
                    where={"id": item_request.product_id}
                )
                
                if not product or product.status != "ACTIVE":
                    continue
                
                # Verify variant if provided
                variant = None
                if item_request.variant_id:
                    variant = await prisma.productvariant.find_unique(
                        where={"id": item_request.variant_id}
                    )
                    if not variant or not variant.isActive:
                        continue
                
                # Check stock
                available_stock = variant.stock if variant else product.stock
                quantity = min(item_request.quantity, available_stock)
                if quantity <= 0:
                    continue
                
                price_at_add = get_effective_price(product, variant)
                
                # Check if already in cart - query and filter by variant
                cart_items_for_product = await prisma.cartitem.find_many(
                    where={
                        "cartId": cart_id,
                        "productId": item_request.product_id,
                    }
                )
                
                existing = None
                for ci in cart_items_for_product:
                    if ci.variantId == item_request.variant_id:
                        existing = ci
                        break
                
                if existing:
                    # Update quantity (merge)
                    new_quantity = min(existing.quantity + quantity, available_stock)
                    await prisma.cartitem.update(
                        where={"id": existing.id},
                        data={"quantity": new_quantity, "priceAtAdd": price_at_add}
                    )
                else:
                    # Create new using Prisma relation connections
                    create_data = {
                        "cart": {"connect": {"id": cart_id}},
                        "product": {"connect": {"id": item_request.product_id}},
                        "quantity": quantity,
                        "priceAtAdd": price_at_add
                    }
                    if item_request.variant_id:
                        create_data["variant"] = {"connect": {"id": item_request.variant_id}}
                    
                    await prisma.cartitem.create(data=create_data)
                
                synced_count += 1
            except Exception:
                # Skip failed items silently
                continue
        
        # Fetch updated cart
        cart = await prisma.cart.find_unique(
            where={"userId": current_user.id},
            include={
                "items": {
                    "include": {
                        "product": {"include": {"images": True}},
                        "variant": True
                    },
                    "order_by": {"createdAt": "desc"}
                }
            }
        )
        
        valid_items = [item for item in cart.items if item.product and item.product.status == "ACTIVE"]
        items_response = [build_cart_item_response(item) for item in valid_items]
        
        return SyncCartResponse(
            message=f"Synced {synced_count} items to cart",
            synced_count=synced_count,
            cart=CartResponse(
                id=cart.id,
                user_id=cart.userId,
                items=items_response,
                total_items=sum(i.quantity for i in items_response),
                subtotal=sum(i.subtotal for i in items_response),
                created_at=cart.createdAt.isoformat() if cart.createdAt else "",
                updated_at=cart.updatedAt.isoformat() if cart.updatedAt else "",
            )
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to sync cart: {str(e)}")
