import axios from "axios";
import type { Listing, Stats } from "../types/listing";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  headers: { "ngrok-skip-browser-warning": "1" },
});

export const fetchListings = async (params: Record<string, any>): Promise<Listing[]> => {
  const { data } = await api.get("/api/listings", { params });
  return data;
};

export const fetchStats = async (): Promise<Stats> => {
  const { data } = await api.get("/api/stats");
  return data;
};

export const updateListing = async (
  id: number,
  body: { is_seen?: number; is_favorite?: number; rating?: number; notes?: string }
): Promise<Listing> => {
  const { data } = await api.patch(`/api/listings/${id}`, body);
  return data;
};

export const markAllSeen = async (): Promise<void> => {
  await api.post("/api/listings/mark-all-seen");
};

export const triggerScrape = async (): Promise<{ status: string }> => {
  const { data } = await api.post("/api/scrape");
  return data;
};

export const fetchScrapeStatus = async (): Promise<{ running: boolean }> => {
  const { data } = await api.get("/api/scrape/running");
  return data;
};

export interface HomeAddress {
  address: string;
  lat: number;
  lon: number;
}

export const fetchHomeAddress = async (): Promise<HomeAddress> => {
  const { data } = await api.get("/api/settings/home");
  return data;
};

export const updateHomeAddress = async (address: string): Promise<HomeAddress> => {
  const { data } = await api.put("/api/settings/home", { address });
  return data;
};
