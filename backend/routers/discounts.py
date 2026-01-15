from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional, List
from datetime import datetime
import math

from prisma_client import get_prisma_client
from prisma import Json
from models.discount_models import (
    DiscountCodeCreate,
    DiscountCodeUpdate,
    DiscountCodeResponse,
    DiscountCodeListResponse,
    DiscountValidationRequest,
    DiscountValidationResponse,
)
from routers.auth import check_permission, get_current_user

router = APIRouter(prefix="/discounts", tags=["Discounts"])


def build_discount_response(discount) -> DiscountCodeResponse:
    """Convert Prisma discount to response model."""
    return DiscountCodeResponse(
        id=discount.id,
        code=discount.code,
        description=discount.description,
        discount_type=discount.discountType.value if hasattr(discount.discountType, 'value') else str(discount.discountType),
        discount_value=discount.discountValue,
        minimum_order_amount=discount.minimumOrderAmount,
        maximum_discount=discount.maximumDiscount,
        usage_limit=discount.usageLimit,
        usage_limit_per_user=discount.usageLimitPerUser,
        usage_count=discount.usageCount,
        is_active=discount.isActive,
        start_date=discount.startDate.isoformat() if discount.startDate else None,
        end_date=discount.endDate.isoformat() if discount.endDate else None,
        auto_apply=discount.autoApply if hasattr(discount, 'autoApply') else False,
        show_badge=discount.showBadge if hasattr(discount, 'showBadge') else True,
        applicable_products=discount.applicableProducts,
        applicable_variants=discount.applicableVariants if hasattr(discount, 'applicableVariants') else None,
        applicable_categories=discount.applicableCategories,
        created_at=discount.createdAt.isoformat() if discount.createdAt else None,
        updated_at=discount.updatedAt.isoformat() if discount.updatedAt else None,
        created_by=discount.createdBy,
    )


@router.get("", response_model=DiscountCodeListResponse)
async def list_discount_codes(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user = Depends(check_permission("products", "view"))  # Use products permission for now
):
    """List all discount codes with pagination and filters."""
    try:
        prisma = await get_prisma_client()
        
        # Build where clause
        where = {}
        if search:
            where["OR"] = [
                {"code": {"contains": search.upper(), "mode": "insensitive"}},
                {"description": {"contains": search, "mode": "insensitive"}},
            ]
        if is_active is not None:
            where["isActive"] = is_active
        
        # Get total count
        total = await prisma.discountcode.count(where=where)
        
        # Get items
        discounts = await prisma.discountcode.find_many(
            where=where,
            skip=(page - 1) * per_page,
            take=per_page,
            order={"createdAt": "desc"},
        )
        
        return DiscountCodeListResponse(
            items=[build_discount_response(d) for d in discounts],
            total=total,
            page=page,
            per_page=per_page,
            total_pages=math.ceil(total / per_page) if total > 0 else 1,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch discount codes: {str(e)}"
        )


@router.get("/auto-apply/all", response_model=List[DiscountCodeResponse])
async def get_all_auto_apply_discounts():
    """Get all active auto-apply discounts (for admin order form)."""
    try:
        from datetime import datetime, timezone
        prisma = await get_prisma_client()
        now = datetime.now(timezone.utc)
        
        # Get all active auto-apply discounts with badge enabled
        discounts = await prisma.discountcode.find_many(
            where={
                "isActive": True,
                "autoApply": True,
                "showBadge": True,
            }
        )
        
        # Filter by date validity
        valid_discounts = []
        for discount in discounts:
            # Check start date
            if discount.startDate:
                start_dt = discount.startDate if discount.startDate.tzinfo else discount.startDate.replace(tzinfo=timezone.utc)
                if start_dt > now:
                    continue
            
            # Check end date
            if discount.endDate:
                end_dt = discount.endDate if discount.endDate.tzinfo else discount.endDate.replace(tzinfo=timezone.utc)
                if end_dt < now:
                    continue
            
            valid_discounts.append(build_discount_response(discount))
        
        return valid_discounts
    except Exception as e:
        import traceback
        print(f"Error in get_all_auto_apply_discounts: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch auto-apply discounts: {str(e)}"
        )


