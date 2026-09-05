import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

from ..config import settings

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register")
async def register(request: Request) -> JSONResponse:
    body = await request.body()
    url = f"{settings.auth_service_url}/auth/register"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                url,
                content=body if body else None,
                headers={"Content-Type": request.headers.get("content-type", "application/json")},
            )
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Auth service unavailable")

    content = response.json() if response.content else None
    return JSONResponse(status_code=response.status_code, content=content)


@router.post("/login")
async def login(request: Request) -> JSONResponse:
    body = await request.body()
    url = f"{settings.auth_service_url}/auth/login"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                url,
                content=body if body else None,
                headers={"Content-Type": request.headers.get("content-type", "application/json")},
            )
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Auth service unavailable")

    content = response.json() if response.content else None
    headers = {}
    set_cookie = response.headers.get("set-cookie")
    if set_cookie:
        headers["set-cookie"] = set_cookie
    return JSONResponse(status_code=response.status_code, content=content, headers=headers)