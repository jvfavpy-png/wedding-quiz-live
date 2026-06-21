import type { CSSProperties } from "react";
import type { DesignThemeId } from "@/types/quiz";

export interface DesignTheme {
  id: DesignThemeId;
  name: string;
  tone: string;
  description: string;
  swatches: [string, string, string, string];
  vars: CSSProperties;
}

const fallbackTheme: DesignThemeId = "classic_bridal";

export const designThemes: Record<DesignThemeId, DesignTheme> = {
  classic_bridal: {
    id: "classic_bridal",
    name: "Classic Bridal",
    tone: "上品・王道",
    description: "白とゴールドを中心にした結婚式らしい定番テーマです。",
    swatches: ["#fff8e7", "#ffffff", "#d9b56d", "#13294b"],
    vars: {
      "--wql-bg": "#fff8e7",
      "--wql-bg-soft": "#fffdf5",
      "--wql-card": "rgba(255,255,255,0.88)",
      "--wql-card-solid": "#ffffff",
      "--wql-text": "#13294b",
      "--wql-muted": "#64748b",
      "--wql-accent": "#d9b56d",
      "--wql-accent-strong": "#a87917",
      "--wql-accent-soft": "#fff6d8",
      "--wql-accent-text": "#6d4b00",
      "--wql-success": "#0f766e",
      "--wql-success-soft": "#d8f7eb",
      "--wql-danger": "#b42335",
      "--wql-danger-soft": "#fff5f6",
      "--wql-screen-gradient":
        "radial-gradient(circle at top left,#fff1b8 0%,transparent 32%),linear-gradient(135deg,#fff8e7 0%,#ffffff 38%,#ffe1ea 70%,#dfe9ff 100%)",
      "--wql-page-gradient":
        "linear-gradient(135deg,#fff8e7 0%,#ffffff 42%,#ffe1ea 72%,#dfe9ff 100%)",
      "--wql-confetti-a": "#d9b56d",
      "--wql-confetti-b": "#ff6f91",
      "--wql-confetti-c": "#13294b",
    } as CSSProperties,
  },
  garden_wedding: {
    id: "garden_wedding",
    name: "Garden Wedding",
    tone: "自然・やわらか",
    description: "グリーンと花の色味で、昼の披露宴やガーデン会場に合います。",
    swatches: ["#f5fbf2", "#ffffff", "#86a873", "#233d2c"],
    vars: {
      "--wql-bg": "#f5fbf2",
      "--wql-bg-soft": "#fbfff8",
      "--wql-card": "rgba(255,255,255,0.9)",
      "--wql-card-solid": "#ffffff",
      "--wql-text": "#233d2c",
      "--wql-muted": "#64748b",
      "--wql-accent": "#86a873",
      "--wql-accent-strong": "#4f743f",
      "--wql-accent-soft": "#edf7df",
      "--wql-accent-text": "#355724",
      "--wql-success": "#0f766e",
      "--wql-success-soft": "#d8f7eb",
      "--wql-danger": "#b42335",
      "--wql-danger-soft": "#fff5f6",
      "--wql-screen-gradient":
        "radial-gradient(circle at top left,#e6f5d2 0%,transparent 34%),linear-gradient(135deg,#f5fbf2 0%,#ffffff 42%,#fce7ef 78%,#e3f4f0 100%)",
      "--wql-page-gradient":
        "linear-gradient(135deg,#f5fbf2 0%,#ffffff 46%,#fce7ef 82%,#e3f4f0 100%)",
      "--wql-confetti-a": "#86a873",
      "--wql-confetti-b": "#f59ab5",
      "--wql-confetti-c": "#233d2c",
    } as CSSProperties,
  },
  quiz_show: {
    id: "quiz_show",
    name: "Quiz Show",
    tone: "盛り上げ・華やか",
    description: "会場スクリーンで映える濃紺と金色のショー向けテーマです。",
    swatches: ["#111827", "#172554", "#facc15", "#38bdf8"],
    vars: {
      "--wql-bg": "#111827",
      "--wql-bg-soft": "#172554",
      "--wql-card": "rgba(255,255,255,0.9)",
      "--wql-card-solid": "#ffffff",
      "--wql-text": "#0f172a",
      "--wql-muted": "#64748b",
      "--wql-accent": "#facc15",
      "--wql-accent-strong": "#ca8a04",
      "--wql-accent-soft": "#fef9c3",
      "--wql-accent-text": "#713f12",
      "--wql-success": "#047857",
      "--wql-success-soft": "#d1fae5",
      "--wql-danger": "#dc2626",
      "--wql-danger-soft": "#fee2e2",
      "--wql-screen-gradient":
        "radial-gradient(circle at top left,#facc15 0%,transparent 24%),radial-gradient(circle at bottom right,#38bdf8 0%,transparent 32%),linear-gradient(135deg,#111827 0%,#172554 52%,#581c87 100%)",
      "--wql-page-gradient":
        "linear-gradient(135deg,#f8fafc 0%,#fff 40%,#fef9c3 74%,#dbeafe 100%)",
      "--wql-confetti-a": "#facc15",
      "--wql-confetti-b": "#38bdf8",
      "--wql-confetti-c": "#f472b6",
    } as CSSProperties,
  },
  minimal_white: {
    id: "minimal_white",
    name: "Minimal White",
    tone: "清潔・控えめ",
    description: "写真や会場装飾を邪魔しない、余白を活かした白基調テーマです。",
    swatches: ["#f8fafc", "#ffffff", "#c8a86a", "#1f2937"],
    vars: {
      "--wql-bg": "#f8fafc",
      "--wql-bg-soft": "#ffffff",
      "--wql-card": "rgba(255,255,255,0.94)",
      "--wql-card-solid": "#ffffff",
      "--wql-text": "#1f2937",
      "--wql-muted": "#6b7280",
      "--wql-accent": "#c8a86a",
      "--wql-accent-strong": "#8a6a2f",
      "--wql-accent-soft": "#f7f1e5",
      "--wql-accent-text": "#5f461e",
      "--wql-success": "#0f766e",
      "--wql-success-soft": "#e6f7f3",
      "--wql-danger": "#b42335",
      "--wql-danger-soft": "#fff5f6",
      "--wql-screen-gradient":
        "linear-gradient(135deg,#f8fafc 0%,#ffffff 42%,#f7f1e5 74%,#eef2f7 100%)",
      "--wql-page-gradient":
        "linear-gradient(135deg,#f8fafc 0%,#ffffff 48%,#f7f1e5 100%)",
      "--wql-confetti-a": "#c8a86a",
      "--wql-confetti-b": "#94a3b8",
      "--wql-confetti-c": "#1f2937",
    } as CSSProperties,
  },
  night_party: {
    id: "night_party",
    name: "Night Party",
    tone: "二次会・ナイト",
    description: "夜の二次会や照明の暗い会場で見やすい高コントラストテーマです。",
    swatches: ["#101828", "#1e1b4b", "#f0abfc", "#fde68a"],
    vars: {
      "--wql-bg": "#101828",
      "--wql-bg-soft": "#1e1b4b",
      "--wql-card": "rgba(255,255,255,0.9)",
      "--wql-card-solid": "#ffffff",
      "--wql-text": "#111827",
      "--wql-muted": "#64748b",
      "--wql-accent": "#f0abfc",
      "--wql-accent-strong": "#c026d3",
      "--wql-accent-soft": "#fae8ff",
      "--wql-accent-text": "#86198f",
      "--wql-success": "#0f766e",
      "--wql-success-soft": "#ccfbf1",
      "--wql-danger": "#e11d48",
      "--wql-danger-soft": "#ffe4e6",
      "--wql-screen-gradient":
        "radial-gradient(circle at top left,#f0abfc 0%,transparent 28%),radial-gradient(circle at bottom right,#fde68a 0%,transparent 30%),linear-gradient(135deg,#101828 0%,#1e1b4b 55%,#4c1d95 100%)",
      "--wql-page-gradient":
        "linear-gradient(135deg,#f8fafc 0%,#ffffff 45%,#fae8ff 74%,#e0e7ff 100%)",
      "--wql-confetti-a": "#f0abfc",
      "--wql-confetti-b": "#fde68a",
      "--wql-confetti-c": "#60a5fa",
    } as CSSProperties,
  },
};

export const designThemeIds = Object.keys(designThemes) as DesignThemeId[];

export function normalizeDesignTheme(value: unknown): DesignThemeId {
  return typeof value === "string" && value in designThemes
    ? (value as DesignThemeId)
    : fallbackTheme;
}

export function getDesignTheme(value: unknown): DesignTheme {
  return designThemes[normalizeDesignTheme(value)];
}

export function getThemeVars(value: unknown): CSSProperties {
  return getDesignTheme(value).vars;
}
