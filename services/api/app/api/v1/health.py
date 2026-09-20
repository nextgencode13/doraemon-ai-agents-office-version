from fastapi import APIRouter
from pydantic import BaseModel

from app.core.config import settings
from app.db.session import check_db_health

router = APIRouter(prefix="/health", tags=["Health"])


class HealthResponse(BaseModel):
    status: str
    app_name: str
    version: str
    app_env: str
    api_version: str
    ai_provider: str
    ai_configured: bool
    db_connected: bool


@router.get("", response_model=HealthResponse)
async def get_health():
    """Returns the operational health and configuration state of JARVIS."""
    db_ok = await check_db_health()
    return HealthResponse(
        status="ok" if db_ok else "degraded",
        app_name=settings.APP_NAME,
        version="0.1.0",
        app_env=settings.APP_ENV,
        api_version=settings.API_VERSION,
        ai_provider=settings.AI_PROVIDER,
        ai_configured=settings.is_ai_configured,
        db_connected=db_ok,
    )
