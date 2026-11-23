"use client";

// A row of the app's shop rooms to put behind the strip. Scrolls sideways; the chosen room has a ring.

import { useEffect, useRef } from "react";
import { ROOMS, roomPath, type RoomId } from "@/lib/rooms";

export function RoomPicker({ value, onChange, disabled }: { value: RoomId; onChange: (id: RoomId) => void; disabled?: boolean }) {
  const chosen = useRef<HTMLButtonElement>(null);

  // Start with the chosen room in view (it may be a random one far down the row).
  useEffect(() => {
    chosen.current?.scrollIntoView({ block: "nearest", inline: "center" });
    // Only on mount: after that the visitor is the one scrolling.
  }, []);

  return (
    <div
      role="group"
      aria-label="Background"
      className="-mx-2 flex snap-x snap-mandatory gap-3 overflow-x-auto px-2 pt-1 pb-2 [scrollbar-width:none] [touch-action:pan-x]"
    >
      {ROOMS.map((room) => {
        const selected = room.id === value;
        return (
          <button
            key={room.id}
            ref={selected ? chosen : undefined}
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onChange(room.id)}
            className="flex w-[76px] shrink-0 snap-start flex-col items-center gap-1.5 transition-transform duration-150 active:scale-95"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={roomPath(room.id)}
              alt=""
              className={
                "h-[100px] w-[76px] rounded-md object-cover shadow-soft " +
                (selected ? "ring-[3px] ring-ink ring-offset-2 ring-offset-page" : "ring-1 ring-card-border")
              }
            />
            <span className={"text-center text-xs leading-tight font-extrabold " + (selected ? "text-ink" : "text-ink-soft")}>
              {room.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
