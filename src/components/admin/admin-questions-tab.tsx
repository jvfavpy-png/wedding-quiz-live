"use client";

import { ShieldAlert } from "lucide-react";
import { emptyQuestion, QuestionEditor, type QuestionFormState } from "@/components/admin/admin-room-shared";
import { Card, CardTitle } from "@/components/ui/card";
import type { AdminQuestion } from "@/types/quiz";

export function AdminQuestionsTab({
  questions,
  editingLocked,
  busy,
  onSaveQuestion,
  onDeleteQuestion,
  onMoveQuestion,
}: {
  questions: AdminQuestion[];
  editingLocked: boolean;
  busy: string | null;
  onSaveQuestion: (question: QuestionFormState) => Promise<void>;
  onDeleteQuestion: (questionId: string) => Promise<void>;
  onMoveQuestion: (questionId: string, direction: -1 | 1) => Promise<void>;
}) {
  return (
    <Card className="grid gap-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <CardTitle>問題編集</CardTitle>
          <p className="mt-1 text-sm font-bold leading-6 text-slate-600">
            現在 {questions.length} 問。本番前に最低1問必要です。問題ごとに得点を設定できます。
            回答済みの問題を直す場合は、回答・得点をリセットしてから編集してください。
          </p>
        </div>
        {editingLocked ? (
          <div className="inline-flex items-center gap-2 rounded-xl bg-[#fff6d8] px-3 py-2 text-xs font-black text-[#6d4b00]">
            <ShieldAlert className="size-4" aria-hidden="true" />
            回答受付中は編集できません
          </div>
        ) : null}
      </div>

      <QuestionEditor
        key={`new-question-${questions.length}`}
        title="新しい問題"
        initial={emptyQuestion}
        busy={busy === "save-new"}
        onSave={onSaveQuestion}
        editingLocked={editingLocked}
      />

      <div className="grid gap-4">
        {questions.map((question, index) => (
          <QuestionEditor
            key={`${question.id}-${question.orderNo}-${question.text}-${question.options.join("|")}-${question.correctIndex}-${question.timeLimitSec}-${question.difficulty}-${question.basePoints}-${question.speedBonusEnabled}`}
            title={`Q${question.orderNo}`}
            initial={question}
            busy={busy === `save-${question.id}` || busy === `delete-${question.id}` || busy === `move-${question.id}`}
            onSave={onSaveQuestion}
            onDelete={() => onDeleteQuestion(question.id)}
            onMoveUp={index === 0 ? undefined : () => onMoveQuestion(question.id, -1)}
            onMoveDown={index === questions.length - 1 ? undefined : () => onMoveQuestion(question.id, 1)}
            editingLocked={editingLocked}
          />
        ))}
      </div>
    </Card>
  );
}
