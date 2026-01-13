from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth_router, categories_router, upload_router, attributes_router, products_router, orders_router, analytics_router, inventory_router, discounts_router, shipping_router, tax_router, site_content_router
from dotenv import load_dotenv
from contextlib import asynccontextmanager
from prisma_client import get_prisma_client, disconnect_prisma
import os
from pathlib import Path

# Load environment variables from root .env file (parent directory)
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=env_path)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    # Startup: Connect to Prisma
    await get_prisma_client()
    yield
    # Shutdown: Disconnect from Prisma
    await disconnect_prisma()


app = FastAPI(
    title="E-commerce Admin API",
    description="Backend API for e-commerce admin application",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
origins = [
    "http://localhost:3000",  # Admin (default)
    "http://localhost:3001",  # Customer (default)
    os.getenv("FRONTEND_URL", "http://localhost:3000"),  # Admin website
    os.getenv("CUSTOMER_FRONTEND_URL", "http://localhost:3001"),  # Customer website
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(categories_router)
app.include_router(upload_router)
app.include_router(attributes_router)
app.include_router(products_router)
app.include_router(orders_router)
app.include_router(analytics_router)
app.include_router(inventory_router)
app.include_router(discounts_router)
app.include_router(shipping_router)
app.include_router(tax_router)
app.include_router(site_content_router)


@app.get("/")
async def root():
    return {"message": "E-commerce Admin API", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )

