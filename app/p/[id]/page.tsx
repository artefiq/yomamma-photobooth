import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { Logo, RoomCard } from "@/components/ui";
import { SaveButtons } from "@/components/SaveButtons";
import { expiresOn, stripPath, stripUrl } from "@/lib/strip-id";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL, TESTFLIGHT_URL, TIKTOK_HANDLE, TIKTOK_URL } from "@/lib/app-links";

export const metadata: Metadata = {
  title: "Your Yo! Mamma photo strip",
  description: "Save your photo strip from the Yo! Mamma photo booth.",
  robots: { index: false, follow: false },
};

// The page a visitor's phone opens from the kiosk's QR code. Dark, like the kiosk. Top to bottom: the picture
// (capped so the buttons start on the first screen), save and share with a nudge to tag us, the app, and
// where to follow us. TestFlight is iPhone and iPad only, so Android phones get the follow buttons first
// and a note instead of the TestFlight button.
export default function StripPage(props: PageProps<"/p/[id]">) {
  return (
    <main className="page-bg flex min-h-dvh flex-1 flex-col items-center gap-6 px-4 pt-[max(24px,env(safe-area-inset-top))] pb-10 sm:px-page">
      <header className="flex items-center gap-3">
        <Logo size={56} />
        <h1 className="text-2xl font-black tracking-tight">Yo! Mamma Photo Booth</h1>
      </header>
      <Suspense fallback={<p className="py-20 text-lg font-bold text-ink-soft">Finding your strip…</p>}>
        <Strip params={props.params} />
      </Suspense>
    </main>
  );
}

async function Strip({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const path = stripPath(id);
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!path || !base) return <Gone title="We can't find that strip" body="Check the link, or scan the code at the booth again." />;

  const src = stripUrl(base, path);
  const found = await fetch(src, { method: "HEAD", cache: "no-store" }).then((r) => r.ok, () => false);
  if (!found) {
    return <Gone title="This strip has gone" body="Strips are kept for 30 days after the exhibition photo, then deleted." />;
  }

  const until = expiresOn(id)!.toLocaleDateString("en-US", { day: "numeric", month: "long", timeZone: "UTC" });
  const android = /Android/i.test((await headers()).get("user-agent") ?? "");
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6">
      {/* The strip on a lighter panel, as on the kiosk; tap it for the full picture. */}
      <a href={src} target="_blank" rel="noopener" className="rounded-stage bg-mint p-3 shadow-card ring-1 ring-card-border sm:p-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="Your photos from the booth. Tap to see it full size." className="h-auto max-h-[55dvh] w-auto max-w-full rounded-md shadow-card" />
      </a>
      <SaveButtons src={src} downloadHref={stripUrl(base, path, `yomamma-${id}.jpg`)} fileName={`yomamma-${id}.jpg`} />
      <p className="-mt-2 text-center text-sm font-semibold text-ink-soft">
        Tap the picture to see it full size. It stays online until {until}.
      </p>
      {android ? (
        <>
          <FollowUs />
          <GetTheApp android />
        </>
      ) : (
        <>
          <GetTheApp />
          <FollowUs />
        </>
      )}
    </div>
  );
}

/** The way to the app from the visitor's own phone: a link, since they can't scan a code on the same screen. */
function GetTheApp({ android = false }: { android?: boolean }) {
  return (
    <RoomCard className="flex w-full items-center gap-4 p-5">
      <Logo size={64} className="shrink-0 self-start" />
      <div className="flex flex-1 flex-col gap-2">
        <h2 className="text-lg font-black leading-tight">Yo! Mamma</h2>
        <p className="text-sm font-semibold text-ink-soft">
          A study buddy that stops your scrolling.{" "}
          {android ? "It's on iPhone for now. Follow us to hear when it lands." : "Free on iPhone, in beta."}
        </p>
        {!android && (
          <a
            href={TESTFLIGHT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex min-h-12 items-center justify-center rounded-full bg-ink px-5 text-base font-extrabold text-on-ink transition-transform duration-150 active:scale-[0.97]"
          >
            Join the beta on TestFlight
          </a>
        )}
      </div>
    </RoomCard>
  );
}

/** Instagram and TikTok, side by side. On a phone with the app installed, the links open it. */
function FollowUs() {
  return (
    <section className="flex w-full flex-col gap-3">
      <h2 className="text-center text-base font-extrabold text-ink-soft">Follow Yo! Mamma</h2>
      <div className="grid grid-cols-2 gap-3">
        <FollowButton href={INSTAGRAM_URL} label={`Follow ${INSTAGRAM_HANDLE} on Instagram`} handle={INSTAGRAM_HANDLE} icon={<InstagramGlyph />} />
        <FollowButton href={TIKTOK_URL} label={`Follow ${TIKTOK_HANDLE} on TikTok`} handle={TIKTOK_HANDLE} icon={<TikTokGlyph />} />
      </div>
    </section>
  );
}

function FollowButton({ href, label, handle, icon }: { href: string; label: string; handle: string; icon: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full px-3 text-sm font-extrabold text-ink ring-[1.5px] ring-inset ring-ink transition-transform duration-150 active:scale-[0.97]"
    >
      {icon}
      <span className="truncate">{handle}</span>
    </a>
  );
}

function InstagramGlyph() {
  return (
    <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="shrink-0">
      <rect x="3" y="3" width="18" height="18" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TikTokGlyph() {
  return (
    <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
      <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

function Gone({ title, body }: { title: string; body: string }) {
  return (
    <RoomCard className="mt-10 flex w-full max-w-md flex-col gap-2 p-6 text-center">
      <h2 className="text-2xl font-black">{title}</h2>
      <p className="font-semibold text-ink-soft">{body}</p>
    </RoomCard>
  );
}
