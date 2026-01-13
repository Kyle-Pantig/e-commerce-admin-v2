# Routers package
# All API routers are organized here

from .auth import router as auth_router
from .categories import router as categories_router
from .upload import router as upload_router
from .attributes import router as attributes_router
from .products import router as products_router
from .orders import router as orders_router
from .analytics import router as analytics_router
from .inventory import router as inventory_router
from .discounts import router as discounts_router
from .shipping import router as shipping_router
from .tax import router as tax_router
from .site_content import router as site_content_router

__all__ = [
    "auth_router",
    "categories_router",
    "upload_router",
    "attributes_router",
    "products_router",
    "orders_router",
    "analytics_router",
    "inventory_router",
    "discounts_router",
    "shipping_router",
    "tax_router",
    "site_content_router",
]

