/**
 * Fetches public IP and ISP from a free, no-auth API.
 * Falls back gracefully if the request fails.
 */
export interface ServerInfo {
  ip: string;
  isp: string;
  city: string;
  country: string;
}

const FALLBACK: ServerInfo = {
  ip: "—",
  isp: "Unknown ISP",
  city: "—",
  country: "—",
};

export async function fetchServerInfo(): Promise<ServerInfo> {
  try {
    // ip-api.com is free, no key required, returns JSON
    const res = await fetch("https://ip-api.com/json/?fields=status,isp,city,country,query", {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return FALLBACK;
    const data = await res.json();
    if (data.status !== "success") return FALLBACK;
    return {
      ip: data.query ?? "—",
      isp: data.isp ?? "Unknown ISP",
      city: data.city ?? "—",
      country: data.country ?? "—",
    };
  } catch {
    return FALLBACK;
  }
}
