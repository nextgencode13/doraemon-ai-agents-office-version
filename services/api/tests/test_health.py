import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.main import app


@pytest.mark.asyncio
async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ["ok", "degraded"]
        assert data["app_name"] == "Doraemon AI Agents Office Version"
        assert data["api_version"] == "v1"
        assert "ai_provider" in data
        assert "ai_configured" in data
        assert "db_connected" in data


def test_settings_secret_redaction():
    # Verify that repr(settings) does not leak secrets
    assert repr(settings.GEMINI_API_KEY) != "my_super_secret_key"
