"""
SQLite database setup and operations for apt_hunt.
"""
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

import os
# Railway persistent volume mounts at /data by default, fallback to local data/ dir
_data_dir = Path(os.environ.get("DATA_DIR", str(Path(__file__).parent.parent / "data")))
DB_PATH = _data_dir / "apartments.db"


def get_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def _migrate(conn: sqlite3.Connection):
    """Add new columns to existing tables without breaking existing data."""
    for col, typedef in [
        ("lat", "REAL"),
        ("lon", "REAL"),
        ("distance_km", "REAL"),
        ("is_agency", "INTEGER"),
    ]:
        try:
            conn.execute(f"ALTER TABLE listings ADD COLUMN {col} {typedef}")
        except sqlite3.OperationalError:
            pass  # column already exists


def init_db():
    conn = get_connection()
    with conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS listings (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                external_id     TEXT NOT NULL,
                source          TEXT NOT NULL,
                dedup_key       TEXT NOT NULL UNIQUE,
                price           INTEGER,
                rooms           REAL,
                floor           INTEGER,
                total_floors    INTEGER,
                size_sqm        REAL,
                city            TEXT,
                neighborhood    TEXT,
                street          TEXT,
                street_number   TEXT,
                title           TEXT,
                description     TEXT,
                url             TEXT,
                image_url       TEXT,
                contact_name    TEXT,
                contact_phone   TEXT,
                is_seen         INTEGER NOT NULL DEFAULT 0,
                is_favorite     INTEGER NOT NULL DEFAULT 0,
                rating          INTEGER NOT NULL DEFAULT 0,
                notes           TEXT,
                price_drop      INTEGER NOT NULL DEFAULT 0,
                listed_at       TEXT,
                first_seen_at   TEXT NOT NULL,
                last_seen_at    TEXT NOT NULL,
                is_active       INTEGER NOT NULL DEFAULT 1,
                lat             REAL,
                lon             REAL,
                distance_km     REAL
            );

            CREATE INDEX IF NOT EXISTS idx_listings_source   ON listings(source);
            CREATE INDEX IF NOT EXISTS idx_listings_dedup    ON listings(dedup_key);
            CREATE INDEX IF NOT EXISTS idx_listings_price    ON listings(price);
            CREATE INDEX IF NOT EXISTS idx_listings_active   ON listings(is_active);
            CREATE INDEX IF NOT EXISTS idx_listings_seen_at  ON listings(first_seen_at);

            CREATE TABLE IF NOT EXISTS price_history (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                listing_id  INTEGER NOT NULL REFERENCES listings(id),
                old_price   INTEGER NOT NULL,
                new_price   INTEGER NOT NULL,
                changed_at  TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS scrape_runs (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                run_at          TEXT NOT NULL,
                source          TEXT NOT NULL,
                status          TEXT NOT NULL,
                listings_found  INTEGER DEFAULT 0,
                listings_new    INTEGER DEFAULT 0,
                error_message   TEXT
            );

            CREATE TABLE IF NOT EXISTS neighborhood_stats (
                id                  INTEGER PRIMARY KEY AUTOINCREMENT,
                city                TEXT NOT NULL,
                neighborhood        TEXT,
                avg_price_per_sqm   REAL,
                sample_count        INTEGER,
                updated_at          TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS settings (
                key     TEXT PRIMARY KEY,
                value   TEXT NOT NULL
            );
        """)
    _migrate(conn)
    conn.close()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def today_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def upsert_listing(conn: sqlite3.Connection, listing: dict) -> tuple[bool, bool]:
    """
    Insert or update a listing.
    Returns (is_new, price_dropped).
    """
    dedup_key = listing["dedup_key"]
    now = now_iso()

    existing = conn.execute(
        "SELECT id, price FROM listings WHERE dedup_key = ?", (dedup_key,)
    ).fetchone()

    price_dropped = False

    if existing:
        old_price = existing["price"]
        new_price = listing.get("price")
        if new_price and old_price and new_price != old_price:
            drop = old_price - new_price  # positive = drop, negative = increase
            conn.execute(
                "INSERT INTO price_history (listing_id, old_price, new_price, changed_at) VALUES (?,?,?,?)",
                (existing["id"], old_price, new_price, now),
            )
            price_drop_val = max(0, drop)  # only store positive drops in price_drop column
            conn.execute(
                "UPDATE listings SET price=?, price_drop=?, last_seen_at=?, is_active=1 WHERE id=?",
                (new_price, price_drop_val, now, existing["id"]),
            )
            price_dropped = drop > 0
        else:
            conn.execute(
                "UPDATE listings SET last_seen_at=?, is_active=1 WHERE dedup_key=?",
                (now, dedup_key),
            )
        return False, price_dropped
    else:
        conn.execute(
            """INSERT OR IGNORE INTO listings
               (external_id, source, dedup_key, price, rooms, floor, total_floors,
                size_sqm, city, neighborhood, street, street_number, title,
                description, url, image_url, contact_name, contact_phone,
                listed_at, first_seen_at, last_seen_at, lat, lon, distance_km, is_agency)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                listing.get("external_id"),
                listing.get("source"),
                dedup_key,
                listing.get("price"),
                listing.get("rooms"),
                listing.get("floor"),
                listing.get("total_floors"),
                listing.get("size_sqm"),
                listing.get("city"),
                listing.get("neighborhood"),
                listing.get("street"),
                listing.get("street_number"),
                listing.get("title"),
                listing.get("description"),
                listing.get("url"),
                listing.get("image_url"),
                listing.get("contact_name"),
                listing.get("contact_phone"),
                listing.get("listed_at"),
                now,
                now,
                listing.get("lat"),
                listing.get("lon"),
                listing.get("distance_km"),
                listing.get("is_agency"),
            ),
        )
        return True, False


