"use client";

import { ArrowDown, ArrowUp, Clipboard, ImagePlus, Monitor, Save, Smartphone, Trash2, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  defaultBasePointsForDifficulty,
  difficultyLabels,
  questionDifficulties,
} from "@/lib/question-settings";
import { Button } from "@/components/ui/button";
import { QuestionScoreBadges } from "@/components/quiz/question-score-badges";
import type { AdminQuestion, QuestionDifficulty } from "@/types/quiz";

export type QuestionFormState = Omit<AdminQuestion, "id"> & { id?: string };

export const emptyQuestion: QuestionFormState = {
  orderNo: 0,
  text: "",
  options: ["", "", "", ""],
  imageUrl: null,
  optionImageUrls: [null, null, null, null],
  correctIndex: 0,
  timeLimitSec: 10,
  difficulty: "normal",
  basePoints: 100,
  speedBonusEnabled: true,
  presenterNote: null,
};

export function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/70 p-3">
      <div className="flex items-center gap-2 text-slate-600">
        {icon}
        <span className="text-xs font-black">{label}</span>
      </div>
      <p className="mt-1 text-3xl font-black text-[#13294b]">{value}</p>
    </div>
  );
}

function ImageUrlInput({
  value,
  disabled,
  uploadBusy,
  compact = false,
  onChange,
  onUpload,
}: {
  value: string | null;
  disabled: boolean;
  uploadBusy: boolean;
  compact?: boolean;
  onChange: (value: string | null) => void;
  onUpload: (file: File) => void;
}) {
  return (
    <div className={compact ? "grid gap-2" : "grid gap-2 sm:grid-cols-[1fr_auto]"}>
      <input
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
        disabled={disabled}
        className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:ring-4 focus:ring-[#d9b56d]/40"
        placeholder="画像URL またはアップロード"
      />
      <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#d9b56d] bg-white px-3 text-sm font-black text-[var(--wql-text)] transition hover:bg-[var(--wql-accent-soft)]">
        <ImagePlus className="size-4" aria-hidden="true" />
        {uploadBusy ? "アップロード中" : "画像"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled || uploadBusy}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.currentTarget.value = "";
            if (file) {
              onUpload(file);
            }
          }}
        />
      </label>
    </div>
  );
}

function QuestionPreviewImage({
  src,
  alt,
  small = false,
  dark = false,
}: {
  src: string;
  alt: string;
  small?: boolean;
  dark?: boolean;
}) {
  return (
    <div className={small ? "mt-2 overflow-hidden rounded-lg" : "mt-3 overflow-hidden rounded-xl"}>
      <img
        src={src}
        alt={alt}
        className={[
          "w-full object-cover",
          small ? "max-h-24" : "max-h-48",
          dark ? "bg-white/10" : "bg-slate-100",
        ].join(" ")}
        loading="lazy"
      />
    </div>
  );
}

export function UrlCopy({
  label,
  value,
  secret = false,
  roomCode,
  onCopy,
}: {
  label: string;
  value: string;
  secret?: boolean;
  roomCode?: string;
  onCopy: (value: string) => Promise<void>;
}) {
  async function handleCopy() {
    if (secret) {
      const accepted = window.confirm(
        "管理URLでは、問題編集や進行操作ができます。ゲストやスクリーンに共有しない前提でコピーしますか？",
      );
      if (!accepted) {
        return;
      }
    }
    await onCopy(value);
  }

  return (
    <div className="grid gap-2 rounded-xl border border-slate-200 bg-white/80 p-3">
      <p className="text-xs font-black text-slate-500">
        {label}
        {secret ? "（非共有）" : ""}
      </p>
      <p className="break-all text-sm font-bold text-[#13294b]">
        {secret
          ? `管理権限付きURLです。表示せずにコピーのみ許可します。roomCode: ${roomCode ?? ""}`
          : value}
      </p>
      <Button
        size="sm"
        variant="secondary"
        icon={<Clipboard className="size-4" aria-hidden="true" />}
        onClick={handleCopy}
      >
        コピー
      </Button>
    </div>
  );
}

