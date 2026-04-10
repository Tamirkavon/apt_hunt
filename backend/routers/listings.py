from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from database import get_connection, get_stats, get_neighborhood_avg
from models import ListingOut, ListingUpdate, StatsOut, ScrapeRunOut

router = APIRouter(prefix="/api")


def _row_to_listing(row, avg: float | None) -> ListingOut:
    return ListingOut.from_row(row, neighborhood_avg=avg)


@router.get("/listings", response_model=list[ListingOut])
def get_listings(
    source: Optional[str] = None,
    is_seen: Optional[int] = None,
    is_favorite: Optional[int] = None,
    is_active: int = 1,
    show_new_only: bool = False,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    min_rooms: Optional[float] = None,
    max_rooms: Optional[float] = None,
    sort_by: str = "first_seen_at",
    order: str = "desc",
    limit: int = Query(default=200, le=500),
    offset: int = 0,
):
    conn = get_connection()
    try:
        avg = get_neighborhood_avg(conn)

        where = ["is_active = ?"]
        params: list = [is_active]

        if source:
            where.append("source = ?")
            params.append(source)
        if is_seen is not None:
            where.append("is_seen = ?")
            params.append(is_seen)
        if is_favorite is not None:
            where.append("is_favorite = ?")
            params.append(is_favorite)
        if show_new_only:
            where.append("DATE(first_seen_at) = DATE('now')")
        if min_price is not None:
            where.append("(price IS NULL OR price >= ?)")
            params.append(min_price)
        if max_price is not None:
            where.append("(price IS NULL OR price <= ?)")
            params.append(max_price)
        if min_rooms is not None:
            where.append("(rooms IS NULL OR rooms >= ?)")
            params.append(min_rooms)
        if max_rooms is not None:
            where.append("(rooms IS NULL OR rooms <= ?)")
            params.append(max_rooms)

        valid_sorts = {"first_seen_at", "last_seen_at", "price", "rooms", "size_sqm", "rating", "distance_km"}
        sort_col = sort_by if sort_by in valid_sorts else "first_seen_at"
        sort_dir = "ASC" if order.lower() == "asc" else "DESC"

        # NULLs always last regardless of sort direction
        null_order = f"{sort_col} IS NULL ASC, {sort_col} {sort_dir}"

        sql = f"""
            SELECT * FROM listings
            WHERE {' AND '.join(where)}
            ORDER BY {null_order}
            LIMIT ? OFFSET ?
        """
        params += [limit, offset]

        rows = conn.execute(sql, params).fetchall()
        return [_row_to_listing(r, avg) for r in rows]
    finally:
        conn.close()


@router.get("/listings/{listing_id}", response_model=ListingOut)
def get_listing(listing_id: int):
    conn = get_connection()
    try:
        avg = get_neighborhood_avg(conn)
        row = conn.execute("SELECT * FROM listings WHERE id=?", (listing_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Not found")
        return _row_to_listing(row, avg)
    finally:
        conn.close()


@router.patch("/listings/{listing_id}", response_model=ListingOut)
def update_listing(listing_id: int, body: ListingUpdate):
    conn = get_connection()
    try:
        avg = get_neighborhood_avg(conn)

        # Verify listing exists
        row = conn.execute("SELECT id FROM listings WHERE id=?", (listing_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Not found")

        updates = {}
        if body.is_seen is not None:
            updates["is_seen"] = body.is_seen
        if body.is_favorite is not None:
            updates["is_favorite"] = body.is_favorite
        if body.rating is not None:
            updates["rating"] = body.rating
        if body.notes is not None:
            updates["notes"] = body.notes

        if updates:
            set_clause = ", ".join(f"{k}=?" for k in updates)
            with conn:
                conn.execute(
                    f"UPDATE listings SET {set_clause} WHERE id=?",
                    list(updates.values()) + [listing_id],
                )

        row = conn.execute("SELECT * FROM listings WHERE id=?", (listing_id,)).fetchone()
        return _row_to_listing(row, avg)
    finally:
        conn.close()


@router.post("/listings/mark-all-seen")
def mark_all_seen():
    conn = get_connection()
    try:
        with conn:
            conn.execute("UPDATE listings SET is_seen=1 WHERE is_active=1")
        return {"ok": True}
    finally:
        conn.close()


@router.get("/stats", response_model=StatsOut)
def stats():
    conn = get_connection()
    try:
        return get_stats(conn)
    finally:
        conn.close()


@router.get("/scrape/history", response_model=list[ScrapeRunOut])
def scrape_history():
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM scrape_runs ORDER BY id DESC LIMIT 30"
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()
