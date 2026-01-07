from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from supabase import Client
from supabase_client import get_supabase_client
from prisma_client import get_prisma_client
from routers.auth import get_current_user, get_current_admin, check_permission
from models.attribute_models import (
    AttributeCreate,
    AttributeUpdate,
    AttributeResponse,
    AttributeType,
    AttributeBulkReorder,
    AttributeCategoryAssignment,
    AttributeBulkDelete,
    BulkOperationResponse,
)
from prisma.models import enums
from prisma import Json
import json

router = APIRouter(prefix="/attributes", tags=["attributes"])


# =============================================================================
# HELPER FUNCTIONS - Build AttributeResponse from DB attribute
# =============================================================================

def _build_attribute_response_sync(attr, category_ids: list = None) -> AttributeResponse:
    """
    Synchronous helper to build AttributeResponse from a DB attribute object.
    Category IDs should be pre-fetched and passed in to avoid N+1 queries.
    """
    created_at_str = attr.createdAt.isoformat() if attr.createdAt else ""
    updated_at_str = attr.updatedAt.isoformat() if attr.updatedAt else ""
    
    return AttributeResponse(
        id=attr.id,
        name=attr.name,
        type=attr.type.value if hasattr(attr.type, 'value') else str(attr.type),
        description=attr.description,
        is_required=attr.isRequired,
        is_filterable=attr.isFilterable,
        display_order=attr.displayOrder,
        is_active=attr.isActive,
        validation_rules=attr.validationRules,
        options=attr.options,
        min_length=attr.minLength,
        max_length=attr.maxLength,
        placeholder=attr.placeholder,
        default_value=attr.defaultValue,
        min_value=attr.minValue,
        max_value=attr.maxValue,
        step=attr.step,
        unit=attr.unit,
        true_label=attr.trueLabel,
        false_label=attr.falseLabel,
        category_ids=category_ids or [],
        created_at=created_at_str,
        updated_at=updated_at_str,
    )


async def _build_attribute_response(attr, prisma) -> AttributeResponse:
    """
    Async helper for single attribute - fetches category IDs.
    For bulk operations, use _build_attribute_response_sync with pre-fetched data.
    """
    category_attributes = await prisma.categoryattribute.find_many(
        where={"attributeId": attr.id}
    )
    category_ids = [ca.categoryId for ca in category_attributes]
    
    return _build_attribute_response_sync(attr, category_ids)


async def _batch_get_category_ids(prisma, attribute_ids: list) -> dict:
    """
    Batch fetch category IDs for multiple attributes in ONE query.
    Returns a dict: {attribute_id: [category_id, ...]}
    """
    if not attribute_ids:
        return {}
    
    category_attributes = await prisma.categoryattribute.find_many(
        where={"attributeId": {"in": attribute_ids}}
    )
    
    # Build lookup dictionary
    result = {attr_id: [] for attr_id in attribute_ids}
    for ca in category_attributes:
        result[ca.attributeId].append(ca.categoryId)
    
    return result


# =============================================================================
# STATIC ROUTES - Must be defined BEFORE dynamic /{attribute_id} routes
# =============================================================================

