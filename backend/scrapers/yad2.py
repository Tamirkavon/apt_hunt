"""
Yad2 scraper — Playwright with real Chrome (channel='chrome').

Uses the system Chrome installation (not bundled Chromium) with headless=False
to avoid Imperva/bot-detection that blocks headless/httpx approaches.

Data is in __NEXT_DATA__ SSR JSON:
  props.pageProps.feed.private  (private sellers)
  props.pageProps.feed.agency   (agencies/brokers)

Pagination: &page=N  (up to feed.pagination.totalPages)
"""
import asyncio
import json
import math
import re
from pathlib import Path

from playwright.async_api import async_playwright

# Persist Chrome session between scrape runs to avoid bot re-detection
_USER_DATA_DIR = str(Path(__file__).parent.parent.parent / "data" / "chrome_profile")

# Home address: Yitzhak Ben Zvi 4, Hod HaSharon
HOME_LAT = 32.1389
HOME_LON = 34.8913

MIN_PRICE = 2_000_000
MAX_PRICE = 3_500_000
MIN_ROOMS = 4
MAX_ROOMS = 5

BASE_URL = (
    "https://www.yad2.co.il/realestate/forsale/center-and-sharon"
    f"?area=54&city=9700&minRooms={MIN_ROOMS}&maxRooms={MAX_ROOMS}"
    f"&propertyGroup=apartments&dealType=1&minPrice={MIN_PRICE}&maxPrice={MAX_PRICE}"
)

TARGET_CITIES = {"הוד השרון"}


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


def _parse_item(item: dict, is_agency: int) -> dict | None:
    token = item.get("token") or str(item.get("orderId", ""))
    if not token:
        return None

    addr = item.get("address", {})
    city_text = addr.get("city", {}).get("text", "")

    if city_text and city_text not in TARGET_CITIES:
        return None

    price = item.get("price")
    if price and (price < MIN_PRICE or price > MAX_PRICE):
        return None

    details = item.get("additionalDetails", {})
    meta = item.get("metaData", {})
    house = addr.get("house", {})

    rooms_raw = details.get("roomsCount")
    try:
        rooms = float(rooms_raw) if rooms_raw is not None else None
        if rooms is not None and (rooms < MIN_ROOMS or rooms > MAX_ROOMS):
            return None
    except (ValueError, TypeError):
        rooms = None

    sqm_raw = details.get("squareMeter")
    try:
        size_sqm = float(sqm_raw) if sqm_raw is not None else None
    except (ValueError, TypeError):
        size_sqm = None

    images = meta.get("images", [])
    image_url = meta.get("coverImage") or (images[0] if images else None)

    # Coordinates: address.coords is the correct field in Yad2 SSR data
    lat = None
    lon = None
    addr_coords = addr.get("coords") or {}
    if isinstance(addr_coords, dict):
        lat = addr_coords.get("lat")
        lon = addr_coords.get("lon") or addr_coords.get("lng")

    if not lat or not lon:
        coords = item.get("coordinates") or item.get("coordinate") or {}
        if isinstance(coords, dict):
            lat = coords.get("lat") or coords.get("latitude")
            lon = coords.get("lon") or coords.get("lng") or coords.get("longitude")

    try:
        lat = float(lat) if lat is not None else None
        lon = float(lon) if lon is not None else None
    except (ValueError, TypeError):
        lat = lon = None

    distance_km = None
    if lat and lon:
        try:
            distance_km = round(_haversine_km(HOME_LAT, HOME_LON, lat, lon), 2)
        except Exception:
            pass

    return {
        "external_id": str(token),
        "source": "yad2",
        "dedup_key": f"yad2:{token}",
        "price": price,
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
        "lat": lat,
        "lon": lon,
        "distance_km": distance_km,
        "is_agency": is_agency,
    }


