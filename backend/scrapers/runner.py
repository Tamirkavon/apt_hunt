"""
Orchestrates all scrapers and writes results to the database.
Also sends a daily email with top 3 recommendations.

Usage:
    python -m scrapers.runner
"""
import asyncio
import sys
from pathlib import Path

# Allow running from backend/ directory
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import get_connection, init_db, upsert_listings, mark_stale, log_scrape_run, get_stats, save_neighborhood_stats
from scrapers.yad2 import scrape_yad2  # now async
from scrapers.madlan import scrape_madlan
from scrapers.nadlan import fetch_nadlan_avg, needs_refresh


async def run_all(send_email: bool = True) -> dict:
    init_db()
    conn = get_connection()
    summary = {"yad2_new": 0, "madlan_new": 0, "errors": []}

    # --- Yad2 ---
    try:
        print("\n=== Scraping Yad2 ===")
        yad2_listings = await scrape_yad2()
        with conn:
            new, drops = upsert_listings(conn, yad2_listings)
            mark_stale(conn, "yad2", days=3)
            log_scrape_run(conn, "yad2", "success", len(yad2_listings), new)
        print(f"[Yad2] {len(yad2_listings)} found, {new} new")
        summary["yad2_new"] = new
    except Exception as e:
        err = f"Yad2 error: {e}"
        print(err)
        summary["errors"].append(err)
        with conn:
            log_scrape_run(conn, "yad2", "error", error=err)

    # --- Madlan ---
    try:
        print("\n=== Scraping Madlan ===")
        madlan_listings = await scrape_madlan()
        with conn:
            new, drops = upsert_listings(conn, madlan_listings)
            mark_stale(conn, "madlan", days=3)
            log_scrape_run(conn, "madlan", "success", len(madlan_listings), new)
        print(f"[Madlan] {len(madlan_listings)} found, {new} new")
        summary["madlan_new"] = new
    except Exception as e:
        err = f"Madlan error: {e}"
        print(err)
        summary["errors"].append(err)
        with conn:
            log_scrape_run(conn, "madlan", "error", error=err)

    # --- Nadlan avg prices (weekly refresh) ---
    try:
        if needs_refresh(conn):
            print("\n=== Fetching Nadlan avg prices ===")
            avg, count = fetch_nadlan_avg()
            if avg:
                with conn:
                    save_neighborhood_stats(conn, "הוד השרון", None, avg, count)
                print(f"[Nadlan] Saved avg ₪{avg:,}/m² from {count} deals")
    except Exception as e:
        print(f"[Nadlan] Error: {e}")

    conn.close()
    print("\n=== Scrape complete ===")
    print(f"Summary: {summary}")
    return summary


def get_top_listings(conn, limit: int = 3) -> list[dict]:
    """Get top N new listings from today, sorted by value vs neighborhood avg."""
    from database import today_str, get_neighborhood_avg
    today = today_str()
    avg = get_neighborhood_avg(conn)

    rows = conn.execute(
        """SELECT * FROM listings
           WHERE is_active=1 AND DATE(first_seen_at)=?
           ORDER BY price ASC
           LIMIT 20""",
        (today,),
    ).fetchall()

    scored = []
    for row in rows:
        d = dict(row)
        score = 0
        if d.get("price") and d.get("size_sqm") and d["size_sqm"] > 0 and avg:
            ppsqm = d["price"] / d["size_sqm"]
            score = ppsqm / avg  # lower = better value
        else:
            score = d.get("price", 9_999_999) / 3_500_000
        d["_score"] = score
        scored.append(d)

    scored.sort(key=lambda x: x["_score"])
    return scored[:limit]


def build_email_html(top: list[dict], stats: dict, avg: float | None) -> str:
    today_label = __import__("datetime").date.today().strftime("%d/%m/%Y")
    cards_html = ""
    for i, listing in enumerate(top, 1):
        price_fmt = f"₪{listing['price']:,}" if listing.get("price") else "לא צוין"
        rooms = listing.get("rooms", "?")
        sqm = listing.get("size_sqm", "?")
        street = f"{listing.get('street', '')} {listing.get('street_number', '')}".strip() or "כתובת לא ידועה"
        source_label = "Yad2" if listing["source"] == "yad2" else "Madlan"
        url = listing.get("url", "#")
        img = listing.get("image_url", "")
        ppsqm = ""
        if listing.get("price") and listing.get("size_sqm") and listing["size_sqm"] > 0:
            pp = listing["price"] / listing["size_sqm"]
            ppsqm = f"₪{pp:,.0f}/מ\"ר"
            if avg:
                diff_pct = (pp / avg - 1) * 100
                sign = "+" if diff_pct > 0 else ""
                ppsqm += f" ({sign}{diff_pct:.1f}% מהממוצע)"

        price_drop = ""
        if listing.get("price_drop") and listing["price_drop"] > 0:
            price_drop = f'<span style="color:#16a34a;font-weight:bold">↓ ₪{listing["price_drop"]:,} ירידה במחיר</span><br>'

        img_html = f'<img src="{img}" style="width:100%;max-height:200px;object-fit:cover;border-radius:6px;margin-bottom:8px" />' if img else ""
        cards_html += f"""
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:16px;background:#fff">
          <div style="color:#6b7280;font-size:12px;margin-bottom:4px">#{i} המלצה | {source_label}</div>
          {img_html}
          <div style="font-size:22px;font-weight:bold;color:#1e3a5f">{price_fmt}</div>
          <div style="color:#374151;margin:4px 0">{rooms} חדרים | {sqm} מ"ר | {ppsqm}</div>
          <div style="color:#6b7280">{street}</div>
          {price_drop}
          <a href="{url}" style="display:inline-block;margin-top:10px;background:#2563eb;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none;font-size:14px">צפה במודעה →</a>
        </div>"""

    new_total = stats.get("new_today", 0)
    price_drops = stats.get("price_drops_today", 0)
    total = stats.get("total_active", 0)
    avg_html = f"ממוצע עסקאות בהוד השרון: ₪{avg:,}/מ\"ר" if avg else ""

    return f"""
    <div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:20px">
      <div style="background:#1e3a5f;color:#fff;padding:20px;border-radius:8px;margin-bottom:20px">
        <h1 style="margin:0;font-size:20px">🏠 דוח דירות יומי — {today_label}</h1>
        <div style="margin-top:8px;font-size:14px;opacity:0.85">
          {new_total} דירות חדשות היום | {price_drops} ירידות מחיר | {total} סה"כ פעילות
          {f'<br>{avg_html}' if avg_html else ''}
        </div>
      </div>
      <h2 style="color:#1e3a5f;margin-bottom:12px">Top 3 המלצות</h2>
      {cards_html if cards_html else '<p style="color:#6b7280">אין דירות חדשות היום.</p>'}
      <div style="text-align:center;margin-top:20px">
        <a href="http://localhost:5173" style="color:#2563eb;font-size:13px">פתח את הדשבורד המלא →</a>
      </div>
    </div>"""


if __name__ == "__main__":
    result = asyncio.run(run_all())
