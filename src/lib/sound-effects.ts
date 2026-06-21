import type { SoundKey, SoundPackId } from "@/types/quiz";

export type SoundEffectName = SoundKey | "top";

export interface SoundPlayOptions {
  volume?: number;
  soundPack?: SoundPackId;
  customAssets?: Partial<Record<SoundKey, string>>;
  useCustomAssets?: boolean;
}

export interface SoundPlayer {
  unlock: () => Promise<void>;
  playSound: (name: SoundEffectName, options?: SoundPlayOptions | number) => void;
  stopSound: (name: SoundEffectName) => void;
  stopAllSounds: () => void;
  fadeOutSound: (name: SoundEffectName, durationMs?: number) => void;
  play: (name: SoundEffectName, options?: SoundPlayOptions | number) => void;
  stop: () => void;
  previewPack: (soundPack: SoundPackId, volume?: number) => void;
}

type AudioContextConstructor = typeof AudioContext;

interface MasterBus {
  input: GainNode;
  delay: DelayNode;
}

const masterBuses = new WeakMap<AudioContext, MasterBus>();

interface ActiveSoundHandle {
  audio?: HTMLAudioElement;
  sources: AudioScheduledSourceNode[];
  gains: GainNode[];
  cleanupTimer?: number;
  fadeTimer?: number;
}

interface GeneratedSoundHandle {
  sources: AudioScheduledSourceNode[];
  gains: GainNode[];
}

let currentGeneratedHandle: GeneratedSoundHandle | null = null;

export function createSoundPlayer(): SoundPlayer | null {
  if (typeof window === "undefined") {
    return null;
  }

  const AudioContextClass =
    window.AudioContext ??
    ((window as unknown as { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext);

  if (!AudioContextClass) {
    return null;
  }

  let context: AudioContext | null = null;
  let stopToken = 0;
  const activeSounds = new Map<SoundKey, ActiveSoundHandle>();

  const getContext = () => {
    context ??= new AudioContextClass();
    return context;
  };

  const removeActiveSound = (soundKey: SoundKey, handle: ActiveSoundHandle) => {
    if (activeSounds.get(soundKey) === handle) {
      activeSounds.delete(soundKey);
    }
  };

  const stopSound = (name: SoundEffectName) => {
    const soundKey = normalizeSoundName(name);
    const handle = activeSounds.get(soundKey);
    if (!handle) {
      return;
    }

    if (handle.cleanupTimer) {
      window.clearTimeout(handle.cleanupTimer);
    }
    if (handle.fadeTimer) {
      window.clearInterval(handle.fadeTimer);
    }
    if (handle.audio) {
      handle.audio.pause();
      handle.audio.currentTime = 0;
    }
    for (const gain of handle.gains) {
      try {
        gain.gain.cancelScheduledValues(gain.context.currentTime);
        gain.gain.setValueAtTime(0.0001, gain.context.currentTime);
      } catch {
        // Already disconnected or stopped.
      }
    }
    for (const source of handle.sources) {
      try {
        source.stop();
      } catch {
        // Source may have already ended.
      }
    }
    activeSounds.delete(soundKey);
  };

  const stopAllSounds = () => {
    stopToken += 1;
    for (const soundKey of Array.from(activeSounds.keys())) {
      stopSound(soundKey);
    }
  };

  const fadeOutSound = (name: SoundEffectName, durationMs = 140) => {
    const soundKey = normalizeSoundName(name);
    const handle = activeSounds.get(soundKey);
    if (!handle) {
      return;
    }

    const durationSec = Math.max(0.04, durationMs / 1000);
    if (handle.audio) {
      const startVolume = handle.audio.volume;
      const startedAt = performance.now();
      if (handle.fadeTimer) {
        window.clearInterval(handle.fadeTimer);
      }
      handle.fadeTimer = window.setInterval(() => {
        const progress = Math.min(1, (performance.now() - startedAt) / Math.max(1, durationMs));
        if (handle.audio) {
          handle.audio.volume = startVolume * (1 - progress);
        }
        if (progress >= 1) {
          stopSound(soundKey);
        }
      }, 24);
    }

    for (const gain of handle.gains) {
      try {
        const now = gain.context.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), now);
        gain.gain.linearRampToValueAtTime(0.0001, now + durationSec);
      } catch {
        // Already stopped.
      }
    }
    if (!handle.audio) {
      handle.cleanupTimer = window.setTimeout(() => stopSound(soundKey), durationMs + 40);
    }
  };

  const playSound = (name: SoundEffectName, options: SoundPlayOptions | number = {}) => {
    const normalized = normalizeOptions(options);
    const soundKey = normalizeSoundName(name);
    const audioContext = getContext();
    if (audioContext.state === "suspended") {
      return;
    }

    stopSound(soundKey);
    const customUrl = normalized.useCustomAssets ? normalized.customAssets?.[soundKey] : null;
    if (customUrl) {
      const audio = new Audio(customUrl);
      audio.volume = clampVolume(normalized.volume);
      const handle: ActiveSoundHandle = { audio, sources: [], gains: [] };
      activeSounds.set(soundKey, handle);
      void audio.play().catch(() => {
        if (activeSounds.get(soundKey) === handle) {
          const generated = playGenerated(audioContext, soundKey, normalized);
          activeSounds.set(soundKey, { sources: generated.sources, gains: generated.gains });
        }
      });
      audio.addEventListener("ended", () => {
        removeActiveSound(soundKey, handle);
      });
      return;
    }

    const generated = playGenerated(audioContext, soundKey, normalized);
    activeSounds.set(soundKey, { sources: generated.sources, gains: generated.gains });
  };

  return {
    unlock: async () => {
      const audioContext = getContext();
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }
      playSound("submit", { volume: 0.16, soundPack: "minimal_clean", useCustomAssets: false });
    },
    playSound,
    stopSound,
    stopAllSounds,
    fadeOutSound,
    play: playSound,
    stop: stopAllSounds,
    previewPack: (soundPack, volume = 0.32) => {
      const audioContext = getContext();
      if (audioContext.state === "suspended") {
        return;
      }
      stopAllSounds();
      const token = stopToken;
      const sequence: Array<[SoundKey, number]> = [
        ["start", 0],
        ["countdown", 420],
        ["reveal", 820],
        ["correct", 1500],
      ];
      for (const [key, delay] of sequence) {
        window.setTimeout(() => {
          if (token === stopToken) {
            playSound(key, { volume, soundPack, customAssets: {}, useCustomAssets: false });
          }
        }, delay);
      }
    },
  };
}

