// Server-only Supabase access with the secret key. Never import this from a client component.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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
