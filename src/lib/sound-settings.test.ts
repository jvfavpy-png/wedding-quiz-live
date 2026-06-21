import { describe, expect, it } from "vitest";
import { normalizeEffectStyle, normalizeSoundPack } from "@/lib/sound-presets";
import { defaultSoundSettings, isValidRevealDelaySeconds, normalizeSoundSettings } from "@/lib/sound-settings";

describe("sound settings", () => {
  it("normalizes invalid pack and effect style to safe defaults", () => {
    expect(normalizeSoundPack("unknown")).toBe("elegant_wedding");
    expect(normalizeEffectStyle("flashy")).toBe("standard");
  });

  it("accepts database snake_case settings", () => {
    expect(
      normalizeSoundSettings({
        sound_enabled: false,
        visual_effects_enabled: false,
        sound_pack: "minimal_clean",
        effect_style: "minimal",
        screen_volume: 0.42,
        reveal_delay_seconds: 1.7,
        screen_confetti_enabled: false,
        guest_sound_enabled: true,
        guest_effects_enabled: false,
      }),
    ).toEqual({
      soundEnabled: false,
      visualEffectsEnabled: false,
      soundPack: "minimal_clean",
      effectStyle: "minimal",
      screenVolume: 0.42,
      revealDelaySeconds: 1.7,
      screenConfettiEnabled: false,
      guestSoundEnabled: true,
      guestEffectsEnabled: false,
    });
  });

  it("keeps wedding-safe defaults", () => {
    expect(normalizeSoundSettings(null)).toEqual(defaultSoundSettings);
  });

  it("clamps screen volume to a safe 0 to 1 range", () => {
    expect(normalizeSoundSettings({ screen_volume: 1.8 }).screenVolume).toBe(1);
    expect(normalizeSoundSettings({ screenVolume: -0.2 }).screenVolume).toBe(0);
    expect(normalizeSoundSettings({ screen_volume: "not-a-number" }).screenVolume).toBe(
      defaultSoundSettings.screenVolume,
    );
  });

  it("normalizes and validates reveal delay seconds", () => {
    expect(normalizeSoundSettings({ reveal_delay_seconds: 1.26 }).revealDelaySeconds).toBe(1.3);
    expect(normalizeSoundSettings({ revealDelaySeconds: 8 }).revealDelaySeconds).toBe(5);
    expect(normalizeSoundSettings({ revealDelaySeconds: -1 }).revealDelaySeconds).toBe(0);
    expect(isValidRevealDelaySeconds(5)).toBe(true);
    expect(isValidRevealDelaySeconds(5.1)).toBe(false);
    expect(isValidRevealDelaySeconds(-0.1)).toBe(false);
  });
});
