// Lays out the shots on a canvas, in the app's dark appearance: the visitor's chosen room from the app's
// shop, frosted-glass cards (the photo blurred into a glassy rim) with the buddy posing in each shot, the TestFlight QR code
// (to get the app), and a footer that tells strangers what the app is: the room down to a solid dark band at the bottom, with the code
// and the words on the band.
// Two formats from the same four shots: the tall photo strip itself, and a 9:16 Instagram story that
// shows that strip shrunk, tilted and taped onto the room (blurred and dimmed) with confetti and the buddy
// around it, all inside Instagram's safe area. The visitor switches between them on the review screen.

import { SHOTS, stickerPath, type Buddy } from "./crew";
import { roomPath, type RoomId } from "./rooms";
import { INSTAGRAM_HANDLE } from "./app-links";

export type Format = "strip" | "story";

const FORMATS = { strip: { width: 900, height: 2700 }, story: { width: 1080, height: 1920 } } as const;

const C = {
  page: "#0F1F1D",
  surface: "#172A27",
  ink: "#E6F2E0",
  inkSoft: "rgba(230, 242, 224, 0.7)",
  ember: "#F0714F",
};

// The strip's card, in strip pixels (about 2.25 px per point of the app's design). Other cards scale from it.
const BASE_CARD_W = 800;
const BASE_CARD_H = 533;
const BASE_INSET = 16;
const BASE_RADIUS = 44; // Radius.card × 2

/** The strip's photo shape (its cards' inner box). */
const PHOTO_ASPECT = (BASE_CARD_W - BASE_INSET * 2) / (BASE_CARD_H - BASE_INSET * 2);

/** How many shots the shoot takes, and the shape of each photo (the live preview frames the same shape). */
export const SHOOT = { shots: 4, aspect: PHOTO_ASPECT } as const;

type Box = { x: number; y: number; w: number; h: number };

interface Layout {
  width: number;
  height: number;
  cards: Box[];
  /** The solid band: the room stops at `top`, and the code and words are centred in it. */
  band: { top: number; qr: number };
}

function layout(): Layout {
  const { width, height } = FORMATS.strip;
  const margin = 50, top = 56, gap = 36;
  const cards = [0, 1, 2, 3].map((i) => ({ x: margin, y: top + i * (BASE_CARD_H + gap), w: BASE_CARD_W, h: BASE_CARD_H }));
  const bandTop = top + 4 * BASE_CARD_H + 3 * gap + top;
  return { width, height, cards, band: { top: bandTop, qr: 210 } };
}

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

/** `src` cover-fit to w×h and blurred, by drawing it tiny and scaling it back up in two steps
 *  (canvas `filter` isn't in every browser). `factor` is how many times smaller the tiny copy is. */
function blurred(src: CanvasImageSource & { width: number; height: number }, w: number, h: number, factor: number): HTMLCanvasElement {
  const tiny = document.createElement("canvas");
  tiny.width = Math.max(1, Math.round(w / factor));
  tiny.height = Math.max(1, Math.round(h / factor));
  drawCover(tiny.getContext("2d")!, src, 0, 0, tiny.width, tiny.height);
  const mid = document.createElement("canvas");
  mid.width = Math.max(1, Math.round(w / 4));
  mid.height = Math.max(1, Math.round(h / 4));
  const midCtx = mid.getContext("2d")!;
  midCtx.imageSmoothingQuality = "high";
  midCtx.drawImage(tiny, 0, 0, mid.width, mid.height);
  return mid;
}

/** The font family next/font gave Nunito (it renames families), for canvas text. */
function roundedFont(): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--font-nunito").trim();
  return v || "system-ui, sans-serif";
}

export interface StripInput {
  shots: HTMLCanvasElement[];
  buddy: Buddy;
  /** The shop room behind the cards. */
  room: RoomId;
}

/** Which side of the photo the buddy stands on in shot `i`. */
export const buddySide = (i: number): "left" | "right" => (i % 2 === 0 ? "right" : "left");

