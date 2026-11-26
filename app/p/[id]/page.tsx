import { Suspense } from "react";
import type { Metadata } from "next";
import { Logo, RoomCard } from "@/components/ui";
import { SaveButtons } from "@/components/SaveButtons";
import { expiresOn, stripPath, stripUrl } from "@/lib/strip-id";
import { TESTFLIGHT_URL } from "@/lib/app-links";

export const metadata: Metadata = {
  title: "Your Yo! Mamma photo strip",
  description: "Save your photo strip from the Yo! Mamma photo booth.",
  robots: { index: false, follow: false },
};

// The page a visitor's phone opens from the kiosk's QR code. Dark, like the kiosk.
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
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6">
      {/* The strip on a lighter panel, as on the kiosk. */}
      <div className="rounded-stage bg-mint p-4 shadow-card ring-1 ring-card-border sm:p-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="Your photos from the booth" className="h-auto w-[min(100%,320px)] rounded-md shadow-card" />
      </div>
      <SaveButtons src={src} downloadHref={stripUrl(base, path, `yomamma-${id}.jpg`)} fileName={`yomamma-${id}.jpg`} />
      <p className="text-center text-sm font-semibold text-ink-soft">
        On iPhone you can also press and hold the picture, then choose Save to Photos. It stays online until {until}.
      </p>
      <GetTheApp />
    </div>
  );
}

/** The way to the app from the visitor's own phone: a link, since they can't scan a code on the same screen. */
function GetTheApp() {
  return (
    <RoomCard className="flex w-full items-center gap-4 p-5">
      <Logo size={64} className="shrink-0" />
      <div className="flex flex-1 flex-col gap-2">
        <h2 className="text-lg font-black leading-tight">Get the Yo! Mamma app</h2>
        <p className="text-sm font-semibold text-ink-soft">Study with your buddy on iPhone. Join the beta on TestFlight.</p>
        <a
          href={TESTFLIGHT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-5 text-base font-extrabold text-on-ink active:scale-[0.97]"
        >
          Join on TestFlight
        </a>
      </div>
    </RoomCard>
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
