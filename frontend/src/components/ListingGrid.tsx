import type { Listing } from "../types/listing";
import { FeaturedCard } from "./FeaturedCard";
import { CompactRow } from "./CompactRow";
import { ListingCard } from "./ListingCard";

interface Props {
  listings: Listing[];
  isLoading: boolean;
  error: Error | null;
  showMode: "all" | "new" | "favorites" | "unseen";
}

function isNewToday(iso: string) {
  return iso.startsWith(new Date().toISOString().slice(0, 10));
}

export function ListingGrid({ listings, isLoading, error, showMode }: Props) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-stone-400">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-stone-300 border-t-amber-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-light">טוען דירות...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center px-6">
          <p className="text-2xl mb-2">⚠️</p>
          <p className="text-sm text-stone-700 font-medium">השרת לא זמין</p>
          <p className="text-xs mt-1 text-stone-400 font-light leading-relaxed">
            הרץ <code className="bg-stone-100 px-1 rounded">start_all.bat</code> במחשב<br />
            ואז רענן את הדף
          </p>
        </div>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-stone-300 text-3xl mb-3 font-serif">—</p>
          <p className="text-sm text-stone-600 font-medium">אין דירות להצגה</p>
          <p className="text-xs mt-1 text-stone-400 font-light">שנה פילטרים או הרץ סריקה חדשה</p>
        </div>
      </div>
    );
  }

  // When filtering by "new" or "favorites" — show card grid (all are featured-worthy)
  if (showMode === "new" || showMode === "favorites") {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        {listings.map((l) => (
          <FeaturedCard key={l.id} listing={l} />
        ))}
      </div>
    );
  }

  // Editorial split: new today → featured banners, rest → compact rows
  const newListings = listings.filter((l) => isNewToday(l.first_seen_at));
  const restListings = listings.filter((l) => !isNewToday(l.first_seen_at));

  // If no new listings, fall back to compact list for everything
  if (newListings.length === 0) {
    return (
      <div className="mx-4 sm:mx-6 my-4 bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">
        <div className="px-4 py-2.5 border-b border-stone-100 flex items-center justify-between">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">כל הדירות</span>
          <span className="text-xs text-stone-400">{restListings.length} תוצאות</span>
        </div>
        {restListings.map((l) => (
          <CompactRow key={l.id} listing={l} />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Featured: new today */}
      <section>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-sm font-semibold text-stone-800 uppercase tracking-wider">חדש היום</h2>
          <span className="bg-amber-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
            {newListings.length}
          </span>
          <div className="flex-1 h-px bg-amber-200" />
        </div>
        <div className="space-y-4">
          {newListings.map((l) => (
            <FeaturedCard key={l.id} listing={l} />
          ))}
        </div>
      </section>

      {/* Compact list: older listings */}
      {restListings.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wider">דירות נוספות</h2>
            <span className="text-xs text-stone-400">{restListings.length}</span>
            <div className="flex-1 h-px bg-stone-200" />
          </div>
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">
            {restListings.map((l) => (
              <CompactRow key={l.id} listing={l} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
