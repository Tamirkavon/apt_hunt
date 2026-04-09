"""Pydantic schemas for FastAPI responses."""
from pydantic import BaseModel
from typing import Optional


class ListingOut(BaseModel):
    id: int
    external_id: str
    source: str
    price: Optional[int]
    rooms: Optional[float]
    floor: Optional[int]
    total_floors: Optional[int]
    size_sqm: Optional[float]
    city: Optional[str]
    neighborhood: Optional[str]
    street: Optional[str]
    street_number: Optional[str]
    title: Optional[str]
    description: Optional[str]
    url: Optional[str]
    image_url: Optional[str]
    contact_name: Optional[str]
    contact_phone: Optional[str]
    is_seen: int
    is_favorite: int
    rating: int
    notes: Optional[str]
    price_drop: int
    listed_at: Optional[str]
    first_seen_at: str
    last_seen_at: str
    is_active: int
    price_per_sqm: Optional[float] = None
    neighborhood_avg_per_sqm: Optional[float] = None
    vs_avg_pct: Optional[float] = None
    distance_km: Optional[float] = None
    is_agency: Optional[int] = None

    @classmethod
    def from_row(cls, row, neighborhood_avg: float | None = None):
        d = dict(row)
        price_per_sqm = None
        vs_avg_pct = None
        if d.get("price") and d.get("size_sqm") and d["size_sqm"] > 0:
            price_per_sqm = round(d["price"] / d["size_sqm"])
            if neighborhood_avg:
                vs_avg_pct = round((price_per_sqm / neighborhood_avg - 1) * 100, 1)
        return cls(
            **d,
            price_per_sqm=price_per_sqm,
            neighborhood_avg_per_sqm=neighborhood_avg,
            vs_avg_pct=vs_avg_pct,
        )


class ListingUpdate(BaseModel):
    is_seen: Optional[int] = None
    is_favorite: Optional[int] = None
    rating: Optional[int] = None
    notes: Optional[str] = None


class StatsOut(BaseModel):
    total_active: int
    new_today: int
    yad2_count: int
    madlan_count: int
    favorites_count: int
    avg_price: int
    min_price: int
    max_price: int
    price_drops_today: int
    last_scrape_at: Optional[str]


class ScrapeRunOut(BaseModel):
    id: int
    run_at: str
    source: str
    status: str
    listings_found: int
    listings_new: int
    error_message: Optional[str]
