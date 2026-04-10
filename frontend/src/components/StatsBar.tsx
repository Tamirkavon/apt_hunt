import { RefreshCw, MapPin, Pencil, Check, X, AlertCircle } from "lucide-react";
import { useState } from "react";
import type { Stats } from "../types/listing";
import { useScrape, useScrapeStatus, useHomeAddress, useUpdateHomeAddress } from "../hooks/useListings";

interface Props {
  stats: Stats | undefined;
}

function fmtPrice(n: number) {
  if (!n) return "—";
  return "₪" + (n / 1_000_000).toFixed(2) + "M";
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function HomeAddressBar() {
  const { data: home } = useHomeAddress();
  const updateHome = useUpdateHomeAddress();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const startEdit = () => {
    setDraft(home?.address ?? "");
    setError(null);
    setEditing(true);
  };

  const save = () => {
    if (!draft.trim()) return;
    setError(null);
    updateHome.mutate(draft.trim(), {
      onSuccess: () => setEditing(false),
      onError: () => setError("לא נמצאה כתובת — נסה שנית"),
    });
  };

  const cancel = () => { setEditing(false); setError(null); };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <MapPin size={12} className="shrink-0 text-amber-500" />
      {editing ? (
        <>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
            className="bg-white border border-stone-300 rounded-md px-2 py-1 text-stone-800 text-sm w-60 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
            autoFocus
            placeholder="הזן כתובת..."
          />
          <button onClick={save} disabled={updateHome.isPending} className="text-stone-500 hover:text-stone-800 transition-colors">
            {updateHome.isPending ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
          </button>
          <button onClick={cancel} className="text-stone-400 hover:text-stone-600 transition-colors"><X size={13} /></button>
          {error && (
            <span className="flex items-center gap-1 text-red-500 text-xs">
              <AlertCircle size={11} /> {error}
            </span>
          )}
        </>
      ) : (
        <>
          <span className="text-stone-600 text-sm">{home?.address ?? "..."}</span>
          <button onClick={startEdit} className="text-stone-400 hover:text-amber-500 transition-colors" title="שנה כתובת בית">
            <Pencil size={11} />
          </button>
        </>
      )}
    </div>
  );
}

export function StatsBar({ stats }: Props) {
  const scrape = useScrape();
  const { data: status } = useScrapeStatus();
  const isRunning = status?.running || scrape.isPending;

  return (
    <div className="bg-white border-b border-stone-200 px-3 sm:px-6 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-3 flex-wrap">

        {/* Title + count */}
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-stone-800">סוכן דירות</h1>
          <span className="text-stone-400 text-sm font-light">
            {stats?.total_active ?? "—"} דירות
          </span>
        </div>

        {/* Stats pills */}
        <div className="flex items-center gap-3 flex-wrap text-sm">
          {(stats?.new_today ?? 0) > 0 && (
            <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-medium">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              {stats!.new_today} חדשות היום
            </span>
          )}

          <span className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1 rounded-full font-medium">
            ★ {stats?.favorites_count ?? 0} מועדפות
          </span>

          {(stats?.price_drops_today ?? 0) > 0 && (
            <span className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium">
              ↓ {stats!.price_drops_today} ירידות מחיר
            </span>
          )}

          {stats?.avg_price ? (
            <span className="text-stone-500 text-sm">
              ממוצע: <strong className="text-stone-700">{fmtPrice(stats.avg_price)}</strong>
            </span>
          ) : null}
        </div>

        {/* Right: scrape button + last update */}
        <div className="flex items-center gap-3">
          <span className="text-stone-400 text-xs hidden sm:block">
            עדכון {fmtDate(stats?.last_scrape_at ?? null)}
          </span>
          <button
            onClick={() => scrape.mutate()}
            disabled={isRunning}
            className="flex items-center gap-1.5 text-sm font-medium text-white bg-stone-800 hover:bg-stone-700
                       px-4 py-2 rounded-lg transition-all disabled:opacity-40 shadow-sm"
          >
            <RefreshCw size={13} className={isRunning ? "animate-spin" : ""} />
            {isRunning ? "סורק..." : "עדכן"}
          </button>
        </div>
      </div>

      {/* Home address row */}
      <div className="mt-3 pt-3 border-t border-stone-100">
        <HomeAddressBar />
      </div>
    </div>
  );
}
