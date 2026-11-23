// Kiosk side of the upload: ask the server for a signed URL, then send the JPEG straight to Supabase.

import { createClient } from "@supabase/supabase-js";
import { BUCKET } from "./strip-id";

const KEY_STORAGE = "yomamma.kioskKey";

export function kioskKey(): string | null {
  try {
    return localStorage.getItem(KEY_STORAGE);
  } catch {
    return null;
  }
}

export function setKioskKey(key: string) {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key);
    else localStorage.removeItem(KEY_STORAGE);
  } catch {}
}

export class UploadError extends Error {
  constructor(message: string, readonly kind: "not-configured" | "unauthorised" | "failed") {
    super(message);
  }
}

export async function uploadStrip(jpeg: Blob): Promise<{ id: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishable) throw new UploadError("Uploads aren't set up yet.", "not-configured");

  let res: Response;
  try {
    res = await fetch("/api/upload-url", { method: "POST", headers: { "x-kiosk-key": kioskKey() ?? "" } });
  } catch {
    throw new UploadError("No internet connection.", "failed");
  }
  const body = await res.json().catch(() => ({}));
  if (res.status === 503) throw new UploadError(body.error ?? "Uploads aren't set up yet.", "not-configured");
  if (res.status === 401) throw new UploadError(body.error ?? "This kiosk isn't authorised.", "unauthorised");
  if (!res.ok) throw new UploadError(body.error ?? "Couldn't upload.", "failed");

  const { id, path, token } = body as { id: string; path: string; token: string };
  const supabase = createClient(url, publishable, { auth: { persistSession: false } });
  const { error } = await supabase.storage.from(BUCKET).uploadToSignedUrl(path, token, jpeg, {
    contentType: "image/jpeg",
    cacheControl: "31536000",
  });
  if (error) throw new UploadError(error.message, "failed");
  return { id };
}
