from fastapi import FastAPI

from .config import settings
from .routers import auth, users

app = FastAPI(title=settings.service_name, version="0.1.0")

app.include_router(auth.router)
app.include_router(users.router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": settings.service_name}