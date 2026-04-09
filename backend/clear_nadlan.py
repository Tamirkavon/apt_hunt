"""One-time script to clear stale fallback neighborhood stats."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from database import get_connection

conn = get_connection()
with conn:
    deleted = conn.execute("DELETE FROM neighborhood_stats").rowcount
print(f"Deleted {deleted} row(s) from neighborhood_stats")
conn.close()
