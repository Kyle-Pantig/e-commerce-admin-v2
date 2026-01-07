"""
Analytics API Router
Provides comprehensive analytics data for the dashboard including:
- Sales reports and revenue metrics
- Product performance metrics
- Inventory reports
- Customer/Order analytics
"""

from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timedelta
from typing import Optional
import asyncio

from prisma_client import get_prisma_client
from routers.auth import get_current_user, check_permission

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/dashboard")
async def get_dashboard_analytics(
    current_user = Depends(check_permission("analytics", "view"))
):
    """Get comprehensive dashboard analytics"""
    prisma = await get_prisma_client()
    
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday = today - timedelta(days=1)
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)
    last_month_start = (today.replace(day=1) - timedelta(days=1)).replace(day=1)
    last_month_end = today.replace(day=1) - timedelta(days=1)
    
    # Execute all queries in parallel for performance
    (
        # Revenue metrics
        total_revenue_all,
        total_revenue_month,
        total_revenue_last_month,
        total_revenue_week,
        total_revenue_today,
        
        # Order counts
        total_orders,
        orders_today,
        orders_week,
        orders_month,
        orders_last_month,
        
        # Order status counts
        pending_orders,
        processing_orders,
        shipped_orders,
        delivered_orders,
        cancelled_orders,
        
        # Product counts
        total_products,
        active_products,
        low_stock_products,
        out_of_stock_products,
        low_stock_variants,
        out_of_stock_variants,
        
        # Customer counts
        total_customers,
        new_customers_month,
        new_customers_last_month,
        
        # Category count
        total_categories,
    ) = await asyncio.gather(
        # Revenue - all time (paid orders)
        prisma.order.find_many(
            where={"paymentStatus": "PAID"}
        ),
        # Revenue - this month
        prisma.order.find_many(
            where={"paymentStatus": "PAID", "createdAt": {"gte": today.replace(day=1)}}
        ),
        # Revenue - last month
        prisma.order.find_many(
            where={"paymentStatus": "PAID", "createdAt": {"gte": last_month_start, "lt": today.replace(day=1)}}
        ),
        # Revenue - this week
        prisma.order.find_many(
            where={"paymentStatus": "PAID", "createdAt": {"gte": week_ago}}
        ),
        # Revenue - today
        prisma.order.find_many(
            where={"paymentStatus": "PAID", "createdAt": {"gte": today}}
        ),
        
        # Order counts
        prisma.order.count(),
        prisma.order.count(where={"createdAt": {"gte": today}}),
        prisma.order.count(where={"createdAt": {"gte": week_ago}}),
        prisma.order.count(where={"createdAt": {"gte": today.replace(day=1)}}),
        prisma.order.count(where={"createdAt": {"gte": last_month_start, "lt": today.replace(day=1)}}),
        
        # Order status
        prisma.order.count(where={"status": "PENDING"}),
        prisma.order.count(where={"status": "PROCESSING"}),
        prisma.order.count(where={"status": "SHIPPED"}),
        prisma.order.count(where={"status": "DELIVERED"}),
        prisma.order.count(where={"status": "CANCELLED"}),
        
        # Products
        prisma.product.count(),
        prisma.product.count(where={"status": "ACTIVE"}),
        # Low stock: products without variants with low stock
        prisma.product.count(where={"hasVariants": False, "stock": {"lte": 10, "gt": 0}, "status": "ACTIVE"}),
        # Out of stock: products without variants with 0 stock
        prisma.product.count(where={"hasVariants": False, "stock": 0, "status": "ACTIVE"}),
        # Low stock variants
        prisma.productvariant.count(where={"isActive": True, "stock": {"lte": 10, "gt": 0}, "product": {"status": "ACTIVE"}}),
        # Out of stock variants
        prisma.productvariant.count(where={"isActive": True, "stock": 0, "product": {"status": "ACTIVE"}}),
        
        # Customers (users with CUSTOMER role - regular customers)
        prisma.user.count(where={"role": "CUSTOMER"}),
        prisma.user.count(where={"role": "CUSTOMER", "createdAt": {"gte": today.replace(day=1)}}),
        prisma.user.count(where={"role": "CUSTOMER", "createdAt": {"gte": last_month_start, "lt": today.replace(day=1)}}),
        
        # Categories
        prisma.category.count(),
    )
    
    # Calculate totals
    revenue_all = sum(o.total for o in total_revenue_all)
    revenue_month = sum(o.total for o in total_revenue_month)
    revenue_last_month = sum(o.total for o in total_revenue_last_month)
    revenue_week = sum(o.total for o in total_revenue_week)
    revenue_today = sum(o.total for o in total_revenue_today)
    
    # Calculate growth percentages
    revenue_growth = ((revenue_month - revenue_last_month) / revenue_last_month * 100) if revenue_last_month > 0 else 0
    orders_growth = ((orders_month - orders_last_month) / orders_last_month * 100) if orders_last_month > 0 else 0
    customers_growth = ((new_customers_month - new_customers_last_month) / new_customers_last_month * 100) if new_customers_last_month > 0 else 0
    
    return {
        "revenue": {
            "total": revenue_all,
            "today": revenue_today,
            "this_week": revenue_week,
            "this_month": revenue_month,
            "last_month": revenue_last_month,
            "growth_percent": round(revenue_growth, 1),
        },
        "orders": {
            "total": total_orders,
            "today": orders_today,
            "this_week": orders_week,
            "this_month": orders_month,
            "last_month": orders_last_month,
            "growth_percent": round(orders_growth, 1),
            "by_status": {
                "pending": pending_orders,
                "processing": processing_orders,
                "shipped": shipped_orders,
                "delivered": delivered_orders,
                "cancelled": cancelled_orders,
            }
        },
        "products": {
            "total": total_products,
            "active": active_products,
            "low_stock": low_stock_products + low_stock_variants,  # Products + Variants combined
            "out_of_stock": out_of_stock_products + out_of_stock_variants,  # Products + Variants combined
            "low_stock_products": low_stock_products,  # Products without variants only
            "low_stock_variants": low_stock_variants,  # Variants only
            "out_of_stock_products": out_of_stock_products,
            "out_of_stock_variants": out_of_stock_variants,
        },
        "customers": {
            "total": total_customers,
            "new_this_month": new_customers_month,
            "growth_percent": round(customers_growth, 1),
        },
        "categories": {
            "total": total_categories,
        }
    }


