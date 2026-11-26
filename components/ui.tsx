// The app's shared pieces (YoMomma/YoMamma/Design/Theme.swift and Cards.swift) for the web.

import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type PillKind = "filled" | "onRoom" | "destructive" | "outlined" | "light" | "outlinedLight";

const pillKinds: Record<PillKind, string> = {
  filled: "bg-ink text-on-ink",
  onRoom: "bg-ink-fixed text-white",
  destructive: "bg-ember text-white",
  outlined: "bg-surface/30 text-ink ring-[1.5px] ring-inset ring-ink",
  light: "bg-white text-ink-fixed",
  outlinedLight: "bg-white/8 text-white ring-[1.5px] ring-inset ring-white",
};

/** PillButtonStyle: a full capsule, 56 tall, bold label; shrinks a touch while pressed and dims when disabled. */
export function PillButton({
  kind = "filled",
  size = "large",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { kind?: PillKind; size?: "regular" | "large" | "huge" }) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full px-6 font-extrabold leading-tight text-center",
        "transition-[transform,opacity] duration-150 ease-out active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100",
        "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sky",
        size === "regular" && "min-h-[52px] text-base",
        size === "large" && "min-h-14 text-lg",
        size === "huge" && "min-h-20 px-10 text-2xl",
        pillKinds[kind],
        className,
      )}
    >
      {children}
    </button>
  );
}

/** RoundButtonStyle: an icon in a circle with a soft lift shadow; filled teal or frosted white. */
export function RoundButton({
  filled = true,
  diameter = 56,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { filled?: boolean; diameter?: number }) {
  return (
    <button
      type="button"
      {...props}
      style={{ width: diameter, height: diameter, ...props.style }}
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-full shadow-lift transition-transform duration-150 active:scale-[0.94]",
        "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sky disabled:opacity-40",
        filled ? "bg-ink text-on-ink" : "bg-surface/85 text-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** RoomCard: a white card with 22pt corners and a hairline border. */
export function RoomCard({ className, children, style }: { className?: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={style} className={cx("rounded-card border border-card-border bg-surface p-4", className)}>
      {children}
    </div>
  );
}

/** The buddy's speech bubble: white, ink outline, a point at the bottom. */
export function SpeechBubble({
  children,
  tail = "left",
  className,
}: {
  children: ReactNode;
  tail?: "left" | "right" | "center" | "none";
  className?: string;
}) {
  const tailPos = tail === "left" ? "left-8" : tail === "right" ? "right-8" : "left-1/2 -translate-x-1/2";
  return (
    <div className={cx("relative rounded-[20px] border-2 border-ink-fixed bg-white px-5 py-3 text-ink-fixed shadow-soft", className)}>
      {children}
      {tail !== "none" && (
        <svg aria-hidden className={cx("absolute -bottom-[11px] h-3 w-5", tailPos)} viewBox="0 0 20 12">
          <path d="M0 0 L10 11 L20 0" fill="#fff" stroke="var(--ink-fixed)" strokeWidth="2" strokeLinejoin="round" />
          <rect x="1" y="-2" width="18" height="3" fill="#fff" />
        </svg>
      )}
    </div>
  );
}

/** The app icon, with iOS-style rounded corners. */
export function Logo({ size = 96, className }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/app-icon.png"
      alt="Yo! Mamma"
      width={size}
      height={size}
      className={cx("rounded-[22%] shadow-soft", className)}
      draggable={false}
    />
  );
}

/** Simple stroked icons (SF Symbols aren't available on the web). */
export function Icon({ name, size = 24 }: { name: "chevron-left" | "chevron-right" | "camera" | "retake" | "check" | "download" | "share" | "home"; size?: number }) {
  const paths: Record<typeof name, ReactNode> = {
    "chevron-left": <path d="M15 5l-7 7 7 7" />,
    "chevron-right": <path d="M9 5l7 7-7 7" />,
    camera: (
      <>
        <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
        <circle cx="12" cy="13" r="3.5" />
      </>
    ),
    retake: (
      <>
        <path d="M4 12a8 8 0 1 0 2.4-5.7" />
        <path d="M4 4v4h4" />
      </>
    ),
    check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
    download: (
      <>
        <path d="M12 4v11" />
        <path d="M7 10.5l5 5 5-5" />
        <path d="M5 20h14" />
      </>
    ),
    share: (
      <>
        <path d="M12 15V4" />
        <path d="M8 8l4-4 4 4" />
        <path d="M6 11v9h12v-9" />
      </>
    ),
    home: <path d="M4 11l8-7 8 7v9h-5v-6h-6v6H4z" />,
  };
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}
