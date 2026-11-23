// A strip's id carries its day, so the download page can find the file without a database:
//   id   20261123-k3v9x2ma
//   file strips/2026-11-23/20261123-k3v9x2ma.jpg
// The day folders are also what the 30-day cleanup deletes.

import { customAlphabet } from "nanoid";

export const BUCKET = "strips";
export const KEEP_DAYS = 30;

const random = customAlphabet("23456789abcdefghjkmnpqrstuvwxyz", 8);
const ID = /^(\d{4})(\d{2})(\d{2})-[a-z0-9]{8}$/;

export function newStripId(now = new Date()): string {
  const day = now.toISOString().slice(0, 10).replaceAll("-", "");
  return `${day}-${random()}`;
}

/** The file's path in the bucket, or null for an id that isn't one of ours. */
export function stripPath(id: string): string | null {
  const m = ID.exec(id);
  return m ? `${m[1]}-${m[2]}-${m[3]}/${id}.jpg` : null;
}

/** The public URL of a strip; with `download`, the browser saves it under that name. */
export function stripUrl(supabaseUrl: string, path: string, download?: string): string {
  const url = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/${path}`;
  return download ? `${url}?download=${encodeURIComponent(download)}` : url;
}

/** When a strip from this id stops being available. */
export function expiresOn(id: string): Date | null {
  const m = ID.exec(id);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  d.setUTCDate(d.getUTCDate() + KEEP_DAYS);
  return d;
}
