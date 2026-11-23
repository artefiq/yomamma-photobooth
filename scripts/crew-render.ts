// A port of the iOS app's crew renderer (YoMomma/Shared/CrewCharacterView.swift, `CrewRenderer`) to SVG.
// Static only: no idle motion, gaze or blinking. The art is the designer's own path data from
// YoMomma/Shared/CrewArt.swift; the live face (eyes, brows, mouth, blush, effects) is redrawn here
// with the same numbers the app uses, in the art's 240 × 320 space.

export type Role = "b" | "h" | "l";
export interface Shape { role: Role; fill: string | null; stroke: string | null; width: number; opacity: number; d: string }
export interface PoseArt { faceIndex: number; shapes: Shape[] }
export interface Library { poses: Record<string, PoseArt>; lashes: Record<string, Shape[]> }

type Eye =
  | { kind: "open"; lid: number; tilt?: number; scale?: number }
  | { kind: "happy" } | { kind: "closed" } | { kind: "star" } | { kind: "heart" };
type Mouth = "smirk" | "smile" | "halfSmile" | "smug" | "laugh" | "grin" | "flat" | "firm";
type Effect = "none" | "sparkle" | "sparkles";

interface Face {
  left: Eye; right: Eye; mouth: Mouth;
  raise?: number; tilt?: number; rightRaise?: number; blush?: boolean; effect?: Effect;
  look?: [number, number]; headTilt?: number; isIdle?: boolean;
}

interface Spec {
  skin: number; ink: number; brow: number; browWidth: number; browArch: number;
  mouth: number; mouthFill: number; tongue: number; blush: number;
  eyeLeftX: number; eyeRightX: number; eyeY: number;
  eyeRadiusX: number; eyeRadiusY: number; pupilRadiusX: number; pupilRadiusY: number;
  mouthY: number; idleFace: Face; browLift?: number; expressionMouthLift?: number;
}

// CrewSpecs, copied from the app.
export const SPECS: Record<string, Spec> = {
  rio: {
    skin: 0x9c6644, ink: 0x2a1a14, brow: 0x1e1a1a, browWidth: 4, browArch: 0,
    mouth: 0x5a2a1e, mouthFill: 0x5a2a1e, tongue: 0xe86a6a, blush: 0xe8897a,
    eyeLeftX: 98, eyeRightX: 142, eyeY: 157, eyeRadiusX: 11, eyeRadiusY: 10, pupilRadiusX: 6.5, pupilRadiusY: 6.5,
    mouthY: 182, idleFace: { left: { kind: "open", lid: 0.5 }, right: { kind: "open", lid: 0.5 }, mouth: "smirk", look: [0.6, 0.3] },
    browLift: 1, expressionMouthLift: 2,
  },
  sunny: {
    skin: 0xf0c09a, ink: 0x2a1a14, brow: 0xb85a10, browWidth: 4, browArch: 5,
    mouth: 0xa83246, mouthFill: 0xa83246, tongue: 0xff8a95, blush: 0xff8a95,
    eyeLeftX: 100, eyeRightX: 142, eyeY: 153.5, eyeRadiusX: 10, eyeRadiusY: 9, pupilRadiusX: 6, pupilRadiusY: 6.5,
    mouthY: 184, idleFace: { left: { kind: "open", lid: 0 }, right: { kind: "open", lid: 0 }, mouth: "smile", raise: 3.5 },
    browLift: 4, expressionMouthLift: 4,
  },
  coachJim: {
    skin: 0xd19a73, ink: 0x1a1a1a, brow: 0x141414, browWidth: 7, browArch: 0,
    mouth: 0x7a2230, mouthFill: 0x7a2230, tongue: 0xff6f7d, blush: 0xe8897a,
    eyeLeftX: 98, eyeRightX: 142, eyeY: 147.5, eyeRadiusX: 11, eyeRadiusY: 9, pupilRadiusX: 6, pupilRadiusY: 6,
    mouthY: 185,
    idleFace: { left: { kind: "open", lid: 0.3, tilt: 3 }, right: { kind: "open", lid: 0.3, tilt: 3 }, mouth: "flat", raise: 1, tilt: 4 },
  },
  mira: {
    skin: 0xedc39c, ink: 0x1a1a1a, brow: 0x4a2e22, browWidth: 4, browArch: 0,
    mouth: 0x8a3b3b, mouthFill: 0x7a2e33, tongue: 0xe86a6a, blush: 0xe8897a,
    eyeLeftX: 100, eyeRightX: 141, eyeY: 160.5, eyeRadiusX: 10, eyeRadiusY: 7.5, pupilRadiusX: 5, pupilRadiusY: 6,
    mouthY: 189, idleFace: { left: { kind: "open", lid: 0.22 }, right: { kind: "open", lid: 0.22 }, mouth: "halfSmile", raise: 1.5 },
    expressionMouthLift: 5,
  },
  reeves: {
    skin: 0xc98c62, ink: 0x1f1a17, brow: 0x4a3a30, browWidth: 6.5, browArch: 0,
    mouth: 0x6b2e22, mouthFill: 0x6b2e22, tongue: 0xe86a6a, blush: 0xe8897a,
    eyeLeftX: 98, eyeRightX: 142, eyeY: 155, eyeRadiusX: 11, eyeRadiusY: 9, pupilRadiusX: 5, pupilRadiusY: 5,
    mouthY: 182.5,
    idleFace: { left: { kind: "open", lid: 0.4, tilt: 3 }, right: { kind: "open", lid: 0.4, tilt: 3 }, mouth: "firm", tilt: 3 },
  },
};