def upsert_listings(conn: sqlite3.Connection, listings: list[dict]) -> tuple[int, int]:
    """Returns (new_count, price_drop_count)."""
    new_count = 0
    drop_count = 0
    for listing in listings:
        is_new, dropped = upsert_listing(conn, listing)
        if is_new:
            new_count += 1
        if dropped:
            drop_count += 1
    return new_count, drop_count


def mark_stale(conn: sqlite3.Connection, source: str, days: int = 3):
    conn.execute(
        """UPDATE listings SET is_active=0
           WHERE source=? AND is_active=1
           AND last_seen_at < datetime('now', ?)""",
        (source, f"-{days} days"),
    )


def log_scrape_run(
    conn: sqlite3.Connection,
    source: str,
    status: str,
    found: int = 0,
    new: int = 0,
    error: str = None,
):
    conn.execute(
        """INSERT INTO scrape_runs (run_at, source, status, listings_found, listings_new, error_message)
           VALUES (?,?,?,?,?,?)""",
        (now_iso(), source, status, found, new, error),
    )


def get_stats(conn: sqlite3.Connection) -> dict:
    today = today_str()
    row = conn.execute(
        """SELECT
               COUNT(*) as total,
               SUM(CASE WHEN DATE(first_seen_at)=? THEN 1 ELSE 0 END) as new_today,
               SUM(CASE WHEN source='yad2' THEN 1 ELSE 0 END) as yad2_count,
               SUM(CASE WHEN source='madlan' THEN 1 ELSE 0 END) as madlan_count,
               SUM(is_favorite) as favorites_count,
               AVG(price) as avg_price,
               MIN(price) as min_price,
               MAX(price) as max_price,
               SUM(CASE WHEN price_drop>0 AND DATE(last_seen_at)=? THEN 1 ELSE 0 END) as price_drops_today
           FROM listings WHERE is_active=1""",
        (today, today),
    ).fetchone()

    last_run = conn.execute(
        "SELECT run_at FROM scrape_runs ORDER BY id DESC LIMIT 1"
    ).fetchone()

    return {
        "total_active": row["total"] or 0,
        "new_today": row["new_today"] or 0,
        "yad2_count": row["yad2_count"] or 0,
        "madlan_count": row["madlan_count"] or 0,
        "favorites_count": row["favorites_count"] or 0,
        "avg_price": int(row["avg_price"]) if row["avg_price"] else 0,
        "min_price": row["min_price"] or 0,
        "max_price": row["max_price"] or 0,
        "price_drops_today": row["price_drops_today"] or 0,
        "last_scrape_at": last_run["run_at"] if last_run else None,
    }


def save_neighborhood_stats(conn: sqlite3.Connection, city: str, neighborhood: str, avg: float, count: int):
    now = now_iso()
    existing = conn.execute(
        "SELECT id FROM neighborhood_stats WHERE city=? AND neighborhood IS ?",
        (city, neighborhood),
    ).fetchone()
    if existing:
        conn.execute(
            "UPDATE neighborhood_stats SET avg_price_per_sqm=?, sample_count=?, updated_at=? WHERE id=?",
            (avg, count, now, existing["id"]),
        )
    else:
        conn.execute(
            "INSERT INTO neighborhood_stats (city, neighborhood, avg_price_per_sqm, sample_count, updated_at) VALUES (?,?,?,?,?)",
            (city, neighborhood, avg, count, now),
        )


def get_setting(conn: sqlite3.Connection, key: str, default: str | None = None) -> str | None:
    row = conn.execute("SELECT value FROM settings WHERE key=?", (key,)).fetchone()
    return row["value"] if row else default


def set_setting(conn: sqlite3.Connection, key: str, value: str):
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        (key, value),
    )


def recalculate_distances(conn: sqlite3.Connection, home_lat: float, home_lon: float):
    """Recalculate distance_km for all listings that have coordinates."""
    import math
    rows = conn.execute("SELECT id, lat, lon FROM listings WHERE lat IS NOT NULL AND lon IS NOT NULL").fetchall()
    for row in rows:
        dlat = math.radians(row["lat"] - home_lat)
        dlon = math.radians(row["lon"] - home_lon)
        a = (math.sin(dlat / 2) ** 2 +
             math.cos(math.radians(home_lat)) * math.cos(math.radians(row["lat"])) *
             math.sin(dlon / 2) ** 2)
        km = round(6371.0 * 2 * math.asin(math.sqrt(a)), 2)
        conn.execute("UPDATE listings SET distance_km=? WHERE id=?", (km, row["id"]))


def get_neighborhood_avg(conn: sqlite3.Connection, city: str = "הוד השרון") -> float | None:
    row = conn.execute(
        "SELECT avg_price_per_sqm, sample_count FROM neighborhood_stats WHERE city=? ORDER BY updated_at DESC LIMIT 1",
        (city,),
    ).fetchone()
    if not row:
        return None
    # Only return the average if it's based on real transaction data (sample_count > 0)
    if (row["sample_count"] or 0) == 0:
        return None
    return row["avg_price_per_sqm"]