export async function composeStrip({
  shots,
  buddy,
  room,
}: StripInput): Promise<HTMLCanvasElement> {
  const font = roundedFont();
  await Promise.all([
    document.fonts.load(`900 80px ${font}`),
    document.fonts.load(`800 32px ${font}`),
  ]).catch(() => {});
  const [qr, roomArt, ...stickers] = await Promise.all([
    loadImage("/app-qr.png"),
    loadImage(roomPath(room)),
    ...SHOTS.map((s) => loadImage(stickerPath(buddy.id, s.pose, s.expression))),
  ]);

  const L = layout();
  const canvas = document.createElement("canvas");
  canvas.width = L.width;
  canvas.height = L.height;
  const ctx = canvas.getContext("2d")!;

  // The room down to the band, then the band.
  drawCover(ctx, roomArt, 0, 0, L.width, L.band.top);
  ctx.fillStyle = C.page;
  ctx.fillRect(0, L.band.top, L.width, L.height - L.band.top);

  shots.slice(0, L.cards.length).forEach((shot, i) => {
    const { x, y, w, h } = L.cards[i];
    const k = w / BASE_CARD_W;
    const inset = Math.round(BASE_INSET * k);
    const radius = Math.max(20, BASE_RADIUS * k);

    // The card as frosted glass: its shadow, then the photo itself blurred under a white tint with a
    // gloss from the top left, so the rim around the photo reads as glass over the picture.
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.22)";
    ctx.shadowBlur = 18 * Math.max(k, 0.6);
    ctx.shadowOffsetY = 10 * Math.max(k, 0.6);
    ctx.fillStyle = C.surface;
    roundRect(ctx, x, y, w, h, radius);
    ctx.fill();
    ctx.restore();
    ctx.save();
    roundRect(ctx, x, y, w, h, radius);
    ctx.clip();
    ctx.drawImage(blurred(shot, w, h, 40), x, y, w, h);
    ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
    ctx.fillRect(x, y, w, h);
    const gloss = ctx.createLinearGradient(x, y, x + w * 0.6, y + h);
    gloss.addColorStop(0, "rgba(255, 255, 255, 0.35)");
    gloss.addColorStop(0.45, "rgba(255, 255, 255, 0.04)");
    gloss.addColorStop(1, "rgba(255, 255, 255, 0.12)");
    ctx.fillStyle = gloss;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
    // The glass edge: a bright rim, strongest at the top where the light catches it.
    const rim = ctx.createLinearGradient(x, y, x, y + h);
    rim.addColorStop(0, "rgba(255, 255, 255, 0.75)");
    rim.addColorStop(0.5, "rgba(255, 255, 255, 0.25)");
    rim.addColorStop(1, "rgba(255, 255, 255, 0.45)");
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = rim;
    roundRect(ctx, x + 1.25, y + 1.25, w - 2.5, h - 2.5, radius - 1.25);
    ctx.stroke();

    // The photo, and the buddy standing in it (cut off by the bottom edge, as on the app's cards).
    const px = x + inset, py = y + inset, pw = w - inset * 2, ph = h - inset * 2;
    ctx.save();
    roundRect(ctx, px, py, pw, ph, radius - inset);
    ctx.clip();
    drawCover(ctx, shot, px, py, pw, ph);
    const sticker = stickers[i];
    const sh = ph * 0.78, sw = (sh * 240) / 320;
    const nudge = 6 * k;
    const sx = buddySide(i) === "right" ? px + pw - sw + nudge : px - nudge;
    ctx.shadowColor = "rgba(0, 0, 0, 0.18)";
    ctx.shadowBlur = 14 * k;
    ctx.drawImage(sticker, sx, py + ph - sh, sw, sh);
    ctx.restore();
    // Where the photo meets the glass: a soft inner shadow and a fine light line, like a pane's cut edge.
    ctx.save();
    roundRect(ctx, px, py, pw, ph, radius - inset);
    ctx.clip();
    ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
    ctx.shadowBlur = 10 * k;
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
    roundRect(ctx, px - 3, py - 3, pw + 6, ph + 6, radius - inset + 3);
    ctx.stroke();
    ctx.restore();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
    roundRect(ctx, px + 0.75, py + 0.75, pw - 1.5, ph - 1.5, radius - inset - 0.75);
    ctx.stroke();
  });

  // Written for people who've never heard of the app: what it is, the buddy's voice, and where to get it.
  const lines = [
    { text: "YO! MAMMA", weight: 900, size: 80, color: C.ink, y: 66 },
    { text: "A study buddy that stops your scrolling", weight: 800, size: 32, color: C.ink, y: 112 },
    { text: `“${buddy.catchphrase}” — ${buddy.name}`, weight: 700, size: 25, color: C.inkSoft, y: 150 },
    { text: `Scan for TestFlight · ${INSTAGRAM_HANDLE}`, weight: 800, size: 25, color: C.ember, y: 188 },
  ];
  const BLOCK_H = 196; // first line's cap height to the last line's descent, at strip size
  const widest = Math.max(...lines.map((l) => ((ctx.font = `${l.weight} ${l.size}px ${font}`), ctx.measureText(l.text).width)));
  const writeLines = (x: number, top: number, k: number) => {
    ctx.textBaseline = "alphabetic";
    for (const l of lines) {
      ctx.font = `${l.weight} ${Math.round(l.size * k)}px ${font}`;
      ctx.fillStyle = l.color;
      ctx.fillText(l.text, x, top + l.y * k);
    }
  };

  // The code on a plain white square and the words beside it, centred together on the band.
  const q = L.band.qr, gapQ = 36, margin = 50;
  const k = Math.min(1, (L.width - margin * 2 - q - gapQ) / widest);
  const groupW = q + gapQ + widest * k;
  const qx = Math.round((L.width - groupW) / 2);
  const qy = Math.round(L.band.top + (L.height - L.band.top - q) / 2);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(qx, qy, q, q);
  ctx.drawImage(qr, qx, qy, q, q);
  writeLines(qx + q + gapQ, qy + (q - BLOCK_H * k) / 2, k);

  return canvas;
}

