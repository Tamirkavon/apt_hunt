import { useState } from "react";
import { StatsBar } from "./components/StatsBar";
import { FilterBar } from "./components/FilterBar";
import { ListingGrid } from "./components/ListingGrid";
import { useListings, useStats } from "./hooks/useListings";
import type { Filters } from "./types/listing";

const DEFAULT_FILTERS: Filters = {
  source: "",
  show: "all",
  sort_by: "first_seen_at",
  order: "desc",
  min_price: 2_000_000,
  max_price: 3_500_000,
  min_rooms: 0,
  include_agency: true,
};

export default function App() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const { data: stats } = useStats();
  const { data: rawListings = [], isLoading, error } = useListings(filters);
  const listings = filters.include_agency
    ? rawListings
    : rawListings.filter((l) => l.is_agency !== 1);

  const updateFilters = (partial: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header className="bg-[#1e3a5f] text-white text-center py-3">
        <h1 className="text-lg font-bold tracking-wide">🏠 סוכן דירות — הוד השרון</h1>
      </header>

      <StatsBar stats={stats} />
      <FilterBar filters={filters} onChange={updateFilters} total={listings.length} />
      <ListingGrid
        listings={listings}
        isLoading={isLoading}
        error={error as Error | null}
      />
    </div>
  );
}
