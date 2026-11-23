// Gives the kiosk a one-time signed URL to upload one strip. Only a kiosk that knows KIOSK_SECRET
// gets one, so nobody else can fill the bucket.

import { secretMatches, supabaseAdmin, supabaseConfigured } from "@/lib/supabase-server";
import { BUCKET, newStripId, stripPath } from "@/lib/strip-id";

export async function POST(request: Request) {
  if (!supabaseConfigured() || !process.env.KIOSK_SECRET) {
    return Response.json({ error: "Uploads aren't set up on this server." }, { status: 503 });
  }
  if (!secretMatches(request.headers.get("x-kiosk-key"), process.env.KIOSK_SECRET)) {
    return Response.json({ error: "This kiosk isn't authorised. Open /booth?setup to enter the kiosk key." }, { status: 401 });
  }

  const id = newStripId();
  const path = stripPath(id)!;
  const { data, error } = await supabaseAdmin().storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("createSignedUploadUrl failed", error);
    return Response.json({ error: "Couldn't prepare the upload." }, { status: 502 });
  }
  return Response.json({ id, path: data.path, token: data.token });
}
