import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse, Response

from ..config import settings

router = APIRouter(prefix="/listings", tags=["listings"])


async def _proxy(
    method: str, path: str, request: Request
) -> JSONResponse:
    url = f"{settings.listing_service_url}/listings{path}"
    if request.url.query:
        url = f"{url}?{request.url.query}"
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
        raise HTTPException(status_code=502, detail="Listing service unavailable")

    content = response.json() if response.content else None
    return JSONResponse(status_code=response.status_code, content=content)


@router.get("/tags")
async def list_tags(request: Request) -> JSONResponse:
    return await _proxy("GET", "/tags", request)


@router.get("/locations")
async def list_locations(request: Request) -> JSONResponse:
    return await _proxy("GET", "/locations", request)


@router.get("/my")
async def list_my_listings(request: Request) -> JSONResponse:
    return await _proxy("GET", "/my", request)


@router.post("")
async def create_listing(request: Request) -> JSONResponse:
    return await _proxy("POST", "", request)


@router.get("")
async def list_listings(request: Request) -> JSONResponse:
    return await _proxy("GET", "", request)


@router.get("/{listing_id}/images")
async def list_images(listing_id: str, request: Request) -> JSONResponse:
    return await _proxy("GET", f"/{listing_id}/images", request)


@router.post("/{listing_id}/images")
async def upload_images(listing_id: str, request: Request) -> JSONResponse:
    return await _proxy("POST", f"/{listing_id}/images", request)


@router.get("/{listing_id}/images/{image_id}")
async def get_image(listing_id: str, image_id: str, request: Request) -> Response:
    url = (
        f"{settings.listing_service_url}/listings/{listing_id}/images/{image_id}"
    )
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            upstream = await client.get(url, cookies=request.cookies)
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Listing service unavailable")

    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        media_type=upstream.headers.get("content-type"),
    )


@router.delete("/{listing_id}/images/{image_id}")
async def delete_image(listing_id: str, image_id: str, request: Request) -> JSONResponse:
    return await _proxy("DELETE", f"/{listing_id}/images/{image_id}", request)


@router.get("/{listing_id}")
async def get_listing(listing_id: str, request: Request) -> JSONResponse:
    return await _proxy("GET", f"/{listing_id}", request)


@router.patch("/{listing_id}")
async def update_listing(listing_id: str, request: Request) -> JSONResponse:
    return await _proxy("PATCH", f"/{listing_id}", request)


@router.delete("/{listing_id}")
async def delete_listing(listing_id: str, request: Request) -> JSONResponse:
    return await _proxy("DELETE", f"/{listing_id}", request)