@router.get("/code/{code}", response_model=DiscountCodeResponse)
async def get_discount_by_code(
    code: str,
    current_user = Depends(check_permission("products", "view"))
):
    """Get a discount code by its code string."""
    try:
        prisma = await get_prisma_client()
        discount = await prisma.discountcode.find_unique(where={"code": code.upper()})
        
        if not discount:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Discount code not found"
            )
        
        return build_discount_response(discount)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch discount code: {str(e)}"
        )


@router.get("/product/{product_id}", response_model=List[DiscountCodeResponse])
async def get_product_discounts(
    product_id: str,
    variant_id: Optional[str] = Query(None),
):
    """Get all active auto-apply discounts for a product/variant (public endpoint for storefront)."""
    try:
        from datetime import datetime
        prisma = await get_prisma_client()
        from datetime import timezone
        now = datetime.now(timezone.utc)
        
        # Get all active auto-apply discounts
        discounts = await prisma.discountcode.find_many(
            where={
                "isActive": True,
                "autoApply": True,
            }
        )
        
        # Filter by date validity and applicable products/variants
        valid_discounts = []
        for discount in discounts:
            # Check start date
            if discount.startDate:
                start_dt = discount.startDate if discount.startDate.tzinfo else discount.startDate.replace(tzinfo=timezone.utc)
                if start_dt > now:
                    continue
            
            # Check end date
            if discount.endDate:
                end_dt = discount.endDate if discount.endDate.tzinfo else discount.endDate.replace(tzinfo=timezone.utc)
                if end_dt < now:
                    continue
            
            # Check if product/variant is applicable
            has_product_restriction = discount.applicableProducts and len(discount.applicableProducts) > 0
            has_variant_restriction = discount.applicableVariants and len(discount.applicableVariants) > 0
            
            if has_product_restriction or has_variant_restriction:
                # Check variant first if provided
                if variant_id and has_variant_restriction:
                    if variant_id in discount.applicableVariants:
                        valid_discounts.append(build_discount_response(discount))
                        continue
                
                # Check product level
                if has_product_restriction and product_id in discount.applicableProducts:
                    valid_discounts.append(build_discount_response(discount))
                    continue
                
                # Has restrictions but doesn't match
                continue
            
            # No restrictions - applies to all products
            valid_discounts.append(build_discount_response(discount))
        
        return valid_discounts
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch product discounts: {str(e)}"
        )


@router.get("/{discount_id}", response_model=DiscountCodeResponse)
async def get_discount_code(
    discount_id: str,
    current_user = Depends(check_permission("products", "view"))
):
    """Get a single discount code by ID."""
    try:
        prisma = await get_prisma_client()
        discount = await prisma.discountcode.find_unique(where={"id": discount_id})
        
        if not discount:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Discount code not found"
            )
        
        return build_discount_response(discount)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch discount code: {str(e)}"
        )


@router.post("", response_model=DiscountCodeResponse, status_code=status.HTTP_201_CREATED)
async def create_discount_code(
    data: DiscountCodeCreate,
    current_user = Depends(check_permission("products", "edit"))
):
    """Create a new discount code."""
    try:
        prisma = await get_prisma_client()
        
        # Check if code already exists
        existing = await prisma.discountcode.find_unique(where={"code": data.code})
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Discount code '{data.code}' already exists"
            )
        
        # Build create data - only include Json fields if they have values
        create_data = {
            "code": data.code,
            "description": data.description,
            "discountType": data.discount_type.value,
            "discountValue": data.discount_value,
            "minimumOrderAmount": data.minimum_order_amount,
            "maximumDiscount": data.maximum_discount,
            "usageLimit": data.usage_limit,
            "usageLimitPerUser": data.usage_limit_per_user,
            "isActive": data.is_active,
            "startDate": data.start_date,
            "endDate": data.end_date,
            "autoApply": data.auto_apply,
            "showBadge": data.show_badge,
            "createdBy": current_user.email if hasattr(current_user, 'email') else None,
        }
        
        # Only add Json fields if they have actual values (non-empty lists)
        if data.applicable_products and len(data.applicable_products) > 0:
            create_data["applicableProducts"] = Json(data.applicable_products)
        if data.applicable_variants and len(data.applicable_variants) > 0:
            create_data["applicableVariants"] = Json(data.applicable_variants)
        if data.applicable_categories and len(data.applicable_categories) > 0:
            create_data["applicableCategories"] = Json(data.applicable_categories)
        
        # Create discount code
        discount = await prisma.discountcode.create(data=create_data)
        
        return build_discount_response(discount)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create discount code: {str(e)}"
        )


