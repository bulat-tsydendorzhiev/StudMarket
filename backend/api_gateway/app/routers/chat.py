import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

from ..config import settings

router = APIRouter(prefix="/chat", tags=["chat"])


async def _proxy(method: str, path: str, request: Request) -> JSONResponse:
    url = f"{settings.chat_service_url}{path}"
    body = await request.body()
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.request(
                method,
                url,
                content=body if body else None,
                headers={"Content-Type": request.headers.get("content-type", "application/json")},
                cookies=request.cookies,
            )
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Chat service unavailable")

    content = response.json() if response.content else None
    return JSONResponse(status_code=response.status_code, content=content)


@router.post("/conversations")
async def create_conversation(request: Request) -> JSONResponse:
    return await _proxy("POST", "/conversations", request)