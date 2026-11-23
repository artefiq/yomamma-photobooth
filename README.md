# Yo! Mamma Photo Booth

A web photo booth for the Yo! Mamma exhibition stand at the Apple Developer Academy.

1. A visitor picks a study buddy on the kiosk (an iPad or Mac with a camera).
2. They take four photos, with the buddy posing in each one.
3. The kiosk makes a 4-shot strip in the app's look.
4. The strip is uploaded, and the kiosk shows a QR code.
5. The visitor scans the code and saves the strip on their own phone.

Strips are deleted automatically after 30 days.

| | |
|---|---|
| App | Next.js 16 (App Router), TypeScript, Tailwind CSS 4 |
| Hosting | Vercel Hobby (free) |
| Storage | Supabase Storage, free plan (1 GB of files) |
| Camera and strip | `getUserMedia` plus `<canvas>`, in the browser |

## Run it locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

- **Demo camera:** add `?demo` to try the booth without a camera: <http://localhost:3000/booth?demo>.
- **Without Supabase:** uploads stay off. The kiosk then offers **Save on this device** instead of a QR code.

## Set up storage (Supabase, free)

1. Create a project at [supabase.com](https://supabase.com). No credit card is needed.
2. **SQL Editor:** run [`supabase/setup.sql`](supabase/setup.sql). It creates the public `strips` bucket, limited to JPEG files of 2 MB or less.
3. Copy `.env.example` to `.env.local`.
   - From **Project Settings → API**, fill in the project URL, the publishable key and the secret key.
   - Set `KIOSK_SECRET` and `CRON_SECRET` to long random strings (`openssl rand -hex 24`).

Free Supabase projects pause after a week without activity. Open the dashboard or do a test shoot a day or two before the exhibition.

## Deploy (Vercel, free)

1. Push this folder to GitHub and import it at [vercel.com/new](https://vercel.com/new).
2. Add the five variables from `.env.example` under **Settings → Environment Variables**, then redeploy.
3. The daily cleanup in [`vercel.json`](vercel.json) runs at 03:00 UTC. Vercel sends `CRON_SECRET` with each call.

## Set up the kiosk

1. Open `https://<your-site>/booth?setup` on the kiosk and paste the `KIOSK_SECRET`.
   - The key is kept in that browser only.
   - Only a kiosk with the key can upload, so strangers can't fill the bucket.
2. Allow the camera when the browser asks.
3. **iPad:** add the site to the Home Screen for full screen. Turn on **Guided Access** (Settings → Accessibility) so visitors can't leave the app.
4. **Mac:** use the browser's full-screen mode or kiosk mode.

The kiosk returns to the start screen after 90 seconds without a tap, and 60 seconds after showing the QR code.

## How it fits together

| Path | What it is |
|---|---|
| `/` | Attract screen |
| `/booth` | The kiosk. Steps: pick a buddy → shoot → review → upload → QR code. Adding `?demo` uses the demo camera; `?setup` opens the kiosk key screen |
| `/p/<id>` | What the visitor's phone opens. It shows the strip with **Save or share** (the phone's share sheet) and **Download** |
| `POST /api/upload-url` | Checks the kiosk key, then returns a one-time signed upload URL for `strips/<yyyy-mm-dd>/<id>.jpg` |
| `GET /api/cleanup` | Deletes day folders older than 30 days. Needs `Authorization: Bearer $CRON_SECRET` |

## The design system

The look comes from the iOS app (`../YoMomma`):

- **Colours:** `YoMamma/Design/Theme.swift` → CSS variables in [`app/globals.css`](app/globals.css).
- **Spacing, radii and shadows:** `Constants.swift`.
- **Pill buttons, round buttons, cards and the speech bubble:** [`components/ui.tsx`](components/ui.tsx).
- **Type:** the app's rounded type is SF Pro Rounded (`ui-rounded`) on Apple devices, with Nunito everywhere else and in the strip.

The buddies are drawn in code in the app, so they're generated as SVG stickers. [`scripts/crew-render.ts`](scripts/crew-render.ts) ports the app's crew renderer: the designer's path data from `Shared/CrewArt.swift`, plus the face rig from `Shared/CrewCharacterView.swift`.

To pick up new art, faces or voice lines from the app, run:

```bash
npm run import-assets
```

It reads `../YoMomma`; pass a different path as an argument if yours is elsewhere. It rewrites:

- `public/stickers`, `public/faces` and `public/voices`
- `public/logo.svg`
- `lib/voice-lines.json`, the buddies' introduction and "well done" lines with their words

## Budget

A strip is a 900 × 2700 JPEG of about 200–450 KB. The free 1 GB holds roughly 2,500 strips. Downloads count against Supabase's 5 GB a month of egress. The 30-day cleanup keeps storage use low.
