"use client";

// Save and share on a phone. "Share to your story" opens the share sheet with the picture attached
// (Instagram is in it, and iOS and Android also offer "Save image") and copies the handle to tag in the
// same tap, since a web page can't add the mention itself. The file is fetched ahead of time because iOS
// only opens the share sheet straight from a tap. Phones that can't share files get Download only, and
// the tag line keeps its own Copy button so tagging works everywhere.

import { useEffect, useRef, useState } from "react";
import { INSTAGRAM_HANDLE } from "@/lib/app-links";
import { Icon } from "./ui";

type Copied = "idle" | "copied" | "failed";

export function SaveButtons({ src, downloadHref, fileName }: { src: string; downloadHref: string; fileName: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [copied, setCopied] = useState<Copied>("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetch(src)
      .then((r) => (r.ok ? r.blob() : Promise.reject()))
      .then((b) => {
        const f = new File([b], fileName, { type: "image/jpeg" });
        if (!cancelled && navigator.canShare?.({ files: [f] })) setFile(f);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      clearTimeout(timer.current);
    };
  }, [src, fileName]);

  function copyHandle() {
    clearTimeout(timer.current);
    (navigator.clipboard?.writeText(INSTAGRAM_HANDLE) ?? Promise.reject())
      .then(() => setCopied("copied"), () => setCopied("failed"))
      .finally(() => {
        timer.current = setTimeout(() => setCopied("idle"), 4000);
      });
  }

  function share() {
    if (!file) return;
    // Copy first without waiting, so the share sheet still opens inside the tap.
    copyHandle();
    navigator.share({ files: [file], title: "My Yo! Mamma photos" }).catch(() => {});
  }

  const button = "inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full px-6 text-lg font-extrabold transition-transform duration-150 active:scale-[0.97]";

  return (
    <div className="flex w-full flex-col gap-3">
      {file && (
        <button type="button" className={`${button} bg-ink text-on-ink`} onClick={share}>
          <Icon name="share" /> Share to your story
        </button>
      )}
      <a href={downloadHref} download={fileName} className={`${button} ${file ? "text-ink ring-[1.5px] ring-inset ring-ink" : "bg-ink text-on-ink"}`}>
        <Icon name="download" /> Download
      </a>
      <div className="flex min-h-12 items-center justify-between gap-3 rounded-full bg-surface py-1.5 pr-1.5 pl-5 ring-1 ring-card-border">
        <p className="text-sm font-bold leading-snug" aria-live="polite">
          {copied === "copied" ? (
            <>Copied! Paste it as a mention in your story</>
          ) : copied === "failed" ? (
            <>Type <span className="text-ember">{INSTAGRAM_HANDLE}</span> as a mention in your story</>
          ) : (
            <>Tag <span className="text-ember">{INSTAGRAM_HANDLE}</span> in your story</>
          )}
        </p>
        <button
          type="button"
          onClick={copyHandle}
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full bg-ink px-4 text-sm font-extrabold text-on-ink transition-transform duration-150 active:scale-[0.97]"
        >
          {copied === "copied" ? <Icon name="check" size={18} /> : "Copy"}
        </button>
      </div>
    </div>
  );
}
