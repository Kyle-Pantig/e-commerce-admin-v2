from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional, List
from prisma import Json
from prisma_client import get_prisma_client
from routers.auth import get_current_user, get_current_admin
from models.product_models import (
    ProductCreate,
    ProductUpdate,
    ProductResponse,
    ProductListResponse,
    ProductImageResponse,
    ProductVariantResponse,
    ProductAttributeValueResponse,
    ProductStatus,
    ProductBulkStatusUpdate,
    ProductBulkDelete,
    BulkOperationResponse,
    PaginatedProductResponse,
)
import re
import math

router = APIRouter(prefix="/products", tags=["Products"])


# Helper function to generate slug from name
def generate_slug(name: str) -> str:
    """Generate a URL-friendly slug from a product name."""
    slug = name.lower().strip()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s-]+', '-', slug)
    slug = slug.strip('-')
    return slug


async def ensure_unique_slug(base_slug: str, exclude_id: Optional[str] = None) -> str:
    """Ensure the slug is unique by appending a number if needed."""
    prisma = await get_prisma_client()
    slug = base_slug
    counter = 1
    
    while True:
        existing = await prisma.product.find_unique(where={"slug": slug})
        if not existing or (exclude_id and existing.id == exclude_id):
            break
        slug = f"{base_slug}-{counter}"
        counter += 1
    
    return slug


def build_product_response(product, include_details: bool = True) -> ProductResponse:
    """Build ProductResponse from Prisma product object"""
    images = None
    variants = None
    attribute_values = None
    
    if include_details:
        if product.images:
            images = [
                ProductImageResponse(
                    id=img.id,
                    product_id=img.productId,
                    url=img.url,
                    alt_text=img.altText,
                    display_order=img.displayOrder,
                    is_primary=img.isPrimary,
                    created_at=img.createdAt.isoformat() if img.createdAt else "",
                )
                for img in product.images
            ]
        
        if product.variants:
            variants = [
                ProductVariantResponse(
                    id=var.id,
                    product_id=var.productId,
                    sku=var.sku,
                    name=var.name,
                    price=var.price,
                    sale_price=var.salePrice,
                    stock=var.stock,
                    low_stock_threshold=var.lowStockThreshold,
                    is_active=var.isActive,
                    options=var.options,
                    image_url=var.imageUrl,
                    created_at=var.createdAt.isoformat() if var.createdAt else "",
                    updated_at=var.updatedAt.isoformat() if var.updatedAt else "",
                )
                for var in product.variants
            ]
        
        if product.attributeValues:
            attribute_values = [
                ProductAttributeValueResponse(
                    id=av.id,
                    product_id=av.productId,
                    attribute_id=av.attributeId,
                    value=av.value,
                    created_at=av.createdAt.isoformat() if av.createdAt else "",
                    updated_at=av.updatedAt.isoformat() if av.updatedAt else "",
                    attribute_name=av.attribute.name if av.attribute else None,
                    attribute_type=av.attribute.type if av.attribute else None,
                )
                for av in product.attributeValues
            ]
    
    category_name = None
    if product.category:
        category_name = product.category.name
    
    return ProductResponse(
        id=product.id,
        name=product.name,
        slug=product.slug,
        description=product.description,
        short_description=product.shortDescription,
        sku=product.sku,
        status=product.status,
        base_price=product.basePrice,
        sale_price=product.salePrice,
        cost_price=product.costPrice,
        category_id=product.categoryId,
        category_name=category_name,
        stock=product.stock,
        low_stock_threshold=product.lowStockThreshold,
        track_inventory=product.trackInventory,
        weight=product.weight,
        length=product.length,
        width=product.width,
        height=product.height,
        meta_title=product.metaTitle,
        meta_description=product.metaDescription,
        is_featured=product.isFeatured,
        has_variants=product.hasVariants,
        images=images,
        variants=variants,
        attribute_values=attribute_values,
        created_at=product.createdAt.isoformat() if product.createdAt else "",
        updated_at=product.updatedAt.isoformat() if product.updatedAt else "",
    )


def build_product_list_response(product) -> ProductListResponse:
    """Build ProductListResponse from Prisma product object"""
    primary_image = None
    if product.images:
        primary = next((img for img in product.images if img.isPrimary), None)
        if primary:
            primary_image = primary.url
        elif product.images:
            primary_image = product.images[0].url
    
    category_name = None
    if product.category:
        category_name = product.category.name
    
    variants = None
    if product.variants:
        variants = [
            {"id": v.id, "stock": v.stock, "is_active": v.isActive}
            for v in product.variants
        ]
    
    return ProductListResponse(
        id=product.id,
        name=product.name,
        slug=product.slug,
        sku=product.sku,
        status=product.status,
        base_price=product.basePrice,
        sale_price=product.salePrice,
        stock=product.stock,
        category_id=product.categoryId,
        category_name=category_name,
        is_featured=product.isFeatured,
        has_variants=product.hasVariants,
        primary_image=primary_image,
        variants=variants,
        created_at=product.createdAt.isoformat() if product.createdAt else "",
        updated_at=product.updatedAt.isoformat() if product.updatedAt else "",
    )


