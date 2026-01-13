"""
Tax Rules Router

Handles CRUD operations for tax rules and tax calculation.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import Optional
from prisma import Json
import math

from models.tax_models import (
    TaxRuleResponse,
    TaxRuleCreate,
    TaxRuleUpdate,
    TaxRuleListResponse,
    TaxCalculationRequest,
    TaxCalculationResponse,
)
from prisma_client import get_prisma_client
from routers.auth import check_permission, get_current_user

router = APIRouter(prefix="/tax", tags=["Tax"])


def build_tax_rule_response(rule) -> TaxRuleResponse:
    """Build TaxRuleResponse from Prisma model."""
    return TaxRuleResponse(
        id=rule.id,
        name=rule.name,
        description=rule.description,
        tax_rate=rule.taxRate,
        tax_type=rule.taxType,
        is_inclusive=rule.isInclusive,
        is_active=rule.isActive,
        applicable_products=rule.applicableProducts if rule.applicableProducts else None,
        applicable_categories=rule.applicableCategories if rule.applicableCategories else None,
        priority=rule.priority,
        created_at=rule.createdAt.isoformat() if rule.createdAt else None,
        updated_at=rule.updatedAt.isoformat() if rule.updatedAt else None,
    )


@router.get("", response_model=TaxRuleListResponse)
async def list_tax_rules(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user = Depends(get_current_user)
):
    """List all tax rules with pagination."""
    try:
        prisma = await get_prisma_client()
        
        # Build filters
        where = {}
        if is_active is not None:
            where["isActive"] = is_active
        if search:
            where["OR"] = [
                {"name": {"contains": search, "mode": "insensitive"}},
                {"description": {"contains": search, "mode": "insensitive"}},
            ]
        
        # Get total count
        total = await prisma.taxrule.count(where=where)
        
        # Calculate pagination
        total_pages = math.ceil(total / per_page) if total > 0 else 1
        skip = (page - 1) * per_page
        
        # Get rules
        rules = await prisma.taxrule.find_many(
            where=where,
            skip=skip,
            take=per_page,
            order=[{"priority": "desc"}, {"createdAt": "desc"}],
        )
        
        return TaxRuleListResponse(
            items=[build_tax_rule_response(r) for r in rules],
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch tax rules: {str(e)}"
        )


@router.get("/{rule_id}", response_model=TaxRuleResponse)
async def get_tax_rule(
    rule_id: str,
    current_user = Depends(get_current_user)
):
    """Get a single tax rule by ID."""
    try:
        prisma = await get_prisma_client()
        
        rule = await prisma.taxrule.find_unique(where={"id": rule_id})
        if not rule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tax rule not found"
            )
        
        return build_tax_rule_response(rule)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch tax rule: {str(e)}"
        )


@router.post("", response_model=TaxRuleResponse, status_code=status.HTTP_201_CREATED)
async def create_tax_rule(
    data: TaxRuleCreate,
    current_user = Depends(check_permission("products", "edit"))
):
    """Create a new tax rule."""
    try:
        prisma = await get_prisma_client()
        
        # Build create data
        create_data = {
            "name": data.name,
            "description": data.description,
            "taxRate": data.tax_rate,
            "taxType": data.tax_type,
            "isInclusive": data.is_inclusive,
            "isActive": data.is_active,
            "priority": data.priority,
        }
        
        # Handle applicable_products
        if data.applicable_products and len(data.applicable_products) > 0:
            create_data["applicableProducts"] = Json(data.applicable_products)
        
        # Handle applicable_categories
        if data.applicable_categories and len(data.applicable_categories) > 0:
            create_data["applicableCategories"] = Json(data.applicable_categories)
        
        # Create rule
        rule = await prisma.taxrule.create(data=create_data)
        
        return build_tax_rule_response(rule)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create tax rule: {str(e)}"
        )


@router.patch("/{rule_id}", response_model=TaxRuleResponse)
async def update_tax_rule(
    rule_id: str,
    data: TaxRuleUpdate,
    current_user = Depends(check_permission("products", "edit"))
):
    """Update an existing tax rule."""
    try:
        prisma = await get_prisma_client()
        
        # Check if rule exists
        existing = await prisma.taxrule.find_unique(where={"id": rule_id})
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tax rule not found"
            )
        
        # Build update data - use model_fields_set to check which fields were actually sent
        update_data = {}
        fields_set = data.model_fields_set
        
        if "name" in fields_set and data.name is not None:
            update_data["name"] = data.name
        if "description" in fields_set:
            update_data["description"] = data.description
        if "tax_rate" in fields_set and data.tax_rate is not None:
            update_data["taxRate"] = data.tax_rate
        if "tax_type" in fields_set and data.tax_type is not None:
            update_data["taxType"] = data.tax_type
        if "is_inclusive" in fields_set and data.is_inclusive is not None:
            update_data["isInclusive"] = data.is_inclusive
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
        
        # Handle applicable_categories
        if "applicable_categories" in fields_set:
            if data.applicable_categories and len(data.applicable_categories) > 0:
                update_data["applicableCategories"] = Json(data.applicable_categories)
            else:
                update_data["applicableCategories"] = Json(None)
        
        if not update_data:
            return build_tax_rule_response(existing)
        
        # Update
        rule = await prisma.taxrule.update(
            where={"id": rule_id},
            data=update_data,
        )
        
        return build_tax_rule_response(rule)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update tax rule: {str(e)}"
        )


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tax_rule(
    rule_id: str,
    current_user = Depends(check_permission("products", "edit"))
):
    """Delete a tax rule."""
    try:
        prisma = await get_prisma_client()
        
        # Check if rule exists
        existing = await prisma.taxrule.find_unique(where={"id": rule_id})
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tax rule not found"
            )
        
        await prisma.taxrule.delete(where={"id": rule_id})
        return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete tax rule: {str(e)}"
        )


@router.post("/{rule_id}/toggle", response_model=TaxRuleResponse)
async def toggle_tax_rule(
    rule_id: str,
    current_user = Depends(check_permission("products", "edit"))
):
    """Toggle a tax rule's active status."""
    try:
        prisma = await get_prisma_client()
        
        # Get current rule
        rule = await prisma.taxrule.find_unique(where={"id": rule_id})
        if not rule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tax rule not found"
            )
        
        # Toggle status
        updated = await prisma.taxrule.update(
            where={"id": rule_id},
            data={"isActive": not rule.isActive},
        )
        
        return build_tax_rule_response(updated)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to toggle tax rule status: {str(e)}"
        )


