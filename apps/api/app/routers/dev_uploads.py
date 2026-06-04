"""Dev-only stub: accepts PUT to /api/dev/upload/<key> and discards body.

Active only when R2 is not configured. Lets the resident upload flow work
end-to-end on a dev box without setting up Cloudflare R2.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request, status

from app.services.r2 import is_configured

router = APIRouter(prefix="/dev/upload", tags=["dev"])


@router.put("/{key:path}", status_code=status.HTTP_204_NO_CONTENT)
async def dev_put(key: str, request: Request) -> None:
    if is_configured():
        # In real deployments uploads must go straight to R2.
        raise HTTPException(status_code=404, detail="Not found")
    # Drain the body so the client sees a clean 204.
    async for _ in request.stream():
        pass
    return None