@router.post("", response_model=AttributeResponse, status_code=status.HTTP_201_CREATED)
async def create_attribute(
    attribute_data: AttributeCreate,
    current_user = Depends(check_permission("attributes", "edit"))
):
    """
    Create a new attribute (admin only).
    """
    try:
        prisma = await get_prisma_client()
        
        # Validate attribute type
        if attribute_data.type not in [AttributeType.TEXT, AttributeType.NUMBER, AttributeType.SELECT, AttributeType.BOOLEAN]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid attribute type. Must be TEXT, NUMBER, SELECT, or BOOLEAN"
            )
        
        # Convert attribute type to Prisma enum
        attribute_type_enum = None
        if attribute_data.type == AttributeType.TEXT:
            attribute_type_enum = enums.AttributeType.TEXT
        elif attribute_data.type == AttributeType.NUMBER:
            attribute_type_enum = enums.AttributeType.NUMBER
        elif attribute_data.type == AttributeType.SELECT:
            attribute_type_enum = enums.AttributeType.SELECT
        elif attribute_data.type == AttributeType.BOOLEAN:
            attribute_type_enum = enums.AttributeType.BOOLEAN
        
        # Create attribute
        created_attribute = await prisma.attribute.create(
            data={
                "name": attribute_data.name,
                "type": attribute_type_enum,
                "description": attribute_data.description,
                "isRequired": attribute_data.is_required,
                "isFilterable": attribute_data.is_filterable,
                "displayOrder": attribute_data.display_order,
                "isActive": attribute_data.is_active,
                "validationRules": Json(attribute_data.validation_rules) if attribute_data.validation_rules else None,
                "options": Json(attribute_data.options) if attribute_data.options else None,
                "minLength": attribute_data.min_length,
                "maxLength": attribute_data.max_length,
                "placeholder": attribute_data.placeholder,
                "defaultValue": attribute_data.default_value,
                "minValue": attribute_data.min_value,
                "maxValue": attribute_data.max_value,
                "step": attribute_data.step,
                "unit": attribute_data.unit,
                "trueLabel": attribute_data.true_label,
                "falseLabel": attribute_data.false_label,
            }
        )
        
        # Assign to categories if provided - batch operation
        if attribute_data.category_ids:
            # Validate all categories in ONE query
            valid_categories = await prisma.category.find_many(
                where={"id": {"in": attribute_data.category_ids}}
            )
            valid_category_ids = {cat.id for cat in valid_categories}
            
            # Batch create all mappings
            assignments = [
                {"categoryId": cat_id, "attributeId": created_attribute.id}
                for cat_id in attribute_data.category_ids
                if cat_id in valid_category_ids
            ]
            
            if assignments:
                await prisma.categoryattribute.create_many(
                    data=assignments,
                    skip_duplicates=True
                )
        
        return await _build_attribute_response(created_attribute, prisma)
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create attribute: {str(e)}"
        )


@router.get("", response_model=List[AttributeResponse])
async def list_attributes(
    include_inactive: bool = False,
    current_user = Depends(check_permission("attributes", "view"))
):
    """
    List all attributes (all authenticated users can read).
    Optimized with batch category lookup to eliminate N+1 queries.
    """
    try:
        prisma = await get_prisma_client()
        
        where_clause = {}
        if not include_inactive:
            where_clause["isActive"] = True
        
        # Fetch all attributes with DB-level sorting (uses index)
        attributes = await prisma.attribute.find_many(
            where=where_clause,
            order=[
                {"displayOrder": "asc"},
                {"name": "asc"}
            ]
        )
        
        if not attributes:
            return []
        
        # Batch fetch all category mappings in ONE query (eliminates N+1)
        attribute_ids = [attr.id for attr in attributes]
        category_lookup = await _batch_get_category_ids(prisma, attribute_ids)
        
        # Build responses using pre-fetched category data
        result = [
            _build_attribute_response_sync(attr, category_lookup.get(attr.id, []))
            for attr in attributes
        ]
        
        return result
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch attributes: {str(e)}"
        )


@router.get("/filterable/all", response_model=List[AttributeResponse])
async def get_filterable_attributes(
    current_user = Depends(check_permission("attributes", "view"))
):
    """
    Get all filterable attributes (for storefront filter UI).
    Optimized with batch category lookup (uses composite index isFilterable + isActive).
    """
    try:
        prisma = await get_prisma_client()
        
        # Uses composite index [isFilterable, isActive]
        attributes = await prisma.attribute.find_many(
            where={
                "isFilterable": True,
                "isActive": True
            },
            order=[
                {"displayOrder": "asc"},
                {"name": "asc"}
            ]
        )
        
        if not attributes:
            return []
        
        # Batch fetch all category mappings in ONE query
        attribute_ids = [attr.id for attr in attributes]
        category_lookup = await _batch_get_category_ids(prisma, attribute_ids)
        
        # Build responses using pre-fetched data
        result = [
            _build_attribute_response_sync(attr, category_lookup.get(attr.id, []))
            for attr in attributes
        ]
        
        return result
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch filterable attributes: {str(e)}"
        )


