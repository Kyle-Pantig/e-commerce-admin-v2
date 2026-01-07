"""
Inventory Management API Router
Provides endpoints for:
- Stock adjustments (increase, decrease, corrections)
- Stock history/audit trail
- Low stock alerts
- Bulk stock operations
- Stock reports
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional, List
from datetime import datetime, timedelta
import asyncio
import math

from prisma_client import get_prisma_client
from models.inventory_models import (
    StockAdjustmentType,
    StockAdjustmentCreate,
    StockAdjustmentResponse,
    StockHistoryResponse,
    BulkStockAdjustmentCreate,
    BulkStockAdjustmentResponse,
    StockSummary,
    ProductStockReport,
    StockMovementReport,
    LowStockAlert,
    LowStockAlertsResponse,
)
from routers.auth import get_current_user, get_current_admin, check_permission

router = APIRouter(prefix="/inventory", tags=["Inventory"])


def build_adjustment_response(adjustment, product=None, variant=None) -> StockAdjustmentResponse:
    """Build a stock adjustment response"""
    # Prioritize stored names (persisted even if product/variant is deleted/recreated)
    # Fall back to passed objects, then to relations
    product_name = (
        adjustment.productName  # Stored in DB
        or (product.name if product else None)  # Passed object
        or (adjustment.product.name if hasattr(adjustment, 'product') and adjustment.product else None)  # Relation
    )
    variant_name = (
        adjustment.variantName  # Stored in DB
        or (variant.name if variant else None)  # Passed object
        or (adjustment.variant.name if hasattr(adjustment, 'variant') and adjustment.variant else None)  # Relation
    )
    
    return StockAdjustmentResponse(
        id=adjustment.id,
        product_id=adjustment.productId,
        variant_id=adjustment.variantId,
        type=StockAdjustmentType(adjustment.type),
        quantity=adjustment.quantity,
        previous_stock=adjustment.previousStock,
        new_stock=adjustment.newStock,
        order_id=adjustment.orderId,
        reason=adjustment.reason,
        notes=adjustment.notes,
        adjusted_by=adjustment.adjustedBy,
        created_at=adjustment.createdAt,
        product_name=product_name,
        variant_name=variant_name,
    )


# ==========================================
# Stock Adjustment Endpoints
# ==========================================

@router.post("/adjust", response_model=StockAdjustmentResponse, status_code=status.HTTP_201_CREATED)
async def create_stock_adjustment(
    adjustment: StockAdjustmentCreate,
    current_user = Depends(check_permission("inventory", "edit"))
):
    """Create a single stock adjustment (Admin only)"""
    prisma = await get_prisma_client()
    
    # Validate that either product_id or variant_id is provided
    if not adjustment.product_id and not adjustment.variant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either product_id or variant_id must be provided"
        )
    
    async with prisma.tx() as tx:
        # Get current stock
        if adjustment.variant_id:
            variant = await tx.productvariant.find_unique(
                where={"id": adjustment.variant_id},
                include={"product": True}
            )
            if not variant:
                raise HTTPException(status_code=404, detail="Variant not found")
            current_stock = variant.stock
            product = variant.product
        else:
            product = await tx.product.find_unique(where={"id": adjustment.product_id})
            if not product:
                raise HTTPException(status_code=404, detail="Product not found")
            current_stock = product.stock
            variant = None
        
        # Calculate new stock
        new_stock = current_stock + adjustment.quantity
        if new_stock < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Adjustment would result in negative stock ({new_stock})"
            )
        
        # Update stock
        if adjustment.variant_id:
            await tx.productvariant.update(
                where={"id": adjustment.variant_id},
                data={"stock": new_stock}
            )
        else:
            await tx.product.update(
                where={"id": adjustment.product_id},
                data={"stock": new_stock}
            )
        
        # Create adjustment record with names
        adj_record = await tx.stockadjustment.create(
            data={
                "productId": adjustment.product_id,
                "variantId": adjustment.variant_id,
                "productName": product.name if product else None,
                "variantName": variant.name if variant else None,
                "type": adjustment.type.value,
                "quantity": adjustment.quantity,
                "previousStock": current_stock,
                "newStock": new_stock,
                "reason": adjustment.reason,
                "notes": adjustment.notes,
                "adjustedBy": current_user.email if hasattr(current_user, 'email') else str(current_user.id),
            }
        )
        
        return build_adjustment_response(adj_record, product, variant)


@router.post("/bulk-adjust", response_model=BulkStockAdjustmentResponse)
async def bulk_stock_adjustment(
    bulk_adjustment: BulkStockAdjustmentCreate,
    current_user = Depends(check_permission("inventory", "edit"))
):
    """Bulk stock adjustment for multiple products/variants (Admin only)"""
    prisma = await get_prisma_client()
    
    adjustments = []
    errors = []
    
    for item in bulk_adjustment.items:
        try:
            if not item.product_id and not item.variant_id:
                errors.append({"item": item.dict(), "error": "Either product_id or variant_id required"})
                continue
            
            async with prisma.tx() as tx:
                # Get current stock
                if item.variant_id:
                    variant = await tx.productvariant.find_unique(
                        where={"id": item.variant_id},
                        include={"product": True}
                    )
                    if not variant:
                        errors.append({"item": item.dict(), "error": "Variant not found"})
                        continue
                    current_stock = variant.stock
                    product = variant.product
                else:
                    product = await tx.product.find_unique(where={"id": item.product_id})
                    if not product:
                        errors.append({"item": item.dict(), "error": "Product not found"})
                        continue
                    current_stock = product.stock
                    variant = None
                
                # Calculate new stock
                new_stock = current_stock + item.quantity
                if new_stock < 0:
                    errors.append({"item": item.dict(), "error": f"Would result in negative stock ({new_stock})"})
                    continue
                
                # Update stock
                if item.variant_id:
                    await tx.productvariant.update(
                        where={"id": item.variant_id},
                        data={"stock": new_stock}
                    )
                else:
                    await tx.product.update(
                        where={"id": item.product_id},
                        data={"stock": new_stock}
                    )
                
                # Create adjustment record with names
                adj_record = await tx.stockadjustment.create(
                    data={
                        "productId": item.product_id,
                        "variantId": item.variant_id,
                        "productName": product.name if product else None,
                        "variantName": variant.name if variant else None,
                        "type": bulk_adjustment.type.value,
                        "quantity": item.quantity,
                        "previousStock": current_stock,
                        "newStock": new_stock,
                        "reason": bulk_adjustment.reason,
                        "notes": bulk_adjustment.notes,
                        "adjustedBy": current_user.email if hasattr(current_user, 'email') else str(current_user.id),
                    }
                )
                
                adjustments.append(build_adjustment_response(adj_record, product, variant))
        except Exception as e:
            errors.append({"item": item.dict(), "error": str(e)})
    
    return BulkStockAdjustmentResponse(
        success_count=len(adjustments),
        failed_count=len(errors),
        adjustments=adjustments,
        errors=errors
    )


# ==========================================
# Stock History Endpoints
# ==========================================

@router.get("/history", response_model=StockHistoryResponse)
async def get_stock_history(
    product_id: Optional[str] = None,
    variant_id: Optional[str] = None,
    type: Optional[StockAdjustmentType] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user = Depends(check_permission("inventory", "view"))
):
    """Get stock adjustment history with filtering"""
    prisma = await get_prisma_client()
    
    # Build where clause
    where = {}
    if product_id:
        where["productId"] = product_id
    if variant_id:
        where["variantId"] = variant_id
    if type:
        where["type"] = type.value
    if start_date or end_date:
        where["createdAt"] = {}
        if start_date:
            where["createdAt"]["gte"] = start_date
        if end_date:
            where["createdAt"]["lte"] = end_date
    
    # Get total count and items in parallel
    total, adjustments = await asyncio.gather(
        prisma.stockadjustment.count(where=where),
        prisma.stockadjustment.find_many(
            where=where,
            include={
                "product": True,
                "variant": True,
            },
            order={"createdAt": "desc"},
            skip=(page - 1) * per_page,
            take=per_page
        )
    )
    
    return StockHistoryResponse(
        items=[build_adjustment_response(adj) for adj in adjustments],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=math.ceil(total / per_page) if total > 0 else 1
    )


@router.get("/history/{product_id}", response_model=StockHistoryResponse)
async def get_product_stock_history(
    product_id: str,
    include_variants: bool = True,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user = Depends(check_permission("inventory", "view"))
):
    """Get stock history for a specific product (including its variants)"""
    prisma = await get_prisma_client()
    
    # Build where clause
    if include_variants:
        # Get product's variant IDs
        product = await prisma.product.find_unique(
            where={"id": product_id},
            include={"variants": True}
        )
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        variant_ids = [v.id for v in product.variants] if product.variants else []
        
        where = {
            "OR": [
                {"productId": product_id},
                {"variantId": {"in": variant_ids}} if variant_ids else {"id": "none"}
            ]
        }
    else:
        where = {"productId": product_id}
    
    # Get total and items
    total, adjustments = await asyncio.gather(
        prisma.stockadjustment.count(where=where),
        prisma.stockadjustment.find_many(
            where=where,
            include={
                "product": True,
                "variant": True,
            },
            order={"createdAt": "desc"},
            skip=(page - 1) * per_page,
            take=per_page
        )
    )
    
    return StockHistoryResponse(
        items=[build_adjustment_response(adj) for adj in adjustments],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=math.ceil(total / per_page) if total > 0 else 1
    )


# ==========================================
# Stock Reports Endpoints
# ==========================================

@router.get("/summary", response_model=StockSummary)
async def get_stock_summary(
    current_user = Depends(check_permission("inventory", "view"))
):
    """Get overall stock summary"""
    prisma = await get_prisma_client()
    
    # Get all counts in parallel
    (
        total_products,
        total_variants,
        products_low_stock,
        products_out_of_stock,
        variants_low_stock,
        variants_out_of_stock,
        all_products,
        all_variants,
    ) = await asyncio.gather(
        prisma.product.count(where={"status": "ACTIVE", "hasVariants": False}),
        prisma.productvariant.count(where={"isActive": True}),
        prisma.product.count(where={"status": "ACTIVE", "hasVariants": False, "stock": {"lte": 10, "gt": 0}}),
        prisma.product.count(where={"status": "ACTIVE", "hasVariants": False, "stock": 0}),
        prisma.productvariant.count(where={"isActive": True, "stock": {"lte": 10, "gt": 0}}),
        prisma.productvariant.count(where={"isActive": True, "stock": 0}),
        prisma.product.find_many(where={"status": "ACTIVE", "hasVariants": False}),
        prisma.productvariant.find_many(where={"isActive": True}, include={"product": True}),
    )
    
    # Calculate stock value
    product_stock_value = sum(p.stock * p.basePrice for p in all_products)
    variant_stock_value = sum(v.stock * (v.price or v.product.basePrice) for v in all_variants)
    
    # Overstocked (arbitrary threshold of 100+)
    products_overstocked = sum(1 for p in all_products if p.stock > 100)
    variants_overstocked = sum(1 for v in all_variants if v.stock > 100)
    
    return StockSummary(
        total_products=total_products + len(set(v.productId for v in all_variants)),  # Products with variants
        total_variants=total_variants,
        total_stock_value=product_stock_value + variant_stock_value,
        low_stock_count=products_low_stock + variants_low_stock,
        out_of_stock_count=products_out_of_stock + variants_out_of_stock,
        overstocked_count=products_overstocked + variants_overstocked,
    )


@router.get("/reports/products", response_model=List[ProductStockReport])
async def get_product_stock_reports(
    status_filter: Optional[str] = None,  # "in_stock", "low_stock", "out_of_stock"
    sort_by: str = "stock",  # "stock", "name", "value"
    sort_order: str = "asc",
    limit: int = Query(50, ge=1, le=200),
    current_user = Depends(check_permission("inventory", "view"))
):
    """Get detailed stock report for products"""
    prisma = await get_prisma_client()
    
    # Get products without variants
    products = await prisma.product.find_many(
        where={"status": "ACTIVE"},
        include={
            "images": True,
            "variants": {"where": {"isActive": True}},
            "stockAdjustments": {
                "order": {"createdAt": "desc"},
                "take": 1
            }
        },
        order={"stock": sort_order} if sort_by == "stock" else {"name": sort_order}
    )
    
    # Get adjustment counts for the month
    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    reports = []
    for p in products:
        # Calculate total stock (including variants)
        if p.hasVariants and p.variants:
            total_stock = sum(v.stock for v in p.variants)
            variant_data = [
                {
                    "id": v.id,
                    "name": v.name,
                    "sku": v.sku,
                    "stock": v.stock,
                    "low_stock_threshold": v.lowStockThreshold or 10,
                    "status": "out_of_stock" if v.stock == 0 else ("low_stock" if v.stock <= (v.lowStockThreshold or 10) else "in_stock")
                }
                for v in p.variants
            ]
        else:
            total_stock = p.stock
            variant_data = None
        
        # Determine status
        threshold = p.lowStockThreshold or 10
        if total_stock == 0:
            stock_status = "out_of_stock"
        elif total_stock <= threshold:
            stock_status = "low_stock"
        else:
            stock_status = "in_stock"
        
        # Filter by status if specified
        if status_filter and stock_status != status_filter:
            continue
        
        # Get primary image
        primary_image = None
        if p.images:
            for img in p.images:
                if img.isPrimary:
                    primary_image = img.url
                    break
            if not primary_image and p.images:
                primary_image = p.images[0].url
        
        reports.append(ProductStockReport(
            id=p.id,
            name=p.name,
            slug=p.slug,
            sku=p.sku,
            stock=total_stock,
            low_stock_threshold=threshold,
            has_variants=p.hasVariants,
            status=stock_status,
            image=primary_image,
            variants=variant_data,
            base_price=p.basePrice,
            stock_value=total_stock * p.basePrice,
            last_adjustment=p.stockAdjustments[0].createdAt if p.stockAdjustments else None,
            adjustments_this_month=0,  # Would need separate query
        ))
    
    # Sort by value if requested
    if sort_by == "value":
        reports.sort(key=lambda x: x.stock_value, reverse=(sort_order == "desc"))
    
    return reports[:limit]


@router.get("/reports/movements", response_model=StockMovementReport)
async def get_stock_movement_report(
    days: int = Query(30, ge=1, le=365),
    current_user = Depends(check_permission("inventory", "view"))
):
    """Get stock movement report for a period"""
    prisma = await get_prisma_client()
    
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # Get all adjustments in the period
    adjustments = await prisma.stockadjustment.find_many(
        where={"createdAt": {"gte": start_date, "lte": end_date}},
        include={"product": True, "variant": True}
    )
    
    # Calculate totals
    total_in = sum(a.quantity for a in adjustments if a.quantity > 0)
    total_out = abs(sum(a.quantity for a in adjustments if a.quantity < 0))
    
    # Group by type
    by_type = {}
    for a in adjustments:
        type_key = a.type
        if type_key not in by_type:
            by_type[type_key] = 0
        by_type[type_key] += abs(a.quantity)
    
    # Top products (by movement volume)
    product_movements = {}
    for a in adjustments:
        key = a.productId or (a.variant.productId if a.variant else None)
        name = a.product.name if a.product else (a.variant.product.name if a.variant and hasattr(a.variant, 'product') else "Unknown")
        if key:
            if key not in product_movements:
                product_movements[key] = {"id": key, "name": name, "in": 0, "out": 0}
            if a.quantity > 0:
                product_movements[key]["in"] += a.quantity
            else:
                product_movements[key]["out"] += abs(a.quantity)
    
    sorted_in = sorted(product_movements.values(), key=lambda x: x["in"], reverse=True)[:5]
    sorted_out = sorted(product_movements.values(), key=lambda x: x["out"], reverse=True)[:5]
    
    return StockMovementReport(
        period_start=start_date,
        period_end=end_date,
        total_in=total_in,
        total_out=total_out,
        net_change=total_in - total_out,
        by_type=by_type,
        top_products_in=sorted_in,
        top_products_out=sorted_out,
    )


# ==========================================
# Low Stock Alerts Endpoints
# ==========================================

@router.get("/alerts/low-stock", response_model=LowStockAlertsResponse)
async def get_low_stock_alerts(
    threshold: int = Query(10, ge=1),
    include_out_of_stock: bool = True,
    current_user = Depends(check_permission("inventory", "view"))
):
    """Get low stock alerts for products and variants"""
    prisma = await get_prisma_client()
    
    # Get products and variants with low stock
    products, variants = await asyncio.gather(
        prisma.product.find_many(
            where={
                "status": "ACTIVE",
                "hasVariants": False,
                "stock": {"lte": threshold}
            },
            include={"images": True}
        ),
        prisma.productvariant.find_many(
            where={
                "isActive": True,
                "stock": {"lte": threshold},
                "product": {"status": "ACTIVE"}
            },
            include={
                "product": {"include": {"images": True}}
            }
        )
    )
    
    alerts = []
    total_low = 0
    total_out = 0
    critical = 0
    
    # Process products
    for p in products:
        if not include_out_of_stock and p.stock == 0:
            continue
        
        is_out = p.stock == 0
        if is_out:
            total_out += 1
            critical += 1
        else:
            total_low += 1
            if p.stock <= 5:
                critical += 1
        
        primary_image = None
        if p.images:
            for img in p.images:
                if img.isPrimary:
                    primary_image = img.url
                    break
            if not primary_image and p.images:
                primary_image = p.images[0].url
        
        alerts.append(LowStockAlert(
            id=p.id,
            type="product",
            product_id=p.id,
            variant_id=None,
            name=p.name,
            slug=p.slug,
            sku=p.sku,
            current_stock=p.stock,
            threshold=p.lowStockThreshold or threshold,
            status="out_of_stock" if is_out else "low_stock",
            image=primary_image,
            days_until_stockout=None,
        ))
    
    # Process variants
    for v in variants:
        if not include_out_of_stock and v.stock == 0:
            continue
        
        is_out = v.stock == 0
        if is_out:
            total_out += 1
            critical += 1
        else:
            total_low += 1
            if v.stock <= 5:
                critical += 1
        
        primary_image = v.imageUrl
        if not primary_image and v.product and v.product.images:
            for img in v.product.images:
                if img.isPrimary:
                    primary_image = img.url
                    break
            if not primary_image and v.product.images:
                primary_image = v.product.images[0].url
        
        alerts.append(LowStockAlert(
            id=v.id,
            type="variant",
            product_id=v.productId,
            variant_id=v.id,
            name=f"{v.product.name} - {v.name}" if v.product else v.name,
            slug=v.product.slug if v.product else "",
            sku=v.sku,
            current_stock=v.stock,
            threshold=v.lowStockThreshold or threshold,
            status="out_of_stock" if is_out else "low_stock",
            image=primary_image,
            days_until_stockout=None,
        ))
    
    # Sort by stock (lowest first)
    alerts.sort(key=lambda x: x.current_stock)
    
    return LowStockAlertsResponse(
        alerts=alerts,
        total_low_stock=total_low,
        total_out_of_stock=total_out,
        critical_count=critical,
    )


# ==========================================
# Quick Stock Update Endpoint
# ==========================================

@router.patch("/quick-update/{product_id}")
async def quick_stock_update(
    product_id: str,
    new_stock: int = Query(..., ge=0),
    variant_id: Optional[str] = None,
    reason: str = "Manual update",
    current_user = Depends(check_permission("inventory", "edit"))
):
    """Quick update stock for a product or variant (Admin only)"""
    prisma = await get_prisma_client()
    
    async with prisma.tx() as tx:
        if variant_id:
            variant = await tx.productvariant.find_unique(
                where={"id": variant_id},
                include={"product": True}
            )
            if not variant:
                raise HTTPException(status_code=404, detail="Variant not found")
            
            current_stock = variant.stock
            quantity_change = new_stock - current_stock
            
            await tx.productvariant.update(
                where={"id": variant_id},
                data={"stock": new_stock}
            )
            
            # Record adjustment with names
            await tx.stockadjustment.create(
                data={
                    "productId": product_id,
                    "variantId": variant_id,
                    "productName": variant.product.name if variant.product else None,
                    "variantName": variant.name,
                    "type": "CORRECTION",
                    "quantity": quantity_change,
                    "previousStock": current_stock,
                    "newStock": new_stock,
                    "reason": reason,
                    "adjustedBy": current_user.email if hasattr(current_user, 'email') else str(current_user.id),
                }
            )
        else:
            product = await tx.product.find_unique(where={"id": product_id})
            if not product:
                raise HTTPException(status_code=404, detail="Product not found")
            
            current_stock = product.stock
            quantity_change = new_stock - current_stock
            
            await tx.product.update(
                where={"id": product_id},
                data={"stock": new_stock}
            )
            
            # Record adjustment with name
            await tx.stockadjustment.create(
                data={
                    "productId": product_id,
                    "productName": product.name,
                    "type": "CORRECTION",
                    "quantity": quantity_change,
                    "previousStock": current_stock,
                    "newStock": new_stock,
                    "reason": reason,
                    "adjustedBy": current_user.email if hasattr(current_user, 'email') else str(current_user.id),
                }
            )
    
    return {
        "success": True,
        "previous_stock": current_stock,
        "new_stock": new_stock,
        "change": quantity_change
    }

