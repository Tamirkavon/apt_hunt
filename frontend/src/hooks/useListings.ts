import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchListings, fetchStats, updateListing, markAllSeen, triggerScrape, fetchScrapeStatus, fetchHomeAddress, updateHomeAddress } from "../api/client";
import type { Filters } from "../types/listing";

export function useListings(filters: Filters) {
  const params: Record<string, any> = {
    sort_by: filters.sort_by,
    order: filters.order,
    is_active: 1,
    limit: 200,
    min_price: filters.min_price,
    max_price: filters.max_price,
  };
  if (filters.min_rooms > 0) params.min_rooms = filters.min_rooms;
  if (filters.source) params.source = filters.source;
  if (filters.show === "new") params.show_new_only = true;
  if (filters.show === "favorites") params.is_favorite = 1;
  if (filters.show === "unseen") params.is_seen = 0;

  return useQuery({
    queryKey: ["listings", filters],
    queryFn: () => fetchListings(params),
    refetchInterval: 60_000,
  });
}

export function useStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
    refetchInterval: 60_000,
  });
}

export function useUpdateListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; is_seen?: number; is_favorite?: number; rating?: number; notes?: string }) =>
      updateListing(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["listings"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useMarkAllSeen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markAllSeen,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["listings"] }),
  });
}

export function useScrape() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: triggerScrape,
    onSuccess: () => {
      // Refetch after scraper likely done (~60s)
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ["listings"] });
        qc.invalidateQueries({ queryKey: ["stats"] });
      }, 60_000);
    },
  });
}

export function useHomeAddress() {
  return useQuery({
    queryKey: ["homeAddress"],
    queryFn: fetchHomeAddress,
    staleTime: Infinity,
  });
}

export function useUpdateHomeAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (address: string) => updateHomeAddress(address),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["homeAddress"] });
      qc.invalidateQueries({ queryKey: ["listings"] });
    },
  });
}

export function useScrapeStatus() {
  const { data } = useQuery({
    queryKey: ["scrapeStatus"],
    queryFn: fetchScrapeStatus,
    refetchInterval: (query) => {
      // Only poll fast when actively scraping
      return query.state.data?.running ? 3000 : 15_000;
    },
  });
  return { data };
}