@router.get("/category/{category_id}", response_model=List[AttributeResponse])
async def get_attributes_by_category(
    category_id: str,
    include_inactive: bool = False,
    include_inherited: bool = True,
    current_user = Depends(check_permission("attributes", "view"))
):
    """
    Get all attributes assigned to a specific category.
    If include_inherited is True, also includes attributes from parent categories.
    Optimized with batch queries and efficient hierarchy traversal.
    """
    try:
        prisma = await get_prisma_client()
        
        # Fetch category with parent in single query if inheritance needed
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
        
        # Traverse parent hierarchy if needed (already have first parent from include)
        if include_inherited:
            current_category = category
            while current_category.parentId:
                # First iteration uses pre-loaded parent
                if hasattr(current_category, 'parent') and current_category.parent:
                    category_ids.append(current_category.parent.id)
                    current_category = current_category.parent
                else:
                    # Need to fetch if not pre-loaded
                    parent = await prisma.category.find_unique(where={"id": current_category.parentId})
                    if parent:
                        category_ids.append(parent.id)
                        current_category = parent
                    else:
                        break
        
        # Fetch all category-attribute mappings in ONE query
        category_attributes = await prisma.categoryattribute.find_many(
            where={"categoryId": {"in": category_ids}}
        )
        
        attribute_ids = list(set([ca.attributeId for ca in category_attributes]))
        
        if not attribute_ids:
            return []
        
        where_clause = {"id": {"in": attribute_ids}}
        if not include_inactive:
            where_clause["isActive"] = True
        
        # Fetch all attributes in ONE query with DB-level sorting
        attributes = await prisma.attribute.find_many(
            where=where_clause,
            order=[
                {"displayOrder": "asc"},
                {"name": "asc"}
            ]
        )
        
        if not attributes:
            return []
        
        # Build category lookup from already-fetched data (no extra query)
        category_lookup = {}
        for attr_id in attribute_ids:
            category_lookup[attr_id] = [ca.categoryId for ca in category_attributes if ca.attributeId == attr_id]
        
        # Build responses using pre-computed data
        result = [
            _build_attribute_response_sync(attr, category_lookup.get(attr.id, []))
            for attr in attributes
        ]
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch attributes for category: {str(e)}"
        )


@router.post("/bulk/reorder", response_model=BulkOperationResponse, status_code=status.HTTP_200_OK)
async def bulk_reorder_attributes(
    data: AttributeBulkReorder,
    current_user = Depends(check_permission("attributes", "edit"))
):
    """
    Bulk update attribute display orders (admin only).
    Expects a list of objects with 'id' and 'display_order' fields.
    Optimized with transaction for atomic updates.
    """
    try:
        prisma = await get_prisma_client()
        
        updated_count = 0
        
        # Use transaction for atomic bulk update
        async with prisma.tx() as tx:
            for item in data.attribute_orders:
                try:
                    await tx.attribute.update(
                        where={"id": item.id},
                        data={"displayOrder": item.display_order}
                    )
                    updated_count += 1
                except:
                    pass
        
        return BulkOperationResponse(
            message=f"Updated {updated_count} attribute orders",
            affected_count=updated_count
        )
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reorder attributes: {str(e)}"
        )


@router.post("/bulk/delete", response_model=BulkOperationResponse, status_code=status.HTTP_200_OK)
async def bulk_delete_attributes(
    data: AttributeBulkDelete,
    current_user = Depends(check_permission("attributes", "edit"))
):
    """
    Bulk delete multiple attributes (admin only).
    Optimized with batch delete operations.
    """
    try:
        prisma = await get_prisma_client()
        
        # Use transaction for atomic batch delete
        async with prisma.tx() as tx:
            # Batch delete all category-attribute mappings in ONE query
            await tx.categoryattribute.delete_many(
                where={"attributeId": {"in": data.attribute_ids}}
                )
            
            # Batch delete all product attribute values in ONE query
            await tx.productattributevalue.delete_many(
                where={"attributeId": {"in": data.attribute_ids}}
            )
            
            # Batch delete all attributes in ONE query
            result = await tx.attribute.delete_many(
                where={"id": {"in": data.attribute_ids}}
            )
        
        return BulkOperationResponse(
            message=f"Deleted {result} attributes",
            affected_count=result
        )
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete attributes: {str(e)}"
        )


# =============================================================================
# DYNAMIC ROUTES - /{attribute_id} patterns
# =============================================================================

@router.get("/{attribute_id}", response_model=AttributeResponse)
async def get_attribute(
    attribute_id: str,
    current_user = Depends(check_permission("attributes", "view"))
):
    """
    Get a single attribute by ID (all authenticated users can read).
    """
    try:
        prisma = await get_prisma_client()
        
        attribute = await prisma.attribute.find_unique(where={"id": attribute_id})
        
        if not attribute:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Attribute not found"
            )
        
        return await _build_attribute_response(attribute, prisma)
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch attribute: {str(e)}"
        )


