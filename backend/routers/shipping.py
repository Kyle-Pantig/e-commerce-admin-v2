from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional, List
import math

from prisma_client import get_prisma_client
from prisma import Json
from models.shipping_models import (
    ShippingRuleResponse,
    ShippingRuleCreate,
    ShippingRuleUpdate,
    ShippingRuleListResponse,
    ShippingCalculationRequest,
    ShippingCalculationResponse,
)
from routers.auth import check_permission, get_current_user

router = APIRouter(prefix="/shipping", tags=["Shipping"])


def build_shipping_rule_response(rule) -> ShippingRuleResponse:
    """Convert Prisma shipping rule to response model."""
    return ShippingRuleResponse(
        id=rule.id,
        name=rule.name,
        description=rule.description,
        shipping_fee=rule.shippingFee,
        free_shipping_threshold=rule.freeShippingThreshold,
        is_active=rule.isActive,
        applicable_products=rule.applicableProducts if rule.applicableProducts else None,
        priority=rule.priority,
        created_at=rule.createdAt.isoformat() if rule.createdAt else None,
        updated_at=rule.updatedAt.isoformat() if rule.updatedAt else None,
    )


@router.get("", response_model=ShippingRuleListResponse)
async def list_shipping_rules(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user = Depends(check_permission("products", "view"))
):
    """List all shipping rules with pagination and filters."""
    try:
        prisma = await get_prisma_client()
        
        # Build where clause
        where = {}
        if search:
            where["OR"] = [
                {"name": {"contains": search, "mode": "insensitive"}},
                {"description": {"contains": search, "mode": "insensitive"}},
            ]
        if is_active is not None:
            where["isActive"] = is_active
        
        # Get total count
        total = await prisma.shippingrule.count(where=where)
        
        # Get items
        rules = await prisma.shippingrule.find_many(
            where=where,
            skip=(page - 1) * per_page,
            take=per_page,
            order=[{"priority": "desc"}, {"createdAt": "desc"}],
        )
        
        return ShippingRuleListResponse(
            items=[build_shipping_rule_response(r) for r in rules],
            total=total,
            page=page,
            per_page=per_page,
            total_pages=math.ceil(total / per_page) if total > 0 else 1,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch shipping rules: {str(e)}"
        )


@router.get("/{rule_id}", response_model=ShippingRuleResponse)
async def get_shipping_rule(
    rule_id: str,
    current_user = Depends(check_permission("products", "view"))
):
    """Get a single shipping rule by ID."""
    try:
        prisma = await get_prisma_client()
        rule = await prisma.shippingrule.find_unique(where={"id": rule_id})
        
        if not rule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Shipping rule not found"
            )
        
        return build_shipping_rule_response(rule)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch shipping rule: {str(e)}"
        )


@router.post("", response_model=ShippingRuleResponse, status_code=status.HTTP_201_CREATED)
async def create_shipping_rule(
    data: ShippingRuleCreate,
    current_user = Depends(check_permission("products", "edit"))
):
    """Create a new shipping rule."""
    try:
        prisma = await get_prisma_client()
        
        # Build create data
        create_data = {
            "name": data.name,
            "description": data.description,
            "shippingFee": data.shipping_fee,
            "freeShippingThreshold": data.free_shipping_threshold,
            "isActive": data.is_active,
            "priority": data.priority,
        }
        
        # Handle applicable_products
        if data.applicable_products and len(data.applicable_products) > 0:
            create_data["applicableProducts"] = Json(data.applicable_products)
        
        # Create rule
        rule = await prisma.shippingrule.create(data=create_data)
        
        return build_shipping_rule_response(rule)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create shipping rule: {str(e)}"
        )


@router.patch("/{rule_id}", response_model=ShippingRuleResponse)
async def update_shipping_rule(
    rule_id: str,
    data: ShippingRuleUpdate,
    current_user = Depends(check_permission("products", "edit"))
):
    """Update an existing shipping rule."""
    try:
        prisma = await get_prisma_client()
        
        # Check if rule exists
        existing = await prisma.shippingrule.find_unique(where={"id": rule_id})
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Shipping rule not found"
            )
        
        # Build update data - use model_fields_set to check which fields were actually sent
        # This allows distinguishing between "not sent" and "explicitly set to null"
        update_data = {}
        fields_set = data.model_fields_set
        
        if "name" in fields_set and data.name is not None:
            update_data["name"] = data.name
        if "description" in fields_set:
            update_data["description"] = data.description
        if "shipping_fee" in fields_set and data.shipping_fee is not None:
            update_data["shippingFee"] = data.shipping_fee
        if "free_shipping_threshold" in fields_set:
            # Allow setting to None (removes free shipping threshold)
            update_data["freeShippingThreshold"] = data.free_shipping_threshold
        if "is_active" in fields_set and data.is_active is not None:
            update_data["isActive"] = data.is_active
        if "priority" in fields_set and data.priority is not None:
            update_data["priority"] = data.priority
        
        # Handle applicable_products
        if "applicable_products" in fields_set:
            if data.applicable_products and len(data.applicable_products) > 0:
                update_data["applicableProducts"] = Json(data.applicable_products)
            else:
                update_data["applicableProducts"] = Json(None)
        
        if not update_data:
            return build_shipping_rule_response(existing)
        
        # Update
        rule = await prisma.shippingrule.update(
            where={"id": rule_id},
            data=update_data,
        )
        
        return build_shipping_rule_response(rule)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update shipping rule: {str(e)}"
        )


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_shipping_rule(
    rule_id: str,
    current_user = Depends(check_permission("products", "edit"))
):
    """Delete a shipping rule."""
    try:
        prisma = await get_prisma_client()
        
        # Check if rule exists
        existing = await prisma.shippingrule.find_unique(where={"id": rule_id})
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Shipping rule not found"
            )
        
        # Delete
        await prisma.shippingrule.delete(where={"id": rule_id})
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete shipping rule: {str(e)}"
        )


