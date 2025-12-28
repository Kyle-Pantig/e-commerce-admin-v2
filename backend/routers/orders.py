from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional
from datetime import datetime
import uuid

from prisma import Prisma
from models.order_models import (
    OrderCreate,
    OrderUpdate,
    OrderStatusUpdate,
    OrderResponse,
    OrderListResponse,
    OrderItemResponse,
    OrderStatusHistoryResponse,
    PaginatedOrderResponse,
    OrderStatus,
    PaymentStatus,
    PaymentMethod,
)
from routers.auth import get_current_user, get_current_admin

router = APIRouter(prefix="/orders", tags=["Orders"])

# Prisma client instance
prisma = Prisma()


async def get_prisma():
    if not prisma.is_connected():
        await prisma.connect()
    return prisma


def generate_order_number() -> str:
    """Generate a unique order number like ORD-20241227-XXXX"""
    date_part = datetime.now().strftime("%Y%m%d")
    random_part = uuid.uuid4().hex[:6].upper()
    return f"ORD-{date_part}-{random_part}"


def build_order_response(order) -> OrderResponse:
    """Build OrderResponse from Prisma order object"""
    items = []
    if order.items:
        for item in order.items:
            items.append(OrderItemResponse(
                id=item.id,
                order_id=item.orderId,
                product_id=item.productId,
                product_name=item.productName,
                product_sku=item.productSku,
                product_image=item.productImage,
                variant_id=item.variantId,
                variant_name=item.variantName,
                variant_options=item.variantOptions,
                unit_price=item.unitPrice,
                quantity=item.quantity,
                subtotal=item.subtotal,
                created_at=item.createdAt,
            ))
    
    status_history = []
    if order.statusHistory:
        for history in order.statusHistory:
            status_history.append(OrderStatusHistoryResponse(
                id=history.id,
                order_id=history.orderId,
                from_status=OrderStatus(history.fromStatus) if history.fromStatus else None,
                to_status=OrderStatus(history.toStatus),
                note=history.note,
                changed_by=history.changedBy,
                created_at=history.createdAt,
            ))
    
    return OrderResponse(
        id=order.id,
        order_number=order.orderNumber,
        status=OrderStatus(order.status),
        payment_status=PaymentStatus(order.paymentStatus),
        payment_method=PaymentMethod(order.paymentMethod) if order.paymentMethod else None,
        customer_name=order.customerName,
        customer_email=order.customerEmail,
        customer_phone=order.customerPhone,
        shipping_address=order.shippingAddress,
        shipping_city=order.shippingCity,
        shipping_state=order.shippingState,
        shipping_zip=order.shippingZip,
        shipping_country=order.shippingCountry,
        billing_address=order.billingAddress,
        billing_city=order.billingCity,
        billing_state=order.billingState,
        billing_zip=order.billingZip,
        billing_country=order.billingCountry,
        subtotal=order.subtotal,
        shipping_cost=order.shippingCost,
        tax_amount=order.taxAmount,
        discount_amount=order.discountAmount,
        total=order.total,
        notes=order.notes,
        internal_notes=order.internalNotes,
        tracking_number=order.trackingNumber,
        shipping_carrier=order.shippingCarrier,
        created_at=order.createdAt,
        updated_at=order.updatedAt,
        shipped_at=order.shippedAt,
        delivered_at=order.deliveredAt,
        cancelled_at=order.cancelledAt,
        items=items,
        status_history=status_history,
    )


def build_order_list_response(order) -> OrderListResponse:
    """Build OrderListResponse for list view"""
    return OrderListResponse(
        id=order.id,
        order_number=order.orderNumber,
        status=OrderStatus(order.status),
        payment_status=PaymentStatus(order.paymentStatus),
        payment_method=PaymentMethod(order.paymentMethod) if order.paymentMethod else None,
        customer_name=order.customerName,
        customer_email=order.customerEmail,
        total=order.total,
        items_count=len(order.items) if order.items else 0,
        created_at=order.createdAt,
        updated_at=order.updatedAt,
    )


# ==========================================
# Order CRUD Endpoints
# ==========================================

