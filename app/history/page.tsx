import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Logo } from "@/components/ui";
import { secretMatches, supabaseAdmin, supabaseConfigured } from "@/lib/supabase-server";
import { BUCKET, expiresOn, stripUrl } from "@/lib/strip-id";

export const metadata: Metadata = {
  title: "Photo history · Yo! Mamma Photo Booth",
  robots: { index: false, follow: false },
};

// Every strip still in storage, newest day first. For the team only: nothing links here, and it needs the
// kiosk key in the URL (/history?key=$KIOSK_SECRET). Without the right key it answers like a missing page.
export default function HistoryPage(props: PageProps<"/history">) {
  return (
    <main className="page-bg flex min-h-dvh flex-1 flex-col items-center gap-6 px-4 py-8 sm:px-page">
      <Suspense fallback={<p className="py-20 text-lg font-bold text-ink-soft">Loading the strips…</p>}>
        <History searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}

const DAY_FOLDER = /^\d{4}-\d{2}-\d{2}$/;

async function History({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { key } = await searchParams;
  if (!secretMatches(typeof key === "string" ? key : null, process.env.KIOSK_SECRET)) notFound();

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseConfigured() || !base) return <Note text="Supabase isn't configured, so there are no uploaded strips." />;

  const storage = supabaseAdmin().storage.from(BUCKET);
  const { data: folders, error } = await storage.list("", { limit: 1000, sortBy: { column: "name", order: "desc" } });
  if (error) return <Note text={`Couldn't read the bucket: ${error.message}`} />;

  const days = await Promise.all(
    (folders ?? [])
      .map((f) => f.name)
      .filter((name) => DAY_FOLDER.test(name))
      .map(async (day) => {
        const { data } = await storage.list(day, { limit: 1000, sortBy: { column: "created_at", order: "desc" } });
        const strips = (data ?? [])
          .filter((f) => f.name.endsWith(".jpg"))
          .map((f) => ({ id: f.name.replace(/\.jpg$/, ""), path: `${day}/${f.name}`, at: f.created_at }));
        return { day, strips };
      }),
  );
  const total = days.reduce((n, d) => n + d.strips.length, 0);

  return (
    <div className="flex w-full max-w-6xl flex-col gap-8">
      <header className="flex items-center gap-3">
        <Logo size={48} />
        <div>
          <h1 className="text-2xl font-black tracking-tight">Photo history</h1>
          <p className="text-sm font-semibold text-ink-soft">
            {total} {total === 1 ? "strip" : "strips"} · each is deleted 30 days after its day
          </p>
        </div>
      </header>

      {total === 0 && <Note text="No strips yet." />}

      {days
        .filter((d) => d.strips.length)
        .map(({ day, strips }) => (
          <section key={day} className="flex flex-col gap-3">
            <h2 className="text-lg font-extrabold">
              {new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}
              <span className="ml-2 text-sm font-bold text-ink-soft">
                {strips.length} · gone {expiresOn(strips[0].id)?.toLocaleDateString("en-US", { day: "numeric", month: "short", timeZone: "UTC" })}
              </span>
            </h2>
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-8">
              {strips.map((s) => (
                <li key={s.id} className="flex flex-col gap-1">
                  <a href={stripUrl(base, s.path)} target="_blank" rel="noopener" className="block overflow-hidden rounded-md bg-mint p-1.5 shadow-card ring-1 ring-card-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={stripUrl(base, s.path)} alt={`Strip ${s.id}`} loading="lazy" className="aspect-[1/3] w-full rounded-sm object-cover" />
                  </a>
                  <div className="flex items-center justify-between gap-1 text-xs font-bold text-ink-soft">
                    <span>{s.at ? new Date(s.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Makassar" }) : ""}</span>
                    <a href={`/p/${s.id}`} target="_blank" rel="noopener" className="underline">page</a>
                    <a href={stripUrl(base, s.path, `yomamma-${s.id}.jpg`)} className="underline">save</a>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}

function Note({ text }: { text: string }) {
  return <p className="py-10 text-center text-lg font-bold text-ink-soft">{text}</p>;
}
