"use client";

// The shoot: a mirrored live camera framed like the strip's photo, the buddy posing in the same spot
// they'll have in the strip, a 3-2-1 countdown, a flash, and four shots.

import { useEffect, useRef, useState } from "react";
import { SHOTS, stickerPath, type Buddy } from "@/lib/crew";
import { captureFrame, openCamera, openDemoCamera, stopCamera } from "@/lib/camera";
import { beep, shutter, unlockAudio } from "@/lib/sound";
import { PHOTO_ASPECT, buddySide } from "@/lib/strip";
import { Icon, PillButton, SpeechBubble } from "./ui";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const CHEERS = ["Say cheese!", "Big smile!", "Strike a pose!", "Last one, go wild!"];

type Phase = "starting" | "ready" | "shooting" | "error";

export function ShootStage({
  buddy,
  demo,
  onDone,
  onBack,
}: {
  buddy: Buddy;
  demo: boolean;
  onDone: (shots: HTMLCanvasElement[]) => void;
  onBack: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const alive = useRef(true);
  const [useDemo, setUseDemo] = useState(demo);
  const [phase, setPhase] = useState<Phase>("starting");
  const [error, setError] = useState("");
  const [shot, setShot] = useState(0);
  const [count, setCount] = useState(0);
  const [flash, setFlash] = useState(0);
  const [thumbs, setThumbs] = useState<string[]>([]);

  useEffect(() => {
    alive.current = true;
    let stream: MediaStream | null = null;
    (async () => {
      try {
        stream = useDemo ? openDemoCamera() : await openCamera();
        if (!alive.current) return stopCamera(stream);
        const v = video.current!;
        v.srcObject = stream;
        await v.play().catch(() => {});
        setPhase("ready");
      } catch (e) {
        setError(e instanceof Error && e.name === "NotAllowedError"
          ? "The camera is blocked. Allow camera access for this site in the browser settings."
          : e instanceof Error ? e.message : "The camera didn't start.");
        setPhase("error");
      }
    })();
    return () => {
      alive.current = false;
      stopCamera(stream);
    };
  }, [useDemo]);

  async function run() {
    unlockAudio();
    setPhase("shooting");
    const shots: HTMLCanvasElement[] = [];
    for (let i = 0; i < SHOTS.length; i++) {
      setShot(i);
      for (let n = 3; n >= 1; n--) {
        if (!alive.current) return;
        setCount(n);
        beep(n === 1);
        await sleep(1000);
      }
      setCount(0);
      shutter();
      setFlash((f) => f + 1);
      const frame = captureFrame(video.current!);
      shots.push(frame);
      setThumbs((t) => [...t, frame.toDataURL("image/jpeg", 0.6)]);
      await sleep(1100);
    }
    if (alive.current) onDone(shots);
  }

  const side = buddySide(shot);
  const pose = SHOTS[shot];

  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-5 px-page py-6 lg:flex-row lg:items-center lg:gap-8">
      <div className="flex w-full flex-col items-center gap-4" style={{ maxWidth: `calc(72dvh * ${PHOTO_ASPECT})` }}>
        <div
          className="relative w-full overflow-hidden rounded-stage border-[10px] border-surface bg-ink-fixed shadow-card ring-1 ring-card-border"
          style={{ aspectRatio: PHOTO_ASPECT }}
        >
          <video ref={video} muted playsInline autoPlay className="absolute inset-0 size-full -scale-x-100 object-cover" />

          {phase !== "error" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`sticker-${shot}`}
              src={stickerPath(buddy.id, pose.pose, pose.expression)}
              alt=""
              draggable={false}
              className="pointer-events-none absolute bottom-0 h-[78%] w-auto animate-pop drop-shadow-[0_4px_10px_rgb(0_0_0/0.25)]"
              style={side === "right" ? { right: "-0.8%" } : { left: "-0.8%" }}
            />
          )}

          {phase === "shooting" && count > 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                key={`${shot}-${count}`}
                className="flex size-40 animate-pop items-center justify-center rounded-full bg-white/85 text-8xl font-black text-ink-fixed shadow-lift"
              >
                {count}
              </span>
            </div>
          )}

          {phase === "shooting" && count === 3 && (
            <div className={`absolute top-5 ${side === "right" ? "right-[20%]" : "left-[20%]"}`}>
              <SpeechBubble tail={side === "right" ? "right" : "left"} className="animate-pop whitespace-nowrap text-2xl font-black">
                {CHEERS[shot]}
              </SpeechBubble>
            </div>
          )}

          {flash > 0 && <div key={`flash-${flash}`} className="pointer-events-none absolute inset-0 animate-flash bg-white" />}

          {phase === "starting" && (
            <p className="absolute inset-0 flex items-center justify-center text-xl font-bold text-white">Starting the camera…</p>
          )}
          {phase === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center text-white">
              <p className="max-w-md text-xl font-bold">{error}</p>
              <PillButton kind="light" size="regular" onClick={() => { setPhase("starting"); setUseDemo(true); }}>
                Use the demo camera
              </PillButton>
            </div>
          )}
        </div>

        <div className="flex w-full items-center gap-3">
          <PillButton kind="outlined" size="large" className="w-36 shrink-0" onClick={onBack} disabled={phase === "shooting"}>
            <Icon name="chevron-left" /> Back
          </PillButton>
          {phase === "shooting" ? (
            <p className="flex-1 text-center text-2xl font-black" aria-live="polite">
              Photo {shot + 1} of {SHOTS.length}
            </p>
          ) : (
            <PillButton size="huge" className="flex-1" onClick={run} disabled={phase !== "ready"}>
              <Icon name="camera" size={30} /> Start · 4 photos
            </PillButton>
          )}
        </div>
      </div>

      {/* The strip filling up */}
      <ol className="flex gap-3 lg:flex-col" aria-label="Photos taken">
        {SHOTS.map((_, i) => (
          <li
            key={i}
            className={`aspect-[3/2] w-24 overflow-hidden rounded-md border-2 bg-surface lg:w-40 ${
              phase === "shooting" && i === shot && !thumbs[i] ? "border-ember" : "border-card-border"
            }`}
          >
            {thumbs[i] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbs[i]} alt={`Photo ${i + 1}`} className="size-full animate-pop object-cover" />
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