@router.get("", response_model=PaginatedProductResponse)
async def list_products(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    category_id: Optional[str] = None,
    status: Optional[str] = None,
    is_featured: Optional[bool] = None,
    search: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    include_inactive: bool = False,
    current_user=Depends(get_current_user)
):
    """List products with filtering, sorting, and pagination."""
    try:
        prisma = await get_prisma_client()
        
        # Build where clause
        where = {}
        
        if category_id:
            where["categoryId"] = category_id
        
        if status:
            where["status"] = status
        elif not include_inactive:
            where["status"] = {"not": "ARCHIVED"}
        
        if is_featured is not None:
            where["isFeatured"] = is_featured
        
        if search:
            where["OR"] = [
                {"name": {"contains": search, "mode": "insensitive"}},
                {"sku": {"contains": search, "mode": "insensitive"}},
                {"description": {"contains": search, "mode": "insensitive"}},
            ]
        
        # Map sort fields
        sort_field_map = {
            "created_at": "createdAt",
            "updated_at": "updatedAt",
            "name": "name",
            "base_price": "basePrice",
            "stock": "stock",
        }
        sort_field = sort_field_map.get(sort_by, "createdAt")
        
        # Get total count
        total = await prisma.product.count(where=where)
        
        # Calculate pagination
        skip = (page - 1) * per_page
        total_pages = math.ceil(total / per_page) if total > 0 else 1
        
        # Fetch products
        products = await prisma.product.find_many(
            where=where,
            include={
                "category": True,
                "images": {"order_by": {"displayOrder": "asc"}},
                "variants": True,
            },
            order={sort_field: sort_order},
            skip=skip,
            take=per_page,
        )
        
        items = [build_product_list_response(p) for p in products]
        
        return PaginatedProductResponse(
            items=items,
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages,
        )
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list products: {str(e)}"
        )


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: str,
    current_user=Depends(get_current_user)
):
    """Get a single product by ID."""
    try:
        prisma = await get_prisma_client()
        
        product = await prisma.product.find_unique(
            where={"id": product_id},
            include={
                "category": True,
                "images": {"order_by": {"displayOrder": "asc"}},
                "variants": {"order_by": {"createdAt": "asc"}},
                "attributeValues": {"include": {"attribute": True}},
            }
        )
        
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )
        
        return build_product_response(product)
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get product: {str(e)}"
        )


@router.get("/slug/{slug}", response_model=ProductResponse)
async def get_product_by_slug(
    slug: str,
    current_user=Depends(get_current_user)
):
    """Get a single product by slug."""
    try:
        prisma = await get_prisma_client()
        
        product = await prisma.product.find_unique(
            where={"slug": slug},
            include={
                "category": True,
                "images": {"order_by": {"displayOrder": "asc"}},
                "variants": {"order_by": {"createdAt": "asc"}},
                "attributeValues": {"include": {"attribute": True}},
            }
        )
        
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )
        
        return build_product_response(product)
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get product: {str(e)}"
        )


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product_data: ProductCreate,
    current_admin=Depends(get_current_admin)
):
    """Create a new product (admin only)."""
    try:
        prisma = await get_prisma_client()
        
        # Validate category exists
        category = await prisma.category.find_unique(where={"id": product_data.category_id})
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )
        
        # Generate unique slug
        base_slug = generate_slug(product_data.name)
        slug = await ensure_unique_slug(base_slug)
        
        # Create product
        product = await prisma.product.create(
            data={
                "name": product_data.name,
                "slug": slug,
                "description": product_data.description,
                "shortDescription": product_data.short_description,
                "sku": product_data.sku,
                "status": product_data.status.value,
                "basePrice": product_data.base_price,
                "salePrice": product_data.sale_price,
                "costPrice": product_data.cost_price,
                "categoryId": product_data.category_id,
                "stock": product_data.stock,
                "lowStockThreshold": product_data.low_stock_threshold,
                "trackInventory": product_data.track_inventory,
                "weight": product_data.weight,
                "length": product_data.length,
                "width": product_data.width,
                "height": product_data.height,
                "metaTitle": product_data.meta_title,
                "metaDescription": product_data.meta_description,
                "isFeatured": product_data.is_featured,
                "hasVariants": product_data.has_variants,
            }
        )
        
        # Create images if provided
        if product_data.images:
            for img in product_data.images:
                await prisma.productimage.create(
                    data={
                        "productId": product.id,
                        "url": img.url,
                        "altText": img.alt_text,
                        "displayOrder": img.display_order,
                        "isPrimary": img.is_primary,
                    }
                )
        
        # Create variants if provided
        if product_data.variants:
            for var in product_data.variants:
                await prisma.productvariant.create(
                    data={
                        "productId": product.id,
                        "sku": var.sku,
                        "name": var.name,
                        "price": var.price,
                        "salePrice": var.sale_price,
                        "stock": var.stock,
                        "lowStockThreshold": var.low_stock_threshold,
                        "isActive": var.is_active,
                        "options": Json(var.options) if var.options else None,
                        "imageUrl": var.image_url,
                    }
                )
        
        # Create attribute values if provided
        if product_data.attribute_values:
            for av in product_data.attribute_values:
                await prisma.productattributevalue.create(
                    data={
                        "productId": product.id,
                        "attributeId": av.attribute_id,
                        "value": av.value,
                    }
                )
        
        # Fetch complete product
        product = await prisma.product.find_unique(
            where={"id": product.id},
            include={
                "category": True,
                "images": {"order_by": {"displayOrder": "asc"}},
                "variants": {"order_by": {"createdAt": "asc"}},
                "attributeValues": {"include": {"attribute": True}},
            }
        )
        
        return build_product_response(product)
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create product: {str(e)}"
        )


