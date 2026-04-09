"""
Madlan scraper — uses Playwright headless browser.

Strategy:
1. Intercept XHR/GraphQL API responses (more stable than DOM selectors).
2. Scroll to load lazy-loaded listings.
3. Fallback DOM scraping if API interception yields nothing.
"""
import asyncio
import json
import re
from playwright.async_api import async_playwright, Response

TARGET_URL = (
    "https://www.madlan.co.il/for-sale/%D7%94%D7%95%D7%93-%D7%94%D7%A9%D7%A8%D7%95%D7%9F"
    "?beds_min=4&price_min=2000000&price_max=3500000&condoTypes=apartment"
)


def _parse_madlan_item(item: dict) -> dict | None:
    listing_id = item.get("id") or item.get("slug") or item.get("listingId")
    if not listing_id:
        return None

    listing_id = str(listing_id)

    price_raw = item.get("price") or item.get("asking_price")
    try:
        price = int(price_raw) if price_raw else None
    except (ValueError, TypeError):
        price = None

    rooms_raw = item.get("rooms") or item.get("bedrooms") or item.get("roomCount")
    try:
        rooms = float(rooms_raw) if rooms_raw else None
    except (ValueError, TypeError):
        rooms = None

    sqm_raw = item.get("area") or item.get("size") or item.get("squareMeter")
    try:
        size_sqm = float(sqm_raw) if sqm_raw else None
    except (ValueError, TypeError):
        size_sqm = None

    floor_raw = item.get("floor") or item.get("floorNumber")
    try:
        floor = int(floor_raw) if floor_raw is not None else None
    except (ValueError, TypeError):
        floor = None

    # Location info
    address = item.get("address") or {}
    if isinstance(address, str):
        street = address
        neighborhood_name = None
    else:
        street = address.get("street") or item.get("street")
        neighborhood_name = (
            (address.get("neighborhood") or {}).get("name")
            or item.get("neighborhood", {}).get("name")
            if isinstance(item.get("neighborhood"), dict)
            else item.get("neighborhood")
        )

    # Images
    images = item.get("images") or item.get("photos") or []
    image_url = None
    if images and isinstance(images, list):
        first = images[0]
        if isinstance(first, dict):
            image_url = first.get("url") or first.get("src") or first.get("src_url")
        elif isinstance(first, str):
            image_url = first

    description = item.get("description") or item.get("remarks") or item.get("text")

    # Contact
    contact = item.get("contact") or {}
    if isinstance(contact, dict):
        contact_name = contact.get("name")
        contact_phone = contact.get("phone")
    else:
        contact_name = None
        contact_phone = None

    listed_at = item.get("publishedAt") or item.get("created_at") or item.get("listingDate")

    url_slug = item.get("slug") or listing_id
    url = f"https://www.madlan.co.il/listing/{url_slug}"

    return {
        "external_id": listing_id,
        "source": "madlan",
        "dedup_key": f"madlan:{listing_id}",
        "price": price,
        "rooms": rooms,
        "floor": floor,
        "total_floors": None,
        "size_sqm": size_sqm,
        "city": "הוד השרון",
        "neighborhood": neighborhood_name,
        "street": street,
        "street_number": item.get("streetNumber") or item.get("house_number"),
        "title": item.get("title"),
        "description": description,
        "url": url,
        "image_url": image_url,
        "contact_name": contact_name,
        "contact_phone": contact_phone,
        "listed_at": str(listed_at) if listed_at else None,
    }


def _extract_from_api_response(data: any) -> list[dict]:
    """Try to extract listing items from various Madlan API response shapes."""
    if not data:
        return []

    candidates = []

    if isinstance(data, list):
        candidates = data
    elif isinstance(data, dict):
        # GraphQL / REST shapes
        for key in ("listings", "items", "results", "condominiums", "data", "hits"):
            val = data.get(key)
            if isinstance(val, list):
                candidates = val
                break
            elif isinstance(val, dict):
                for subkey in ("listings", "items", "results", "hits"):
                    subval = val.get(subkey)
                    if isinstance(subval, list):
                        candidates = subval
                        break
                if candidates:
                    break

    results = []
    for item in candidates:
        if isinstance(item, dict):
            parsed = _parse_madlan_item(item)
            if parsed:
                results.append(parsed)
    return results


async def scrape_madlan() -> list[dict]:
    all_listings: list[dict] = []
    seen_keys: set[str] = set()
    captured_json: list[any] = []

    async def on_response(response: Response):
        url = response.url
        # Intercept likely API calls
        if any(kw in url for kw in ["api.madlan", "condominiums", "listings", "search", "graphql"]):
            try:
                ct = response.headers.get("content-type", "")
                if "json" in ct:
                    body = await response.json()
                    captured_json.append(body)
            except Exception:
                pass

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

        print("[Madlan] Navigating to search page...")
        try:
            await page.goto(TARGET_URL, wait_until="networkidle", timeout=45000)
        except Exception as e:
            print(f"[Madlan] Navigation warning: {e}")

        # Scroll to trigger lazy loading
        for i in range(6):
            await page.keyboard.press("End")
            await asyncio.sleep(2)

        # Parse captured API responses
        for body in captured_json:
            items = _extract_from_api_response(body)
            for item in items:
                if item["dedup_key"] not in seen_keys:
                    seen_keys.add(item["dedup_key"])
                    all_listings.append(item)

        # Fallback: DOM scraping if nothing captured
        if not all_listings:
            print("[Madlan] No API data captured, trying DOM scraping...")
            all_listings = await _dom_scrape(page)

        await browser.close()

    print(f"[Madlan] Total listings: {len(all_listings)}")
    return all_listings


async def _dom_scrape(page) -> list[dict]:
    """Fallback DOM-based extraction."""
    results = []
    # Try to find listing cards with various selectors
    selectors = [
        "[data-testid='listing-card']",
        "[class*='ListingCard']",
        "[class*='listing-card']",
        "article[data-id]",
    ]
    cards = []
    for sel in selectors:
        cards = await page.query_selector_all(sel)
        if cards:
            break

    print(f"[Madlan DOM] Found {len(cards)} cards")
    for card in cards:
        try:
            # Extract text content
            price_el = await card.query_selector("[class*='price'], [data-testid*='price']")
            price_text = await price_el.inner_text() if price_el else ""
            price_clean = re.sub(r"[^\d]", "", price_text)
            price = int(price_clean) if price_clean else None

            link_el = await card.query_selector("a[href]")
            href = await link_el.get_attribute("href") if link_el else ""
            url = f"https://www.madlan.co.il{href}" if href.startswith("/") else href

            listing_id = href.split("/")[-1] if href else None
            if not listing_id:
                continue

            img_el = await card.query_selector("img")
            image_url = await img_el.get_attribute("src") if img_el else None

            addr_el = await card.query_selector("[class*='address'], [class*='street'], [class*='location']")
            street = await addr_el.inner_text() if addr_el else None

            results.append({
                "external_id": listing_id,
                "source": "madlan",
                "dedup_key": f"madlan:{listing_id}",
                "price": price,
                "rooms": None,
                "floor": None,
                "total_floors": None,
                "size_sqm": None,
                "city": "הוד השרון",
                "neighborhood": None,
                "street": street,
                "street_number": None,
                "title": None,
                "description": None,
                "url": url,
                "image_url": image_url,
                "contact_name": None,
                "contact_phone": None,
                "listed_at": None,
            })
        except Exception as e:
            print(f"[Madlan DOM] Card parse error: {e}")
            continue

    return results


if __name__ == "__main__":
    results = asyncio.run(scrape_madlan())
    for r in results[:3]:
        print(r)
