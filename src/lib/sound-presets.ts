import type { DesignThemeId, EffectStyleId, SoundKey, SoundPackId } from "@/types/quiz";

export const soundKeys: SoundKey[] = [
  "start",
  "countdown",
  "close",
  "reveal",
  "correct",
  "wrong",
  "ranking",
  "winner",
  "submit",
];

export const soundPackIds: SoundPackId[] = [
  "elegant_wedding",
  "quiz_show_classic",
  "party_pop",
  "minimal_clean",
  "night_party",
  "custom",
];

export const effectStyleIds: EffectStyleId[] = ["minimal", "standard", "tv_show", "party"];

export const soundKeyLabels: Record<SoundKey, string> = {
  start: "問題開始",
  countdown: "カウントダウン",
  close: "回答締切",
  reveal: "正解発表前",
  correct: "正解",
  wrong: "不正解",
  ranking: "ランキング",
  winner: "1位発表",
  submit: "回答受付",
};

export const soundPacks: Record<
  SoundPackId,
  {
    id: SoundPackId;
    name: string;
    description: string;
    sourceType: "Web Audio生成" | "Custom SE";
    licenseStatus: string;
  }
> = {
  elegant_wedding: {
    id: "elegant_wedding",
    name: "Elegant Wedding",
    description: "披露宴やホテル会場向け。柔らかいベルとチャイムを中心にした、控えめで透明感のある音です。",
    sourceType: "Web Audio生成",
    licenseStatus: "外部音源を使わず、Web Audio APIで生成します。",
  },
  quiz_show_classic: {
    id: "quiz_show_classic",
    name: "Quiz Show Classic",
    description: "二次会や早押し風の進行向け。テンポと期待感を足しながら、既存番組の音は再現しません。",
    sourceType: "Web Audio生成",
    licenseStatus: "外部音源を使わず、Web Audio APIで生成します。",
  },
  party_pop: {
    id: "party_pop",
    name: "Party Pop",
    description: "友人中心の明るい二次会向け。短く軽快で、子ども向けゲーム音にならないよう高音を抑えています。",
    sourceType: "Web Audio生成",
    licenseStatus: "外部音源を使わず、Web Audio APIで生成します。",
  },
  minimal_clean: {
    id: "minimal_clean",
    name: "Minimal Clean",
    description: "BGMや司会マイクを優先したい会場向け。短く控えめな情報音に寄せています。",
    sourceType: "Web Audio生成",
    licenseStatus: "外部音源を使わず、Web Audio APIで生成します。",
  },
  night_party: {
    id: "night_party",
    name: "Night Party",
    description: "夜の二次会やラウンジ向け。少し低めで大人っぽい、短いアクセント音です。",
    sourceType: "Web Audio生成",
    licenseStatus: "外部音源を使わず、Web Audio APIで生成します。",
  },
  custom: {
    id: "custom",
    name: "Custom",
    description: "管理者がアップロードした音源を優先します。未設定スロットはElegant Weddingへ自動fallbackします。",
    sourceType: "Custom SE",
    licenseStatus: "アップロードする音源の権利確認は管理者が行います。",
  },
};

export const effectStyles: Record<
  EffectStyleId,
  { id: EffectStyleId; name: string; description: string; intensity: "quiet" | "balanced" | "broadcast" | "celebratory" }
> = {
  minimal: {
    id: "minimal",
    name: "Minimal",
    description: "フェード中心。紙吹雪は使わず、読みやすさを最優先にします。",
    intensity: "quiet",
  },
  standard: {
    id: "standard",
    name: "Standard",
    description: "披露宴・二次会の標準。正解とランキングだけを控えめに強調します。",
    intensity: "balanced",
  },
  tv_show: {
    id: "tv_show",
    name: "TV Show",
    description: "正解前の短い溜めとTOP3の段階表示で、番組風のテンポを足します。",
    intensity: "broadcast",
  },
  party: {
    id: "party",
    name: "Party",
    description: "二次会向け。祝福感を少し強めますが、文字を隠す演出はしません。",
    intensity: "celebratory",
  },
};

export const recommendedSoundByTheme: Record<
  DesignThemeId,
  { soundPack: SoundPackId; effectStyle: EffectStyleId }
> = {
  classic_bridal: { soundPack: "elegant_wedding", effectStyle: "standard" },
  garden_wedding: { soundPack: "elegant_wedding", effectStyle: "minimal" },
  quiz_show: { soundPack: "quiz_show_classic", effectStyle: "tv_show" },
  minimal_white: { soundPack: "minimal_clean", effectStyle: "minimal" },
  night_party: { soundPack: "night_party", effectStyle: "party" },
};

export function isSoundKey(value: unknown): value is SoundKey {
  return typeof value === "string" && soundKeys.includes(value as SoundKey);
}

export function normalizeSoundPack(value: unknown): SoundPackId {
  return typeof value === "string" && soundPackIds.includes(value as SoundPackId)
    ? (value as SoundPackId)
    : "elegant_wedding";
}

export function normalizeEffectStyle(value: unknown): EffectStyleId {
  return typeof value === "string" && effectStyleIds.includes(value as EffectStyleId)
    ? (value as EffectStyleId)
    : "standard";
}
