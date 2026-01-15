"""
User Address Models
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class AddressType(str, Enum):
    SHIPPING = "SHIPPING"
    BILLING = "BILLING"
    BOTH = "BOTH"


class UserAddressCreate(BaseModel):
    type: AddressType = AddressType.BOTH
    is_default: bool = False
    phone: Optional[str] = None
    shipping_address: str = Field(..., min_length=5)
    shipping_city: str = Field(..., min_length=2)
    shipping_state: Optional[str] = None
    shipping_zip: Optional[str] = None
    shipping_country: str = Field(default="Philippines")
    billing_address: Optional[str] = None
    billing_city: Optional[str] = None
    billing_state: Optional[str] = None
    billing_zip: Optional[str] = None
    billing_country: Optional[str] = None
    label: Optional[str] = None


class UserAddressUpdate(BaseModel):
    type: Optional[AddressType] = None
    is_default: Optional[bool] = None
    phone: Optional[str] = None
    shipping_address: Optional[str] = Field(None, min_length=5)
    shipping_city: Optional[str] = Field(None, min_length=2)
    shipping_state: Optional[str] = None
    shipping_zip: Optional[str] = None
    shipping_country: Optional[str] = None
    billing_address: Optional[str] = None
    billing_city: Optional[str] = None
    billing_state: Optional[str] = None
    billing_zip: Optional[str] = None
    billing_country: Optional[str] = None
    label: Optional[str] = None


class UserAddressResponse(BaseModel):
    id: str
    user_id: str = Field(alias="userId")
    type: str
    is_default: bool = Field(alias="isDefault")
    phone: Optional[str]
    shipping_address: str = Field(alias="shippingAddress")
    shipping_city: str = Field(alias="shippingCity")
    shipping_state: Optional[str] = Field(None, alias="shippingState")
    shipping_zip: Optional[str] = Field(None, alias="shippingZip")
    shipping_country: str = Field(alias="shippingCountry")
    billing_address: Optional[str] = Field(None, alias="billingAddress")
    billing_city: Optional[str] = Field(None, alias="billingCity")
    billing_state: Optional[str] = Field(None, alias="billingState")
    billing_zip: Optional[str] = Field(None, alias="billingZip")
    billing_country: Optional[str] = Field(None, alias="billingCountry")
    label: Optional[str]
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")

    class Config:
        from_attributes = True
        populate_by_name = True