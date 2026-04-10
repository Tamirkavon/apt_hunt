import { useState, useRef } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import type { Filters, SortField } from "../types/listing";
import { useMarkAllSeen } from "../hooks/useListings";
import { Toast } from "./Toast";

interface Props {
  filters: Filters;
  onChange: (f: Partial<Filters>) => void;
  total: number;
}

function Seg({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-stone-200 text-xs">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 transition-colors font-medium ${
            value === o.value
              ? "bg-stone-900 text-white"
              : "bg-white text-stone-500 hover:bg-stone-50 hover:text-stone-700"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function fmtM(n: number) {
  return n >= 1_000_000 ? `₪${(n / 1_000_000).toFixed(1)}M` : `₪${(n / 1000).toFixed(0)}K`;
}

export function FilterBar({ filters, onChange, total }: Props) {
  const markAll = useMarkAllSeen();
  const [expanded, setExpanded] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const undoRef = useRef<(() => void) | null>(null);

  const handleMarkAll = () => {
    markAll.mutate(undefined, {
      onSuccess: () => {
        setToast(`סומנו ${total} דירות כנראות`);
        // undo not available server-side, just dismiss
        undoRef.current = null;
      },
    });
  };

  const hasActiveAdvanced =
    filters.min_rooms > 0 ||
    filters.max_distance_km !== null ||
    filters.source !== "" ||
    !filters.include_agency ||
    filters.min_price !== 2_000_000 ||
    filters.max_price !== 3_500_000;

  return (
    <div className="bg-white border-b border-stone-200 px-3 sm:px-6">
      {toast && (
        <Toast
          message={toast}
          onDismiss={() => setToast(null)}
        />
      )}
      {/* Primary row — always visible */}
      <div className="flex items-center gap-2 py-2.5">
        <Seg
          options={[
            { label: "הכל", value: "all" },
            { label: "חדשות", value: "new" },
            { label: "לא נראו", value: "unseen" },
            { label: "★", value: "favorites" },
          ]}
          value={filters.show}
          onChange={(v) => onChange({ show: v as Filters["show"] })}
        />

        <select
          className="border border-stone-200 rounded-lg text-xs px-2.5 py-1.5 bg-white text-stone-700 font-medium focus:outline-none focus:ring-1 focus:ring-amber-400"
          value={`${filters.sort_by}:${filters.order}`}
          onChange={(e) => {
            const [sort_by, order] = e.target.value.split(":");
            onChange({ sort_by: sort_by as SortField, order: order as "asc" | "desc" });
          }}
        >
          <option value="first_seen_at:desc">חדש ביותר</option>
          <option value="price:asc">מחיר עולה</option>
          <option value="price:desc">מחיר יורד</option>
          <option value="rooms:desc">חדרים</option>
          <option value="size_sqm:desc">שטח</option>
          <option value="rating:desc">דירוג שלי</option>
          <option value="distance_km:asc">קרוב לביתי</option>
        </select>

        <div className="flex-1" />

        <span className="text-xs text-stone-400 hidden sm:block">{total} תוצאות</span>

        {/* Advanced filters toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors font-medium ${
            hasActiveAdvanced
              ? "bg-amber-50 text-amber-700 border-amber-300"
              : expanded
              ? "bg-stone-900 text-white border-stone-900"
              : "bg-white text-stone-500 border-stone-200 hover:border-stone-400"
          }`}
        >
          {expanded ? <X size={12} /> : <SlidersHorizontal size={12} />}
          פילטרים
          {hasActiveAdvanced && !expanded && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          )}
        </button>
      </div>

      {/* Advanced filters — collapsible */}
      {expanded && (
        <div className="pb-3 pt-1 border-t border-stone-100 flex flex-wrap gap-x-6 gap-y-3 items-center">
          {/* Price */}
          <div className="flex items-center gap-2 text-xs text-stone-600">
            <span className="font-medium text-stone-700">מחיר:</span>
            <input
              type="number"
              step={100000}
              min={0}
              max={filters.max_price}
              value={filters.min_price}
              onChange={(e) => onChange({ min_price: Number(e.target.value) })}
              className="w-24 border border-stone-200 rounded-lg px-2 py-1 text-xs text-center bg-stone-50 focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
            <span className="text-stone-300">—</span>
            <input
              type="number"
              step={100000}
              min={filters.min_price}
              max={5_000_000}
              value={filters.max_price}
              onChange={(e) => onChange({ max_price: Number(e.target.value) })}
              className="w-24 border border-stone-200 rounded-lg px-2 py-1 text-xs text-center bg-stone-50 focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
            <span className="text-stone-400 text-[11px] font-light">
              {fmtM(filters.min_price)} – {fmtM(filters.max_price)}
            </span>
          </div>

          {/* Rooms */}
          <div className="flex items-center gap-2 text-xs text-stone-600">
            <span className="font-medium text-stone-700">חדרים מינ׳:</span>
            <Seg
              options={[
                { label: "הכל", value: "0" },
                { label: "4", value: "4" },
                { label: "4.5", value: "4.5" },
                { label: "5+", value: "5" },
              ]}
              value={String(filters.min_rooms)}
              onChange={(v) => onChange({ min_rooms: Number(v) })}
            />
          </div>

          {/* Distance */}
          <div className="flex items-center gap-2 text-xs text-stone-600">
            <span className="font-medium text-stone-700">מרחק מקס׳:</span>
            <Seg
              options={[
                { label: "הכל", value: "null" },
                { label: "1 ק״מ", value: "1" },
                { label: "2 ק״מ", value: "2" },
                { label: "3 ק״מ", value: "3" },
                { label: "5 ק״מ", value: "5" },
              ]}
              value={filters.max_distance_km === null ? "null" : String(filters.max_distance_km)}
              onChange={(v) => onChange({ max_distance_km: v === "null" ? null : Number(v) })}
            />
          </div>

          {/* Source */}
          <div className="flex items-center gap-2 text-xs text-stone-600">
            <span className="font-medium text-stone-700">מקור:</span>
            <Seg
              options={[
                { label: "הכל", value: "" },
                { label: "Yad2", value: "yad2" },
                { label: "Madlan", value: "madlan" },
              ]}
              value={filters.source}
              onChange={(v) => onChange({ source: v as Filters["source"] })}
            />
          </div>

          {/* Agency */}
          <button
            onClick={() => onChange({ include_agency: !filters.include_agency })}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors font-medium ${
              filters.include_agency
                ? "bg-stone-900 text-white border-stone-900"
                : "bg-white text-stone-400 border-stone-200 hover:border-stone-400"
            }`}
          >
            🤝 תיווך
          </button>

          {/* Mark all seen */}
          <button
            onClick={handleMarkAll}
            className="text-xs text-stone-400 hover:text-stone-700 transition-colors mr-auto"
          >
            סמן הכל כנראה
          </button>
        </div>
      )}
    </div>
  );
}
