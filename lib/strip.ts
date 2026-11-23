// Lays out the 4-shot strip on a canvas, in the app's dark appearance: the dark green page with its glow,
// dark RoomCards with a hairline border, the buddy posing in each shot, and the "Yo!" footer.

import { SHOTS, stickerPath, type Buddy } from "./crew";

export const STRIP = { width: 900, height: 2700 } as const;

const C = {
  page: "#0F1F1D",
  glow: "#1E3B31",
  surface: "#172A27",
  border: "#34463F",
  ink: "#E6F2E0",
  inkSoft: "rgba(230, 242, 224, 0.7)",
  ember: "#F0714F",
};

// Layout, in strip pixels (about 2.25 px per point of the app's design).
const MARGIN = 50;
const TOP = 56;
const GAP = 36;
const CARD_W = STRIP.width - MARGIN * 2;
const CARD_H = 533;
const CARD_RADIUS = 44; // Radius.card × 2
const INSET = 16;
const PHOTO_RADIUS = CARD_RADIUS - INSET;
const FOOTER_TOP = TOP + 4 * CARD_H + 3 * GAP;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Couldn't load ${src}`));
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Draws `src` to fill the box, cropping the overflow from the middle (CSS object-fit: cover). */
function drawCover(ctx: CanvasRenderingContext2D, src: CanvasImageSource & { width: number; height: number }, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / src.width, h / src.height);
  const sw = w / scale, sh = h / scale;
  ctx.drawImage(src, (src.width - sw) / 2, (src.height - sh) / 2, sw, sh, x, y, w, h);
}

/** The font family next/font gave Nunito (it renames families), for canvas text. */
export function roundedFont(): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--font-nunito").trim();
  return v || "system-ui, sans-serif";
}

export interface StripInput {
  shots: HTMLCanvasElement[];
  buddy: Buddy;
  date?: Date;
  /** The line under the date. */
  event?: string;
}

/** The photo slot's box for shot `i`, so the live preview can match the crop. */
export const PHOTO_ASPECT = (CARD_W - INSET * 2) / (CARD_H - INSET * 2);

/** Which side of the photo the buddy stands on in shot `i`. */
export const buddySide = (i: number): "left" | "right" => (i % 2 === 0 ? "right" : "left");

export async function composeStrip({ shots, buddy, date = new Date(), event = "Apple Developer Academy" }: StripInput): Promise<HTMLCanvasElement> {
  const font = roundedFont();
  await Promise.all([
    document.fonts.load(`900 80px ${font}`),
    document.fonts.load(`800 32px ${font}`),
  ]).catch(() => {});
  const [logo, ...stickers] = await Promise.all([
    loadImage("/logo.svg"),
    ...SHOTS.map((s) => loadImage(stickerPath(buddy.id, s.pose, s.expression))),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = STRIP.width;
  canvas.height = STRIP.height;
  const ctx = canvas.getContext("2d")!;

  // PageBackground: page colour, glow from the top.
  ctx.fillStyle = C.page;
  ctx.fillRect(0, 0, STRIP.width, STRIP.height);
  const glow = ctx.createLinearGradient(0, 0, 0, STRIP.height * 0.45);
  glow.addColorStop(0, C.glow);
  glow.addColorStop(1, "rgba(30, 59, 49, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, STRIP.width, STRIP.height);

  shots.slice(0, 4).forEach((shot, i) => {
    const x = MARGIN, y = TOP + i * (CARD_H + GAP);

    // RoomCard with the card shadow.
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.15)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = C.surface;
    roundRect(ctx, x, y, CARD_W, CARD_H, CARD_RADIUS);
    ctx.fill();
    ctx.restore();
    ctx.lineWidth = 2;
    ctx.strokeStyle = C.border;
    roundRect(ctx, x + 1, y + 1, CARD_W - 2, CARD_H - 2, CARD_RADIUS - 1);
    ctx.stroke();

    // The photo, and the buddy standing in it (cut off by the bottom edge, as on the app's cards).
    const px = x + INSET, py = y + INSET, pw = CARD_W - INSET * 2, ph = CARD_H - INSET * 2;
    ctx.save();
    roundRect(ctx, px, py, pw, ph, PHOTO_RADIUS);
    ctx.clip();
    drawCover(ctx, shot, px, py, pw, ph);
    const sticker = stickers[i];
    const sh = ph * 0.78, sw = (sh * 240) / 320;
    const sx = buddySide(i) === "right" ? px + pw - sw + 6 : px - 6;
    ctx.shadowColor = "rgba(0, 0, 0, 0.18)";
    ctx.shadowBlur = 14;
    ctx.drawImage(sticker, sx, py + ph - sh, sw, sh);
    ctx.restore();
  });

  // Footer: the logo, the wordmark, who you posed with, the date and the event.
  const logoSize = 190;
  const fy = FOOTER_TOP + (STRIP.height - FOOTER_TOP - logoSize) / 2 - 6;
  ctx.drawImage(logo, MARGIN - 18, fy, logoSize, logoSize);
  const tx = MARGIN + logoSize - 4;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = C.ink;
  ctx.font = `900 92px ${font}`;
  ctx.fillText("YO! MAMMA", tx, fy + 96, STRIP.width - tx - MARGIN);
  ctx.font = `800 36px ${font}`;
  ctx.fillText(`with ${buddy.name}, ${buddy.role.replace(/^The /, "the ")}`, tx + 2, fy + 146, STRIP.width - tx - MARGIN);
  ctx.fillStyle = C.inkSoft;
  ctx.font = `700 28px ${font}`;
  const day = date.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
  ctx.fillText(`${event} · ${day}`, tx + 2, fy + 188, STRIP.width - tx - MARGIN);

  return canvas;
}

export function toJpeg(canvas: HTMLCanvasElement, quality = 0.86): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't make the picture"))), "image/jpeg", quality),
  );
}
