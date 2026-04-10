export interface Listing {
  id: number;
  external_id: string;
  source: "yad2" | "madlan";
  price: number | null;
  rooms: number | null;
  floor: number | null;
  total_floors: number | null;
  size_sqm: number | null;
  city: string | null;
  neighborhood: string | null;
  street: string | null;
  street_number: string | null;
  title: string | null;
  description: string | null;
  url: string | null;
  image_url: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  is_seen: 0 | 1;
  is_favorite: 0 | 1;
  rating: number;
  notes: string | null;
  price_drop: number;
  listed_at: string | null;
  first_seen_at: string;
  last_seen_at: string;
  is_active: 0 | 1;
  price_per_sqm: number | null;
  neighborhood_avg_per_sqm: number | null;
  vs_avg_pct: number | null;
  distance_km: number | null;
  is_agency: 0 | 1 | null;
}

export interface Stats {
  total_active: number;
  new_today: number;
  yad2_count: number;
  madlan_count: number;
  favorites_count: number;
  avg_price: number;
  min_price: number;
  max_price: number;
  price_drops_today: number;
  last_scrape_at: string | null;
}

export type SortField = "first_seen_at" | "price" | "rooms" | "size_sqm" | "rating" | "distance_km";

export interface Filters {
  source: "" | "yad2" | "madlan";
  show: "all" | "new" | "favorites" | "unseen";
  sort_by: SortField;
  order: "asc" | "desc";
  min_price: number;
  max_price: number;
  min_rooms: number;
  include_agency: boolean;
  max_distance_km: number | null;
}
