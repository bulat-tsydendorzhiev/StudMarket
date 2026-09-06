import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI

from .config import settings
from .expiration import expiration_loop
from .routers import images, listings


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(expiration_loop())
    try:
        yield
    finally:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass


app = FastAPI(title=settings.service_name, version="0.1.0", lifespan=lifespan)

app.include_router(listings.router)
app.include_router(images.router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": settings.service_name}