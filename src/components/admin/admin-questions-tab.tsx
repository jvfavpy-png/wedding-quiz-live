"use client";

import { Download, FileUp, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { emptyQuestion, QuestionEditor, type QuestionFormState } from "@/components/admin/admin-room-shared";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import type { AdminQuestion, QuestionDifficulty } from "@/types/quiz";

export function AdminQuestionsTab({
  roomCode,
  questions,
  editingLocked,
  busy,
  onSaveQuestion,
  onDeleteQuestion,
  onMoveQuestion,
  onUploadImage,
}: {
  roomCode: string;
  questions: AdminQuestion[];
  editingLocked: boolean;
  busy: string | null;
  onSaveQuestion: (question: QuestionFormState) => Promise<void>;
  onDeleteQuestion: (questionId: string) => Promise<void>;
  onMoveQuestion: (questionId: string, direction: -1 | 1) => Promise<void>;
  onUploadImage: (file: File, kind: "question" | "option") => Promise<string>;
}) {
  const [importMode, setImportMode] = useState<"append" | "replace">("append");

  async function importQuestions(file: File) {
    const text = await file.text();
    const imported = file.name.toLowerCase().endsWith(".csv") ? parseQuestionCsv(text) : parseQuestionJson(text);

    if (imported.length === 0) {
      window.alert("インポートできる問題がありません。");
      return;
    }

    if (importMode === "replace") {
      const accepted = window.confirm(
        "現在の問題をすべて置き換えます。回答履歴がある場合は、先にリセットしてください。実行しますか？",
      );
      if (!accepted) {
        return;
      }
      for (const question of questions) {
        await onDeleteQuestion(question.id);
      }
    }

    for (const [index, question] of imported.entries()) {
      await onSaveQuestion({
        ...question,
        id: undefined,
        orderNo: importMode === "replace" ? index + 1 : 0,
      });
    }
  }

  return (
    <Card className="grid gap-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <CardTitle>問題編集</CardTitle>
          <p className="mt-1 text-sm font-bold leading-6 text-slate-600">
            現在 {questions.length} 問。画像付き問題、選択肢画像、司会者メモを設定できます。
            回答済みの問題を編集する場合は、先に回答と得点をリセットしてください。
          </p>
        </div>
        {editingLocked ? (
          <div className="inline-flex items-center gap-2 rounded-xl bg-[#fff6d8] px-3 py-2 text-xs font-black text-[#6d4b00]">
            <ShieldAlert className="size-4" aria-hidden="true" />
            回答受付中は編集できません
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 rounded-2xl border border-[#d9b56d]/30 bg-white/70 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-base font-black text-[var(--wql-text)]">問題データのバックアップ</h3>
            <p className="mt-1 text-xs font-bold leading-5 text-slate-600">
              画像本体は含めず、画像URLのみを書き出します。インポートは追加または全置換を選べます。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" icon={<Download className="size-4" />} onClick={() => exportQuestionsJson(roomCode, questions)}>
              JSONエクスポート
            </Button>
            <Button size="sm" variant="secondary" icon={<Download className="size-4" />} onClick={() => exportQuestionsCsv(roomCode, questions)}>
              CSVエクスポート
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={importMode}
            onChange={(event) => setImportMode(event.target.value as "append" | "replace")}
            disabled={editingLocked}
            className="min-h-10 rounded-xl border border-[#d9b56d]/60 bg-white px-3 text-sm font-bold"
          >
            <option value="append">既存問題に追加</option>
            <option value="replace">既存問題を全置換</option>
          </select>
          <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl bg-[var(--wql-text)] px-4 py-2 text-sm font-bold text-white transition hover:brightness-95">
            <FileUp className="size-4" aria-hidden="true" />
            JSON/CSVインポート
            <input
              type="file"
              accept=".json,.csv,application/json,text/csv"
              className="sr-only"
              disabled={editingLocked || busy !== null}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.currentTarget.value = "";
                if (file) {
                  void importQuestions(file).catch((error) => {
                    window.alert(error instanceof Error ? error.message : "インポートに失敗しました。");
                  });
                }
              }}
            />
          </label>
        </div>
      </div>

      <QuestionEditor
        key={`new-question-${questions.length}`}
        title="新しい問題"
        initial={emptyQuestion}
        busy={busy === "save-new"}
        onSave={onSaveQuestion}
        editingLocked={editingLocked}
        onUploadImage={onUploadImage}
      />

      <div className="grid gap-4">
        {questions.map((question, index) => (
          <QuestionEditor
            key={`${question.id}-${question.orderNo}-${question.text}-${question.options.join("|")}-${question.correctIndex}-${question.timeLimitSec}-${question.difficulty}-${question.basePoints}-${question.speedBonusEnabled}-${question.imageUrl ?? ""}-${question.optionImageUrls.join("|")}`}
            title={`Q${question.orderNo}`}
            initial={question}
            busy={busy === `save-${question.id}` || busy === `delete-${question.id}` || busy === `move-${question.id}`}
            onSave={onSaveQuestion}
            onDelete={() => onDeleteQuestion(question.id)}
            onMoveUp={index === 0 ? undefined : () => onMoveQuestion(question.id, -1)}
            onMoveDown={index === questions.length - 1 ? undefined : () => onMoveQuestion(question.id, 1)}
            editingLocked={editingLocked}
            onUploadImage={onUploadImage}
          />
        ))}
      </div>
    </Card>
  );
}

function exportQuestionsJson(roomCode: string, questions: AdminQuestion[]) {
  downloadText(
    `wedding-quiz-questions_${roomCode}_${dateStamp()}.json`,
    "application/json",
    JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), questions }, null, 2),
  );
}

