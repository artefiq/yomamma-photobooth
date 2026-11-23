// Booth sounds: the buddies' recorded lines, and synthesized countdown beeps and shutter click
// (no extra files to load).

import voiceLines from "./voice-lines.json";
import type { CrewId } from "./crew";

export interface VoiceLine { id: string; text: string; src: string }
const lines = voiceLines as Record<string, { intro: VoiceLine[]; done: VoiceLine[] }>;

let current: HTMLAudioElement | null = null;
const lastPlayed: Record<string, string> = {};

/** A line from this buddy's group, never the same one twice in a row. */
export function pickLine(id: CrewId, group: "intro" | "done"): VoiceLine | null {
  const pool = lines[id]?.[group] ?? [];
  if (!pool.length) return null;
  const key = `${id}.${group}`;
  const choices = pool.length > 1 ? pool.filter((l) => l.id !== lastPlayed[key]) : pool;
  const line = choices[Math.floor(Math.random() * choices.length)];
  lastPlayed[key] = line.id;
  return line;
}

/** Plays a line, cutting off whatever was speaking. Autoplay refusals are ignored. */
export function speak(line: VoiceLine | null) {
  stopSpeaking();
  if (!line) return;
  current = new Audio(line.src);
  current.play().catch(() => {});
}

export function stopSpeaking() {
  current?.pause();
  current = null;
}

let audioCtx: AudioContext | null = null;
function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  audioCtx ??= new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
  return audioCtx;
}

/** Unlocks audio on iPad Safari; call from a tap. */
export function unlockAudio() {
  ctx();
}

export function beep(high = false) {
  const c = ctx();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "sine";
  o.frequency.value = high ? 1320 : 880;
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.25, c.currentTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.18);
  o.connect(g).connect(c.destination);
  o.start();
  o.stop(c.currentTime + 0.2);
}

export function shutter() {
  const c = ctx();
  if (!c) return;
  const length = Math.floor(c.sampleRate * 0.12);
  const buffer = c.createBuffer(1, length, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
  const src = c.createBufferSource();
  const g = c.createGain();
  g.gain.value = 0.5;
  src.buffer = buffer;
  src.connect(g).connect(c.destination);
  src.start();
}