@router.get("/sales-chart")
async def get_sales_chart_data(
    period: str = "30d",  # 7d, 30d, 90d
    current_user = Depends(check_permission("analytics", "view"))
):
    """Get sales data for chart visualization"""
    prisma = await get_prisma_client()
    
    days = {"7d": 7, "30d": 30, "90d": 90}.get(period, 30)
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Get all paid orders in the period
    orders = await prisma.order.find_many(
        where={
            "paymentStatus": "PAID",
            "createdAt": {"gte": start_date}
        },
        order={"createdAt": "asc"}
    )
    
    # Group by date
    daily_data = {}
    for order in orders:
        date_key = order.createdAt.strftime("%Y-%m-%d")
        if date_key not in daily_data:
            daily_data[date_key] = {"revenue": 0, "orders": 0}
        daily_data[date_key]["revenue"] += float(order.total)
        daily_data[date_key]["orders"] += 1
    
    # Fill in missing dates with zeros
    result = []
    current = start_date
    while current <= datetime.utcnow():
        date_key = current.strftime("%Y-%m-%d")
        data = daily_data.get(date_key, {"revenue": 0, "orders": 0})
        result.append({
            "date": date_key,
            "revenue": data["revenue"],
            "orders": data["orders"],
        })
        current += timedelta(days=1)
    
    return result


@router.get("/top-products")
async def get_top_products(
    limit: int = 5,
    current_user = Depends(check_permission("analytics", "view"))
):
    """Get top selling products based on order items"""
    prisma = await get_prisma_client()
    
    # Get order items with product relation
    order_items = await prisma.orderitem.find_many(
        include={
            "product": {
                "include": {
                    "images": True
                }
            }
        }
    )
    
    # Aggregate by product
    product_stats = {}
    for item in order_items:
        if not item.product:
            continue
        pid = item.product.id
        if pid not in product_stats:
            # Find primary image
            primary_image = None
            if item.product.images:
                for img in item.product.images:
                    if img.isPrimary:
                        primary_image = img.url
                        break
                if not primary_image and item.product.images:
                    primary_image = item.product.images[0].url
            
            product_stats[pid] = {
                "id": item.product.id,
                "name": item.product.name,
                "slug": item.product.slug,
                "price": float(item.product.basePrice),
                "stock": item.product.stock,
                "image": primary_image,
                "total_sold": 0,
                "total_revenue": 0,
            }
        product_stats[pid]["total_sold"] += item.quantity
        product_stats[pid]["total_revenue"] += float(item.subtotal)
    
    # Sort by total sold and return top N
    sorted_products = sorted(
        product_stats.values(),
        key=lambda x: x["total_sold"],
        reverse=True
    )[:limit]
    
    return sorted_products


