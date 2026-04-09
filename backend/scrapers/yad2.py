"""
Yad2 scraper — uses Playwright to intercept the internal map API.

The page loads listings via:
  gw.yad2.co.il/realestate-feed/forsale/map?city=9700&area=54&...
which returns data.markers[] with full listing info.

We filter client-side for city = הוד השרון.
"""
import asyncio
import math
from playwright.async_api import async_playwright, Response

# Home address: יצחק בן צבי 4, הוד השרון (מתחם 200)
HOME_LAT = 32.1389
HOME_LON = 34.8913


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return distance in km between two lat/lon points."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))

MIN_PRICE = 2_000_000
MAX_PRICE = 3_500_000
MIN_ROOMS = 4
MAX_ROOMS = 5

SEARCH_URL = (
    "https://www.yad2.co.il/realestate/forsale"
    f"?city=9700&minRooms={MIN_ROOMS}&maxRooms={MAX_ROOMS}&price={MIN_PRICE}-{MAX_PRICE}&propertyGroup=apartments&dealType=1"
)

TARGET_CITIES = {"הוד השרון"}  # filter to only our city


def _parse_marker(marker: dict) -> dict | None:
    token = marker.get("token") or str(marker.get("orderId", ""))
    if not token:
        return None

    addr = marker.get("address", {})
    city_text = addr.get("city", {}).get("text", "")

    # Filter: only Hod HaSharon
    if city_text and city_text not in TARGET_CITIES:
        return None

    # Filter: price range
    price = marker.get("price")
    if price and (price < MIN_PRICE or price > MAX_PRICE):
        return None

    # Filter: rooms (4–5 only)
    rooms_raw_check = details.get("roomsCount")
    try:
        rooms_check = float(rooms_raw_check) if rooms_raw_check is not None else None
        if rooms_check is not None and (rooms_check < MIN_ROOMS or rooms_check > MAX_ROOMS):
            return None
    except (ValueError, TypeError):
        pass

    details = marker.get("additionalDetails", {})
    meta = marker.get("metaData", {})
    house = addr.get("house", {})

    rooms_raw = details.get("roomsCount")
    try:
        rooms = float(rooms_raw) if rooms_raw is not None else None
    except (ValueError, TypeError):
        rooms = None

    sqm_raw = details.get("squareMeter")
    try:
        size_sqm = float(sqm_raw) if sqm_raw is not None else None
    except (ValueError, TypeError):
        size_sqm = None

    images = meta.get("images", [])
    image_url = meta.get("coverImage") or (images[0] if images else None)

    # Extract coordinates for distance calculation
    coords = marker.get("coordinates") or marker.get("coordinate") or {}
    lat = coords.get("latitude") or coords.get("lat")
    lon = coords.get("longitude") or coords.get("lng") or coords.get("lon")
    distance_km = None
    if lat and lon:
        try:
            distance_km = round(_haversine_km(HOME_LAT, HOME_LON, float(lat), float(lon)), 2)
        except (ValueError, TypeError):
            pass

    # Detect agency/broker listing
    listing_type = marker.get("listingType") or marker.get("ListingType") or ""
    merchant = marker.get("merchant") or marker.get("merchantType") or marker.get("merchantId")
    agency_fields = marker.get("agentData") or marker.get("agency")
    is_agency = 1 if (
        str(listing_type).lower() in ("agent", "agency", "2") or
        bool(agency_fields) or
        (isinstance(merchant, int) and merchant == 2) or
        (isinstance(merchant, str) and merchant not in ("", "1", "private"))
    ) else 0

    return {
        "external_id": str(token),
        "source": "yad2",
        "dedup_key": f"yad2:{token}",
        "price": marker.get("price"),
        "rooms": rooms,
        "floor": house.get("floor"),
        "total_floors": None,
        "size_sqm": size_sqm,
        "city": city_text or "הוד השרון",
        "neighborhood": addr.get("neighborhood", {}).get("text"),
        "street": addr.get("street", {}).get("text"),
        "street_number": str(house.get("number", "")) or None,
        "title": details.get("property", {}).get("text"),
        "description": None,
        "url": f"https://www.yad2.co.il/item/{token}",
        "image_url": image_url,
        "contact_name": None,
        "contact_phone": None,
        "listed_at": None,
        "lat": float(lat) if lat else None,
        "lon": float(lon) if lon else None,
        "distance_km": distance_km,
        "is_agency": is_agency,
    }


async def scrape_yad2() -> list[dict]:
    all_listings: list[dict] = []
    seen_keys: set[str] = set()

    async def on_response(response: Response):
        url = response.url
        if "realestate-feed/forsale/map" not in url:
            return
        try:
            ct = response.headers.get("content-type", "")
            if "json" not in ct:
                return
            body = await response.json()
            if not isinstance(body, dict):
                return

            markers = body.get("data", {}).get("markers", [])
            if not isinstance(markers, list):
                return

            for marker in markers:
                parsed = _parse_marker(marker)
                if parsed and parsed["dedup_key"] not in seen_keys:
                    seen_keys.add(parsed["dedup_key"])
                    all_listings.append(parsed)

            print(f"[Yad2] Map response: {len(markers)} markers, {len(all_listings)} Hod HaSharon so far")
        except Exception as e:
            print(f"[Yad2] Response parse error: {e}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-setuid-sandbox"],
        )
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 900},
            locale="he-IL",
        )
        page = await context.new_page()
        page.on("response", on_response)

        print(f"[Yad2] Navigating...")
        try:
            await page.goto(SEARCH_URL, wait_until="domcontentloaded", timeout=30000)
        except Exception as e:
            print(f"[Yad2] Navigation note: {e}")

        # Wait for XHR calls
        await asyncio.sleep(10)

        # Scroll to trigger more map tiles if needed
        for _ in range(3):
            await page.keyboard.press("End")
            await asyncio.sleep(2)

        await browser.close()

    print(f"[Yad2] Total Hod HaSharon listings: {len(all_listings)}")
    return all_listings


if __name__ == "__main__":
    results = asyncio.run(scrape_yad2())
    for r in results[:3]:
        print(r)
