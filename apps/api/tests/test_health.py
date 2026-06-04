from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health() -> None:
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["service"] == "api"


def test_root() -> None:
    r = client.get("/")
    assert r.status_code == 200
    assert r.json()["service"] == "assembly-api"