export type Expression = "idle" | "happy" | "laugh" | "proud" | "excited";

// CrewFace.face(for:spec:), the expressions the booth uses.
function faceFor(expression: Expression, spec: Spec): Face {
  switch (expression) {
    case "idle": return { ...spec.idleFace, isIdle: true };
    case "happy": return { left: { kind: "happy" }, right: { kind: "happy" }, mouth: "smile", raise: 3, blush: true };
    case "laugh": return { left: { kind: "happy" }, right: { kind: "happy" }, mouth: "laugh", raise: 4, blush: true, effect: "sparkle", headTilt: -3 };
    case "proud": return { left: { kind: "closed" }, right: { kind: "closed" }, mouth: "smug", raise: 2, blush: true, effect: "sparkle", headTilt: 4 };
    case "excited": return { left: { kind: "star" }, right: { kind: "star" }, mouth: "grin", raise: 6, effect: "sparkles" };
  }
}

const GOLD = 0xffc531;
const hex = (v: number) => "#" + v.toString(16).padStart(6, "0").toUpperCase();
const n = (v: number) => +v.toFixed(2);
const stroke = (color: string, width: number) =>
  `fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"`;
const quad = (x1: number, y1: number, cx: number, cy: number, x2: number, y2: number) =>
  `M${n(x1)} ${n(y1)} Q${n(cx)} ${n(cy)} ${n(x2)} ${n(y2)}`;
const ellipse = (cx: number, cy: number, rx: number, ry: number, attrs: string) =>
  `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" ${attrs}/>`;

function star(cx: number, cy: number, r: number, inner = 0.38, points = 4): string {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const a = (i * Math.PI) / points - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * inner;
    pts.push(`${n(cx + Math.cos(a) * rr)} ${n(cy + Math.sin(a) * rr)}`);
  }
  return `M${pts.join(" L")} Z`;
}

function heart(cx: number, cy: number, s: number): string {
  return `M${n(cx)} ${n(cy + s * 0.9)} C${n(cx - s * 1.4)} ${n(cy - s * 0.1)} ${n(cx - s * 0.8)} ${n(cy - s * 1.2)} ${n(cx)} ${n(cy - s * 0.45)} ` +
    `C${n(cx + s * 0.8)} ${n(cy - s * 1.2)} ${n(cx + s * 1.4)} ${n(cy - s * 0.1)} ${n(cx)} ${n(cy + s * 0.9)} Z`;
}

/** Horizontal middle of a path's points (for matching lashes to an eye). */
function midX(d: string): number {
  const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+/g) ?? [];
  const xs: number[] = [];
  let cmd = "M";
  let i = 0;
  const num = () => Number(tokens[i++]);
  while (i < tokens.length) {
    if (/[A-Za-z]/.test(tokens[i])) { cmd = tokens[i++]; if (cmd === "Z" || cmd === "z") continue; }
    switch (cmd) {
      case "M": case "L": xs.push(num()); num(); if (cmd === "M") cmd = "L"; break;
      case "H": xs.push(num()); break;
      case "V": num(); break;
      case "Q": num(); num(); xs.push(num()); num(); break;
      case "C": num(); num(); num(); num(); xs.push(num()); num(); break;
      default: i++;
    }
  }
  return (Math.min(...xs) + Math.max(...xs)) / 2;
}

function shapeSVG(s: Shape, transform = ""): string {
  const t = transform ? ` transform="${transform}"` : "";
  const o = s.opacity < 1 ? ` opacity="${s.opacity}"` : "";
  const fill = s.fill ?? "none";
  const st = s.stroke ? ` stroke="${s.stroke}" stroke-width="${s.width}" stroke-linecap="round" stroke-linejoin="round"` : "";
  return `<path d="${s.d}" fill="${fill}"${st}${o}${t}/>`;
}

