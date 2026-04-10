import type { Listing } from "../types/listing";
import { ListingCard } from "./ListingCard";

interface Props {
  listings: Listing[];
  isLoading: boolean;
  error: Error | null;
}

export function ListingGrid({ listings, isLoading, error }: Props) {
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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-6">
      {listings.map((l) => (
        <ListingCard key={l.id} listing={l} />
      ))}
    </div>
  );
}
