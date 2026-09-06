import logging
import sys

from fastapi import FastAPI

from .config import settings
from .routers import auth, users


def _configure_logging() -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter(
            "%(asctime)s %(levelname)s %(name)s %(message)s"
        )
    )
    root = logging.getLogger()
    root.setLevel(logging.INFO)
    root.addHandler(handler)


_configure_logging()

app = FastAPI(title=settings.service_name, version="0.1.0")

app.include_router(auth.router)
app.include_router(users.router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": settings.service_name}