from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_cors_origins, settings
from .routers import auth

app = FastAPI(title=settings.service_name, version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": settings.service_name}