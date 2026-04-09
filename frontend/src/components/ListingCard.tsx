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
          className="text-lg leading-none"
        >
          <span className={(hover || rating) >= n ? "text-yellow-400" : "text-gray-200"}>★</span>
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
  const sourceColor = l.source === "yad2" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700";

  return (
    <div
      className={`
        relative bg-white rounded-xl shadow-sm border transition-all duration-200 overflow-hidden
        hover:shadow-md hover:-translate-y-0.5
        ${isNew ? "border-l-4 border-l-green-400 border-t border-r border-b border-gray-100" : "border border-gray-100"}
        ${isSeen ? "opacity-60" : ""}
      `}
    >
      {/* Image */}
      <div className="relative">
        {l.image_url && !imgError ? (
          <img
            src={l.image_url}
            alt={address}
            className="w-full h-48 object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-48 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
            אין תמונה
          </div>
        )}

        {/* Badges on image */}
        <div className="absolute top-2 right-2 flex gap-1 flex-wrap">
          {isNew && (
            <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">חדש!</span>
          )}
          {l.price_drop > 0 && (
            <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <TrendingDown size={10} />
              ↓{fmt(l.price_drop)}
            </span>
          )}
          {l.is_agency === 1 && (
            <span className="bg-orange-400 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              🤝 תיווך
            </span>
          )}
        </div>

        <span className={`absolute top-2 left-2 text-xs font-semibold px-2 py-0.5 rounded-full ${sourceColor}`}>
          {sourceLabel}
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Price */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="text-2xl font-bold text-[#1e3a5f]">
              {l.price ? fmt(l.price) : "מחיר לא ידוע"}
            </div>
            {l.price_per_sqm && (
              <div className="text-sm text-gray-400 mt-0.5">
                {fmt(l.price_per_sqm)}/מ"ר
                {l.vs_avg_pct !== null && (
                  <span className={`ms-1 font-medium ${l.vs_avg_pct! > 0 ? "text-red-500" : "text-green-600"}`}>
                    ({l.vs_avg_pct! > 0 ? "+" : ""}{l.vs_avg_pct}% מממוצע)
                  </span>
                )}
              </div>
            )}
          </div>
          <button
            onClick={() => toggle("is_favorite", l.is_favorite ? 0 : 1)}
            title={l.is_favorite ? "הסר ממועדפים" : "הוסף למועדפים"}
            className={`text-2xl leading-none mt-1 transition-colors ${
              l.is_favorite ? "text-yellow-400" : "text-gray-300 hover:text-yellow-300"
            }`}
          >
            ★
          </button>
        </div>

        {/* Details row */}
        <div className="flex gap-3 text-sm text-gray-500 mb-2">
          {l.rooms && <span>{l.rooms} חד'</span>}
          {l.size_sqm && <span>{l.size_sqm} מ"ר</span>}
          {l.floor !== null && <span>קומה {l.floor}{l.total_floors ? `/${l.total_floors}` : ""}</span>}
        </div>

        {/* Address + neighborhood */}
        <div className="text-sm text-gray-700 font-medium">{address}</div>
        <div className="flex items-center gap-2 flex-wrap">
          {l.neighborhood && <span className="text-xs text-gray-400">{l.neighborhood}</span>}
          {l.distance_km !== null && l.distance_km !== undefined && (
            <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">
              📍 {l.distance_km < 1 ? `${Math.round(l.distance_km * 1000)}מ'` : `${l.distance_km}ק"מ`} מהבית
            </span>
          )}
        </div>

        {/* Description */}
        {l.description && (
          <div className="mt-3">
            <p className={`text-sm text-gray-600 leading-relaxed whitespace-pre-line ${descExpanded ? "" : "line-clamp-3"}`}>
              {l.description}
            </p>
            {l.description.length > 120 && (
              <button
                onClick={() => setDescExpanded(!descExpanded)}
                className="text-xs text-blue-500 hover:text-blue-700 mt-0.5"
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
                className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={saveNote} className="flex items-center gap-1 text-xs bg-[#1e3a5f] text-white px-2.5 py-1 rounded-lg hover:bg-[#2a4f7e]">
                  <Check size={11} /> שמור
                </button>
                <button onClick={() => { setNoteText(l.notes ?? ""); setEditingNote(false); }} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-2 py-1">
                  <X size={11} /> ביטול
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setEditingNote(true)}
              className="flex items-start gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors w-full text-right"
            >
              <Pencil size={11} className="mt-0.5 shrink-0" />
              <span className="italic">{l.notes || "הוסף הערה..."}</span>
            </button>
          )}
        </div>

        {/* Nadlan link */}
        <div className="mt-2">
          <a
            href={`https://www.nadlan.gov.il/?search=${encodeURIComponent([l.street, l.street_number, l.city].filter(Boolean).join(" "))}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:text-blue-600 underline"
          >
            עסקאות אחרונות באזור — נדל"ן.gov.il
          </a>
        </div>

        {/* Star rating */}
        <div className="mt-3">
          <StarRating
            rating={l.rating}
            onRate={(n) => update.mutate({ id: l.id, rating: n })}
          />
        </div>

        {/* Footer actions */}
        <div className="mt-4 flex items-center justify-between border-t border-gray-50 pt-3">
          <button
            onClick={() => toggle("is_seen", l.is_seen ? 0 : 1)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            {isSeen ? <Eye size={13} /> : <EyeOff size={13} />}
            {isSeen ? "ראיתי" : "סמן כנראה"}
          </button>

          {l.url && (
            <a
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs bg-[#1e3a5f] text-white px-3 py-1.5 rounded-lg hover:bg-[#2a4f7e] transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={11} />
              פתח מודעה
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
