import type { EventRunMode } from "@/types/quiz";

export const runModes: EventRunMode[] = ["rehearsal", "production"];

export function normalizeRunMode(value: unknown): EventRunMode {
  return value === "production" ? "production" : "rehearsal";
}

export function runModeLabel(mode: EventRunMode): string {
  return mode === "production" ? "本番" : "リハーサル";
}