/** Renders one character in one pose and expression as a standalone SVG (240 × 320 art space). */
export function renderCrew(lib: Library, character: string, pose: string, expression: Expression, scale = 2): string {
  const spec = SPECS[character];
  const art = lib.poses[`${character}.${pose}`];
  if (!spec || !art) throw new Error(`No art for ${character}.${pose}`);
  const face = faceFor(expression, spec);
  const id = `${character}-${pose}-${expression}`;
  const defs: string[] = [];
  const ink = hex(spec.ink);
  const ey = spec.eyeY;
  const look = face.look ? [face.look[0] * 0.6, face.look[1] * 0.6] : [0, 0];

  const eye = (cx: number, isLeft: boolean, state: Eye): string => {
    switch (state.kind) {
      case "happy": return `<path d="${quad(cx - 10, ey + 4, cx, ey - 7, cx + 10, ey + 4)}" ${stroke(ink, 4.5)}/>`;
      case "closed": return `<path d="${quad(cx - 10, ey, cx, ey + 6, cx + 10, ey)}" ${stroke(ink, 4)}/>`;
      case "star": {
        const d = star(cx, ey, 12, 0.42, 5);
        return `<path d="${d}" fill="${hex(GOLD)}" stroke="#E0A800" stroke-width="1.5" stroke-linejoin="round"/>`;
      }
      case "heart":
        return `<path d="${heart(cx, ey, 9.5)}" fill="#E8456B"/>` + ellipse(cx - 4, ey - 4, 2, 2, `fill="#FFFFFF" opacity="0.8"`);
      case "open": {
        const { lid, tilt = 0, scale: ps = 1 } = state;
        const rx = spec.eyeRadiusX, ry = spec.eyeRadiusY;
        const prx = spec.pupilRadiusX * ps, pry = spec.pupilRadiusY * ps;
        const clip = `${id}-eye${isLeft ? "L" : "R"}`;
        defs.push(`<clipPath id="${clip}">${ellipse(cx, ey, rx, ry, "")}</clipPath>`);
        const px = cx + look[0] * Math.max(0, rx - prx - 0.5);
        const py = ey + look[1] * Math.max(0, ry - pry - 0.5);
        let out = ellipse(cx, ey, rx, ry, `fill="#FFFFFF"`);
        let inside = ellipse(px, py, prx, pry, `fill="${ink}"`) + ellipse(px + prx * 0.35, py - pry * 0.35, 1.8, 1.8, `fill="#FFFFFF"`);
        const closed = Math.min(1, lid);
        const minX = cx - rx, maxX = cx + rx, minY = ey - ry;
        const base = minY + 2 * ry * closed;
        const yL = isLeft ? base - tilt : base + tilt;
        const yR = isLeft ? base + tilt : base - tilt;
        if (closed > 0.01) {
          inside += `<path d="M${n(minX - 3)} ${n(minY - 5)} L${n(maxX + 3)} ${n(minY - 5)} L${n(maxX + 3)} ${n(yR)} L${n(minX - 3)} ${n(yL)} Z" fill="${hex(spec.skin)}"/>`;
        }
        out += `<g clip-path="url(#${clip})">${inside}</g>`;
        if (closed > 0.06) out += `<path d="M${n(minX - 1)} ${n(yL)} L${n(maxX + 1)} ${n(yR)}" ${stroke(ink, 4)}/>`;
        if (lid < 0.15) {
          for (const lash of lib.lashes[character] ?? []) {
            if (Math.abs(midX(lash.d) - cx) < 12) out += shapeSVG(lash);
          }
        }
        return out;
      }
    }
  };

  const brows = (): string => {
    const t = face.tilt ?? 0;
    const lift = spec.browLift ?? 0;
    const raise = face.raise ?? 0;
    let out = "";
    for (const [cx, isLeft, r] of [[spec.eyeLeftX, true, raise], [spec.eyeRightX, false, raise + (face.rightRaise ?? 0)]] as const) {
      const outerX = isLeft ? cx - 10 : cx + 10;
      const innerX = isLeft ? cx + 10 : cx - 10;
      const outerY = ey - 12 - r - lift - t * 0.3;
      const innerY = ey - 10 - r - lift + t;
      const mx = (outerX + innerX) / 2, my = (outerY + innerY) / 2 - spec.browArch;
      out += `<path d="${quad(outerX, outerY, mx, my, innerX, innerY)}" ${stroke(hex(spec.brow), spec.browWidth)}/>`;
    }
    return out;
  };

  const mouth = (): string => {
    const dy = spec.mouthY - 158 - (face.isIdle ? 0 : spec.expressionMouthLift ?? 0);
    const line = hex(spec.mouth), fill = hex(spec.mouthFill);
    let body = "";
    switch (face.mouth) {
      case "smirk": body = `<path d="${quad(112, 160, 122, 162, 132, 156)}" ${stroke(line, 4)}/>`; break;
      case "smile": body = `<path d="${quad(106, 155, 120, 168, 134, 155)}" ${stroke(line, 4.5)}/>`; break;
      case "halfSmile": body = `<path d="${quad(108, 158, 122, 165, 134, 155)}" ${stroke(line, 4)}/>`; break;
      case "smug": body = `<path d="${quad(102, 154, 120, 170, 138, 154)}" ${stroke(line, 4.5)}/>`; break;
      case "flat": body = `<path d="M111 160 L131 160" ${stroke(line, 4)}/>`; break;
      case "firm": body = `<path d="${quad(109, 161, 120, 158, 131, 161)}" ${stroke(line, 5.5)}/>`; break;
      case "laugh": case "grin": {
        const grin = face.mouth === "grin";
        const d = grin ? "M100 151 Q120 184 140 151 Z" : "M104 153 Q120 178 136 153 Z";
        const clip = `${id}-mouth`;
        defs.push(`<clipPath id="${clip}"><path d="${d}"/></clipPath>`);
        body = `<path d="${d}" fill="${fill}"/><g clip-path="url(#${clip})">` +
          ellipse(120, grin ? 170 : 166, 9, 5, `fill="${hex(spec.tongue)}"`) +
          `<rect x="98" y="${grin ? 148.5 : 151}" width="44" height="${grin ? 6 : 5}" rx="2" fill="#FFFFFF"/></g>`;
        break;
      }
    }
    return `<g transform="translate(0 ${n(dy)})">${body}</g>`;
  };

  const effect = (): string => {
    const g = hex(GOLD);
    switch (face.effect ?? "none") {
      case "sparkle": return `<path d="${star(200, 100, 9)}" fill="${g}"/><path d="${star(36, 88, 6)}" fill="${g}"/>`;
      case "sparkles":
        return [star(202, 98, 10), star(34, 86, 7), star(212, 146, 6), star(26, 140, 5)].map((d) => `<path d="${d}" fill="${g}"/>`).join("");
      default: return "";
    }
  };

  const faceSVG = (): string => {
    let out = "";
    if (face.blush) {
      out += `<g opacity="0.45">${ellipse(spec.eyeLeftX - 12, ey + 18, 9, 5, `fill="${hex(spec.blush)}"`)}${ellipse(spec.eyeRightX + 12, ey + 18, 9, 5, `fill="${hex(spec.blush)}"`)}</g>`;
    }
    out += eye(spec.eyeLeftX, true, face.left) + eye(spec.eyeRightX, false, face.right) + brows() + mouth() + effect();
    return out;
  };

  const tilt = face.headTilt ?? 0;
  const headTransform = tilt ? `rotate(${tilt} 120 196)` : "";
  const faceTransform = [headTransform, pose === "shrug" ? "rotate(5 120 196)" : ""].filter(Boolean).join(" ");
  const faceGroup = `<g${faceTransform ? ` transform="${faceTransform}"` : ""}>${faceSVG()}</g>`;

  let body = "";
  art.shapes.forEach((s, i) => {
    if (i === art.faceIndex) body += faceGroup;
    body += shapeSVG(s, s.role === "h" ? headTransform : "");
  });
  if (art.faceIndex >= art.shapes.length) body += faceGroup;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${240 * scale}" height="${320 * scale}" viewBox="0 0 240 320">` +
    (defs.length ? `<defs>${defs.join("")}</defs>` : "") + body + `</svg>\n`;
}