function normalizeOptions(options: SoundPlayOptions | number): Required<SoundPlayOptions> {
  if (typeof options === "number") {
    return {
      volume: clampVolume(options),
      soundPack: "elegant_wedding",
      customAssets: {},
      useCustomAssets: true,
    };
  }

  return {
    volume: clampVolume(options.volume ?? 0.36),
    soundPack: options.soundPack ?? "elegant_wedding",
    customAssets: options.customAssets ?? {},
    useCustomAssets: options.useCustomAssets ?? true,
  };
}

function normalizeSoundName(name: SoundEffectName): SoundKey {
  return name === "top" ? "winner" : name;
}

function playGenerated(context: AudioContext, name: SoundKey, options: Required<SoundPlayOptions>): GeneratedSoundHandle {
  const now = context.currentTime;
  const volume = clampVolume(options.volume);
  const handle: GeneratedSoundHandle = { sources: [], gains: [] };
  const previousHandle = currentGeneratedHandle;
  currentGeneratedHandle = handle;

  try {
    switch (options.soundPack === "custom" ? "elegant_wedding" : options.soundPack) {
      case "quiz_show_classic":
        playQuizShow(context, name, now, volume);
        break;
      case "party_pop":
        playPartyPop(context, name, now, volume);
        break;
      case "minimal_clean":
        playMinimalClean(context, name, now, volume);
        break;
      case "night_party":
        playNightParty(context, name, now, volume);
        break;
      case "elegant_wedding":
      default:
        playElegantWedding(context, name, now, volume);
        break;
    }
  } finally {
    currentGeneratedHandle = previousHandle;
  }

  return handle;
}