@router.patch("/{attribute_id}", response_model=AttributeResponse)
async def update_attribute(
    attribute_id: str,
    attribute_data: AttributeUpdate,
    current_user = Depends(check_permission("attributes", "edit"))
):
    """
    Update an existing attribute (admin only).
    """
    try:
        prisma = await get_prisma_client()
        
        attribute = await prisma.attribute.find_unique(where={"id": attribute_id})
        if not attribute:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Attribute not found"
            )
        
        update_data = {}
        
        if attribute_data.name is not None:
            update_data["name"] = attribute_data.name
        if attribute_data.type is not None:
            if attribute_data.type == AttributeType.TEXT:
                update_data["type"] = enums.AttributeType.TEXT
            elif attribute_data.type == AttributeType.NUMBER:
                update_data["type"] = enums.AttributeType.NUMBER
            elif attribute_data.type == AttributeType.SELECT:
                update_data["type"] = enums.AttributeType.SELECT
            elif attribute_data.type == AttributeType.BOOLEAN:
                update_data["type"] = enums.AttributeType.BOOLEAN
        if attribute_data.description is not None:
            update_data["description"] = attribute_data.description
        if attribute_data.is_required is not None:
            update_data["isRequired"] = attribute_data.is_required
        if attribute_data.is_filterable is not None:
            update_data["isFilterable"] = attribute_data.is_filterable
        if attribute_data.display_order is not None:
            update_data["displayOrder"] = attribute_data.display_order
        if attribute_data.is_active is not None:
            update_data["isActive"] = attribute_data.is_active
        if attribute_data.validation_rules is not None:
            update_data["validationRules"] = Json(attribute_data.validation_rules)
        if attribute_data.options is not None:
            update_data["options"] = Json(attribute_data.options)
        if attribute_data.min_length is not None:
            update_data["minLength"] = attribute_data.min_length
        if attribute_data.max_length is not None:
            update_data["maxLength"] = attribute_data.max_length
        if attribute_data.placeholder is not None:
            update_data["placeholder"] = attribute_data.placeholder
        if attribute_data.default_value is not None:
            update_data["defaultValue"] = attribute_data.default_value
        if attribute_data.min_value is not None:
            update_data["minValue"] = attribute_data.min_value
        if attribute_data.max_value is not None:
            update_data["maxValue"] = attribute_data.max_value
        if attribute_data.step is not None:
            update_data["step"] = attribute_data.step
        if attribute_data.unit is not None:
            update_data["unit"] = attribute_data.unit
        if attribute_data.true_label is not None:
            update_data["trueLabel"] = attribute_data.true_label
        if attribute_data.false_label is not None:
            update_data["falseLabel"] = attribute_data.false_label
        
        updated_attribute = await prisma.attribute.update(
            where={"id": attribute_id},
            data=update_data
        )
        
        # Handle category assignments - batch operations
        if attribute_data.category_ids is not None:
            # Delete all existing and recreate in batch
            await prisma.categoryattribute.delete_many(
                where={"attributeId": attribute_id}
            )
            
            if attribute_data.category_ids:
                # Validate all categories in ONE query
                valid_categories = await prisma.category.find_many(
                    where={"id": {"in": attribute_data.category_ids}}
                )
                valid_category_ids = {cat.id for cat in valid_categories}
                
                # Batch create all mappings
                assignments = [
                    {"categoryId": cat_id, "attributeId": attribute_id}
                    for cat_id in attribute_data.category_ids
                    if cat_id in valid_category_ids
                ]
                
                if assignments:
                    await prisma.categoryattribute.create_many(
                        data=assignments,
                        skip_duplicates=True
                    )
        
        return await _build_attribute_response(updated_attribute, prisma)
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update attribute: {str(e)}"
        )


@router.delete("/{attribute_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_attribute(
    attribute_id: str,
    current_user = Depends(check_permission("attributes", "edit"))
):
    """
    Delete an attribute (admin only).
    Also deletes all category-attribute relationships and product attribute values.
    Optimized with transaction and parallel deletes.
    """
    import asyncio
    
    try:
        prisma = await get_prisma_client()
        
        attribute = await prisma.attribute.find_unique(where={"id": attribute_id})
        if not attribute:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Attribute not found"
            )
        
        # Delete all related data in parallel
        await asyncio.gather(
            prisma.categoryattribute.delete_many(where={"attributeId": attribute_id}),
            prisma.productattributevalue.delete_many(where={"attributeId": attribute_id})
        )
        
        # Delete the attribute
        await prisma.attribute.delete(where={"id": attribute_id})
        
        return
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete attribute: {str(e)}"
        )


