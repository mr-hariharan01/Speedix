import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format speed in Mbps. Never returns "--" or NaN — falls back to "0.0". */
export function formatSpeed(mbps: number | null | undefined): string {
  if (mbps === null || mbps === undefined || isNaN(mbps) || !isFinite(mbps)) return "0.0";
  return mbps.toFixed(1);
}

/** Format ping in ms. Never returns "--" or NaN — falls back to "0". */
export function formatPing(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || isNaN(ms) || !isFinite(ms)) return "0";
  return Math.round(ms).toString();
}