function playElegantWedding(context: AudioContext, name: SoundKey, now: number, volume: number): void {
  const v = volume * 0.82;
  switch (name) {
    case "start":
      bell(context, 523.25, now, 0.34, v * 0.62);
      bell(context, 783.99, now + 0.13, 0.42, v * 0.54);
      break;
    case "countdown":
      bell(context, 880, now, 0.18, v * 0.38);
      break;
    case "close":
      tone(context, 392, now, 0.2, v * 0.38, "sine");
      tone(context, 261.63, now + 0.14, 0.28, v * 0.34, "sine");
      break;
    case "reveal":
      shimmer(context, [392, 493.88, 659.25, 783.99], now, v * 0.5, 1.05);
      break;
    case "correct":
      bell(context, 659.25, now, 0.32, v * 0.58);
      bell(context, 880, now + 0.14, 0.42, v * 0.56);
      bell(context, 1174.66, now + 0.3, 0.48, v * 0.48);
      break;
    case "wrong":
      tone(context, 329.63, now, 0.16, v * 0.24, "sine");
      tone(context, 293.66, now + 0.13, 0.22, v * 0.22, "sine");
      break;
    case "ranking":
      arpeggio(context, [392, 523.25, 659.25, 783.99], now, 0.15, 0.18, v * 0.46, "triangle");
      break;
    case "winner":
      chord(context, [523.25, 659.25, 783.99], now, 0.38, v * 0.72, "triangle");
      chord(context, [587.33, 739.99, 987.77], now + 0.42, 0.55, v * 0.64, "triangle");
      break;
    case "submit":
      bell(context, 987.77, now, 0.16, v * 0.3);
      break;
  }
}

function playQuizShow(context: AudioContext, name: SoundKey, now: number, volume: number): void {
  const v = volume * 0.72;
  switch (name) {
    case "start":
      arpeggio(context, [392, 523.25, 659.25], now, 0.08, 0.12, v * 0.58, "triangle");
      tone(context, 783.99, now + 0.34, 0.16, v * 0.55, "triangle");
      break;
    case "countdown":
      tone(context, 740, now, 0.12, v * 0.42, "triangle");
      break;
    case "close":
      tone(context, 246.94, now, 0.16, v * 0.42, "triangle");
      tone(context, 196, now + 0.15, 0.22, v * 0.34, "triangle");
      break;
    case "reveal":
      sweep(context, 196, 880, now, 0.9, v * 0.42, "triangle");
      noise(context, now + 0.72, 0.12, v * 0.12, "highpass");
      break;
    case "correct":
      arpeggio(context, [523.25, 659.25, 783.99, 1046.5], now, 0.09, 0.16, v * 0.5, "triangle");
      break;
    case "wrong":
      tone(context, 220, now, 0.12, v * 0.26, "triangle");
      tone(context, 196, now + 0.1, 0.18, v * 0.22, "triangle");
      break;
    case "ranking":
      arpeggio(context, [261.63, 329.63, 392, 523.25, 659.25], now, 0.12, 0.18, v * 0.44, "triangle");
      break;
    case "winner":
      chord(context, [392, 493.88, 659.25], now, 0.32, v * 0.58, "triangle");
      chord(context, [523.25, 659.25, 880], now + 0.36, 0.62, v * 0.6, "triangle");
      break;
    case "submit":
      tone(context, 880, now, 0.07, v * 0.28, "sine");
      tone(context, 1174.66, now + 0.06, 0.08, v * 0.22, "sine");
      break;
  }
}

function playPartyPop(context: AudioContext, name: SoundKey, now: number, volume: number): void {
  const v = volume * 0.68;
  switch (name) {
    case "start":
      arpeggio(context, [440, 554.37, 659.25], now, 0.09, 0.12, v * 0.52, "triangle");
      break;
    case "countdown":
      tone(context, 932.33, now, 0.1, v * 0.34, "sine");
      break;
    case "close":
      tone(context, 329.63, now, 0.12, v * 0.38, "triangle");
      tone(context, 246.94, now + 0.1, 0.18, v * 0.32, "triangle");
      break;
    case "reveal":
      shimmer(context, [329.63, 415.3, 554.37, 739.99], now, v * 0.38, 0.82);
      break;
    case "correct":
      bell(context, 554.37, now, 0.22, v * 0.48);
      bell(context, 739.99, now + 0.1, 0.28, v * 0.46);
      noise(context, now + 0.24, 0.14, v * 0.08, "highpass");
      break;
    case "wrong":
      tone(context, 311.13, now, 0.18, v * 0.2, "sine");
      break;
    case "ranking":
      arpeggio(context, [369.99, 466.16, 554.37, 739.99], now, 0.12, 0.16, v * 0.42, "triangle");
      break;
    case "winner":
      chord(context, [466.16, 587.33, 739.99], now, 0.28, v * 0.5, "triangle");
      chord(context, [554.37, 698.46, 932.33], now + 0.32, 0.42, v * 0.52, "triangle");
      break;
    case "submit":
      tone(context, 1046.5, now, 0.08, v * 0.24, "sine");
      break;
  }
}

