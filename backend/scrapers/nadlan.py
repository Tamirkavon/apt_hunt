"""
Nadlan.gov.il scraper — fetches average sold price per m² for Hod HaSharon.

Uses the unofficial API reverse-engineered from nadlan.gov.il.
Refreshes weekly (not daily).
"""
import httpx
from datetime import datetime, timezone, timedelta

# Reverse-engineered endpoints (based on github.com/jmpfar/gov-nadlan-fetcher
# and github.com/bareini/Nadlan)
NADLAN_SEARCH_URL = "https://www.nadlan.gov.il/Nadlan.REST/getDealInfo"
NADLAN_DEALS_URL = "https://www.nadlan.gov.il/Nadlan.REST/getAssessorData"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "he-IL,he;q=0.9",
    "Referer": "https://www.nadlan.gov.il/",
    "Origin": "https://www.nadlan.gov.il",
    "Content-Type": "application/json",
}

HOD_HASHARON_CODE = "7400"  # Same as Yad2 city code


def _months_ago_str(months: int) -> str:
    d = datetime.now(timezone.utc) - timedelta(days=30 * months)
    return d.strftime("%Y-%m-%d")


def fetch_nadlan_avg(city_code: str = HOD_HASHARON_CODE) -> tuple[float | None, int]:
    """
    Returns (avg_price_per_sqm, sample_count) for apartments sold
    in Hod HaSharon in the last 12 months.
    """
    from_date = _months_ago_str(12)

    # Payload format based on reverse-engineered API
    payload = {
        "cityCode": city_code,
        "assetType": "0",       # 0 = דירה (apartment)
        "fromDate": from_date,
        "toDate": "",
        "pageNum": 0,
        "pageSize": 200,
    }

    try:
        with httpx.Client(headers=HEADERS, follow_redirects=True, timeout=20) as client:
            # First get a session
            client.get("https://www.nadlan.gov.il/", timeout=10)

            resp = client.post(NADLAN_DEALS_URL, json=payload)
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        print(f"[Nadlan] Primary endpoint error: {e}")
        return _fallback_fetch(city_code)

    return _parse_deals(data)


def _parse_deals(data: any) -> tuple[float | None, int]:
    """Parse the API response and compute avg price/sqm."""
    deals = []

    if isinstance(data, list):
        deals = data
    elif isinstance(data, dict):
        for key in ("deals", "data", "results", "items"):
            val = data.get(key)
            if isinstance(val, list):
                deals = val
                break

    if not deals:
        print(f"[Nadlan] No deals found in response")
        return None, 0

    prices_per_sqm = []
    for deal in deals:
        if not isinstance(deal, dict):
            continue
        price = deal.get("DEALAMOUNT") or deal.get("price") or deal.get("dealAmount")
        sqm = deal.get("DEALNATURESQM") or deal.get("area") or deal.get("sqm")
        try:
            price_f = float(str(price).replace(",", ""))
            sqm_f = float(str(sqm).replace(",", ""))
            if price_f > 100000 and sqm_f > 20:  # sanity check
                prices_per_sqm.append(price_f / sqm_f)
        except (ValueError, TypeError, ZeroDivisionError):
            continue

    if not prices_per_sqm:
        return None, 0

    avg = sum(prices_per_sqm) / len(prices_per_sqm)
    print(f"[Nadlan] Computed avg: ₪{avg:,.0f}/m² from {len(prices_per_sqm)} deals")
    return round(avg), len(prices_per_sqm)


def _fallback_fetch(city_code: str) -> tuple[float | None, int]:
    """
    Alternate endpoint format — try getDealInfo.
    """
    from_date = _months_ago_str(12)
    payload = {
        "cityCode": city_code,
        "street": "",
        "houseNum": "",
        "fromDate": from_date,
        "toDate": "",
        "assetType": "0",
        "pageNum": 0,
        "pageSize": 200,
    }

    try:
        with httpx.Client(headers=HEADERS, follow_redirects=True, timeout=20) as client:
            client.get("https://www.nadlan.gov.il/", timeout=10)
            resp = client.post(NADLAN_SEARCH_URL, json=payload)
            resp.raise_for_status()
            data = resp.json()
        return _parse_deals(data)
    except Exception as e:
        print(f"[Nadlan] Fallback endpoint error: {e}")
        return None, 0


def needs_refresh(conn) -> bool:
    """Returns True if neighborhood stats are older than 7 days or missing."""
    row = conn.execute(
        "SELECT updated_at FROM neighborhood_stats WHERE city=? ORDER BY updated_at DESC LIMIT 1",
        ("הוד השרון",),
    ).fetchone()
    if not row:
        return True
    try:
        updated = datetime.fromisoformat(row["updated_at"])
        age = datetime.now(timezone.utc) - updated
        return age.days >= 7
    except Exception:
        return True


if __name__ == "__main__":
    avg, count = fetch_nadlan_avg()
    print(f"Average: ₪{avg:,}/m² from {count} deals")