@router.patch("/{attribute_id}/toggle-status", response_model=AttributeResponse)
async def toggle_attribute_status(
    attribute_id: str,
    current_user = Depends(check_permission("attributes", "edit"))
):
    """
    Toggle an attribute's active status (admin only).
    """
    try:
        prisma = await get_prisma_client()
        
        attribute = await prisma.attribute.find_unique(where={"id": attribute_id})
        if not attribute:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Attribute not found"
            )
        
        updated_attribute = await prisma.attribute.update(
            where={"id": attribute_id},
            data={"isActive": not attribute.isActive}
        )
        
        return await _build_attribute_response(updated_attribute, prisma)
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to toggle attribute status: {str(e)}"
        )


@router.post("/{attribute_id}/duplicate", response_model=AttributeResponse, status_code=status.HTTP_201_CREATED)
async def duplicate_attribute(
    attribute_id: str,
    current_user = Depends(check_permission("attributes", "edit"))
):
    """
    Duplicate an existing attribute (admin only).
    Creates a copy with "(Copy)" appended to the name.
    """
    try:
        prisma = await get_prisma_client()
        
        original = await prisma.attribute.find_unique(where={"id": attribute_id})
        if not original:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Attribute not found"
            )
        
        duplicated = await prisma.attribute.create(
            data={
                "name": f"{original.name} (Copy)",
                "type": original.type,
                "description": original.description,
                "isRequired": original.isRequired,
                "isFilterable": original.isFilterable,
                "displayOrder": original.displayOrder + 1,
                "isActive": False,  # Start as inactive
                "validationRules": Json(original.validationRules) if original.validationRules else None,
                "options": Json(original.options) if original.options else None,
                "minLength": original.minLength,
                "maxLength": original.maxLength,
                "placeholder": original.placeholder,
                "defaultValue": original.defaultValue,
                "minValue": original.minValue,
                "maxValue": original.maxValue,
                "step": original.step,
                "unit": original.unit,
                "trueLabel": original.trueLabel,
                "falseLabel": original.falseLabel,
            }
        )
        
        # Copy category assignments in batch
        original_categories = await prisma.categoryattribute.find_many(
            where={"attributeId": attribute_id}
        )
        
        if original_categories:
            assignments = [
                {"categoryId": cat_attr.categoryId, "attributeId": duplicated.id}
                for cat_attr in original_categories
            ]
            await prisma.categoryattribute.create_many(
                data=assignments,
                skip_duplicates=True
            )
        
        return await _build_attribute_response(duplicated, prisma)
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to duplicate attribute: {str(e)}"
        )


@router.post("/{attribute_id}/assign-categories", response_model=AttributeResponse)
async def assign_attribute_to_categories(
    attribute_id: str,
    data: AttributeCategoryAssignment,
    current_user = Depends(check_permission("attributes", "edit"))
):
    """
    Assign an attribute to multiple categories (admin or staff with edit permission).
    Adds to existing assignments without removing current ones.
    Optimized with batch category validation and create_many.
    """
    try:
        prisma = await get_prisma_client()
        
        attribute = await prisma.attribute.find_unique(where={"id": attribute_id})
        if not attribute:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Attribute not found"
            )
        
        # Batch validate all categories in ONE query
        valid_categories = await prisma.category.find_many(
            where={"id": {"in": data.category_ids}}
        )
        valid_category_ids = {cat.id for cat in valid_categories}
        
        # Batch create all mappings (skip_duplicates handles existing ones)
        assignments = [
            {"categoryId": cat_id, "attributeId": attribute_id}
            for cat_id in data.category_ids
            if cat_id in valid_category_ids
        ]
        
        if assignments:
            await prisma.categoryattribute.create_many(
                data=assignments,
                skip_duplicates=True
            )
        
        return await _build_attribute_response(attribute, prisma)
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to assign attribute to categories: {str(e)}"
        )


@router.post("/{attribute_id}/remove-categories", response_model=AttributeResponse)
async def remove_attribute_from_categories(
    attribute_id: str,
    data: AttributeCategoryAssignment,
    current_user = Depends(check_permission("attributes", "edit"))
):
    """
    Remove an attribute from multiple categories (admin or staff with edit permission).
    Optimized with batch delete.
    """
    try:
        prisma = await get_prisma_client()
        
        attribute = await prisma.attribute.find_unique(where={"id": attribute_id})
        if not attribute:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Attribute not found"
            )
        
        # Batch delete all mappings in ONE query
            await prisma.categoryattribute.delete_many(
                where={
                "categoryId": {"in": data.category_ids},
                    "attributeId": attribute_id,
                }
            )
        
        return await _build_attribute_response(attribute, prisma)
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove attribute from categories: {str(e)}"
        )