@router.patch("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    product_data: ProductUpdate,
    current_admin=Depends(get_current_admin)
):
    """Update an existing product (admin only)."""
    try:
        prisma = await get_prisma_client()
        
        # Check product exists
        existing = await prisma.product.find_unique(where={"id": product_id})
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )
        
        # Build update data
        update_data = {}
        
        if product_data.name is not None:
            update_data["name"] = product_data.name
            base_slug = generate_slug(product_data.name)
            update_data["slug"] = await ensure_unique_slug(base_slug, product_id)
        
        if product_data.description is not None:
            update_data["description"] = product_data.description
        if product_data.short_description is not None:
            update_data["shortDescription"] = product_data.short_description
        if product_data.sku is not None:
            update_data["sku"] = product_data.sku
        if product_data.status is not None:
            update_data["status"] = product_data.status.value
        if product_data.base_price is not None:
            update_data["basePrice"] = product_data.base_price
        if product_data.sale_price is not None:
            update_data["salePrice"] = product_data.sale_price
        if product_data.cost_price is not None:
            update_data["costPrice"] = product_data.cost_price
        if product_data.category_id is not None:
            # Validate category
            category = await prisma.category.find_unique(where={"id": product_data.category_id})
            if not category:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Category not found"
                )
            update_data["categoryId"] = product_data.category_id
        if product_data.stock is not None:
            update_data["stock"] = product_data.stock
        if product_data.low_stock_threshold is not None:
            update_data["lowStockThreshold"] = product_data.low_stock_threshold
        if product_data.track_inventory is not None:
            update_data["trackInventory"] = product_data.track_inventory
        if product_data.weight is not None:
            update_data["weight"] = product_data.weight
        if product_data.length is not None:
            update_data["length"] = product_data.length
        if product_data.width is not None:
            update_data["width"] = product_data.width
        if product_data.height is not None:
            update_data["height"] = product_data.height
        if product_data.meta_title is not None:
            update_data["metaTitle"] = product_data.meta_title
        if product_data.meta_description is not None:
            update_data["metaDescription"] = product_data.meta_description
        if product_data.is_featured is not None:
            update_data["isFeatured"] = product_data.is_featured
        if product_data.has_variants is not None:
            update_data["hasVariants"] = product_data.has_variants
        
        # Update product
        if update_data:
            await prisma.product.update(
                where={"id": product_id},
                data=update_data
            )
        
        # Update images if provided
        if product_data.images is not None:
            # Delete existing images
            await prisma.productimage.delete_many(where={"productId": product_id})
            # Create new images
            for img in product_data.images:
                await prisma.productimage.create(
                    data={
                        "productId": product_id,
                        "url": img.url,
                        "altText": img.alt_text,
                        "displayOrder": img.display_order,
                        "isPrimary": img.is_primary,
                    }
                )
        
        # Update variants if provided
        if product_data.variants is not None:
            # Delete existing variants
            await prisma.productvariant.delete_many(where={"productId": product_id})
            # Create new variants
            for var in product_data.variants:
                await prisma.productvariant.create(
                    data={
                        "productId": product_id,
                        "sku": var.sku,
                        "name": var.name,
                        "price": var.price,
                        "salePrice": var.sale_price,
                        "stock": var.stock,
                        "lowStockThreshold": var.low_stock_threshold,
                        "isActive": var.is_active,
                        "options": Json(var.options) if var.options else None,
                        "imageUrl": var.image_url,
                    }
                )
        
        # Update attribute values if provided
        if product_data.attribute_values is not None:
            # Delete existing attribute values
            await prisma.productattributevalue.delete_many(where={"productId": product_id})
            # Create new attribute values
            for av in product_data.attribute_values:
                await prisma.productattributevalue.create(
                    data={
                        "productId": product_id,
                        "attributeId": av.attribute_id,
                        "value": av.value,
                    }
                )
        
        # Fetch updated product
        product = await prisma.product.find_unique(
            where={"id": product_id},
            include={
                "category": True,
                "images": {"order_by": {"displayOrder": "asc"}},
                "variants": {"order_by": {"createdAt": "asc"}},
                "attributeValues": {"include": {"attribute": True}},
            }
        )
        
        return build_product_response(product)
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update product: {str(e)}"
        )


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: str,
    current_admin=Depends(get_current_admin)
):
    """Delete a product (admin only)."""
    try:
        prisma = await get_prisma_client()
        
        # Check product exists
        existing = await prisma.product.find_unique(where={"id": product_id})
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )
        
        # Delete related data first
        await prisma.productimage.delete_many(where={"productId": product_id})
        await prisma.productvariant.delete_many(where={"productId": product_id})
        await prisma.productattributevalue.delete_many(where={"productId": product_id})
        
        # Delete product
        await prisma.product.delete(where={"id": product_id})
        
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete product: {str(e)}"
        )