@router.post("/calculate", response_model=TaxCalculationResponse)
async def calculate_tax(
    data: TaxCalculationRequest,
    current_user = Depends(get_current_user)
):
    """Calculate tax for an order."""
    try:
        prisma = await get_prisma_client()
        
        # Get all active rules ordered by priority
        rules = await prisma.taxrule.find_many(
            where={"isActive": True},
            order=[{"priority": "desc"}],
        )
        
        if not rules:
            return TaxCalculationResponse(
                tax_amount=0,
                tax_rate=0,
                tax_type="PERCENTAGE",
                is_inclusive=False,
                rule_name=None,
                message="No tax rules configured"
            )
        
        # Find matching rule
        matched_rule = None
        default_rule = None
        
        for rule in rules:
            # Check if this is a product-specific rule
            if rule.applicableProducts and len(rule.applicableProducts) > 0:
                if data.product_ids:
                    # Check if any product in the order matches
                    matching_products = set(data.product_ids) & set(rule.applicableProducts)
                    if matching_products:
                        matched_rule = rule
                        break
            else:
                # This is a default rule (applies to all products)
                if default_rule is None:
                    default_rule = rule
        
        # Use matched rule or fall back to default
        final_rule = matched_rule or default_rule
        
        if not final_rule:
            return TaxCalculationResponse(
                tax_amount=0,
                tax_rate=0,
                tax_type="PERCENTAGE",
                is_inclusive=False,
                rule_name=None,
                message="No applicable tax rule found"
            )
        
        # Calculate tax
        if final_rule.taxType == "PERCENTAGE":
            if final_rule.isInclusive:
                # Tax is already included in price
                tax_amount = data.order_subtotal - (data.order_subtotal / (1 + final_rule.taxRate / 100))
            else:
                # Tax is added on top
                tax_amount = data.order_subtotal * (final_rule.taxRate / 100)
        else:
            # Fixed amount
            tax_amount = final_rule.taxRate
        
        return TaxCalculationResponse(
            tax_amount=round(tax_amount, 2),
            tax_rate=final_rule.taxRate,
            tax_type=final_rule.taxType,
            is_inclusive=final_rule.isInclusive,
            rule_name=final_rule.name,
            message=f"Tax calculated using '{final_rule.name}' rule"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate tax: {str(e)}"
        )


@router.get("/public/info", response_model=TaxCalculationResponse)
async def get_public_tax_info():
    """Get public tax info (no auth required)."""
    try:
        prisma = await get_prisma_client()
        
        # Get highest priority default rule
        rule = await prisma.taxrule.find_first(
            where={
                "isActive": True,
                "applicableProducts": None,
            },
            order=[{"priority": "desc"}],
        )
        
        if not rule:
            return TaxCalculationResponse(
                tax_amount=0,
                tax_rate=0,
                tax_type="PERCENTAGE",
                is_inclusive=False,
                rule_name=None,
                message="No default tax rule configured"
            )
        
        return TaxCalculationResponse(
            tax_amount=0,
            tax_rate=rule.taxRate,
            tax_type=rule.taxType,
            is_inclusive=rule.isInclusive,
            rule_name=rule.name,
            message=f"{rule.taxRate}% {rule.name}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch tax info: {str(e)}"
        )