@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    order_data: OrderCreate,
    current_user = Depends(get_current_user)
):
    """Create a new order (Admin can create manual orders for testing)"""
    await get_prisma()
    
    # Calculate subtotal from items
    subtotal = sum(item.unit_price * item.quantity for item in order_data.items)
    
    # Calculate total
    total = subtotal + order_data.shipping_cost + order_data.tax_amount - order_data.discount_amount
    
    # Generate unique order number
    order_number = generate_order_number()
    
    # Create order with items in a transaction
    async with prisma.tx() as tx:
        # Create the order
        order = await tx.order.create(
            data={
                "orderNumber": order_number,
                "status": "PENDING",
                "paymentStatus": "PENDING",
                "paymentMethod": order_data.payment_method.value if order_data.payment_method else None,
                "customerName": order_data.customer_name,
                "customerEmail": order_data.customer_email,
                "customerPhone": order_data.customer_phone,
                "shippingAddress": order_data.shipping_address,
                "shippingCity": order_data.shipping_city,
                "shippingState": order_data.shipping_state,
                "shippingZip": order_data.shipping_zip,
                "shippingCountry": order_data.shipping_country,
                "billingAddress": order_data.billing_address,
                "billingCity": order_data.billing_city,
                "billingState": order_data.billing_state,
                "billingZip": order_data.billing_zip,
                "billingCountry": order_data.billing_country,
                "subtotal": subtotal,
                "shippingCost": order_data.shipping_cost,
                "taxAmount": order_data.tax_amount,
                "discountAmount": order_data.discount_amount,
                "total": total,
                "notes": order_data.notes,
                "internalNotes": order_data.internal_notes,
            }
        )
        
        # Create order items
        for item in order_data.items:
            item_data = {
                "orderId": order.id,
                "productId": item.product_id,
                "productName": item.product_name,
                "productSku": item.product_sku,
                "productImage": item.product_image,
                "variantId": item.variant_id,
                "variantName": item.variant_name,
                "unitPrice": item.unit_price,
                "quantity": item.quantity,
                "subtotal": item.unit_price * item.quantity,
            }
            # Only include variantOptions if it has a value (JSON fields need special handling)
            if item.variant_options:
                item_data["variantOptions"] = item.variant_options
            
            await tx.orderitem.create(data=item_data)
        
        # Create initial status history
        await tx.orderstatushistory.create(
            data={
                "orderId": order.id,
                "fromStatus": None,
                "toStatus": "PENDING",
                "note": "Order created",
                "changedBy": current_user.email if hasattr(current_user, 'email') else str(current_user.id),
            }
        )
    
    # Fetch complete order with relations
    complete_order = await prisma.order.find_unique(
        where={"id": order.id},
        include={
            "items": True,
            "statusHistory": {"order_by": {"createdAt": "desc"}},
        }
    )
    
    return build_order_response(complete_order)


@router.get("", response_model=PaginatedOrderResponse)
async def list_orders(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: Optional[OrderStatus] = None,
    payment_status: Optional[PaymentStatus] = None,
    search: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    sort_by: str = Query("created_at", regex="^(created_at|updated_at|total|order_number)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    current_user = Depends(get_current_user)
):
    """List orders with filtering and pagination"""
    await get_prisma()
    
    # Build where clause
    where = {}
    
    if status:
        where["status"] = status.value
    
    if payment_status:
        where["paymentStatus"] = payment_status.value
    
    if search:
        where["OR"] = [
            {"orderNumber": {"contains": search, "mode": "insensitive"}},
            {"customerName": {"contains": search, "mode": "insensitive"}},
            {"customerEmail": {"contains": search, "mode": "insensitive"}},
        ]
    
    if date_from:
        where["createdAt"] = {"gte": date_from}
    
    if date_to:
        if "createdAt" in where:
            where["createdAt"]["lte"] = date_to
        else:
            where["createdAt"] = {"lte": date_to}
    
    # Map sort field names
    sort_field_map = {
        "created_at": "createdAt",
        "updated_at": "updatedAt",
        "total": "total",
        "order_number": "orderNumber",
    }
    sort_field = sort_field_map.get(sort_by, "createdAt")
    
    # Get total count
    total = await prisma.order.count(where=where)
    
    # Calculate pagination
    skip = (page - 1) * per_page
    total_pages = (total + per_page - 1) // per_page
    
    # Fetch orders
    orders = await prisma.order.find_many(
        where=where,
        include={"items": True},
        order={sort_field: sort_order},
        skip=skip,
        take=per_page,
    )
    
    return PaginatedOrderResponse(
        items=[build_order_list_response(order) for order in orders],
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
    )


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: str,
    current_user = Depends(get_current_user)
):
    """Get order by ID"""
    await get_prisma()
    
    order = await prisma.order.find_unique(
        where={"id": order_id},
        include={
            "items": True,
            "statusHistory": {"order_by": {"createdAt": "desc"}},
        }
    )
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    return build_order_response(order)


