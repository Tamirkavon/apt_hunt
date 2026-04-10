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
  max_distance_km: 1.0,
};

export default function App() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const { data: stats } = useStats();
  const { data: rawListings = [], isLoading, error } = useListings(filters);
  const listings = rawListings
    .filter((l) => filters.include_agency || l.is_agency !== 1)
    .filter((l) =>
      filters.max_distance_km === null ||
      l.distance_km === null ||
      l.distance_km <= filters.max_distance_km
    );

  const updateFilters = (partial: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  };

  return (
    <div dir="rtl" className="min-h-screen bg-stone-50 font-sans">
      <StatsBar stats={stats} />
      <FilterBar filters={filters} onChange={updateFilters} total={listings.length} />
      <ListingGrid listings={listings} isLoading={isLoading} error={error as Error | null} />
    </div>
  );
}
