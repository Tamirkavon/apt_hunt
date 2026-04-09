# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend
```bash
cd backend
.venv/Scripts/python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000
```
Run scraper manually:
```bash
cd backend && .venv/Scripts/python.exe -m scrapers.runner
```

### Frontend
```bash
cd frontend
npm run dev        # dev server on :5173
npm run build      # production build (tsc + vite)
```

### Deploy
```bash
# Start everything (backend + ngrok tunnel)
start_all.bat

# Deploy frontend to Netlify
cd frontend && netlify deploy --build --prod
```

## Architecture

**Stack:** FastAPI + SQLite (backend) / React 18 + Vite + Tailwind + TanStack Query (frontend). Backend runs locally; public access via ngrok tunnel (`unpesterous-mikel-individualistically.ngrok-free.dev`). Frontend deployed on Netlify (`apt-hunt-hod-hasharon.netlify.app`).

**Data flow:**
1. `scrapers/runner.py` orchestrates `yad2.py` (Playwright XHR interception) and `madlan.py` → writes to SQLite via `database.py`
2. FastAPI serves the DB via REST; frontend polls every 60s via TanStack Query
3. Scrape is triggered via `POST /api/scrape` which runs the runner in a background thread (subprocess to avoid Playwright/asyncio conflict)

**Key design decisions:**
- Deduplication via `dedup_key = "source:external_id"` UNIQUE constraint — `INSERT OR IGNORE` + update `last_seen_at`
- Listings marked `is_active=0` if not seen in 3+ days (`mark_stale`)
- `distance_km` is calculated with Haversine from home address (stored in `settings` table, default: יצחק בן צבי 4 הוד השרון). Changing home address via `PUT /api/settings/home` geocodes via Nominatim and recalculates all distances
- `is_agency` filter is client-side only (frontend filters out `is_agency=1` listings when toggle is off); backend always returns all listings
- Neighborhood avg price (₪/m²) comes from `nadlan.gov.il` API, refreshed weekly, stored in `neighborhood_stats`. Returns `None` if no real data — never use a hardcoded fallback

**Backend modules:**
- `database.py` — all SQLite ops, migration (`_migrate` adds columns to existing DB), `upsert_listing`, `recalculate_distances`
- `models.py` — Pydantic schemas; `ListingOut.from_row()` computes `price_per_sqm` and `vs_avg_pct` on the fly
- `routers/listings.py` — CRUD; filtering/sorting done in SQL
- `routers/settings.py` — home address CRUD + Nominatim geocoding
- `routers/scrape.py` — trigger/status endpoints; runs subprocess to avoid asyncio conflicts

**Frontend modules:**
- `hooks/useListings.ts` — all TanStack Query hooks; `include_agency` filter applied in `App.tsx` before passing to grid
- `api/client.ts` — axios instance with `ngrok-skip-browser-warning: 1` header (required for ngrok free tier)
- `types/listing.ts` — `Filters` interface is the source of truth for filter state

**DB schema additions via migration** (added after initial schema, safe to add more):
```python
# in database._migrate()
for col, typedef in [("lat", "REAL"), ("lon", "REAL"), ("distance_km", "REAL"), ("is_agency", "INTEGER")]:
    try: conn.execute(f"ALTER TABLE listings ADD COLUMN {col} {typedef}")
    except sqlite3.OperationalError: pass
```

**CORS:** Backend uses `allow_origins=["*"]` with `allow_credentials=False` to work with ngrok.

**Windows gotcha:** `print()` with Unicode chars (✓, ★) crashes uvicorn on Windows cp1255 encoding. Use ASCII only in `print()` calls in `main.py`.