@router.post("/{rule_id}/toggle", response_model=ShippingRuleResponse)
async def toggle_shipping_rule_status(
    rule_id: str,
    current_user = Depends(check_permission("products", "edit"))
):
    """Toggle a shipping rule's active status."""
    try:
        prisma = await get_prisma_client()
        
        # Get current rule
        rule = await prisma.shippingrule.find_unique(where={"id": rule_id})
        if not rule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Shipping rule not found"
            )
        
        # Toggle status
        updated = await prisma.shippingrule.update(
            where={"id": rule_id},
            data={"isActive": not rule.isActive},
        )
        
        return build_shipping_rule_response(updated)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to toggle shipping rule status: {str(e)}"
        )


@router.post("/calculate", response_model=ShippingCalculationResponse)
async def calculate_shipping(
    data: ShippingCalculationRequest,
    current_user = Depends(get_current_user)
):
    """Calculate shipping cost for an order."""
    try:
        prisma = await get_prisma_client()
        
        # Get all active rules ordered by priority
        rules = await prisma.shippingrule.find_many(
            where={"isActive": True},
            order=[{"priority": "desc"}],
        )
        
        if not rules:
            return ShippingCalculationResponse(
                shipping_fee=0,
                is_free_shipping=True,
                free_shipping_threshold=None,
                rule_name=None,
                message="No shipping rules configured - shipping is free"
            )
        
        # Find matching rule
        matched_rule = None
        default_rule = None
        
        for rule in rules:
            # Check if this is a product-specific rule
            if rule.applicableProducts and len(rule.applicableProducts) > 0:
                if data.product_ids:
                    # Check if any product in order matches
                    has_match = any(pid in rule.applicableProducts for pid in data.product_ids)
                    if has_match:
                        matched_rule = rule
                        break
            else:
                # This is a default rule (no product restriction)
                if default_rule is None:
                    default_rule = rule
        
        # Use matched rule or fall back to default
        rule = matched_rule or default_rule
        
        if not rule:
            return ShippingCalculationResponse(
                shipping_fee=0,
                is_free_shipping=True,
                free_shipping_threshold=None,
                rule_name=None,
                message="No applicable shipping rule - shipping is free"
            )
        
        # Check if order qualifies for free shipping
        if rule.freeShippingThreshold and data.order_subtotal >= rule.freeShippingThreshold:
            return ShippingCalculationResponse(
                shipping_fee=0,
                is_free_shipping=True,
                free_shipping_threshold=rule.freeShippingThreshold,
                rule_name=rule.name,
                message=f"Free shipping! Order total exceeds ₱{rule.freeShippingThreshold:,.2f}"
            )
        
        # Apply shipping fee
        message = f"Shipping fee: ₱{rule.shippingFee:,.2f}"
        if rule.freeShippingThreshold:
            remaining = rule.freeShippingThreshold - data.order_subtotal
            message = f"Add ₱{remaining:,.2f} more for free shipping"
        
        return ShippingCalculationResponse(
            shipping_fee=rule.shippingFee,
            is_free_shipping=False,
            free_shipping_threshold=rule.freeShippingThreshold,
            rule_name=rule.name,
            message=message
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate shipping: {str(e)}"
        )


@router.get("/public/info", response_model=ShippingCalculationResponse)
async def get_public_shipping_info():
    """Get public shipping information (no auth required)."""
    try:
        prisma = await get_prisma_client()
        
        # Get default rule (no product restrictions, highest priority)
        rule = await prisma.shippingrule.find_first(
            where={
                "isActive": True,
                "applicableProducts": None,
            },
            order=[{"priority": "desc"}],
        )
        
        if not rule:
            return ShippingCalculationResponse(
                shipping_fee=0,
                is_free_shipping=True,
                free_shipping_threshold=None,
                rule_name=None,
                message="Shipping is currently free"
            )
        
        message = f"Flat shipping fee: ₱{rule.shippingFee:,.2f}"
        if rule.freeShippingThreshold:
            message = f"₱{rule.shippingFee:,.2f} shipping fee. Free shipping on orders over ₱{rule.freeShippingThreshold:,.2f}"
        
        return ShippingCalculationResponse(
            shipping_fee=rule.shippingFee,
            is_free_shipping=False,
            free_shipping_threshold=rule.freeShippingThreshold,
            rule_name=rule.name,
            message=message
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get shipping info: {str(e)}"
        )
