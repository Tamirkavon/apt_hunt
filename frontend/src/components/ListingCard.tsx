import { useState } from "react";
import { Eye, EyeOff, TrendingDown, ExternalLink, Pencil, Check, X } from "lucide-react";
import type { Listing } from "../types/listing";
import { useUpdateListing } from "../hooks/useListings";

interface Props {
  listing: Listing;
}

function fmt(n: number) {
  return "₪" + n.toLocaleString("he-IL");
}

function isNewToday(iso: string) {
  return iso.startsWith(new Date().toISOString().slice(0, 10));
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
          className="text-base leading-none"
        >
          <span className={(hover || rating) >= n ? "text-amber-400" : "text-stone-200"}>★</span>
        </button>
      ))}
    </div>
  );
}

export function ListingCard({ listing: l }: Props) {
  const update = useUpdateListing();
  const [imgError, setImgError] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(l.notes ?? "");
  const isNew = isNewToday(l.first_seen_at);
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
    <div
      className={`
        relative bg-white rounded-xl overflow-hidden transition-all duration-200
        border hover:shadow-lg hover:-translate-y-0.5
        ${isNew ? "border-amber-300 shadow-sm shadow-amber-100" : "border-stone-200 shadow-sm"}
        ${isSeen ? "opacity-55" : ""}
      `}
    >
      {/* Image */}
      <div className="relative">
        {l.image_url && !imgError ? (
          <img
            src={l.image_url}
            alt={address}
            className="w-full h-44 object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-44 bg-stone-100 flex items-center justify-center text-stone-400 text-xs font-light">
            אין תמונה
          </div>
        )}

        {/* Top-right badges */}
        <div className="absolute top-2 right-2 flex gap-1 flex-wrap">
          {isNew && (
            <span className="bg-amber-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full tracking-wide">
              חדש
            </span>
          )}
          {l.price_drop > 0 && (
            <span className="bg-emerald-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <TrendingDown size={9} />
              ↓{fmt(l.price_drop)}
            </span>
          )}
          {l.is_agency === 1 && (
            <span className="bg-stone-700 text-stone-200 text-[10px] font-medium px-2 py-0.5 rounded-full">
              תיווך
            </span>
          )}
        </div>

        {/* Source badge — top left */}
        <span className="absolute top-2 left-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/80 text-stone-600 backdrop-blur-sm">
          {sourceLabel}
        </span>

        {/* Favorite button — bottom right of image */}
        <button
          onClick={() => toggle("is_favorite", l.is_favorite ? 0 : 1)}
          title={l.is_favorite ? "הסר ממועדפים" : "הוסף למועדפים"}
          className={`absolute bottom-2 left-2 w-7 h-7 flex items-center justify-center rounded-full transition-colors text-lg leading-none
            ${l.is_favorite
              ? "bg-amber-400 text-white shadow-sm"
              : "bg-white/80 text-stone-300 hover:text-amber-400 backdrop-blur-sm"
            }`}
        >
          ★
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Price — DM Serif Display, protagonist */}
        <div className="mb-3">
          <div className="font-serif text-[1.6rem] leading-none text-stone-900 tracking-tight">
            {l.price ? fmt(l.price) : "מחיר לא ידוע"}
          </div>
          {l.price_per_sqm && (
            <div className="text-xs text-stone-400 mt-1 font-light">
              {fmt(l.price_per_sqm)}/מ"ר
              {l.vs_avg_pct !== null && (
                <span className={`ms-1.5 font-medium ${l.vs_avg_pct! > 0 ? "text-rose-500" : "text-emerald-600"}`}>
                  {l.vs_avg_pct! > 0 ? "+" : ""}{l.vs_avg_pct}%
                </span>
              )}
            </div>
          )}
        </div>

        {/* Details row */}
        <div className="flex gap-2.5 text-xs text-stone-500 mb-2.5 font-light">
          {l.rooms && <span className="font-medium text-stone-700">{l.rooms} חדרים</span>}
          {l.size_sqm && <span>{l.size_sqm} מ"ר</span>}
          {l.floor !== null && <span>קומה {l.floor}{l.total_floors ? `/${l.total_floors}` : ""}</span>}
        </div>

        {/* Address */}
        <div className="text-sm text-stone-800 font-medium leading-snug">{address}</div>
        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
          {l.neighborhood && <span className="text-xs text-stone-400 font-light">{l.neighborhood}</span>}
          {l.distance_km !== null && l.distance_km !== undefined && (
            <span className="text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded-full font-medium">
              {l.distance_km < 1 ? `${Math.round(l.distance_km * 1000)}מ'` : `${l.distance_km}ק"מ`} מהבית
            </span>
          )}
        </div>

        {/* Description */}
        {l.description && (
          <div className="mt-3">
            <p className={`text-xs text-stone-500 leading-relaxed font-light whitespace-pre-line ${descExpanded ? "" : "line-clamp-3"}`}>
              {l.description}
            </p>
            {l.description.length > 120 && (
              <button
                onClick={() => setDescExpanded(!descExpanded)}
                className="text-[10px] text-stone-400 hover:text-stone-600 mt-0.5"
              >
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
                rows={3}
                className="w-full text-xs border border-stone-200 rounded-lg px-2.5 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-amber-400 text-stone-700 bg-stone-50"
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={saveNote} className="flex items-center gap-1 text-xs bg-stone-900 text-white px-2.5 py-1 rounded-lg hover:bg-stone-700">
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
              className="flex items-start gap-1.5 text-xs text-stone-400 hover:text-stone-600 transition-colors w-full text-right"
            >
              <Pencil size={10} className="mt-0.5 shrink-0" />
              <span className="italic font-light">{l.notes || "הוסף הערה..."}</span>
            </button>
          )}
        </div>

        {/* Star rating */}
        <div className="mt-3">
          <StarRating
            rating={l.rating}
            onRate={(n) => update.mutate({ id: l.id, rating: n })}
          />
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => toggle("is_seen", l.is_seen ? 0 : 1)}
              className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-600 transition-colors"
            >
              {isSeen ? <Eye size={12} /> : <EyeOff size={12} />}
              {isSeen ? "נראה" : "סמן כנראה"}
            </button>

            <a
              href={`https://www.nadlan.gov.il/?search=${encodeURIComponent([l.street, l.street_number, l.city].filter(Boolean).join(" "))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
            >
              נדל"ן.gov
            </a>
          </div>

          {l.url && (
            <a
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs bg-stone-900 text-white px-3 py-1.5 rounded-lg hover:bg-stone-700 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={10} />
              פתח
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
