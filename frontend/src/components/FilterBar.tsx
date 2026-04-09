import type { Filters, SortField } from "../types/listing";
import { useMarkAllSeen } from "../hooks/useListings";

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
    <div className="flex rounded-lg overflow-hidden border border-gray-200 text-sm">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 transition-colors ${
            value === o.value
              ? "bg-[#1e3a5f] text-white"
              : "bg-white text-gray-600 hover:bg-gray-50"
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

  const handleMarkAll = () => {
    if (window.confirm(`לסמן את כל ${total} הדירות כנראות?`)) {
      markAll.mutate();
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-3 space-y-3">
      {/* Row 1: source + show + sort */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          <Seg
            options={[
              { label: "הכל", value: "" },
              { label: "Yad2", value: "yad2" },
              { label: "Madlan", value: "madlan" },
            ]}
            value={filters.source}
            onChange={(v) => onChange({ source: v as Filters["source"] })}
          />

          <Seg
            options={[
              { label: "כל הדירות", value: "all" },
              { label: "חדשות היום", value: "new" },
              { label: "לא נראו", value: "unseen" },
              { label: "מועדפים ★", value: "favorites" },
            ]}
            value={filters.show}
            onChange={(v) => onChange({ show: v as Filters["show"] })}
          />

          <select
            className="border border-gray-200 rounded-lg text-sm px-3 py-1.5 bg-white text-gray-700"
            value={`${filters.sort_by}:${filters.order}`}
            onChange={(e) => {
              const [sort_by, order] = e.target.value.split(":");
              onChange({ sort_by: sort_by as SortField, order: order as "asc" | "desc" });
            }}
          >
            <option value="first_seen_at:desc">חדש ביותר</option>
            <option value="price:asc">מחיר: נמוך לגבוה</option>
            <option value="price:desc">מחיר: גבוה לנמוך</option>
            <option value="rooms:desc">הכי הרבה חדרים</option>
            <option value="size_sqm:desc">הכי גדול</option>
            <option value="rating:desc">דירוג שלי</option>
            <option value="distance_km:asc">קרוב לביתי</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{total} תוצאות</span>
          <button
            onClick={handleMarkAll}
            className="text-sm text-gray-400 hover:text-gray-600 underline transition-colors"
          >
            סמן הכל כנראה
          </button>
        </div>
      </div>

      {/* Row 2: price range + rooms */}
      <div className="flex flex-wrap gap-4 items-center">
        {/* Price range */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="font-medium">מחיר:</span>
          <input
            type="number"
            step={100000}
            min={0}
            max={filters.max_price}
            value={filters.min_price}
            onChange={(e) => onChange({ min_price: Number(e.target.value) })}
            className="w-28 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center"
          />
          <span className="text-gray-400">—</span>
          <input
            type="number"
            step={100000}
            min={filters.min_price}
            max={5_000_000}
            value={filters.max_price}
            onChange={(e) => onChange({ max_price: Number(e.target.value) })}
            className="w-28 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center"
          />
          <span className="text-gray-400 text-xs">
            {fmtM(filters.min_price)} – {fmtM(filters.max_price)}
          </span>
        </div>

        {/* Rooms filter */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="font-medium">חדרים מינימום:</span>
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

        {/* Agency toggle */}
        <button
          onClick={() => onChange({ include_agency: !filters.include_agency })}
          className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border transition-colors ${
            filters.include_agency
              ? "bg-[#1e3a5f] text-white border-[#1e3a5f]"
              : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
          }`}
        >
          <span>🤝</span>
          <span>כולל מודעות עם תיווך</span>
        </button>
      </div>
    </div>
  );
}