@router.patch("/{discount_id}", response_model=DiscountCodeResponse)
async def update_discount_code(
    discount_id: str,
    data: DiscountCodeUpdate,
    current_user = Depends(check_permission("products", "edit"))
):
    """Update an existing discount code."""
    try:
        prisma = await get_prisma_client()
        
        # Check if discount exists
        existing = await prisma.discountcode.find_unique(where={"id": discount_id})
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Discount code not found"
            )
        
        # If code is being changed, check for duplicates
        if data.code and data.code != existing.code:
            duplicate = await prisma.discountcode.find_unique(where={"code": data.code})
            if duplicate:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Discount code '{data.code}' already exists"
                )
        
        # Build update data
        update_data = {}
        if data.code is not None:
            update_data["code"] = data.code
        if data.description is not None:
            update_data["description"] = data.description
        if data.discount_type is not None:
            update_data["discountType"] = data.discount_type.value
        if data.discount_value is not None:
            update_data["discountValue"] = data.discount_value
        if data.minimum_order_amount is not None:
            update_data["minimumOrderAmount"] = data.minimum_order_amount
        if data.maximum_discount is not None:
            update_data["maximumDiscount"] = data.maximum_discount
        if data.usage_limit is not None:
            update_data["usageLimit"] = data.usage_limit
        if data.usage_limit_per_user is not None:
            update_data["usageLimitPerUser"] = data.usage_limit_per_user
        if data.is_active is not None:
            update_data["isActive"] = data.is_active
        if data.start_date is not None:
            update_data["startDate"] = data.start_date
        if data.end_date is not None:
            update_data["endDate"] = data.end_date
        if data.auto_apply is not None:
            update_data["autoApply"] = data.auto_apply
        if data.show_badge is not None:
            update_data["showBadge"] = data.show_badge
        # Handle Json fields - use Json wrapper for non-empty lists, don't include for empty/None
        if data.applicable_products is not None:
            if data.applicable_products and len(data.applicable_products) > 0:
                update_data["applicableProducts"] = Json(data.applicable_products)
            else:
                update_data["applicableProducts"] = Json(None)
        if data.applicable_variants is not None:
            if data.applicable_variants and len(data.applicable_variants) > 0:
                update_data["applicableVariants"] = Json(data.applicable_variants)
            else:
                update_data["applicableVariants"] = Json(None)
        if data.applicable_categories is not None:
            if data.applicable_categories and len(data.applicable_categories) > 0:
                update_data["applicableCategories"] = Json(data.applicable_categories)
            else:
                update_data["applicableCategories"] = Json(None)
        
        if not update_data:
            return build_discount_response(existing)
        
        # Update
        discount = await prisma.discountcode.update(
            where={"id": discount_id},
            data=update_data,
        )
        
        return build_discount_response(discount)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update discount code: {str(e)}"
        )


@router.delete("/{discount_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_discount_code(
    discount_id: str,
    current_user = Depends(check_permission("products", "edit"))
):
    """Delete a discount code."""
    try:
        prisma = await get_prisma_client()
        
        # Check if discount exists
        existing = await prisma.discountcode.find_unique(where={"id": discount_id})
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Discount code not found"
            )
        
        # Delete
        await prisma.discountcode.delete(where={"id": discount_id})
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete discount code: {str(e)}"
        )


