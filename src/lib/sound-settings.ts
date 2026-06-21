import { normalizeEffectStyle, normalizeSoundPack } from "@/lib/sound-presets";
import type { SoundAsset, SoundKey, SoundSettings } from "@/types/quiz";

export const defaultSoundSettings: SoundSettings = {
  soundEnabled: true,
  visualEffectsEnabled: true,
  soundPack: "elegant_wedding",
  effectStyle: "standard",
  screenVolume: 0.55,
  revealDelaySeconds: 1.2,
  screenConfettiEnabled: true,
  guestSoundEnabled: false,
  guestEffectsEnabled: true,
};

export function normalizeSoundSettings(value: Partial<SoundSettings> | Record<string, unknown> | null | undefined): SoundSettings {
  const record = (value ?? {}) as Record<string, unknown>;
  return {
    soundEnabled: toBoolean(record.soundEnabled ?? record.sound_enabled, defaultSoundSettings.soundEnabled),
    visualEffectsEnabled: toBoolean(
      record.visualEffectsEnabled ?? record.visual_effects_enabled,
      defaultSoundSettings.visualEffectsEnabled,
    ),
    soundPack: normalizeSoundPack(record.soundPack ?? record.sound_pack),
    effectStyle: normalizeEffectStyle(record.effectStyle ?? record.effect_style),
    screenVolume: toVolume(record.screenVolume ?? record.screen_volume, defaultSoundSettings.screenVolume),
    revealDelaySeconds: toRevealDelaySeconds(
      record.revealDelaySeconds ?? record.reveal_delay_seconds,
      defaultSoundSettings.revealDelaySeconds,
    ),
    screenConfettiEnabled: toBoolean(
      record.screenConfettiEnabled ?? record.screen_confetti_enabled,
      defaultSoundSettings.screenConfettiEnabled,
    ),
    guestSoundEnabled: toBoolean(
      record.guestSoundEnabled ?? record.guest_sound_enabled,
      defaultSoundSettings.guestSoundEnabled,
    ),
    guestEffectsEnabled: toBoolean(
      record.guestEffectsEnabled ?? record.guest_effects_enabled,
      defaultSoundSettings.guestEffectsEnabled,
    ),
  };
}

export function soundAssetFromRow(row: {
  sound_key: string;
  file_url: string;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  updated_at: string | null;
}): SoundAsset {
  return {
    soundKey: row.sound_key as SoundKey,
    fileUrl: row.file_url,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    updatedAt: row.updated_at ?? new Date(0).toISOString(),
  };
}

export function isValidRevealDelaySeconds(value: unknown): boolean {
  if (value === undefined || value === null || value === "") {
    return true;
  }

  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 && numberValue <= 5;
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function toVolume(value: unknown, fallback: number): number {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) {
    return fallback;
  }
  return Math.min(1, Math.max(0, numberValue));
}

function toRevealDelaySeconds(value: unknown, fallback: number): number {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return Math.round(Math.min(5, Math.max(0, numberValue)) * 10) / 10;
}
