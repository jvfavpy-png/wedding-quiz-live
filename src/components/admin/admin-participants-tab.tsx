"use client";

import { useState } from "react";
import { Save, RotateCcw, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import type { AdminParticipant } from "@/types/quiz";

export type ParticipantAdminAction = "rename" | "reset_score" | "reset_all_scores" | "delete";

export function AdminParticipantsTab({
  participants,
  busy,
  onAction,
}: {
  participants: AdminParticipant[];
  busy: string | null;
  onAction: (
    action: ParticipantAdminAction,
    payload?: { participantId?: string; name?: string },
  ) => Promise<void>;
}) {
  const [names, setNames] = useState<Record<string, string>>({});

  return (
    <div className="grid gap-5">
      <Card className="grid gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>参加者管理</CardTitle>
            <p className="mt-1 text-sm font-bold leading-6 text-slate-600">
              名前の入力ミスやテスト参加者を本番中に整理できます。スコア操作はランキングに反映されます。
            </p>
          </div>
          <Button
            variant="danger"
            icon={<RotateCcw className="size-4" aria-hidden="true" />}
            disabled={busy !== null || participants.length === 0}
            onClick={() => {
              if (window.confirm("全参加者のスコアを0点に戻します。回答履歴は残ります。実行しますか？")) {
                void onAction("reset_all_scores");
              }
            }}
          >
            全員のスコアをリセット
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3 md:grid-cols-5">
          <Stat label="参加者" value={participants.length} />
          <Stat label="回答済み人数" value={participants.filter((participant) => participant.answerCount > 0).length} />
          <Stat label="総回答数" value={participants.reduce((total, participant) => total + participant.answerCount, 0)} />
          <Stat label="最高点" value={Math.max(0, ...participants.map((participant) => participant.score))} />
          <Stat label="未回答" value={participants.filter((participant) => participant.answerCount === 0).length} />
        </div>
      </Card>

      <div className="grid gap-3">
        {participants.length === 0 ? (
          <Card className="grid min-h-48 place-items-center text-center">
            <div>
              <Users className="mx-auto size-12 text-[var(--wql-accent-strong)]" aria-hidden="true" />
              <CardTitle className="mt-3">参加者はまだいません</CardTitle>
              <p className="mt-2 text-sm font-bold text-slate-600">参加URLまたはQRコードから入室すると表示されます。</p>
            </div>
          </Card>
        ) : null}

        {participants.map((participant) => {
          const editedName = names[participant.participantId] ?? participant.name;
          const nameChanged = editedName.trim() !== participant.name;

          return (
            <Card key={participant.participantId} className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="grid gap-2">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--wql-accent-soft)] text-base font-black text-[var(--wql-accent-text)]">
                    {participant.avatarUrl ? (
                      <img src={participant.avatarUrl} alt="" className="size-full object-cover" />
                    ) : (
                      participant.name.slice(0, 1)
                    )}
                  </div>
                  <input
                    value={editedName}
                    onChange={(event) =>
                      setNames((current) => ({
                        ...current,
                        [participant.participantId]: event.target.value.slice(0, 20),
                      }))
                    }
                    className="min-h-11 min-w-0 flex-1 rounded-xl border border-[#d9b56d]/60 bg-white px-3 font-black outline-none ring-[var(--wql-accent)] focus:ring-4"
                    maxLength={20}
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Save className="size-4" aria-hidden="true" />}
                    disabled={busy !== null || !nameChanged || !editedName.trim()}
                    onClick={() =>
                      onAction("rename", {
                        participantId: participant.participantId,
                        name: editedName,
                      })
                    }
                  >
                    名前を保存
                  </Button>
                </div>
                {participant.duplicateNameCount > 1 ? (
                  <div className="rounded-xl bg-[#fff6d8] p-2 text-xs font-black text-[#6d4b00]">
                    同じ名前の参加者が {participant.duplicateNameCount} 人います。
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-600">
                  <span className="rounded-full bg-[var(--wql-accent-soft)] px-3 py-1 text-[var(--wql-accent-text)]">
                    {participant.score}点
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1">回答 {participant.answerCount}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1">
                    最終接続 {formatDateTime(participant.lastSeenAt)}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 lg:justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<RotateCcw className="size-4" aria-hidden="true" />}
                  disabled={busy !== null || participant.score === 0}
                  onClick={() => onAction("reset_score", { participantId: participant.participantId })}
                >
                  スコア0
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  icon={<Trash2 className="size-4" aria-hidden="true" />}
                  disabled={busy !== null}
                  onClick={() => {
                    if (window.confirm(`${participant.name} さんを削除します。回答履歴も削除されます。実行しますか？`)) {
                      void onAction("delete", { participantId: participant.participantId });
                    }
                  }}
                >
                  削除
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/75 p-3 text-center">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-[var(--wql-text)]">{value}</p>
    </div>
  );
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