@router.post("/bulk/status", response_model=BulkOperationResponse)
async def bulk_update_status(
    data: ProductBulkStatusUpdate,
    current_admin=Depends(get_current_admin)
):
    """Bulk update product status (admin only)."""
    try:
        prisma = await get_prisma_client()
        
        result = await prisma.product.update_many(
            where={"id": {"in": data.product_ids}},
            data={"status": data.status.value}
        )
        
        return BulkOperationResponse(
            message=f"Updated {result} products to {data.status.value}",
            affected_count=result
        )
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to bulk update status: {str(e)}"
        )


@router.post("/bulk/delete", response_model=BulkOperationResponse)
async def bulk_delete_products(
    data: ProductBulkDelete,
    current_admin=Depends(get_current_admin)
):
    """Bulk delete products (admin only)."""
    try:
        prisma = await get_prisma_client()
        
        # Delete related data first
        await prisma.productimage.delete_many(where={"productId": {"in": data.product_ids}})
        await prisma.productvariant.delete_many(where={"productId": {"in": data.product_ids}})
        await prisma.productattributevalue.delete_many(where={"productId": {"in": data.product_ids}})
        
        # Delete products
        result = await prisma.product.delete_many(where={"id": {"in": data.product_ids}})
        
        return BulkOperationResponse(
            message=f"Deleted {result} products",
            affected_count=result
        )
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to bulk delete products: {str(e)}"
        )


@router.get("/category/{category_id}/attributes")
async def get_category_attributes(
    category_id: str,
    include_inherited: bool = True,
    include_inactive: bool = False,
    current_user=Depends(get_current_user)
):
    """Get attributes for a category (and inherited from parents)."""
    try:
        prisma = await get_prisma_client()
        
        # Fetch category with parent
        if include_inherited:
            category = await prisma.category.find_unique(
                where={"id": category_id},
                include={"parent": True}
            )
        else:
            category = await prisma.category.find_unique(where={"id": category_id})
        
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )
        
        category_ids = [category_id]
        
        # Traverse parent hierarchy if needed
        if include_inherited:
            current_category = category
            while current_category.parentId:
                if hasattr(current_category, 'parent') and current_category.parent:
                    category_ids.append(current_category.parent.id)
                    current_category = current_category.parent
                else:
                    parent = await prisma.category.find_unique(where={"id": current_category.parentId})
                    if parent:
                        category_ids.append(parent.id)
                        current_category = parent
                    else:
                        break
        
        # Fetch category attributes
        category_attributes = await prisma.categoryattribute.find_many(
            where={"categoryId": {"in": category_ids}}
        )
        
        attribute_ids = list(set([ca.attributeId for ca in category_attributes]))
        
        if not attribute_ids:
            return []
        
        where_clause = {"id": {"in": attribute_ids}}
        if not include_inactive:
            where_clause["isActive"] = True
        
        attributes = await prisma.attribute.find_many(
            where=where_clause,
            order=[{"displayOrder": "asc"}, {"name": "asc"}]
        )
        
        return [
            {
                "id": attr.id,
                "name": attr.name,
                "type": attr.type.value if hasattr(attr.type, 'value') else str(attr.type),
                "is_required": attr.isRequired,
                "is_filterable": attr.isFilterable,
                "is_searchable": attr.isSearchable if hasattr(attr, 'isSearchable') else False,
                "display_order": attr.displayOrder,
                "is_active": attr.isActive,
                "unit": attr.unit,
                "options": attr.options if attr.options else [],
            }
            for attr in attributes
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get category attributes: {str(e)}"
        )

