// Deletes strips older than 30 days. Vercel Cron calls this once a day (vercel.json) with
// "Authorization: Bearer $CRON_SECRET"; you can also call it by hand with the same header.

import { secretMatches, supabaseAdmin, supabaseConfigured } from "@/lib/supabase-server";
import { BUCKET, KEEP_DAYS } from "@/lib/strip-id";

const DAY_FOLDER = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? null;
  if (!secretMatches(bearer, process.env.CRON_SECRET)) return new Response("Unauthorized", { status: 401 });
  if (!supabaseConfigured()) return Response.json({ error: "Supabase isn't configured." }, { status: 503 });

  const storage = supabaseAdmin().storage.from(BUCKET);
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - KEEP_DAYS);
  const cutoffDay = cutoff.toISOString().slice(0, 10);

  const { data: folders, error } = await storage.list("", { limit: 1000, sortBy: { column: "name", order: "asc" } });
  if (error) return Response.json({ error: error.message }, { status: 502 });

  const expired = (folders ?? []).map((f) => f.name).filter((name) => DAY_FOLDER.test(name) && name < cutoffDay);
  let deleted = 0;
  for (const day of expired) {
    // Remove a page at a time until the folder is empty (the folder itself disappears with its last file).
    for (;;) {
      const { data: files, error: listError } = await storage.list(day, { limit: 1000 });
      if (listError) return Response.json({ error: listError.message, deleted }, { status: 502 });
      if (!files?.length) break;
      const { error: removeError } = await storage.remove(files.map((f) => `${day}/${f.name}`));
      if (removeError) return Response.json({ error: removeError.message, deleted }, { status: 502 });
      deleted += files.length;
    }
  }
  return Response.json({ cutoff: cutoffDay, folders: expired, deleted });
}
