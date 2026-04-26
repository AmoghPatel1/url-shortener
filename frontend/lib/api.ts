const BASE = "http://localhost:8081";

export interface ShortUrl {
  id: number;
  url: string;
  shortCode: string;
  accessCount: number;
  createdAt: string;
  updatedAt: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const createShortUrl = (url: string) =>
  request<ShortUrl>("/api/shorten", {
    method: "POST",
    body: JSON.stringify({ url }),
  });

export const listUrls = () =>
  request<ShortUrl[]>("/api/shorten", { method: "GET" });

export const getUrl = (code: string) =>
  request<ShortUrl>(`/api/shorten/${code}`, { method: "GET" });

export const getStats = (code: string) =>
  request<ShortUrl>(`/api/shorten/${code}/stats`, { method: "GET" });

export const updateUrl = (code: string, url: string) =>
  request<ShortUrl>(`/api/shorten/${code}`, {
    method: "PUT",
    body: JSON.stringify({ url }),
  });

export const deleteUrl = (code: string) =>
  request<void>(`/api/shorten/${code}`, { method: "DELETE" });
