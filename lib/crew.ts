// The study buddies, as the iOS app describes them (YoMomma/Shared/CrewCharacterView.swift and
// YoMomma/YoMamma/Design/Theme.swift `tagline`). The art itself is generated into public/stickers by
// scripts/import-assets.ts.

export type CrewId = "sunny" | "rio" | "coachJim" | "mira" | "reeves";

export interface Buddy {
  id: CrewId;
  name: string;
  /** "The Cheerleader" */
  role: string;
  /** The line under the name in the app's crew picker. */
  tagline: string;
  /** What they say when they catch you on your phone (CrewLines.swift `caughtOnPhone`), printed in the picture's footer. */
  catchphrase: string;
  /** Voice file prefix (SUN-IN01.m4a). */
  voice: string;
  /** Card background behind the buddy, from CrewSpec.background. */
  background: string;
  /** Accent colour, from CrewSpec.accent. */
  accent: string;
}

export const CREW: Buddy[] = [
  { id: "sunny", name: "Sunny", role: "The Cheerleader", tagline: "The bubbly go-getter", catchphrase: "Phone down, superstar!", voice: "SUN", background: "#E0F1FF", accent: "#0B5FA5" },
  { id: "rio", name: "Rio", role: "The Chill Friend", tagline: "The cool, chill guy", catchphrase: "Bro. The phone.", voice: "RIO", background: "#F4EDE4", accent: "#7A4F1D" },
  { id: "coachJim", name: "Coach Jim", role: "The Drill Sergeant", tagline: "The tough-love coach", catchphrase: "DROP THAT PHONE, RECRUIT!", voice: "JIN", background: "#FFE1E1", accent: "#A3171F" },
  { id: "mira", name: "Mira", role: "The Balanced Mom", tagline: "The sweet-but-firm mom", catchphrase: "Don't make me get the slipper.", voice: "MIR", background: "#E3F1EF", accent: "#2F6B68" },
  { id: "reeves", name: "Reeves", role: "The Steady Lawman", tagline: "The steady old lawman", catchphrase: "That phone part of the job, partner?", voice: "REE", background: "#F3E9D8", accent: "#6B4226" },
];

/** The buddy's pose and face in each of the four shots. */
export const SHOTS = [
  { pose: "wave", expression: "happy" },
  { pose: "thumbsUp", expression: "proud" },
  { pose: "cheer", expression: "excited" },
  { pose: "point", expression: "laugh" },
] as const;

/** The standing pose used in the picker. */
export const IDLE = { pose: "idle", expression: "idle" } as const;

export function stickerPath(id: CrewId, pose: string, expression: string): string {
  return `/stickers/${id}-${pose}-${expression}.svg`;
}

export function facePath(id: CrewId, mood: "happy" | "idle" | "proud" = "happy"): string {
  return `/faces/face_${id}_${mood}.png`;
}

export function buddy(id: string | null | undefined): Buddy {
  return CREW.find((b) => b.id === id) ?? CREW[0];
}
