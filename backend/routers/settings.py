"""Settings endpoints — home address, geocoding."""
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import get_connection, get_setting, set_setting, recalculate_distances

router = APIRouter(prefix="/api/settings")

DEFAULT_HOME = {
    "address": "יצחק בן צבי 4, הוד השרון",
    "lat": 32.1389,
    "lon": 34.8913,
}


class HomeUpdate(BaseModel):
    address: str


def _geocode(address: str) -> tuple[float, float]:
    """Geocode address using Nominatim (OSM). Returns (lat, lon)."""
    params = {
        "q": address,
        "format": "json",
        "limit": 1,
        "countrycodes": "il",
    }
    headers = {"User-Agent": "apt_hunt/1.0 (apartment search tool)"}
    resp = httpx.get("https://nominatim.openstreetmap.org/search", params=params, headers=headers, timeout=10)
    resp.raise_for_status()
    results = resp.json()
    if not results:
        raise HTTPException(status_code=422, detail=f"לא נמצאה כתובת: {address}")
    return float(results[0]["lat"]), float(results[0]["lon"])


@router.get("/home")
def get_home():
    conn = get_connection()
    try:
        address = get_setting(conn, "home_address", DEFAULT_HOME["address"])
        lat = get_setting(conn, "home_lat")
        lon = get_setting(conn, "home_lon")
        return {
            "address": address,
            "lat": float(lat) if lat else DEFAULT_HOME["lat"],
            "lon": float(lon) if lon else DEFAULT_HOME["lon"],
        }
    finally:
        conn.close()


@router.put("/home")
def update_home(body: HomeUpdate):
    lat, lon = _geocode(body.address)
    conn = get_connection()
    try:
        with conn:
            set_setting(conn, "home_address", body.address)
            set_setting(conn, "home_lat", str(lat))
            set_setting(conn, "home_lon", str(lon))
            recalculate_distances(conn, lat, lon)
        return {"address": body.address, "lat": lat, "lon": lon}
    finally:
        conn.close()
