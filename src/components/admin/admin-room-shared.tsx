"use client";

import { ArrowDown, ArrowUp, Clipboard, Monitor, Save, Smartphone, Trash2 } from "lucide-react";
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
  correctIndex: 0,
  timeLimitSec: 10,
  difficulty: "normal",
  basePoints: 100,
  speedBonusEnabled: true,
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
}: {
  title: string;
  initial: QuestionFormState;
  busy: boolean;
  onSave: (question: QuestionFormState) => Promise<void>;
  onDelete?: () => Promise<void>;
  onMoveUp?: () => Promise<void>;
  onMoveDown?: () => Promise<void>;
  editingLocked: boolean;
}) {
  const [draft, setDraft] = useState<QuestionFormState>(initial);
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