function playMinimalClean(context: AudioContext, name: SoundKey, now: number, volume: number): void {
  const v = volume * 0.5;
  switch (name) {
    case "start":
      tone(context, 659.25, now, 0.12, v * 0.38, "sine");
      tone(context, 880, now + 0.1, 0.12, v * 0.28, "sine");
      break;
    case "countdown":
      tone(context, 740, now, 0.08, v * 0.26, "sine");
      break;
    case "close":
      tone(context, 330, now, 0.18, v * 0.24, "sine");
      break;
    case "reveal":
      sweep(context, 392, 659.25, now, 0.48, v * 0.22, "sine");
      break;
    case "correct":
      tone(context, 880, now, 0.1, v * 0.32, "sine");
      tone(context, 1174.66, now + 0.1, 0.14, v * 0.24, "sine");
      break;
    case "wrong":
      tone(context, 293.66, now, 0.16, v * 0.18, "sine");
      break;
    case "ranking":
      arpeggio(context, [392, 523.25, 659.25], now, 0.1, 0.12, v * 0.28, "sine");
      break;
    case "winner":
      chord(context, [523.25, 659.25, 783.99], now, 0.34, v * 0.34, "sine");
      break;
    case "submit":
      tone(context, 880, now, 0.07, v * 0.18, "sine");
      break;
  }
}

function playNightParty(context: AudioContext, name: SoundKey, now: number, volume: number): void {
  const v = volume * 0.62;
  switch (name) {
    case "start":
      tone(context, 220, now, 0.12, v * 0.32, "triangle");
      arpeggio(context, [329.63, 415.3, 554.37], now + 0.12, 0.09, 0.16, v * 0.34, "sine");
      break;
    case "countdown":
      tone(context, 392, now, 0.1, v * 0.28, "triangle");
      break;
    case "close":
      tone(context, 164.81, now, 0.2, v * 0.34, "triangle");
      tone(context, 130.81, now + 0.16, 0.22, v * 0.24, "sine");
      break;
    case "reveal":
      sweep(context, 146.83, 587.33, now, 0.86, v * 0.32, "triangle");
      break;
    case "correct":
      arpeggio(context, [415.3, 554.37, 830.61], now, 0.12, 0.18, v * 0.38, "sine");
      break;
    case "wrong":
      tone(context, 196, now, 0.18, v * 0.2, "sine");
      break;
    case "ranking":
      chord(context, [261.63, 329.63, 493.88], now, 0.28, v * 0.38, "triangle");
      arpeggio(context, [392, 493.88, 659.25], now + 0.28, 0.13, 0.16, v * 0.34, "sine");
      break;
    case "winner":
      chord(context, [329.63, 415.3, 622.25], now, 0.36, v * 0.44, "triangle");
      chord(context, [392, 493.88, 739.99], now + 0.38, 0.52, v * 0.42, "sine");
      break;
    case "submit":
      tone(context, 622.25, now, 0.08, v * 0.2, "sine");
      break;
  }
}

function chord(
  context: AudioContext,
  frequencies: number[],
  startAt: number,
  duration: number,
  volume: number,
  type: OscillatorType,
): void {
  frequencies.forEach((frequency) => tone(context, frequency, startAt, duration, volume / frequencies.length, type));
}

function arpeggio(
  context: AudioContext,
  frequencies: number[],
  startAt: number,
  step: number,
  duration: number,
  volume: number,
  type: OscillatorType,
): void {
  frequencies.forEach((frequency, index) => tone(context, frequency, startAt + index * step, duration, volume, type));
}

function bell(context: AudioContext, frequency: number, startAt: number, duration: number, volume: number): void {
  tone(context, frequency, startAt, duration, volume * 0.72, "sine");
  tone(context, frequency * 2.01, startAt + 0.006, duration * 0.72, volume * 0.18, "sine");
  tone(context, frequency * 3.02, startAt + 0.01, duration * 0.52, volume * 0.08, "sine");
}

function shimmer(context: AudioContext, frequencies: number[], startAt: number, volume: number, duration: number): void {
  frequencies.forEach((frequency, index) => {
    const offset = (duration / frequencies.length) * index;
    bell(context, frequency, startAt + offset, 0.28, volume * 0.5);
  });
}