def _parse_feed(feed: dict) -> list[dict]:
    results = []
    for section, is_agency in [("private", 0), ("agency", 1), ("yad1", 1), ("platinum", 1)]:
        items = feed.get(section) or []
        if not isinstance(items, list):
            continue
        for item in items:
            if isinstance(item, dict):
                parsed = _parse_item(item, is_agency)
                if parsed:
                    results.append(parsed)
    return results


async def scrape_yad2() -> list[dict]:
    all_listings: list[dict] = []
    seen_keys: set[str] = set()

    async with async_playwright() as p:
        # Use persistent context with real Chrome to preserve cookies/session
        # This avoids bot re-detection on repeated runs
        try:
            Path(_USER_DATA_DIR).mkdir(parents=True, exist_ok=True)
            context = await p.chromium.launch_persistent_context(
                _USER_DATA_DIR,
                channel="chrome",
                headless=False,
                args=["--window-position=9999,9999"],
                viewport={"width": 1280, "height": 900},
                locale="he-IL",
            )
            print("[Yad2] Using persistent Chrome profile")
        except Exception as e:
            print(f"[Yad2] Chrome not available ({e}), falling back to Chromium")
            context = await p.chromium.launch_persistent_context(
                _USER_DATA_DIR,
                headless=True,
                args=["--no-sandbox", "--disable-setuid-sandbox"],
                viewport={"width": 1280, "height": 900},
                locale="he-IL",
            )

        page = await context.new_page()

        # Page 1
        url_p1 = BASE_URL + "&page=1"
        print(f"[Yad2] Fetching page 1...")
        try:
            await page.goto(url_p1, wait_until="domcontentloaded", timeout=30000)
        except Exception as e:
            print(f"[Yad2] Navigation error page 1: {e}")
            await context.close()
            return []

        await asyncio.sleep(3)

        feed_p1 = await page.evaluate("""() => {
            const el = document.getElementById('__NEXT_DATA__');
            if (!el) return null;
            try {
                const d = JSON.parse(el.textContent);
                return d?.props?.pageProps?.feed || null;
            } catch(e) { return null; }
        }""")

        if not feed_p1:
            print("[Yad2] No feed in __NEXT_DATA__ on page 1")
            await context.close()
            return []

        pagination = feed_p1.get("pagination", {})
        total_pages = pagination.get("totalPages", 1)
        print(f"[Yad2] {pagination.get('total','?')} listings, {total_pages} pages")

        items_p1 = _parse_feed(feed_p1)
        for item in items_p1:
            if item["dedup_key"] not in seen_keys:
                seen_keys.add(item["dedup_key"])
                all_listings.append(item)
        print(f"[Yad2] Page 1: {len(items_p1)} parsed -> {len(all_listings)} Hod HaSharon")

        # Remaining pages
        for page_num in range(2, total_pages + 1):
            url = BASE_URL + f"&page={page_num}"
            print(f"[Yad2] Fetching page {page_num}/{total_pages}...")
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=30000)
                await asyncio.sleep(2)

                feed_data = await page.evaluate("""() => {
                    const el = document.getElementById('__NEXT_DATA__');
                    if (!el) return null;
                    try {
                        const d = JSON.parse(el.textContent);
                        return d?.props?.pageProps?.feed || null;
                    } catch(e) { return null; }
                }""")

                if not feed_data:
                    print(f"[Yad2] No feed on page {page_num}")
                    continue

                items = _parse_feed(feed_data)
                new_count = 0
                for item in items:
                    if item["dedup_key"] not in seen_keys:
                        seen_keys.add(item["dedup_key"])
                        all_listings.append(item)
                        new_count += 1
                print(f"[Yad2] Page {page_num}: {len(items)} ({new_count} new) -> {len(all_listings)} total")

            except Exception as e:
                print(f"[Yad2] Error page {page_num}: {e}")
                continue

        await context.close()

    print(f"[Yad2] Done. {len(all_listings)} listings")
    return all_listings


if __name__ == "__main__":
    results = asyncio.run(scrape_yad2())
    for r in results[:3]:
        print(r)
