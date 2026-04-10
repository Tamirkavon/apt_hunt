import { RefreshCw, MapPin, Pencil, Check, X, AlertCircle } from "lucide-react";
import { useState } from "react";
import type { Stats } from "../types/listing";
import { useScrape, useScrapeStatus, useHomeAddress, useUpdateHomeAddress } from "../hooks/useListings";

interface Props {
  stats: Stats | undefined;
}

function fmtDate(iso: string | null) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return null;
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
      onError: () => setError("לא נמצאה כתובת"),
    });
  };

  const cancel = () => { setEditing(false); setError(null); };

  if (editing) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <MapPin size={11} className="shrink-0 text-amber-500" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
          className="border border-stone-300 rounded-md px-2 py-0.5 text-stone-800 text-sm w-56 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
          autoFocus
          placeholder="הזן כתובת..."
        />
        <button onClick={save} disabled={updateHome.isPending} className="text-stone-400 hover:text-stone-700 transition-colors">
          {updateHome.isPending ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
        </button>
        <button onClick={cancel} className="text-stone-400 hover:text-stone-600"><X size={12} /></button>
        {error && (
          <span className="flex items-center gap-1 text-red-500 text-xs">
            <AlertCircle size={10} /> {error}
          </span>
        )}
      </div>
    );
  }

  return (
    <button onClick={startEdit} className="flex items-center gap-1.5 text-stone-400 hover:text-stone-600 transition-colors group">
      <MapPin size={11} className="text-amber-500 shrink-0" />
      <span className="text-xs font-light">{home?.address ?? "..."}</span>
      <Pencil size={9} className="opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

export function StatsBar({ stats }: Props) {
  const scrape = useScrape();
  const { data: status } = useScrapeStatus();
  const isRunning = status?.running || scrape.isPending;
  const lastUpdate = fmtDate(stats?.last_scrape_at ?? null);

  // Build editorial headline
  const today = new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" });
  const newCount = stats?.new_today ?? 0;
  const drops = stats?.price_drops_today ?? 0;

  const headline = [
    newCount > 0 ? `${newCount} דירות חדשות` : "אין דירות חדשות היום",
    drops > 0 ? `${drops} ירידות מחיר` : null,
    stats?.total_active ? `${stats.total_active} סה״כ` : null,
  ].filter(Boolean).join(" · ");

  return (
    <div className="bg-white border-b border-stone-200 px-4 sm:px-6 py-3 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        {/* Left: title + headline */}
        <div className="min-w-0">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="text-base font-semibold text-stone-900 shrink-0">סוכן דירות</h1>
            <span className={`text-sm font-light ${newCount > 0 ? "text-amber-600" : "text-stone-400"}`}>
              {headline}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <HomeAddressBar />
            {lastUpdate && (
              <span className="text-xs text-stone-300 font-light">עדכון {lastUpdate}</span>
            )}
          </div>
        </div>

        {/* Right: scrape button */}
        <button
          onClick={() => scrape.mutate()}
          disabled={isRunning}
          className="flex items-center gap-1.5 text-sm font-medium text-white bg-stone-800 hover:bg-stone-700
                     px-4 py-2 rounded-lg transition-all disabled:opacity-40 shadow-sm shrink-0"
        >
          <RefreshCw size={13} className={isRunning ? "animate-spin" : ""} />
          {isRunning ? "סורק..." : "עדכן"}
        </button>
      </div>
    </div>
  );
}