export function QuestionEditor({
  title,
  initial,
  busy,
  onSave,
  onDelete,
  onMoveUp,
  onMoveDown,
  editingLocked,
  onUploadImage,
}: {
  title: string;
  initial: QuestionFormState;
  busy: boolean;
  onSave: (question: QuestionFormState) => Promise<void>;
  onDelete?: () => Promise<void>;
  onMoveUp?: () => Promise<void>;
  onMoveDown?: () => Promise<void>;
  editingLocked: boolean;
  onUploadImage?: (file: File, kind: "question" | "option") => Promise<string>;
}) {
  const [draft, setDraft] = useState<QuestionFormState>(initial);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const isDirty = JSON.stringify(draft) !== JSON.stringify(initial);

  function updateOption(index: number, value: string) {
    const nextOptions: [string, string, string, string] = [
      draft.options[0],
      draft.options[1],
      draft.options[2],
      draft.options[3],
    ];
    nextOptions[index] = value;
    setDraft({ ...draft, options: nextOptions });
  }

  function updateDifficulty(difficulty: QuestionDifficulty) {
    setDraft({
      ...draft,
      difficulty,
      basePoints: defaultBasePointsForDifficulty(difficulty),
    });
  }

  function updateOptionImage(index: number, value: string | null) {
    const current = draft.optionImageUrls ?? [null, null, null, null];
    const nextOptionImageUrls: [string | null, string | null, string | null, string | null] = [
      current[0],
      current[1],
      current[2],
      current[3],
    ];
    nextOptionImageUrls[index] = value;
    setDraft({ ...draft, optionImageUrls: nextOptionImageUrls });
  }

  async function uploadImage(file: File, kind: "question" | "option", applyUrl: (url: string) => void, key: string) {
    if (!onUploadImage) {
      return;
    }

    try {
      setUploadingKey(key);
      const url = await onUploadImage(file, kind);
      applyUrl(url);
    } finally {
      setUploadingKey(null);
    }
  }

  return (
    <div className="grid gap-3 rounded-2xl border border-[#d9b56d]/45 bg-white/75 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-black text-[#13294b]">{title}</h3>
          <div className="mt-1">
            <QuestionScoreBadges question={draft} />
          </div>
          {isDirty ? <p className="mt-2 text-xs font-black text-[#b45309]">未保存の変更があります</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {onMoveUp ? (
            <Button size="sm" variant="ghost" icon={<ArrowUp className="size-4" />} onClick={onMoveUp} disabled={busy || editingLocked}>
              上へ
            </Button>
          ) : null}
          {onMoveDown ? (
            <Button size="sm" variant="ghost" icon={<ArrowDown className="size-4" />} onClick={onMoveDown} disabled={busy || editingLocked}>
              下へ
            </Button>
          ) : null}
          {onDelete ? (
            <Button size="sm" variant="danger" icon={<Trash2 className="size-4" />} onClick={onDelete} disabled={busy || editingLocked}>
              削除
            </Button>
          ) : null}
          <Button
            size="sm"
            icon={<Save className="size-4" />}
            onClick={() => onSave(draft)}
            disabled={busy || editingLocked || !isDirty}
          >
            保存
          </Button>
        </div>
      </div>

      <textarea
        value={draft.text}
        onChange={(event) => setDraft({ ...draft, text: event.target.value })}
        rows={2}
        disabled={editingLocked}
        className="min-h-20 rounded-xl border border-slate-200 bg-white p-3 font-bold outline-none focus:ring-4 focus:ring-[#d9b56d]/40"
        placeholder="問題文"
      />

      <div className="grid gap-3 rounded-xl bg-white/70 p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-black text-slate-500">問題画像</span>
          {draft.imageUrl ? (
            <button
              type="button"
              onClick={() => setDraft({ ...draft, imageUrl: null })}
              disabled={editingLocked}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-600"
            >
              <X className="size-3" aria-hidden="true" />
              削除
            </button>
          ) : null}
        </div>
        <ImageUrlInput
          value={draft.imageUrl}
          disabled={editingLocked}
          uploadBusy={uploadingKey === "question"}
          onChange={(imageUrl) => setDraft({ ...draft, imageUrl })}
          onUpload={(file) =>
            uploadImage(file, "question", (imageUrl) => setDraft((current) => ({ ...current, imageUrl })), "question")
          }
        />
        {draft.imageUrl ? <QuestionPreviewImage src={draft.imageUrl} alt="問題画像プレビュー" /> : null}
      </div>

      <label className="grid gap-1">
        <span className="text-xs font-black text-slate-500">司会者メモ</span>
        <textarea
          value={draft.presenterNote ?? ""}
          onChange={(event) => setDraft({ ...draft, presenterNote: event.target.value.slice(0, 500) })}
          rows={2}
          disabled={editingLocked}
          className="min-h-16 rounded-xl border border-slate-200 bg-white p-3 text-sm font-bold outline-none focus:ring-4 focus:ring-[#d9b56d]/40"
          placeholder="スクリーンやゲストには表示されません"
        />
      </label>

      <div className="grid gap-3 lg:grid-cols-3">
        <label className="grid gap-1">
          <span className="text-xs font-black text-slate-500">難易度</span>
          <select
            value={draft.difficulty}
            onChange={(event) => updateDifficulty(event.target.value as QuestionDifficulty)}
            disabled={editingLocked}
            className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 font-bold outline-none focus:ring-4 focus:ring-[#d9b56d]/40"
          >
            {questionDifficulties.map((difficulty) => (
              <option key={difficulty} value={difficulty}>
                {difficultyLabels[difficulty]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-black text-slate-500">基本得点</span>
          <input
            type="number"
            min={10}
            max={1000}
            value={draft.basePoints}
            onChange={(event) => setDraft({ ...draft, basePoints: Number(event.target.value) })}
            disabled={editingLocked}
            className="min-h-11 rounded-lg border border-slate-200 px-3 font-bold outline-none focus:ring-4 focus:ring-[#d9b56d]/40"
          />
          <span className="text-xs font-bold leading-5 text-slate-500">
            正解時に加算される基本点です。
          </span>
        </label>
        <label className="grid content-start gap-2 rounded-xl bg-white/80 p-3 text-sm font-bold text-[#13294b]">
          <span className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={draft.speedBonusEnabled}
              onChange={(event) => setDraft({ ...draft, speedBonusEnabled: event.target.checked })}
              disabled={editingLocked}
            />
            速度ボーナスを有効にする
          </span>
          <span className="text-xs font-bold leading-5 text-slate-500">
            早く正解した人に追加点が入ります。判定得点問題はOFFにできます。
          </span>
        </label>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {draft.options.map((option, index) => (
          <label key={index} className="grid gap-1 rounded-xl bg-white/70 p-3">
            <span className="text-xs font-black text-slate-500">
              {String.fromCharCode(65 + index)} 選択肢
            </span>
            <input
              value={option}
              onChange={(event) => updateOption(index, event.target.value)}
              disabled={editingLocked}
              className="min-h-11 rounded-lg border border-slate-200 px-3 font-bold outline-none focus:ring-4 focus:ring-[#d9b56d]/40"
            />
            <ImageUrlInput
              value={draft.optionImageUrls?.[index] ?? null}
              disabled={editingLocked}
              uploadBusy={uploadingKey === `option-${index}`}
              compact
              onChange={(imageUrl) => updateOptionImage(index, imageUrl)}
              onUpload={(file) =>
                uploadImage(file, "option", (imageUrl) => updateOptionImage(index, imageUrl), `option-${index}`)
              }
            />
            {draft.optionImageUrls?.[index] ? (
              <div className="grid gap-2">
                <QuestionPreviewImage src={draft.optionImageUrls[index] ?? ""} alt={`${String.fromCharCode(65 + index)} 選択肢画像`} small />
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    updateOptionImage(index, null);
                  }}
                  disabled={editingLocked}
                  className="inline-flex w-fit items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-600"
                >
                  <X className="size-3" aria-hidden="true" />
                  画像削除
                </button>
              </div>
            ) : null}
            <label className="mt-1 flex items-center gap-2 text-sm font-bold text-[#13294b]">
              <input
                type="radio"
                checked={draft.correctIndex === index}
                onChange={() => setDraft({ ...draft, correctIndex: index })}
                disabled={editingLocked}
              />
              正解にする
            </label>
          </label>
        ))}
      </div>

      <label className="grid gap-1 sm:max-w-xs">
        <span className="text-xs font-black text-slate-500">制限時間（秒）</span>
        <input
          type="number"
          min={5}
          max={60}
          value={draft.timeLimitSec}
          onChange={(event) =>
            setDraft({ ...draft, timeLimitSec: Number(event.target.value) })
          }
          disabled={editingLocked}
          className="min-h-11 rounded-lg border border-slate-200 px-3 font-bold outline-none focus:ring-4 focus:ring-[#d9b56d]/40"
        />
      </label>

      <div className="grid gap-3 border-t border-[#eadcc4] pt-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#d9b56d]/30 bg-[#fffaf2] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-[#8a6a22]">
            <Smartphone className="size-4" aria-hidden="true" />
            ゲスト表示プレビュー
          </div>
          <QuestionScoreBadges question={draft} showDifficulty={false} showSpeedBonus={false} />
          <p className="mt-3 text-lg font-black leading-snug text-[#13294b]">
            {draft.text || "ここに問題文が表示されます"}
          </p>
          <div className="mt-3 grid gap-2">
            {draft.options.map((option, index) => (
              <div key={`guest-preview-${index}`} className="rounded-xl border border-slate-200 bg-white p-3 text-sm font-black text-[#13294b]">
                <span className="mr-2 text-[#b89443]">{String.fromCharCode(65 + index)}.</span>
                {option || "選択肢"}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-[#13294b] p-4 text-white">
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-[#ffe7a3]">
            <Monitor className="size-4" aria-hidden="true" />
            スクリーン表示プレビュー
          </div>
          <QuestionScoreBadges question={draft} showDifficulty={false} showSpeedBonus={false} />
          <p className="mt-3 text-2xl font-black leading-snug">
            {draft.text || "ここに問題文が大きく表示されます"}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {draft.options.map((option, index) => (
              <div key={`screen-preview-${index}`} className="rounded-xl bg-white/10 p-3 text-base font-black">
                <span className="mr-2 text-[#ffe7a3]">{String.fromCharCode(65 + index)}.</span>
                {option || "選択肢"}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs font-bold text-white/70">
            プレビューでは回答受付を開始しません。
          </p>
        </div>
      </div>
    </div>
  );
}