@router.get("/low-stock")
async def get_low_stock_products(
    threshold: int = 10,
    limit: int = 10,
    current_user = Depends(check_permission("analytics", "view"))
):
    """Get products and variants with low stock"""
    prisma = await get_prisma_client()
    
    # Get products WITHOUT variants that have low stock
    products, variants = await asyncio.gather(
        prisma.product.find_many(
            where={
                "status": "ACTIVE",
                "hasVariants": False,
                "stock": {"lte": threshold}
            },
            include={"images": True},
            order={"stock": "asc"},
            take=limit
        ),
        # Get variants with low stock
        prisma.productvariant.find_many(
            where={
                "isActive": True,
                "stock": {"lte": threshold},
                "product": {"status": "ACTIVE"}
            },
            include={
                "product": {
                    "include": {"images": True}
                }
            },
            order={"stock": "asc"},
            take=limit
        )
    )
    
    result = []
    
    # Add products without variants
    for p in products:
        # Find primary image
        primary_image = None
        if p.images:
            for img in p.images:
                if img.isPrimary:
                    primary_image = img.url
                    break
            if not primary_image and p.images:
                primary_image = p.images[0].url
        
        result.append({
            "id": p.id,
            "name": p.name,
            "slug": p.slug,
            "sku": p.sku,
            "stock": p.stock,
            "low_stock_threshold": p.lowStockThreshold or 10,
            "image": primary_image,
            "status": "out_of_stock" if p.stock == 0 else "low_stock",
            "type": "product",
        })
    
    # Add variants
    for v in variants:
        # Find primary image from product
        primary_image = v.imageUrl
        if not primary_image and v.product and v.product.images:
            for img in v.product.images:
                if img.isPrimary:
                    primary_image = img.url
                    break
            if not primary_image and v.product.images:
                primary_image = v.product.images[0].url
        
        result.append({
            "id": v.id,
            "product_id": v.productId,
            "name": f"{v.product.name} - {v.name}" if v.product else v.name,
            "slug": v.product.slug if v.product else None,
            "sku": v.sku,
            "stock": v.stock,
            "low_stock_threshold": v.lowStockThreshold or 10,
            "image": primary_image,
            "status": "out_of_stock" if v.stock == 0 else "low_stock",
            "type": "variant",
        })
    
    # Sort combined results by stock and limit
    result.sort(key=lambda x: x["stock"])
    return result[:limit]


@router.get("/recent-orders")
async def get_recent_orders(
    limit: int = 5,
    current_user = Depends(check_permission("analytics", "view"))
):
    """Get most recent orders"""
    prisma = await get_prisma_client()
    
    orders = await prisma.order.find_many(
        take=limit,
        order={"createdAt": "desc"},
        include={"user": True}
    )
    
    return [
        {
            "id": o.id,
            "order_number": o.orderNumber,
            "customer_name": o.user.fullName if o.user and o.user.fullName else o.customerName,
            "customer_email": o.user.email if o.user else o.customerEmail,
            "total": float(o.total),
            "status": o.status,
            "payment_status": o.paymentStatus,
            "created_at": o.createdAt.isoformat(),
        }
        for o in orders
    ]


@router.get("/order-status-distribution")
async def get_order_status_distribution(
    current_user = Depends(check_permission("analytics", "view"))
):
    """Get order count by status for pie/donut chart"""
    prisma = await get_prisma_client()
    
    statuses = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]
    
    counts = await asyncio.gather(*[
        prisma.order.count(where={"status": status})
        for status in statuses
    ])
    
    return [
        {"status": status.lower(), "count": count, "label": status.replace("_", " ").title()}
        for status, count in zip(statuses, counts)
        if count > 0
    ]