function exportQuestionsCsv(roomCode: string, questions: AdminQuestion[]) {
  const headers = [
    "orderNo",
    "text",
    "optionA",
    "optionB",
    "optionC",
    "optionD",
    "correctIndex",
    "timeLimitSec",
    "difficulty",
    "basePoints",
    "speedBonusEnabled",
    "presenterNote",
    "imageUrl",
    "optionAImageUrl",
    "optionBImageUrl",
    "optionCImageUrl",
    "optionDImageUrl",
  ];
  const rows = questions.map((question) => [
    question.orderNo,
    question.text,
    question.options[0],
    question.options[1],
    question.options[2],
    question.options[3],
    question.correctIndex,
    question.timeLimitSec,
    question.difficulty,
    question.basePoints,
    question.speedBonusEnabled ? "true" : "false",
    question.presenterNote ?? "",
    question.imageUrl ?? "",
    question.optionImageUrls[0] ?? "",
    question.optionImageUrls[1] ?? "",
    question.optionImageUrls[2] ?? "",
    question.optionImageUrls[3] ?? "",
  ]);
  downloadText(
    `wedding-quiz-questions_${roomCode}_${dateStamp()}.csv`,
    "text/csv;charset=utf-8",
    [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n"),
  );
}

function parseQuestionJson(text: string): QuestionFormState[] {
  const parsed = JSON.parse(text) as { questions?: unknown[] } | unknown[];
  const rows = Array.isArray(parsed) ? parsed : parsed.questions;
  if (!Array.isArray(rows)) {
    throw new Error("JSONにquestions配列がありません。");
  }

  return rows.map(normalizeImportedQuestion);
}

function parseQuestionCsv(text: string): QuestionFormState[] {
  const rows = parseCsvRows(text).filter((row) => row.some((cell) => cell.trim()));
  const [headers, ...body] = rows;
  if (!headers) {
    return [];
  }
  return body.map((row) => {
    const record = Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""]));
    return normalizeImportedQuestion({
      orderNo: Number(record.orderNo),
      text: record.text,
      options: [record.optionA, record.optionB, record.optionC, record.optionD],
      correctIndex: Number(record.correctIndex),
      timeLimitSec: Number(record.timeLimitSec),
      difficulty: record.difficulty,
      basePoints: Number(record.basePoints),
      speedBonusEnabled: record.speedBonusEnabled,
      presenterNote: record.presenterNote,
      imageUrl: record.imageUrl,
      optionImageUrls: [
        record.optionAImageUrl || null,
        record.optionBImageUrl || null,
        record.optionCImageUrl || null,
        record.optionDImageUrl || null,
      ],
    });
  });
}

function normalizeImportedQuestion(value: unknown): QuestionFormState {
  const question = value as Partial<QuestionFormState>;
  const options = Array.isArray(question.options) ? question.options : [];
  const difficulty = normalizeDifficulty(question.difficulty);
  const normalized: QuestionFormState = {
    orderNo: Number(question.orderNo ?? 0),
    text: String(question.text ?? "").trim(),
    options: [
      String(options[0] ?? "").trim(),
      String(options[1] ?? "").trim(),
      String(options[2] ?? "").trim(),
      String(options[3] ?? "").trim(),
    ],
    correctIndex: Number(question.correctIndex ?? 0),
    timeLimitSec: Number(question.timeLimitSec ?? 10),
    difficulty,
    basePoints: Number(question.basePoints ?? 100),
    speedBonusEnabled: normalizeSpeedBonus(question.speedBonusEnabled),
    imageUrl: question.imageUrl || null,
    presenterNote: question.presenterNote || null,
    optionImageUrls: [
      question.optionImageUrls?.[0] || null,
      question.optionImageUrls?.[1] || null,
      question.optionImageUrls?.[2] || null,
      question.optionImageUrls?.[3] || null,
    ],
  };

  if (!normalized.text || normalized.options.some((option) => !option)) {
    throw new Error("問題文と4つの選択肢は必須です。");
  }
  if (![0, 1, 2, 3].includes(normalized.correctIndex)) {
    throw new Error("正解番号は0〜3で指定してください。");
  }
  if (normalized.timeLimitSec < 5 || normalized.timeLimitSec > 60) {
    throw new Error("制限時間は5〜60秒で指定してください。");
  }
  if (normalized.basePoints < 10 || normalized.basePoints > 1000) {
    throw new Error("基本得点は10〜1000点で指定してください。");
  }

  return normalized;
}

function normalizeDifficulty(value: unknown): QuestionDifficulty {
  const difficulty = String(value ?? "normal").trim() || "normal";
  if (!["easy", "normal", "hard", "special", "final"].includes(difficulty)) {
    throw new Error("難易度は easy / normal / hard / special / final のいずれかで指定してください。");
  }
  return difficulty as QuestionDifficulty;
}

function normalizeSpeedBonus(value: unknown): boolean {
  if (value === undefined || value === null || value === "") {
    return true;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
  }
  throw new Error("速度ボーナスは true または false で指定してください。");
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted && char === "\"" && next === "\"") {
      cell += "\"";
      index += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (!quoted && char === ",") {
      row.push(cell);
      cell = "";
    } else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  rows.push(row);
  return rows;
}

function downloadText(filename: string, type: string, text: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value: unknown): string {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10).replaceAll("-", "");
}