@router.post("/{discount_id}/toggle", response_model=DiscountCodeResponse)
async def toggle_discount_status(
    discount_id: str,
    current_user = Depends(check_permission("products", "edit"))
):
    """Toggle a discount code's active status."""
    try:
        prisma = await get_prisma_client()
        
        # Get current discount
        discount = await prisma.discountcode.find_unique(where={"id": discount_id})
        if not discount:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Discount code not found"
            )
        
        # Toggle status
        updated = await prisma.discountcode.update(
            where={"id": discount_id},
            data={"isActive": not discount.isActive},
        )
        
        return build_discount_response(updated)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to toggle discount status: {str(e)}"
        )


@router.post("/validate", response_model=DiscountValidationResponse)
async def validate_discount_code(
    data: DiscountValidationRequest,
    current_user = Depends(get_current_user)
):
    """Validate a discount code for an order."""
    try:
        prisma = await get_prisma_client()
        code = data.code.upper().strip()
        
        # Find the discount code
        discount = await prisma.discountcode.find_unique(where={"code": code})
        
        if not discount:
            return DiscountValidationResponse(
                valid=False,
                message="Invalid discount code"
            )
        
        # Check if active
        if not discount.isActive:
            return DiscountValidationResponse(
                valid=False,
                message="This discount code is no longer active"
            )
        
        from datetime import timezone
        now = datetime.now(timezone.utc)
        
        # Check start date
        if discount.startDate:
            start_dt = discount.startDate if discount.startDate.tzinfo else discount.startDate.replace(tzinfo=timezone.utc)
            if start_dt > now:
                return DiscountValidationResponse(
                    valid=False,
                    message="This discount code is not yet active"
                )
        
        # Check end date
        if discount.endDate:
            end_dt = discount.endDate if discount.endDate.tzinfo else discount.endDate.replace(tzinfo=timezone.utc)
            if end_dt < now:
                return DiscountValidationResponse(
                    valid=False,
                    message="This discount code has expired"
                )
        
        # Check usage limit
        if discount.usageLimit and discount.usageCount >= discount.usageLimit:
            return DiscountValidationResponse(
                valid=False,
                message="This discount code has reached its usage limit"
            )
        
        # Check per-user limit if user is logged in
        if data.user_id and discount.usageLimitPerUser:
            user_usage = await prisma.order.count(
                where={
                    "userId": data.user_id,
                    "discountCodeId": discount.id,
                }
            )
            if user_usage >= discount.usageLimitPerUser:
                return DiscountValidationResponse(
                    valid=False,
                    message="You have already used this discount code the maximum number of times"
                )
        
        # Check minimum order amount
        if discount.minimumOrderAmount and data.order_subtotal < discount.minimumOrderAmount:
            return DiscountValidationResponse(
                valid=False,
                message=f"Minimum order amount of ₱{discount.minimumOrderAmount:.2f} required"
            )
        
        # Calculate discount amount
        discount_type = discount.discountType.value if hasattr(discount.discountType, 'value') else str(discount.discountType)
        
        if discount_type == "PERCENTAGE":
            discount_amount = data.order_subtotal * (discount.discountValue / 100)
            # Apply maximum discount cap if set
            if discount.maximumDiscount and discount_amount > discount.maximumDiscount:
                discount_amount = discount.maximumDiscount
        else:  # FIXED_AMOUNT
            discount_amount = min(discount.discountValue, data.order_subtotal)
        
        return DiscountValidationResponse(
            valid=True,
            code=discount.code,
            discount_id=discount.id,
            discount_type=discount_type,
            discount_value=discount.discountValue,
            discount_amount=round(discount_amount, 2),
            message=f"Discount of ₱{discount_amount:.2f} applied!"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to validate discount code: {str(e)}"
        )