@router.get("/number/{order_number}", response_model=OrderResponse)
async def get_order_by_number(
    order_number: str,
    current_user = Depends(get_current_user)
):
    """Get order by order number"""
    await get_prisma()
    
    order = await prisma.order.find_unique(
        where={"orderNumber": order_number},
        include={
            "items": True,
            "statusHistory": {"order_by": {"createdAt": "desc"}},
        }
    )
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    return build_order_response(order)


@router.patch("/{order_id}", response_model=OrderResponse)
async def update_order(
    order_id: str,
    order_data: OrderUpdate,
    current_admin = Depends(get_current_admin)
):
    """Update order details (Admin only)"""
    await get_prisma()
    
    # Check if order exists
    existing_order = await prisma.order.find_unique(where={"id": order_id})
    if not existing_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Build update data
    update_data = {}
    
    if order_data.customer_name is not None:
        update_data["customerName"] = order_data.customer_name
    if order_data.customer_email is not None:
        update_data["customerEmail"] = order_data.customer_email
    if order_data.customer_phone is not None:
        update_data["customerPhone"] = order_data.customer_phone
    
    if order_data.shipping_address is not None:
        update_data["shippingAddress"] = order_data.shipping_address
    if order_data.shipping_city is not None:
        update_data["shippingCity"] = order_data.shipping_city
    if order_data.shipping_state is not None:
        update_data["shippingState"] = order_data.shipping_state
    if order_data.shipping_zip is not None:
        update_data["shippingZip"] = order_data.shipping_zip
    if order_data.shipping_country is not None:
        update_data["shippingCountry"] = order_data.shipping_country
    
    if order_data.billing_address is not None:
        update_data["billingAddress"] = order_data.billing_address
    if order_data.billing_city is not None:
        update_data["billingCity"] = order_data.billing_city
    if order_data.billing_state is not None:
        update_data["billingState"] = order_data.billing_state
    if order_data.billing_zip is not None:
        update_data["billingZip"] = order_data.billing_zip
    if order_data.billing_country is not None:
        update_data["billingCountry"] = order_data.billing_country
    
    if order_data.payment_method is not None:
        update_data["paymentMethod"] = order_data.payment_method.value
    if order_data.payment_status is not None:
        update_data["paymentStatus"] = order_data.payment_status.value
    
    # Recalculate total if costs change
    if any(x is not None for x in [order_data.shipping_cost, order_data.tax_amount, order_data.discount_amount]):
        shipping_cost = order_data.shipping_cost if order_data.shipping_cost is not None else existing_order.shippingCost
        tax_amount = order_data.tax_amount if order_data.tax_amount is not None else existing_order.taxAmount
        discount_amount = order_data.discount_amount if order_data.discount_amount is not None else existing_order.discountAmount
        
        update_data["shippingCost"] = shipping_cost
        update_data["taxAmount"] = tax_amount
        update_data["discountAmount"] = discount_amount
        update_data["total"] = existing_order.subtotal + shipping_cost + tax_amount - discount_amount
    
    if order_data.notes is not None:
        update_data["notes"] = order_data.notes
    if order_data.internal_notes is not None:
        update_data["internalNotes"] = order_data.internal_notes
    if order_data.tracking_number is not None:
        update_data["trackingNumber"] = order_data.tracking_number
    if order_data.shipping_carrier is not None:
        update_data["shippingCarrier"] = order_data.shipping_carrier
    
    # Update order
    await prisma.order.update(
        where={"id": order_id},
        data=update_data
    )
    
    # Fetch updated order
    updated_order = await prisma.order.find_unique(
        where={"id": order_id},
        include={
            "items": True,
            "statusHistory": {"order_by": {"createdAt": "desc"}},
        }
    )
    
    return build_order_response(updated_order)


