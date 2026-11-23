"use client";

// Save on a phone: the share sheet with the picture attached (iOS and Android offer "Save image"),
// falling back to a plain download. The file is fetched ahead of time because iOS only opens the
// share sheet straight from a tap.

import { useEffect, useState } from "react";
import { Icon } from "./ui";

export function SaveButtons({ src, downloadHref, fileName }: { src: string; downloadHref: string; fileName: string }) {
  const [file, setFile] = useState<File | null>(null);

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
    };
  }, [src, fileName]);

  const button = "inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full px-6 text-lg font-extrabold transition-transform duration-150 active:scale-[0.97]";

  return (
    <div className="flex w-full flex-col gap-3">
      {file && (
        <button
          type="button"
          className={`${button} bg-ink text-on-ink`}
          onClick={() => navigator.share({ files: [file], title: "My Yo! Mamma photo strip" }).catch(() => {})}
        >
          <Icon name="share" /> Save or share
        </button>
      )}
      <a href={downloadHref} download={fileName} className={`${button} ${file ? "text-ink ring-[1.5px] ring-inset ring-ink" : "bg-ink text-on-ink"}`}>
        <Icon name="download" /> Download
      </a>
    </div>
  );
}