function tone(
  context: AudioContext,
  frequency: number,
  startAt: number,
  duration: number,
  volume: number,
  type: OscillatorType,
  send = 0.035,
): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const filter = context.createBiquadFilter();
  const peak = Math.max(0.0001, volume);
  const attack = Math.min(0.028, duration * 0.32);

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startAt);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(type === "sine" ? 3800 : 2400, startAt);
  filter.Q.setValueAtTime(0.7, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.linearRampToValueAtTime(peak, startAt + attack);
  gain.gain.setTargetAtTime(0.0001, startAt + duration * 0.62, Math.max(0.035, duration * 0.18));

  oscillator.connect(filter);
  filter.connect(gain);
  connectVoice(context, gain, send);
  currentGeneratedHandle?.sources.push(oscillator);
  currentGeneratedHandle?.gains.push(gain);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.04);
}

function sweep(
  context: AudioContext,
  startFrequency: number,
  endFrequency: number,
  startAt: number,
  duration: number,
  volume: number,
  type: OscillatorType,
): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const filter = context.createBiquadFilter();
  const peak = Math.max(0.0001, volume);

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(startFrequency, startAt);
  oscillator.frequency.exponentialRampToValueAtTime(endFrequency, startAt + duration);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1800, startAt);
  filter.frequency.linearRampToValueAtTime(3600, startAt + duration);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.linearRampToValueAtTime(peak, startAt + 0.05);
  gain.gain.setTargetAtTime(0.0001, startAt + duration * 0.72, 0.08);

  oscillator.connect(filter);
  filter.connect(gain);
  connectVoice(context, gain, 0.07);
  currentGeneratedHandle?.sources.push(oscillator);
  currentGeneratedHandle?.gains.push(gain);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.05);
}

function noise(
  context: AudioContext,
  startAt: number,
  duration: number,
  volume: number,
  filterType: BiquadFilterType,
): void {
  const sampleRate = context.sampleRate;
  const buffer = context.createBuffer(1, Math.ceil(sampleRate * duration), sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) {
    data[index] = (Math.random() * 2 - 1) * (1 - index / data.length);
  }

  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  source.buffer = buffer;
  filter.type = filterType;
  filter.frequency.setValueAtTime(1400, startAt);
  gain.gain.setValueAtTime(Math.max(0.0001, volume), startAt);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  source.connect(filter);
  filter.connect(gain);
  connectVoice(context, gain, 0.03);
  currentGeneratedHandle?.sources.push(source);
  currentGeneratedHandle?.gains.push(gain);
  source.start(startAt);
  source.stop(startAt + duration + 0.02);
}

function connectVoice(context: AudioContext, node: AudioNode, sendLevel: number): void {
  const bus = getMasterBus(context);
  const dryGain = context.createGain();
  dryGain.gain.value = 0.92;
  node.connect(dryGain);
  dryGain.connect(bus.input);

  if (sendLevel > 0) {
    const send = context.createGain();
    send.gain.value = Math.min(0.18, Math.max(0, sendLevel));
    node.connect(send);
    send.connect(bus.delay);
  }
}

function getMasterBus(context: AudioContext): MasterBus {
  const cached = masterBuses.get(context);
  if (cached) {
    return cached;
  }

  const input = context.createGain();
  const compressor = context.createDynamicsCompressor();
  const delay = context.createDelay(0.45);
  const feedback = context.createGain();
  const wetFilter = context.createBiquadFilter();
  const wetGain = context.createGain();

  input.gain.value = 0.96;
  compressor.threshold.value = -16;
  compressor.knee.value = 16;
  compressor.ratio.value = 3.5;
  compressor.attack.value = 0.006;
  compressor.release.value = 0.18;
  delay.delayTime.value = 0.105;
  feedback.gain.value = 0.14;
  wetFilter.type = "lowpass";
  wetFilter.frequency.value = 3600;
  wetGain.gain.value = 0.22;

  input.connect(compressor);
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(wetFilter);
  wetFilter.connect(wetGain);
  wetGain.connect(compressor);
  compressor.connect(context.destination);

  const bus = { input, delay };
  masterBuses.set(context, bus);
  return bus;
}

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) {
    return 0.34;
  }

  return Math.min(0.85, Math.max(0, value));
}
