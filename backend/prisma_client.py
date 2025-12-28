from prisma import Prisma
from functools import lru_cache
import asyncio
from contextlib import asynccontextmanager

# Global Prisma instance
prisma: Prisma = None


async def get_prisma_client() -> Prisma:
    """Get or create Prisma client instance."""
    global prisma
    if prisma is None:
        prisma = Prisma()
        await prisma.connect()
    return prisma


async def disconnect_prisma():
    """Disconnect Prisma client."""
    global prisma
    if prisma is not None:
        await prisma.disconnect()
        prisma = None


@asynccontextmanager
async def prisma_context():
    """Context manager for Prisma client."""
    client = await get_prisma_client()
    try:
        yield client
    finally:
        pass  # Don't disconnect here, let the global instance handle it

