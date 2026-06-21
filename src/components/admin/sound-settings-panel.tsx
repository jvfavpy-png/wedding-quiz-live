"use client";

import { useMemo, useState } from "react";
import { Headphones, Play, Save, Trash2, Upload, Volume2 } from "lucide-react";
import { providedSoundAssetUrls } from "@/lib/sound-asset-manifest";
import { createSoundPlayer } from "@/lib/sound-effects";
import {
  effectStyleIds,
  effectStyles,
  recommendedSoundByTheme,
  soundKeyLabels,
  soundKeys,
  soundPackIds,
  soundPacks,
} from "@/lib/sound-presets";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import type { DesignThemeId, EffectStyleId, SoundAsset, SoundKey, SoundPackId, SoundSettings } from "@/types/quiz";

export function SoundSettingsPanel({
  settings,
  designTheme,
  soundAssets,
  busy,
  disabled,
  onChange,
  onSave,
  onUploadSound,
  onDeleteSound,
}: {
  settings: SoundSettings;
  designTheme: DesignThemeId;
  soundAssets: SoundAsset[];
  busy: string | null;
  disabled: boolean;
  onChange: (settings: SoundSettings) => void;
  onSave: () => Promise<void>;
  onUploadSound: (soundKey: SoundKey, file: File) => Promise<void>;
  onDeleteSound: (soundKey: SoundKey) => Promise<void>;
}) {
  const [previewError, setPreviewError] = useState<string | null>(null);
  const player = useMemo(() => createSoundPlayer(), []);
  const assetByKey = useMemo(
    () => new Map(soundAssets.map((asset) => [asset.soundKey, asset])),
    [soundAssets],
  );
  const customAssetUrls = useMemo(() => {
    const entries = soundAssets.map((asset) => [asset.soundKey, asset.fileUrl] as const);
    return { ...providedSoundAssetUrls, ...Object.fromEntries(entries) } as Partial<Record<SoundKey, string>>;
  }, [soundAssets]);
  const recommended = recommendedSoundByTheme[designTheme];

  async function preview(soundKey: SoundKey, soundPack: SoundPackId = settings.soundPack, useCustomAssets = true) {
    try {
      setPreviewError(null);
      if (!player) {
        throw new Error("このブラウザでは効果音を再生できません。");
      }
      await player.unlock();
      player.play(soundKey, {
        volume: 0.28,
        soundPack,
        customAssets: customAssetUrls,
        useCustomAssets,
      });
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : "試聴に失敗しました。");
    }
  }

  async function previewPack(soundPack: SoundPackId) {
    try {
      setPreviewError(null);
      if (!player) {
        throw new Error("このブラウザでは効果音を再生できません。");
      }
      await player.unlock();
      player.previewPack(soundPack, 0.28);
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : "試聴に失敗しました。");
    }
  }

  function update(patch: Partial<SoundSettings>) {
    onChange({ ...settings, ...patch });
  }

  return (
    <Card className="grid gap-5">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <CardTitle>効果音・演出</CardTitle>
          <p className="mt-1 text-sm font-bold leading-6 text-slate-600">
            会場の雰囲気に合わせて、効果音と演出を調整できます。スクリーン画面では、開始前に効果音を有効化してください。
          </p>
          <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
            既存のテレビ番組やゲームの効果音は使用していません。標準SEはWeb Audio APIで生成します。
          </p>
        </div>
        <Button
          icon={<Save className="size-4" aria-hidden="true" />}
          onClick={onSave}
          disabled={disabled || busy !== null}
        >
          設定を保存
        </Button>
      </div>

      {previewError ? (
        <div className="rounded-xl bg-[#fff5f6] p-3 text-sm font-black leading-6 text-[#8f1d2b]">
          {previewError}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <ToggleRow
          label="効果音を使う"
          description="スクリーン画面でSEを再生します。OFFでも進行は止まりません。"
          checked={settings.soundEnabled}
          disabled={disabled}
          onChange={(checked) => update({ soundEnabled: checked })}
        />
        <ToggleRow
          label="演出を使う"
          description="正解発表やランキングの動きを有効にします。"
          checked={settings.visualEffectsEnabled}
          disabled={disabled}
          onChange={(checked) => update({ visualEffectsEnabled: checked })}
        />
        <ToggleRow
          label="正解・ランキングの祝福演出"
          description="紙吹雪は控えめに表示し、文字を隠さない量に抑えます。"
          checked={settings.screenConfettiEnabled}
          disabled={disabled || !settings.visualEffectsEnabled}
          onChange={(checked) => update({ screenConfettiEnabled: checked })}
        />
        <ToggleRow
          label="ゲスト画面の演出"
          description="スマホ側の祝福演出です。控えめな表示に限定します。"
          checked={settings.guestEffectsEnabled}
          disabled={disabled || !settings.visualEffectsEnabled}
          onChange={(checked) => update({ guestEffectsEnabled: checked })}
        />
        <ToggleRow
          label="ゲスト画面の効果音"
          description="初期OFF推奨。会場ではスクリーン音声を優先してください。"
          checked={settings.guestSoundEnabled}
          disabled={disabled || !settings.soundEnabled}
          onChange={(checked) => update({ guestSoundEnabled: checked })}
        />
      </div>

      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white/70 p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-black">スクリーン音量</h3>
            <p className="mt-1 text-xs font-bold leading-5 text-slate-600">
              会場のスピーカーに合わせて調整します。スクリーン画面には音量スライダーを表示しません。
            </p>
          </div>
          <span className="text-2xl font-black text-[var(--wql-accent-text)]">
            {Math.round(settings.screenVolume * 100)}%
          </span>
        </div>
        <label className="grid gap-2 text-xs font-black text-slate-600">
          <span className="sr-only">スクリーン音量</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.screenVolume}
            disabled={disabled || !settings.soundEnabled}
            onChange={(event) => update({ screenVolume: Number(event.target.value) })}
            className="h-2 w-full accent-[var(--wql-accent)] disabled:opacity-40"
          />
        </label>
      </section>

      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white/70 p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-black">正解発表前の待ち時間</h3>
            <p className="mt-1 text-xs font-bold leading-5 text-slate-600">
              「正解は……」と表示してから、実際に正解を出すまでの時間を設定できます。
            </p>
          </div>
          <span className="text-2xl font-black text-[var(--wql-accent-text)]">
            {settings.revealDelaySeconds.toFixed(1)}秒
          </span>
        </div>
        <label className="grid gap-2 text-xs font-black text-slate-600">
          <span className="sr-only">正解発表前の待ち時間</span>
          <input
            type="range"
            min="0"
            max="5"
            step="0.1"
            value={settings.revealDelaySeconds}
            disabled={disabled}
            onChange={(event) => update({ revealDelaySeconds: Number(event.target.value) })}
            className="h-2 w-full accent-[var(--wql-accent)] disabled:opacity-40"
          />
        </label>
      </section>

      <section className="grid gap-3 rounded-2xl border border-[#d9b56d]/30 bg-white/70 p-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-base font-black">効果音プリセット</h3>
            <p className="mt-1 text-xs font-bold leading-5 text-slate-600">
              現在のテーマ推奨: {soundPacks[recommended.soundPack].name} / {effectStyles[recommended.effectStyle].name}
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            icon={<Headphones className="size-4" aria-hidden="true" />}
            onClick={() => previewPack(settings.soundPack)}
            disabled={disabled || !settings.soundEnabled}
          >
            プリセットを試聴
          </Button>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {soundPackIds.map((packId) => {
            const pack = soundPacks[packId];
            const selected = settings.soundPack === packId;
            return (
              <button
                key={packId}
                type="button"
                onClick={() => update({ soundPack: packId })}
                disabled={disabled}
                className={[
                  "grid gap-2 rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50",
                  selected ? "border-[var(--wql-accent)] bg-[var(--wql-accent-soft)]" : "border-slate-200 bg-white",
                ].join(" ")}
                aria-pressed={selected}
              >
                <span className="text-base font-black text-[var(--wql-text)]">{pack.name}</span>
                <span className="text-xs font-bold leading-5 text-slate-600">{pack.description}</span>
                <span className="text-xs font-black text-[var(--wql-accent-text)]">
                  使用音源: {pack.sourceType} / {pack.licenseStatus}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white/70 p-4">
        <h3 className="text-base font-black">演出スタイル</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {effectStyleIds.map((styleId) => {
            const style = effectStyles[styleId];
            const selected = settings.effectStyle === styleId;
            return (
              <button
                key={styleId}
                type="button"
                onClick={() => update({ effectStyle: styleId as EffectStyleId })}
                disabled={disabled}
                className={[
                  "rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50",
                  selected ? "border-[var(--wql-accent)] bg-[var(--wql-accent-soft)]" : "border-slate-200 bg-white",
                ].join(" ")}
                aria-pressed={selected}
              >
                <span className="text-base font-black">{style.name}</span>
                <span className="mt-1 block text-xs font-bold leading-5 text-slate-600">{style.description}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-3 rounded-2xl border border-[#d9b56d]/30 bg-white/70 p-4">
        <div>
          <h3 className="text-base font-black">カスタム効果音</h3>
          <p className="mt-1 text-xs font-bold leading-5 text-slate-600">
            無料素材を利用する場合は、配布元の利用規約を確認し、結婚式・二次会で使用できる音源だけをアップロードしてください。
            権利不明の音源、テレビ番組やゲームの効果音はアップロードしないでください。
          </p>
        </div>
        <div className="grid gap-2">
          {soundKeys.map((soundKey) => {
            const asset = assetByKey.get(soundKey);
            return (
              <div
                key={soundKey}
                className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 lg:grid-cols-[150px_1fr_auto] lg:items-center"
              >
                <div>
                  <p className="text-sm font-black text-[var(--wql-text)]">{soundKeyLabels[soundKey]}</p>
                  <p className="text-xs font-bold text-slate-500">{soundKey}</p>
                </div>
                <div className="min-w-0 text-xs font-bold leading-5 text-slate-600">
                  {asset ? (
                    <>
                      <p className="truncate">アップロード済み: {asset.fileName ?? "custom sound"}</p>
                      <p>{asset.mimeType ?? "audio"} / {formatBytes(asset.sizeBytes)}</p>
                    </>
                  ) : (
                    <p>未設定。提供音源があるSEは提供音源、未対応スロットはWeb Audio標準音へfallbackします。</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Play className="size-4" aria-hidden="true" />}
                    onClick={() => preview(soundKey)}
                    disabled={disabled || !settings.soundEnabled}
                  >
                    試聴
                  </Button>
                  <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--wql-accent)] bg-white px-3 text-sm font-bold text-[var(--wql-text)] transition hover:bg-[var(--wql-accent-soft)]">
                    <Upload className="size-4" aria-hidden="true" />
                    差し替え
                    <input
                      type="file"
                      accept="audio/mpeg,audio/wav,audio/ogg,audio/webm"
                      disabled={disabled || busy !== null}
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.currentTarget.value = "";
                        if (file) {
                          void onUploadSound(soundKey, file);
                        }
                      }}
                    />
                  </label>
                  {asset ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Trash2 className="size-4" aria-hidden="true" />}
                      onClick={() => onDeleteSound(soundKey)}
                      disabled={disabled || busy !== null}
                    >
                      削除
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="rounded-xl bg-slate-50 p-3 text-xs font-bold leading-5 text-slate-600">
        <Volume2 className="mr-1 inline size-4 align-[-3px] text-[var(--wql-accent-strong)]" aria-hidden="true" />
        効果音や演出は管理画面で設定します。スクリーン画面には本番中の設定UIを表示しません。
      </div>
    </Card>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 size-4 accent-[var(--wql-accent)]"
      />
      <span>
        <span className="block text-sm font-black text-[var(--wql-text)]">{label}</span>
        <span className="mt-1 block text-xs font-bold leading-5 text-slate-600">{description}</span>
      </span>
    </label>
  );
}

function formatBytes(value: number | null): string {
  if (!value || value <= 0) {
    return "サイズ不明";
  }
  if (value < 1024 * 1024) {
    return `${Math.ceil(value / 1024)}KB`;
  }
  return `${(value / 1024 / 1024).toFixed(1)}MB`;
}
