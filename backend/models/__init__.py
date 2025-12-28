# Models package
# All Pydantic models are organized here

from .auth_models import (
    UserCreate,
    UserLogin,
    AuthResponse,
    UserResponse,
    RefreshTokenRequest,
    UserListResponse,
    UserUpdateRequest,
)

from .category_models import (
    CategoryCreate,
    CategoryUpdate,
    CategoryResponse,
)

from .attribute_models import (
    AttributeCreate,
    AttributeUpdate,
    AttributeResponse,
    AttributeType,
)

from .product_models import (
    ProductStatus,
    ProductCreate,
    ProductUpdate,
    ProductResponse,
    ProductListResponse,
    ProductImageCreate,
    ProductImageUpdate,
    ProductImageResponse,
    ProductVariantCreate,
    ProductVariantUpdate,
    ProductVariantResponse,
    ProductAttributeValueCreate,
    ProductAttributeValueResponse,
    ProductBulkStatusUpdate,
    ProductBulkDelete,
    ProductStockUpdate,
    BulkOperationResponse,
    PaginatedProductResponse,
)

__all__ = [
    # Auth models
    "UserCreate",
    "UserLogin",
    "AuthResponse",
    "UserResponse",
    "RefreshTokenRequest",
    "UserListResponse",
    "UserUpdateRequest",
    # Category models
    "CategoryCreate",
    "CategoryUpdate",
    "CategoryResponse",
    # Attribute models
    "AttributeCreate",
    "AttributeUpdate",
    "AttributeResponse",
    "AttributeType",
    # Product models
    "ProductStatus",
    "ProductCreate",
    "ProductUpdate",
    "ProductResponse",
    "ProductListResponse",
    "ProductImageCreate",
    "ProductImageUpdate",
    "ProductImageResponse",
    "ProductVariantCreate",
    "ProductVariantUpdate",
    "ProductVariantResponse",
    "ProductAttributeValueCreate",
    "ProductAttributeValueResponse",
    "ProductBulkStatusUpdate",
    "ProductBulkDelete",
    "ProductStockUpdate",
    "BulkOperationResponse",
    "PaginatedProductResponse",
]

