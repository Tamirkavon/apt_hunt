"""
apt_hunt FastAPI backend.

Start with:
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db
from routers.listings import router as listings_router
from routers.scrape import router as scrape_router
from routers.settings import router as settings_router

app = FastAPI(title="apt_hunt", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(listings_router)
app.include_router(scrape_router)
app.include_router(settings_router)


@app.on_event("startup")
def startup():
    init_db()
    print("Database initialized")


@app.get("/")
def root():
    return {"status": "ok", "app": "apt_hunt"}
