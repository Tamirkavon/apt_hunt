import { useState } from "react";
import { TrendingDown, ExternalLink } from "lucide-react";
import type { Listing } from "../types/listing";
import { useUpdateListing } from "../hooks/useListings";

function fmt(n: number) {
  return "₪" + n.toLocaleString("he-IL");
}

export function CompactRow({ listing: l }: { listing: Listing }) {
  const update = useUpdateListing();
  const [imgError, setImgError] = useState(false);
  const isSeen = l.is_seen === 1;

  const toggle = (field: "is_seen" | "is_favorite", val: number) => {
    const extra = field === "is_favorite" && val === 1 ? { is_seen: 1 } : {};
    update.mutate({ id: l.id, [field]: val, ...extra });
  };

  const address = [l.street, l.street_number].filter(Boolean).join(" ") || "כתובת לא ידועה";

  return (
    <div className={`
      flex items-center gap-3 px-4 py-3 bg-white border-b border-stone-100
      hover:bg-stone-50 transition-colors group
      ${isSeen ? "opacity-40" : ""}
    `}>
      {/* Thumbnail */}
      <div className="shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-stone-100">
        {l.image_url && !imgError ? (
          <img
            src={l.image_url}
            alt={address}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-300 text-[10px]">—</div>
        )}
      </div>

      {/* Price */}
      <div className="w-32 shrink-0">
        <div className="font-serif text-lg leading-tight text-stone-900">
          {l.price ? fmt(l.price) : "—"}
        </div>
        {l.price_per_sqm && (
          <div className="text-[11px] text-stone-400 font-light">
            {fmt(l.price_per_sqm)}/מ"ר
            {l.vs_avg_pct !== null && (
              <span className={`ms-1 font-medium ${l.vs_avg_pct! > 0 ? "text-rose-500" : "text-emerald-600"}`}>
                {l.vs_avg_pct! > 0 ? "+" : ""}{l.vs_avg_pct}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* Specs */}
      <div className="w-28 shrink-0 text-xs text-stone-500 font-light space-y-0.5">
        <div>
          {[l.rooms && `${l.rooms} חד'`, l.size_sqm && `${l.size_sqm} מ"ר`].filter(Boolean).join(" · ")}
        </div>
        {l.floor !== null && <div className="text-stone-400">קומה {l.floor}{l.total_floors ? `/${l.total_floors}` : ""}</div>}
      </div>

      {/* Address */}
      <div className="flex-1 min-w-0">
        <div className="text-sm text-stone-700 font-medium truncate">{address}</div>
        <div className="flex items-center gap-2 mt-0.5">
          {l.neighborhood && <span className="text-xs text-stone-400 font-light truncate">{l.neighborhood}</span>}
          {l.distance_km !== null && l.distance_km !== undefined && (
            <span className="text-[10px] text-stone-500 shrink-0">
              {l.distance_km < 1 ? `${Math.round(l.distance_km * 1000)}מ'` : `${l.distance_km}ק"מ`}
            </span>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="hidden sm:flex items-center gap-1.5 shrink-0">
        {l.price_drop > 0 && (
          <span className="flex items-center gap-0.5 text-emerald-600 text-[10px] font-medium">
            <TrendingDown size={9} /> ↓{fmt(l.price_drop)}
          </span>
        )}
        {l.is_agency === 1 && (
          <span className="text-[10px] text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded-full">תיווך</span>
        )}
      </div>

      {/* Actions — visible on hover */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => toggle("is_favorite", l.is_favorite ? 0 : 1)}
          className={`text-lg leading-none transition-colors ${l.is_favorite ? "text-amber-400" : "text-stone-200 hover:text-amber-400"}`}
          title={l.is_favorite ? "הסר ממועדפים" : "מועדף"}
        >
          ★
        </button>
        {l.url && (
          <a
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-stone-300 hover:text-stone-600 transition-colors opacity-0 group-hover:opacity-100"
          >
            <ExternalLink size={14} />
          </a>
        )}
      </div>
    </div>
  );
}
