import { headers } from "next/headers";

export function trimBase(url: string) {
  return url.trim().replace(/\/+$/, "");
}

export async function getBaseUrl(): Promise<string> {
  const configured = process.env.APP_URL?.trim();
  if (configured) return trimBase(configured);

  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export function baseUrlFromRequest(req: Request): string {
  const configured = process.env.APP_URL?.trim();
  if (configured) return trimBase(configured);
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}
