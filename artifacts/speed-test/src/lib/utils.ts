import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSpeed(mbps: number | null): string {
  if (mbps === null) return "--";
  return mbps.toFixed(1);
}

export function formatPing(ms: number | null): string {
  if (ms === null) return "--";
  return Math.round(ms).toString();
}
