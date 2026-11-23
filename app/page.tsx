import Link from "next/link";
import { Logo } from "@/components/ui";
import { CREW, IDLE, stickerPath } from "@/lib/crew";

// The attract screen: the whole page is one big "start" button.
export default function Attract() {
  return (
    <main data-theme="dark" className="kiosk page-bg flex min-h-dvh flex-1 flex-col">
      <Link
        href="/booth"
        className="flex flex-1 flex-col items-center justify-center gap-8 px-page py-10 text-center focus-visible:outline-none"
      >
        <Logo size={150} className="animate-float drop-shadow-[0_5px_8px_rgb(0_0_0/0.15)]" />
        <div className="flex flex-col gap-3">
          <p className="text-lg font-extrabold uppercase tracking-[0.2em] text-ink-soft">Photo booth</p>
          <h1 className="text-5xl font-black tracking-tight text-ink sm:text-7xl">Snap with your study buddy!</h1>
        </div>

        <div className="flex items-end justify-center -space-x-6 sm:-space-x-4" aria-hidden>
          {CREW.map((b, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={b.id}
              src={stickerPath(b.id, IDLE.pose, IDLE.expression)}
              alt=""
              draggable={false}
              className="h-40 w-auto sm:h-56"
              style={{ transform: `translateY(${i % 2 ? 0 : 8}px)` }}
            />
          ))}
        </div>

        <span className="inline-flex min-h-20 items-center justify-center rounded-full bg-ink px-12 text-2xl font-extrabold text-on-ink shadow-lift">
          Tap to start
        </span>
        <p className="text-base font-semibold text-ink-soft">4 photos · a strip to keep · scan to download</p>
      </Link>
    </main>
  );
}
