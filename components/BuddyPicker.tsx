"use client";

// "Find your study buddy!": the app's onboarding picker, for the booth. Swipe or tap the arrows
// (it loops), or tap a face; each buddy introduces themselves out loud.

import { useEffect, useRef, useState } from "react";
import { CREW, IDLE, facePath, stickerPath, type CrewId } from "@/lib/crew";
import { pickLine, speak, unlockAudio, type VoiceLine } from "@/lib/sound";
import { Icon, PillButton, RoundButton, SpeechBubble } from "./ui";

export function BuddyPicker({ initial, onPick }: { initial: CrewId; onPick: (id: CrewId) => void }) {
  const [index, setIndex] = useState(() => Math.max(0, CREW.findIndex((b) => b.id === initial)));
  const [line, setLine] = useState<VoiceLine | null>(null);
  const touchX = useRef<number | null>(null);
  const b = CREW[index];

  const show = (i: number) => {
    const next = (i + CREW.length) % CREW.length;
    unlockAudio();
    const l = pickLine(CREW[next].id, "intro");
    setIndex(next);
    setLine(l);
    speak(l);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") show(index - 1);
      if (e.key === "ArrowRight") show(index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <section className="flex flex-1 flex-col items-center gap-5 px-page py-6" aria-label="Pick your study buddy">
      <h1 className="text-center text-4xl font-black tracking-tight sm:text-5xl">Find your study buddy!</h1>

      <div className="flex w-full max-w-4xl flex-1 items-center gap-3 sm:gap-6">
        <RoundButton filled={false} diameter={64} onClick={() => show(index - 1)} aria-label="Previous buddy" className="max-sm:hidden">
          <Icon name="chevron-left" size={30} />
        </RoundButton>

        <div
          className="relative flex min-h-[340px] flex-1 flex-col self-stretch overflow-hidden rounded-stage border border-card-border shadow-card sm:flex-row"
          style={{ background: b.background }}
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX.current == null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
            touchX.current = null;
          }}
        >
          <div className="z-10 flex flex-col justify-center gap-2 p-6 sm:flex-1 sm:p-10">
            <p className="text-sm font-extrabold uppercase tracking-[0.18em]" style={{ color: b.accent }}>
              {b.role}
            </p>
            <h2 className="text-5xl font-black text-ink-fixed sm:text-6xl">{b.name}</h2>
            <p className="text-xl font-bold text-ink-fixed/70">{b.tagline}</p>
            {line && (
              <SpeechBubble key={line.id} tail="right" className="mt-4 max-w-sm animate-pop text-lg font-bold leading-snug">
                “{line.text}”
              </SpeechBubble>
            )}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={b.id}
            src={stickerPath(b.id, IDLE.pose, IDLE.expression)}
            alt={`${b.name}, ${b.role}`}
            draggable={false}
            className="pointer-events-none mx-auto mt-auto h-64 w-auto animate-pop object-contain object-bottom sm:absolute sm:right-0 sm:bottom-0 sm:h-[92%] sm:max-w-[55%]"
          />
        </div>

        <RoundButton filled={false} diameter={64} onClick={() => show(index + 1)} aria-label="Next buddy" className="max-sm:hidden">
          <Icon name="chevron-right" size={30} />
        </RoundButton>
      </div>

      <div className="flex gap-3" role="radiogroup" aria-label="Buddies">
        {CREW.map((c, i) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={i === index}
            aria-label={c.name}
            onClick={() => show(i)}
            className={`size-13 overflow-hidden sm:size-16 rounded-full border-[3px] transition-transform duration-200 active:scale-95 ${
              i === index ? "scale-110 border-ink" : "border-transparent opacity-70"
            }`}
            style={{ background: c.background }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={facePath(c.id)} alt="" draggable={false} className="size-full object-cover" />
          </button>
        ))}
      </div>

      <PillButton size="huge" className="w-full max-w-md" onClick={() => onPick(b.id)}>
        <Icon name="camera" size={30} /> Shoot with {b.name}
      </PillButton>
    </section>
  );
}