@router.patch("/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: str,
    status_update: OrderStatusUpdate,
    current_admin = Depends(get_current_admin)
):
    """Update order status (Admin only)"""
    await get_prisma()
    
    # Check if order exists
    existing_order = await prisma.order.find_unique(where={"id": order_id})
    if not existing_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    old_status = existing_order.status
    new_status = status_update.status.value
    
    # Update status and set timestamps
    update_data = {"status": new_status}
    
    if new_status == "SHIPPED" and not existing_order.shippedAt:
        update_data["shippedAt"] = datetime.utcnow()
    elif new_status == "DELIVERED" and not existing_order.deliveredAt:
        update_data["deliveredAt"] = datetime.utcnow()
    elif new_status == "CANCELLED" and not existing_order.cancelledAt:
        update_data["cancelledAt"] = datetime.utcnow()
    
    async with prisma.tx() as tx:
        # Update order status
        await tx.order.update(
            where={"id": order_id},
            data=update_data
        )
        
        # Add status history entry
        await tx.orderstatushistory.create(
            data={
                "orderId": order_id,
                "fromStatus": old_status,
                "toStatus": new_status,
                "note": status_update.note,
                "changedBy": current_admin.email if hasattr(current_admin, 'email') else str(current_admin.id),
            }
        )
    
    # Fetch updated order
    updated_order = await prisma.order.find_unique(
        where={"id": order_id},
        include={
            "items": True,
            "statusHistory": {"order_by": {"createdAt": "desc"}},
        }
    )
    
    return build_order_response(updated_order)


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_order(
    order_id: str,
    current_admin = Depends(get_current_admin)
):
    """Delete an order (Admin only) - Use with caution, prefer cancellation"""
    await get_prisma()
    
    existing_order = await prisma.order.find_unique(where={"id": order_id})
    if not existing_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Delete order (cascade will handle items and status history)
    await prisma.order.delete(where={"id": order_id})
    
    return None


# ==========================================
# Order Statistics Endpoints
# ==========================================

@router.get("/stats/summary")
async def get_order_stats(
    current_user = Depends(get_current_user)
):
    """Get order statistics summary"""
    await get_prisma()
    
    # Total orders
    total_orders = await prisma.order.count()
    
    # Orders by status
    pending_orders = await prisma.order.count(where={"status": "PENDING"})
    confirmed_orders = await prisma.order.count(where={"status": "CONFIRMED"})
    processing_orders = await prisma.order.count(where={"status": "PROCESSING"})
    shipped_orders = await prisma.order.count(where={"status": "SHIPPED"})
    delivered_orders = await prisma.order.count(where={"status": "DELIVERED"})
    cancelled_orders = await prisma.order.count(where={"status": "CANCELLED"})
    
    # Payment status counts
    pending_payment = await prisma.order.count(where={"paymentStatus": "PENDING"})
    paid_orders = await prisma.order.count(where={"paymentStatus": "PAID"})
    
    # Revenue (from paid orders)
    paid_order_list = await prisma.order.find_many(
        where={"paymentStatus": "PAID"},
        select={"total": True}
    )
    total_revenue = sum(order.total for order in paid_order_list)
    
    # Today's orders
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    todays_orders = await prisma.order.count(
        where={"createdAt": {"gte": today_start}}
    )
    
    return {
        "total_orders": total_orders,
        "todays_orders": todays_orders,
        "total_revenue": total_revenue,
        "by_status": {
            "pending": pending_orders,
            "confirmed": confirmed_orders,
            "processing": processing_orders,
            "shipped": shipped_orders,
            "delivered": delivered_orders,
            "cancelled": cancelled_orders,
        },
        "by_payment_status": {
            "pending": pending_payment,
            "paid": paid_orders,
        }
    }

