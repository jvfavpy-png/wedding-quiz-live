"use client";

import { Maximize2, Volume2 } from "lucide-react";

export function ScreenSoundControl({
  soundSupported,
  soundEnabled,
  soundReady,
  fullscreen,
  fullscreenSupported,
  onEnableSound,
  onToggleFullscreen,
}: {
  soundSupported: boolean;
  soundEnabled: boolean;
  soundReady: boolean;
  fullscreen: boolean;
  fullscreenSupported: boolean;
  onEnableSound: () => void;
  onToggleFullscreen: () => void;
}) {
  const showSoundButton = soundEnabled && !soundReady && soundSupported;
  const showFullscreenButton = fullscreenSupported && !fullscreen;

  if (!showSoundButton && !showFullscreenButton) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-3 text-sm font-black text-[var(--wql-text)]">
      {showSoundButton ? (
        <button
          type="button"
          onClick={onEnableSound}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--wql-text)] px-5 py-2 text-white shadow-lg transition hover:-translate-y-0.5"
        >
          <Volume2 className="size-4" aria-hidden="true" />
          効果音を有効にする
        </button>
      ) : null}

      {showFullscreenButton ? (
        <button
          type="button"
          onClick={onToggleFullscreen}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white/88 px-5 py-2 text-[var(--wql-text)] shadow-lg transition hover:-translate-y-0.5"
        >
          <Maximize2 className="size-4" aria-hidden="true" />
          全画面表示にする
        </button>
      ) : null}
    </div>
  );
}
