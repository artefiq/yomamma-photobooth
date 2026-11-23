"use client";

// The kiosk: pick a buddy → shoot four photos → review the strip → upload → scan the QR code.
// Rendered on the client only (it reads the URL, the camera and localStorage).

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { buddy as findBuddy, type CrewId } from "@/lib/crew";
import { pickLine, speak, stopSpeaking, type VoiceLine } from "@/lib/sound";
import { composeStrip, toJpeg } from "@/lib/strip";
import { randomRoom, type RoomId } from "@/lib/rooms";
import { kioskKey, setKioskKey, uploadStrip, UploadError } from "@/lib/upload";
import { BuddyPicker } from "./BuddyPicker";
import { RoomPicker } from "./RoomPicker";
import { ShootStage } from "./ShootStage";
import { Icon, Logo, PillButton, RoomCard, SpeechBubble } from "./ui";

type Step =
  | { name: "pick" }
  | { name: "shoot" }
  | { name: "making" }
  | { name: "review"; jpeg: Blob; url: string; line: VoiceLine | null; shots: HTMLCanvasElement[]; redrawing?: boolean }
  | { name: "uploading"; jpeg: Blob; url: string }
  | { name: "done"; jpeg: Blob; url: string; link: string; qr: string }
  | { name: "failed"; jpeg: Blob; url: string; error: UploadError };

const IDLE_MS = 90_000;
const DONE_SECONDS = 60;

