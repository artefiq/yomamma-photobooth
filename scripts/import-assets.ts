// Copies the booth's assets out of the iOS project and generates the buddy stickers.
//
//   node scripts/import-assets.ts [path/to/YoMomma]     (default: ../YoMomma)
//
// Writes (all committed, so a deploy doesn't need the iOS repo):
//   public/logo.svg                     the "Yo!" bubble from the launch screen
//   public/faces/face_<buddy>_<mood>.png
//   public/stickers/<buddy>-<pose>-<expression>.svg
//   public/voices/<ID>.m4a              introductions (IN) and "completed" lines (CP)
//   lib/voice-lines.json                which line is which, with its words

import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { CREW, IDLE, SHOTS } from "../lib/crew.ts";
import { parseCrewArt, renderCrew, type Expression } from "./crew-render.ts";

const root = resolve(import.meta.dirname, "..");
const ios = resolve(process.argv[2] ?? join(root, "..", "YoMomma"));
const app = join(ios, "YoMamma");
const out = (...p: string[]) => join(root, ...p);

// Logo
mkdirSync(out("public"), { recursive: true });
copyFileSync(join(app, "Assets.xcassets/launch_logo.imageset/launch_logo.svg"), out("public/logo.svg"));

// Faces
mkdirSync(out("public/faces"), { recursive: true });
for (const f of readdirSync(join(app, "Faces")).filter((f) => f.endsWith(".png"))) {
  copyFileSync(join(app, "Faces", f), out("public/faces", f));
}

// Stickers
const lib = parseCrewArt(readFileSync(join(ios, "Shared/CrewArt.swift"), "utf8"));
mkdirSync(out("public/stickers"), { recursive: true });
let stickers = 0;
for (const b of CREW) {
  for (const { pose, expression } of [IDLE, ...SHOTS]) {
    writeFileSync(out("public/stickers", `${b.id}-${pose}-${expression}.svg`), renderCrew(lib, b.id, pose, expression as Expression));
    stickers++;
  }
}

// Voices: the line's words come from the Swift scripts; the recording is <ID>.m4a or its last take.
const swift = ["Focus/VoiceIntros.swift", "Focus/VoiceScript.swift"].map((f) => readFileSync(join(app, f), "utf8")).join("\n");
const lineRe = /VoiceLine\(id: "([A-Z]{3}-(IN|CP)\d\d)", crew: \.(\w+), group: \.\w+, number: \d+, text: "((?:[^"\\]|\\.)*)"\)/g;
const folders: Record<string, string> = { sunny: "Sunny", rio: "Rio", coachJim: "CoachJim", mira: "Mira", reeves: "Reeves" };
type Line = { id: string; text: string; src: string };
const lines: Record<string, { intro: Line[]; done: Line[] }> = {};
mkdirSync(out("public/voices"), { recursive: true });
for (const m of swift.matchAll(lineRe)) {
  const [, id, group, crew, rawText] = m;
  const folder = join(app, "Voices", folders[crew]);
  const takes = readdirSync(folder).filter((f) => f === `${id}.m4a` || f.startsWith(`${id}_take`)).sort();
  const file = takes.at(-1);
  if (!file) continue; // not recorded yet
  copyFileSync(join(folder, file), out("public/voices", `${id}.m4a`));
  const entry = (lines[crew] ??= { intro: [], done: [] });
  (group === "IN" ? entry.intro : entry.done).push({ id, text: rawText.replace(/\\(.)/g, "$1"), src: `/voices/${id}.m4a` });
}
writeFileSync(out("lib/voice-lines.json"), JSON.stringify(lines, null, 2) + "\n");

const counts = Object.entries(lines).map(([c, l]) => `${c} ${l.intro.length}+${l.done.length}`).join(", ");
console.log(`Imported from ${ios}\n  ${stickers} stickers\n  voices: ${counts}`);
