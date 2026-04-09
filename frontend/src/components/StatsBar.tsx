import { RefreshCw, Star, Home, TrendingDown, MapPin, Pencil, Check, X } from "lucide-react";
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
  if (!iso) return "מעולם לא";
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

  const startEdit = () => {
    setDraft(home?.address ?? "");
    setEditing(true);
  };

  const save = () => {
    if (draft.trim()) {
      updateHome.mutate(draft.trim());
    }
    setEditing(false);
  };

  const cancel = () => setEditing(false);

  return (
    <div className="flex items-center gap-2 text-xs opacity-80 mt-1">
      <MapPin size={11} className="shrink-0" />
      {editing ? (
        <>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
            className="bg-white/20 border border-white/40 rounded px-2 py-0.5 text-white text-xs w-64 focus:outline-none"
            autoFocus
            placeholder="הזן כתובת..."
          />
          <button onClick={save} disabled={updateHome.isPending} className="hover:opacity-100 opacity-70">
            {updateHome.isPending ? <RefreshCw size={11} className="animate-spin" /> : <Check size={11} />}
          </button>
          <button onClick={cancel} className="hover:opacity-100 opacity-70"><X size={11} /></button>
        </>
      ) : (
        <>
          <span className="font-medium">{home?.address ?? "..."}</span>
          <button onClick={startEdit} className="hover:opacity-100 opacity-50" title="שנה כתובת בית">
            <Pencil size={10} />
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
    <div className="bg-[#1e3a5f] text-white px-6 py-3">
      {/* Top row */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 justify-between">
        <div className="flex items-center gap-x-6 flex-wrap gap-y-1">
          <div className="flex items-center gap-2">
            <Home size={14} className="opacity-60" />
            <span className="text-xs opacity-60">פעילות:</span>
            <span className="font-bold">{stats?.total_active ?? 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full" />
            <span className="text-xs opacity-60">חדשות היום:</span>
            <span className="font-bold text-green-300">{stats?.new_today ?? 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <Star size={12} className="text-yellow-300" />
            <span className="text-xs opacity-60">מועדפים:</span>
            <span className="font-bold">{stats?.favorites_count ?? 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingDown size={12} className="text-emerald-300" />
            <span className="text-xs opacity-60">ירידות היום:</span>
            <span className="font-bold text-emerald-300">{stats?.price_drops_today ?? 0}</span>
          </div>
        </div>

        <button
          onClick={() => scrape.mutate()}
          disabled={isRunning}
          className="flex items-center gap-2 bg-white/15 hover:bg-white/25 disabled:opacity-50
                     text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
        >
          <RefreshCw size={13} className={isRunning ? "animate-spin" : ""} />
          {isRunning ? "סורק..." : "עדכן עכשיו"}
        </button>
      </div>

      {/* Home address row */}
      <HomeAddressBar />

      {/* Bottom row: price stats */}
      {(stats?.avg_price || stats?.min_price || stats?.max_price) ? (
        <div className="flex flex-wrap gap-x-6 gap-y-0.5 mt-1.5 text-xs opacity-70">
          <span>ממוצע: <span className="opacity-100 font-medium">{fmtPrice(stats!.avg_price)}</span></span>
          <span>מינימום: <span className="opacity-100">{fmtPrice(stats!.min_price)}</span></span>
          <span>מקסימום: <span className="opacity-100">{fmtPrice(stats!.max_price)}</span></span>
          <span>עדכון אחרון: {fmtDate(stats?.last_scrape_at ?? null)}</span>
          <span>Yad2: {stats?.yad2_count ?? 0} | Madlan: {stats?.madlan_count ?? 0}</span>
        </div>
      ) : (
        <div className="text-xs opacity-50 mt-1">עדכון אחרון: {fmtDate(stats?.last_scrape_at ?? null)}</div>
      )}
    </div>
  );
}