/** Calls `onIdle` after `ms` with no taps or keys, while `active`. */
function useIdle(active: boolean, ms: number, onIdle: () => void) {
  useEffect(() => {
    if (!active) return;
    let timer = setTimeout(onIdle, ms);
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(onIdle, ms);
    };
    const events = ["pointerdown", "keydown", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [active, ms, onIdle]);
}

export default function Booth() {
  const router = useRouter();
  const [params] = useState(() => new URLSearchParams(window.location.search));
  const demo = params.has("demo");  const [setup, setSetup] = useState(() => params.has("setup"));
  const [buddyId, setBuddyId] = useState<CrewId>("sunny");
  const [step, setStep] = useState<Step>({ name: "pick" });
  // The shop room behind the strip: random to start, then whatever the visitor last picked.
  const [room, setRoom] = useState<RoomId>(randomRoom);
  const redraws = useRef(0);
  const urls = useRef<string[]>([]);
  const b = findBuddy(buddyId);

  const goHome = useCallback(() => {
    stopSpeaking();
    router.push("/");
  }, [router]);

  useIdle(step.name !== "shoot" && step.name !== "making" && step.name !== "uploading" && !setup, IDLE_MS, goHome);
  useEffect(() => () => urls.current.forEach(URL.revokeObjectURL), []);

  async function make(shots: HTMLCanvasElement[]) {
    setStep({ name: "making" });
    const { jpeg, url } = await render(shots, room);
    const line = pickLine(b.id, "done");
    speak(line);
    setStep({ name: "review", jpeg, url, line, shots });
  }

  async function render(shots: HTMLCanvasElement[], r: RoomId) {
    const jpeg = await toJpeg(await composeStrip({ shots, buddy: b, room: r }));
    const url = URL.createObjectURL(jpeg);
    urls.current.push(url);
    return { jpeg, url };
  }

  /** Redraws the strip in the review step with another room behind it. */
  async function changeRoom(r: RoomId) {
    if (step.name !== "review" || r === room) return;
    setRoom(r);
    const n = ++redraws.current;
    setStep({ ...step, redrawing: true });
    const { jpeg, url } = await render(step.shots, r);
    if (n !== redraws.current) return; // the visitor picked again meanwhile
    setStep((s) => (s.name === "review" ? { ...s, jpeg, url, redrawing: false } : s));
  }

  async function upload(jpeg: Blob, url: string) {
    setStep({ name: "uploading", jpeg, url });
    try {
      const { id } = await uploadStrip(jpeg);
      const link = `${window.location.origin}/p/${id}`;
      const qr = await QRCode.toDataURL(link, { margin: 1, width: 560, errorCorrectionLevel: "M", color: { dark: "#013237", light: "#FFFFFF" } });
      setStep({ name: "done", jpeg, url, link, qr });
    } catch (e) {
      setStep({ name: "failed", jpeg, url, error: e instanceof UploadError ? e : new UploadError(String(e), "failed") });
    }
  }

  if (setup) return <Setup onClose={() => setSetup(false)} />;

  return (
    <main data-theme="dark" className="kiosk page-bg flex min-h-dvh flex-1 flex-col">
      <header className="flex items-center justify-between px-page pt-4">
        <button type="button" onClick={goHome} className="flex items-center gap-3 rounded-full pr-3 active:scale-95" aria-label="Back to start">
          <Logo size={52} />
          <span className="text-xl font-black tracking-tight">Yo! Mamma Photo Booth</span>
        </button>
      </header>

      {step.name === "pick" && (
        <BuddyPicker
          initial={buddyId}
          onPick={(id) => {
            stopSpeaking();
            setBuddyId(id);
            setStep({ name: "shoot" });
          }}
        />
      )}

      {step.name === "shoot" && <ShootStage buddy={b} demo={demo} onDone={make} onBack={() => setStep({ name: "pick" })} />}

      {step.name === "making" && (
        <div className="flex flex-1 items-center justify-center text-2xl font-black" aria-live="polite">
          Making your strip…
        </div>
      )}

      {(step.name === "review" || step.name === "uploading" || step.name === "done" || step.name === "failed") && (
        <section className="flex flex-1 flex-col items-center justify-center gap-6 px-page py-6 md:flex-row md:items-center md:gap-12">
          {/* The strip on a lighter panel, so its dark footer doesn't melt into the page. */}
          <div className="animate-pop rounded-stage bg-mint p-6 shadow-card ring-1 ring-card-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={step.url}
              alt={`Your photo strip with ${b.name}`}
              className={`h-[min(74dvh,860px)] w-auto rounded-md shadow-card transition-opacity duration-150 ${step.name === "review" && step.redrawing ? "opacity-60" : ""}`}
            />
          </div>

          <div className="flex w-full max-w-md flex-col gap-5">
            {step.name === "review" && (
              <>
                {step.line && (
                  <SpeechBubble tail="left" className="animate-pop text-xl font-bold leading-snug">
                    <span className="block text-sm font-extrabold uppercase tracking-widest" style={{ color: b.accent }}>
                      {b.name}
                    </span>
                    “{step.line.text}”
                  </SpeechBubble>
                )}
                <h2 className="mt-2 text-4xl font-black">Looking good!</h2>
                <div className="flex flex-col gap-3">
                  <p className="text-lg font-extrabold text-ink-soft">Pick a background</p>
                  <RoomPicker value={room} onChange={changeRoom} />
                </div>
                <PillButton size="huge" disabled={step.redrawing} onClick={() => upload(step.jpeg, step.url)}>
                  <Icon name="check" size={30} /> Keep it
                </PillButton>
                <PillButton kind="outlined" size="large" onClick={() => setStep({ name: "shoot" })}>
                  <Icon name="retake" /> Retake
                </PillButton>
              </>
            )}

            {step.name === "uploading" && (
              <p className="text-3xl font-black" aria-live="polite">
                Sending it to the cloud…
              </p>
            )}

            {step.name === "done" && <Done link={step.link} qr={step.qr} onFinish={goHome} />}

            {step.name === "failed" && (
              <RoomCard className="flex flex-col gap-4 p-6">
                <h2 className="text-2xl font-black">
                  {step.error.kind === "failed" ? "The upload didn't go through" : "Downloads aren't set up"}
                </h2>
                <p className="text-lg font-semibold text-ink-soft">{step.error.message}</p>
                {step.error.kind === "failed" && (
                  <PillButton onClick={() => upload(step.jpeg, step.url)}>
                    <Icon name="retake" /> Try again
                  </PillButton>
                )}
                <a
                  href={step.url}
                  download={`yomamma-strip-${step.url.slice(-8)}.jpg`}
                  className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full px-6 text-lg font-extrabold ring-[1.5px] ring-inset ring-ink"
                >
                  <Icon name="download" /> Save on this device
                </a>
                <PillButton kind="outlined" onClick={goHome}>
                  <Icon name="home" /> Start over
                </PillButton>
              </RoomCard>
            )}
          </div>
        </section>
      )}
    </main>
  );
}

function Done({ link, qr, onFinish }: { link: string; qr: string; onFinish: () => void }) {
  const [left, setLeft] = useState(DONE_SECONDS);
  useEffect(() => {
    const t = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (left <= 0) onFinish();
  }, [left, onFinish]);

  return (
    <RoomCard className="flex flex-col items-center gap-4 p-6 text-center shadow-card">
      <h2 className="text-3xl font-black">Scan to download</h2>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qr} alt={`QR code for ${link}`} className="size-64 rounded-md" />
      <p className="text-base font-semibold text-ink-soft">
        Open your phone&apos;s camera and point it at the code. Your strip stays online for 30 days.
      </p>
      <PillButton className="w-full" onClick={onFinish}>
        Done · {left}s
      </PillButton>
    </RoomCard>
  );
}

function Setup({ onClose }: { onClose: () => void }) {
  const [key, setKey] = useState(() => kioskKey() ?? "");
  return (
    <main data-theme="dark" className="page-bg flex min-h-dvh flex-1 items-center justify-center px-page">
      <RoomCard className="flex w-full max-w-md flex-col gap-4 p-6">
        <h1 className="text-2xl font-black">Kiosk setup</h1>
        <p className="font-semibold text-ink-soft">
          Paste the kiosk key (the <code>KIOSK_SECRET</code> set on the server). It stays in this browser only.
        </p>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="min-h-14 rounded-md border border-card-border bg-surface px-4 text-lg"
          placeholder="Kiosk key"
          autoComplete="off"
        />
        <PillButton
          onClick={() => {
            setKioskKey(key.trim());
            window.history.replaceState(null, "", "/booth");
            onClose();
          }}
        >
          Save
        </PillButton>
      </RoomCard>
    </main>
  );
}
