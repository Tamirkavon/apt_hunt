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
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">טוען דירות...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500">
        <div className="text-center">
          <p className="font-medium">שגיאה בטעינת הנתונים</p>
          <p className="text-sm mt-1 text-gray-400">וודא שהשרת רץ (start_backend.bat)</p>
        </div>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="text-center">
          <p className="text-4xl mb-3">🏠</p>
          <p className="font-medium">אין דירות להצגה</p>
          <p className="text-sm mt-1">נסה לשנות את הפילטרים או להריץ סריקה חדשה</p>
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