/** Parses the raw art block in CrewArt.swift. */
export function parseCrewArt(swift: string): Library {
  const start = swift.indexOf('#"""');
  const end = swift.indexOf('"""#', start + 4);
  const raw = swift.slice(start + 4, end);
  const poses: Record<string, PoseArt> = {};
  const lashes: Record<string, Shape[]> = {};
  let current: { key: string; art: PoseArt } | null = null;
  let lashKey: string | null = null;
  for (const line of raw.split("\n")) {
    if (line.startsWith("#P ")) {
      const [, c, p, f] = line.split(" ");
      current = { key: `${c}.${p}`, art: { faceIndex: Number(f), shapes: [] } };
      poses[current.key] = current.art;
      lashKey = null;
      continue;
    }
    if (line.startsWith("#L ")) { lashKey = line.split(" ")[1]; lashes[lashKey] = []; current = null; continue; }
    const f = line.split("|");
    if (f.length < 6) continue;
    const shape: Shape = {
      role: f[0] as Role,
      fill: f[1] === "-" ? null : f[1],
      stroke: f[2] === "-" ? null : f[2],
      width: Number(f[3]) || 0,
      opacity: Number(f[4]) || 1,
      d: f.slice(5).join("|"),
    };
    if (lashKey) lashes[lashKey].push(shape);
    else current?.art.shapes.push(shape);
  }
  return { poses, lashes };
}
