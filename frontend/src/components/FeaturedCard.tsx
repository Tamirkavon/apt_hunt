import { useState } from "react";
import { Eye, EyeOff, TrendingDown, ExternalLink, Pencil, Check, X } from "lucide-react";
import type { Listing } from "../types/listing";
import { useUpdateListing } from "../hooks/useListings";

function fmt(n: number) {
  return "₪" + n.toLocaleString("he-IL");
}

function StarRating({ rating, onRate }: { rating: number; onRate: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={(e) => { e.stopPropagation(); onRate(n === rating ? 0 : n); }}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="text-lg leading-none"
        >
          <span className={(hover || rating) >= n ? "text-amber-400" : "text-stone-200"}>★</span>
        </button>
      ))}
    </div>
  );
}

export function FeaturedCard({ listing: l }: { listing: Listing }) {
  const update = useUpdateListing();
  const [imgError, setImgError] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(l.notes ?? "");
  const [descExpanded, setDescExpanded] = useState(false);
  const isSeen = l.is_seen === 1;

  const saveNote = () => {
    update.mutate({ id: l.id, notes: noteText });
    setEditingNote(false);
  };

  const toggle = (field: "is_seen" | "is_favorite", val: number) => {
    const extra = field === "is_favorite" && val === 1 ? { is_seen: 1 } : {};
    update.mutate({ id: l.id, [field]: val, ...extra });
  };

  const address = [l.street, l.street_number].filter(Boolean).join(" ") || "כתובת לא ידועה";
  const sourceLabel = l.source === "yad2" ? "Yad2" : "Madlan";

  return (
    <div className={`
      relative bg-white rounded-xl overflow-hidden border transition-all duration-200 hover:shadow-lg
      border-amber-200 shadow-md shadow-amber-50
      ${isSeen ? "opacity-60" : ""}
    `}>
      <div className="flex flex-col sm:flex-row">
        {/* Image — left on desktop, top on mobile */}
        <div className="relative sm:w-72 shrink-0">
          {l.image_url && !imgError ? (
            <img
              src={l.image_url}
              alt={address}
              className="w-full h-52 sm:h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-52 sm:h-full bg-stone-100 flex items-center justify-center text-stone-300 text-xs">
              אין תמונה
            </div>
          )}

          {/* Badges over image */}
          <div className="absolute top-3 right-3 flex gap-1.5 flex-wrap">
            <span className="bg-amber-500 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full tracking-wide shadow-sm">
              חדש היום
            </span>
            {l.price_drop > 0 && (
              <span className="bg-emerald-500 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                <TrendingDown size={10} /> ↓{fmt(l.price_drop)}
              </span>
            )}
          </div>

          <span className="absolute top-3 left-3 text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/85 text-stone-600 backdrop-blur-sm">
            {sourceLabel}
          </span>

          {l.is_agency === 1 && (
            <span className="absolute bottom-3 left-3 text-[10px] font-medium px-2 py-0.5 rounded-full bg-stone-800/80 text-stone-200 backdrop-blur-sm">
              תיווך
            </span>
          )}
        </div>

        {/* Content — right */}
        <div className="flex flex-col flex-1 p-5">
          {/* Price */}
          <div className="mb-3">
            <div className="font-serif text-[2rem] leading-none text-stone-900 tracking-tight">
              {l.price ? fmt(l.price) : "מחיר לא ידוע"}
            </div>
            {l.price_per_sqm && (
              <div className="text-sm text-stone-400 mt-1 font-light">
                {fmt(l.price_per_sqm)}/מ"ר
                {l.vs_avg_pct !== null && (
                  <span className={`ms-2 font-semibold text-sm ${l.vs_avg_pct! > 0 ? "text-rose-500" : "text-emerald-600"}`}>
                    {l.vs_avg_pct! > 0 ? "+" : ""}{l.vs_avg_pct}% מהממוצע
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex gap-3 text-sm text-stone-600 mb-2 font-light flex-wrap">
            {l.rooms && <span className="font-semibold text-stone-800">{l.rooms} חדרים</span>}
            {l.size_sqm && <span>{l.size_sqm} מ"ר</span>}
            {l.floor !== null && <span>קומה {l.floor}{l.total_floors ? `/${l.total_floors}` : ""}</span>}
          </div>

          {/* Address + distance */}
          <div className="text-base text-stone-800 font-medium">{address}</div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {l.neighborhood && <span className="text-sm text-stone-400 font-light">{l.neighborhood}</span>}
            {l.distance_km !== null && l.distance_km !== undefined && (
              <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                {l.distance_km < 1 ? `${Math.round(l.distance_km * 1000)}מ'` : `${l.distance_km}ק"מ`} מהבית
              </span>
            )}
          </div>

          {/* Description */}
          {l.description && (
            <div className="mt-3">
              <p className={`text-sm text-stone-500 leading-relaxed font-light whitespace-pre-line ${descExpanded ? "" : "line-clamp-2"}`}>
                {l.description}
              </p>
              {l.description.length > 100 && (
                <button onClick={() => setDescExpanded(!descExpanded)} className="text-xs text-stone-400 hover:text-stone-600 mt-0.5">
                  {descExpanded ? "פחות" : "קרא עוד"}
                </button>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="mt-3">
            {editingNote ? (
              <div className="space-y-1.5">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="הערות..."
                  rows={2}
                  className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-amber-400 text-stone-700 bg-stone-50"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button onClick={saveNote} className="flex items-center gap-1 text-xs bg-stone-900 text-white px-3 py-1.5 rounded-lg hover:bg-stone-700">
                    <Check size={11} /> שמור
                  </button>
                  <button onClick={() => { setNoteText(l.notes ?? ""); setEditingNote(false); }} className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-600 px-2 py-1">
                    <X size={11} /> ביטול
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setEditingNote(true)}
                className="flex items-start gap-1.5 text-sm text-stone-400 hover:text-stone-600 transition-colors w-full text-right"
              >
                <Pencil size={12} className="mt-0.5 shrink-0" />
                <span className="italic font-light">{l.notes || "הוסף הערה..."}</span>
              </button>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Footer */}
          <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => toggle("is_favorite", l.is_favorite ? 0 : 1)}
                className={`flex items-center gap-1.5 text-sm font-medium transition-colors px-3 py-1.5 rounded-lg
                  ${l.is_favorite ? "bg-amber-400 text-white" : "bg-stone-100 text-stone-500 hover:bg-amber-50 hover:text-amber-600"}`}
              >
                ★ {l.is_favorite ? "מועדף" : "שמור"}
              </button>
              <StarRating rating={l.rating} onRate={(n) => update.mutate({ id: l.id, rating: n })} />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => toggle("is_seen", l.is_seen ? 0 : 1)}
                className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-600 transition-colors"
              >
                {isSeen ? <Eye size={13} /> : <EyeOff size={13} />}
                {isSeen ? "נראה" : "סמן כנראה"}
              </button>
              <a
                href={`https://www.nadlan.gov.il/?search=${encodeURIComponent([l.street, l.street_number, l.city].filter(Boolean).join(" "))}`}
                target="_blank" rel="noopener noreferrer"
                className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
              >
                נדל"ן.gov
              </a>
              {l.url && (
                <a
                  href={l.url}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm bg-stone-900 text-white px-3 py-1.5 rounded-lg hover:bg-stone-700 transition-colors"
                >
                  <ExternalLink size={12} /> פתח
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
