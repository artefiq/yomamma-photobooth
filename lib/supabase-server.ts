// Server-only Supabase access with the secret key. Never import this from a client component.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { BUCKET, isShown, stripPath } from "./strip-id";

export function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}

let admin: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (!supabaseConfigured()) throw new Error("Supabase isn't configured (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY).");
  admin ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}

/** Constant-time comparison of a presented secret with the expected one. */
export function secretMatches(presented: string | null, expected: string | undefined): boolean {
  if (!presented || !expected) return false;
  const a = new TextEncoder().encode(presented);
  const b = new TextEncoder().encode(expected);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

/** How long a signed strip link works. Reopening the visitor page signs a fresh one. */
const LINK_SECONDS = 24 * 60 * 60;

export type StripLinks = { src: string; download: string };

/** Signed links to view and download one strip, or null when it's hidden, gone, or not one of ours.
 *  The bucket is private, so these links are the only way to a strip. */
export async function stripLinks(id: string): Promise<StripLinks | null> {
  const path = stripPath(id);
  if (!path || !isShown(id) || !supabaseConfigured()) return null;
  const storage = supabaseAdmin().storage.from(BUCKET);
  const [view, save] = await Promise.all([
    storage.createSignedUrl(path, LINK_SECONDS),
    storage.createSignedUrl(path, LINK_SECONDS, { download: `yomamma-${id}.jpg` }),
  ]);
  if (view.error || save.error || !view.data || !save.data) return null;
  return { src: view.data.signedUrl, download: save.data.signedUrl };
}

/** Signed links for many strips at once (the history page). Hidden or missing ones are left out. */
export async function manyStripLinks(ids: string[]): Promise<Map<string, StripLinks>> {
  const shown = ids.filter(isShown);
  const links = new Map<string, StripLinks>();
  if (!shown.length || !supabaseConfigured()) return links;
  const storage = supabaseAdmin().storage.from(BUCKET);
  const paths = shown.map((id) => stripPath(id)!);
  const [views, saves] = await Promise.all([
    storage.createSignedUrls(paths, LINK_SECONDS),
    storage.createSignedUrls(paths, LINK_SECONDS, { download: true }),
  ]);
  shown.forEach((id, i) => {
    const src = views.data?.[i]?.signedUrl;
    const download = saves.data?.[i]?.signedUrl;
    if (src && download) links.set(id, { src, download });
  });
  return links;
}