// The story. Instagram covers about 250 px at the top (progress bar, profile) and 340 px at the bottom
// (reply bar), so the strip and the buddies stay between those lines; only background confetti goes past them.
const SAFE_TOP = 250;
const SAFE_BOTTOM = 340;
const STORY_STRIP_H = 1240;
const STORY_MAT = 12;
const STORY_TILT = (-3 * Math.PI) / 180;

/** A small seeded random generator, so the decor stays put when the picture is redrawn. */
function seeded(text: string): () => number {
  let a = 0;
  for (let i = 0; i < text.length; i++) a = (Math.imul(a, 31) + text.charCodeAt(i)) | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A four-pointed sparkle centred on (x, y). */
function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const w = r * 0.28;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + w, y - w, x + r, y);
  ctx.quadraticCurveTo(x + w, y + w, x, y + r);
  ctx.quadraticCurveTo(x - w, y + w, x - r, y);
  ctx.quadraticCurveTo(x - w, y - w, x, y - r);
  ctx.fill();
}

export interface StoryInput {
  /** The finished photo strip from composeStrip. */
  strip: HTMLCanvasElement;
  room: RoomId;
  buddy: Buddy;
}

/** The 9:16 story: the strip shrunk, tilted and taped onto the blurred room, with confetti and the buddy around it. */
export async function composeStory({ strip, room, buddy }: StoryInput): Promise<HTMLCanvasElement> {
  const { width: W, height: H } = FORMATS.story;
  const [roomArt, stickerA, stickerB] = await Promise.all([
    loadImage(roomPath(room)),
    loadImage(stickerPath(buddy.id, SHOTS[0].pose, SHOTS[0].expression)),
    loadImage(stickerPath(buddy.id, SHOTS[2].pose, SHOTS[2].expression)),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";

  // The room, blurred by drawing it tiny and scaling it back up (canvas filters aren't everywhere), then dimmed.
  ctx.drawImage(blurred(roomArt, W, H, 24), -30, -30, W + 60, H + 60);
  ctx.fillStyle = "rgba(15, 31, 29, 0.55)";
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, H * 0.45, 80, W / 2, H * 0.45, H * 0.7);
  glow.addColorStop(0, "rgba(230, 242, 224, 0.10)");
  glow.addColorStop(1, "rgba(15, 31, 29, 0.35)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Where the strip goes: centred in the safe area.
  const sw = (STORY_STRIP_H * strip.width) / strip.height;
  const mw = sw + STORY_MAT * 2, mh = STORY_STRIP_H + STORY_MAT * 2;
  const cx = W / 2, cy = SAFE_TOP + (H - SAFE_TOP - SAFE_BOTTOM) / 2;
  const half = (Math.abs(Math.cos(STORY_TILT)) * mw + Math.abs(Math.sin(STORY_TILT)) * mh) / 2;
  const gutter = { left: cx - half, right: cx + half }; // the strip's tilted outline, left and right

  // The buddies in the side gutters, tucked a little behind the strip.
  const buddies = [
    { img: stickerA, h: 400, x: gutter.right - 60, y: SAFE_TOP + 40, tilt: 7 },
    { img: stickerB, h: 430, x: gutter.left + 50, y: H - SAFE_BOTTOM - 430 - 10, tilt: -6, flip: true },
  ].map((s) => ({ ...s, w: (s.h * 240) / 320 }));
  const boxes = buddies.map((s) => (s.flip ? { x: s.x - s.w, y: s.y, w: s.w, h: s.h } : { x: s.x, y: s.y, w: s.w, h: s.h }));

  // Confetti, sparkles and dots in the gutters, kept off the buddies.
  const rand = seeded(`${buddy.id}:${room}`);
  const colors = [C.ember, C.ink, buddy.background, "#F6C453"];
  const hits = (x: number, y: number, pad: number) =>
    boxes.some((b) => x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad);
  let placed = 0;
  for (let tries = 0; placed < 34 && tries < 400; tries++) {
    const leftSide = rand() < 0.5;
    const x = leftSide ? 24 + rand() * (gutter.left - 60) : gutter.right + 36 + rand() * (W - gutter.right - 60);
    const y = 90 + rand() * (H - 180);
    if (hits(x, y, 30)) continue;
    placed++;
    const kind = rand();
    ctx.save();
    ctx.globalAlpha = 0.55 + rand() * 0.4;
    ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
    if (kind < 0.4) {
      sparkle(ctx, x, y, 14 + rand() * 22);
    } else if (kind < 0.7) {
      ctx.beginPath();
      ctx.arc(x, y, 5 + rand() * 7, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.translate(x, y);
      ctx.rotate(rand() * Math.PI);
      roundRect(ctx, -18, -6, 36, 12, 6);
      ctx.fill();
    }
    ctx.restore();
  }

  for (const s of buddies) {
    ctx.save();
    ctx.translate(s.x + (s.flip ? -s.w / 2 : s.w / 2), s.y + s.h / 2);
    ctx.rotate((s.tilt * Math.PI) / 180);
    if (s.flip) ctx.scale(-1, 1);
    ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 10;
    ctx.drawImage(s.img, -s.w / 2, -s.h / 2, s.w, s.h);
    ctx.restore();
  }

  // The strip, on a white print mat, tilted, with tape over the top corners.
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(STORY_TILT);
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 18;
  roundRect(ctx, -mw / 2, -mh / 2, mw, mh, 10);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.restore();
  ctx.save();
  roundRect(ctx, -sw / 2, -STORY_STRIP_H / 2, sw, STORY_STRIP_H, 4);
  ctx.clip();
  ctx.drawImage(strip, -sw / 2, -STORY_STRIP_H / 2, sw, STORY_STRIP_H);
  ctx.restore();
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate((side * mw) / 2 - side * 22, -mh / 2 + 18);
    ctx.rotate((side * -38 * Math.PI) / 180);
    ctx.fillStyle = side < 0 ? "rgba(246, 196, 83, 0.82)" : "rgba(240, 113, 79, 0.78)";
    ctx.fillRect(-64, -20, 128, 40);
    ctx.restore();
  }
  ctx.restore();

  return canvas;
}

export function toJpeg(canvas: HTMLCanvasElement, quality = 0.86): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't make the picture"))), "image/jpeg", quality),
  );
}
