"""
User Address Management Router
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from prisma import Prisma
from prisma_client import get_prisma_client
from models.address_models import (
    UserAddressCreate,
    UserAddressUpdate,
    UserAddressResponse,
)
from routers.auth import get_current_user

router = APIRouter(prefix="/addresses", tags=["addresses"])


@router.get("", response_model=List[UserAddressResponse])
async def get_user_addresses(
    current_user=Depends(get_current_user),
    prisma: Prisma = Depends(get_prisma_client),
):
    """Get all addresses for the current user"""
    addresses = await prisma.useraddress.find_many(
        where={"userId": current_user.id},
        order={"createdAt": "desc"},
    )
    return addresses


@router.get("/{address_id}", response_model=UserAddressResponse)
async def get_address(
    address_id: str,
    current_user=Depends(get_current_user),
    prisma: Prisma = Depends(get_prisma_client),
):
    """Get a specific address by ID"""
    address = await prisma.useraddress.find_first(
        where={"id": address_id, "userId": current_user.id}
    )
    if not address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found",
        )
    return address


@router.post("", response_model=UserAddressResponse, status_code=status.HTTP_201_CREATED)
async def create_address(
    data: UserAddressCreate,
    current_user=Depends(get_current_user),
    prisma: Prisma = Depends(get_prisma_client),
):
    """Create a new address for the current user"""
    # If this is set as default, unset other defaults
    if data.is_default:
        await prisma.useraddress.update_many(
            where={"userId": current_user.id, "isDefault": True},
            data={"isDefault": False},
        )

    address = await prisma.useraddress.create(
        data={
            "userId": current_user.id,
            "type": data.type.value,
            "isDefault": data.is_default,
            "phone": data.phone,
            "shippingAddress": data.shipping_address,
            "shippingCity": data.shipping_city,
            "shippingState": data.shipping_state,
            "shippingZip": data.shipping_zip,
            "shippingCountry": data.shipping_country,
            "billingAddress": data.billing_address,
            "billingCity": data.billing_city,
            "billingState": data.billing_state,
            "billingZip": data.billing_zip,
            "billingCountry": data.billing_country,
            "label": data.label,
        }
    )
    return address


@router.patch("/{address_id}", response_model=UserAddressResponse)
async def update_address(
    address_id: str,
    data: UserAddressUpdate,
    current_user=Depends(get_current_user),
    prisma: Prisma = Depends(get_prisma_client),
):
    """Update an existing address"""
    # Verify ownership
    existing = await prisma.useraddress.find_first(
        where={"id": address_id, "userId": current_user.id}
    )
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found",
        )

    # If setting as default, unset other defaults
    update_data = {}
    if data.is_default is True:
        await prisma.useraddress.update_many(
            where={"userId": current_user.id, "isDefault": True},
            data={"isDefault": False},
        )
        update_data["isDefault"] = True
    elif data.is_default is False:
        update_data["isDefault"] = False

    # Build update data
    if data.type is not None:
        update_data["type"] = data.type.value
    if data.phone is not None:
        update_data["phone"] = data.phone
    if data.shipping_address is not None:
        update_data["shippingAddress"] = data.shipping_address
    if data.shipping_city is not None:
        update_data["shippingCity"] = data.shipping_city
    if data.shipping_state is not None:
        update_data["shippingState"] = data.shipping_state
    if data.shipping_zip is not None:
        update_data["shippingZip"] = data.shipping_zip
    if data.shipping_country is not None:
        update_data["shippingCountry"] = data.shipping_country
    if data.billing_address is not None:
        update_data["billingAddress"] = data.billing_address
    if data.billing_city is not None:
        update_data["billingCity"] = data.billing_city
    if data.billing_state is not None:
        update_data["billingState"] = data.billing_state
    if data.billing_zip is not None:
        update_data["billingZip"] = data.billing_zip
    if data.billing_country is not None:
        update_data["billingCountry"] = data.billing_country
    if data.label is not None:
        update_data["label"] = data.label

    address = await prisma.useraddress.update(
        where={"id": address_id},
        data=update_data,
    )
    return address


@router.delete("/{address_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_address(
    address_id: str,
    current_user=Depends(get_current_user),
    prisma: Prisma = Depends(get_prisma_client),
):
    """Delete an address"""
    # Verify ownership
    address = await prisma.useraddress.find_first(
        where={"id": address_id, "userId": current_user.id}
    )
    if not address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found",
        )

    await prisma.useraddress.delete(where={"id": address_id})
    return None
