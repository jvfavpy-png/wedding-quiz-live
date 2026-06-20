"use client";

import { CheckCircle2, ExternalLink, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import type { AdminAction } from "@/types/quiz";

export function AdminRehearsalTab({
  urls,
  busy,
  adminAuthorized,
  canReset,
  hasRehearsalResults,
  checklistItems,
  pretestChecks,
  onPretestChange,
  onControl,
}: {
  urls: {
    joinUrl: string;
    screenUrl: string;
  };
  busy: string | null;
  adminAuthorized: boolean;
  canReset: boolean;
  hasRehearsalResults: boolean;
  checklistItems: string[];
  pretestChecks: boolean[];
  onPretestChange: (checks: boolean[]) => void;
  onControl: (action: AdminAction) => Promise<void>;
}) {
  const checkedCount = pretestChecks.filter(Boolean).length;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(280px,420px)_1fr]">
      <Card className="grid content-start gap-4">
        <CardTitle>リハーサル</CardTitle>
        <p className="text-sm font-bold leading-6 text-slate-700">
          本番前に、参加URLとスクリーンURLで動作確認します。リハーサル後は回答・得点をリセットしてから本番を開始してください。
        </p>
        {hasRehearsalResults ? (
          <div className="rounded-xl border border-[#f59e0b]/40 bg-[#fff6d8] p-3 text-sm font-black leading-6 text-[#6d4b00]">
            リハーサルの回答や得点が残っています。本番前にリセットしてください。
          </div>
        ) : (
          <div className="rounded-xl bg-[#d8f7eb] p-3 text-sm font-black leading-6 text-[#075d4b]">
            回答・得点のリセット状態は整っています。
          </div>
        )}
        <div className="grid gap-2">
          <Button
            variant="secondary"
            icon={<Play className="size-4" aria-hidden="true" />}
            disabled={busy !== null || !adminAuthorized}
            onClick={() => onControl("reopen_event")}
          >
            リハーサル開始
          </Button>
          <Button
            variant="ghost"
            icon={<ExternalLink className="size-4" aria-hidden="true" />}
            onClick={() => window.open(urls.joinUrl, "_blank", "noopener,noreferrer")}
          >
            参加URLを開く
          </Button>
          <Button
            variant="ghost"
            icon={<ExternalLink className="size-4" aria-hidden="true" />}
            onClick={() => window.open(urls.screenUrl, "_blank", "noopener,noreferrer")}
          >
            スクリーンURLを開く
          </Button>
          <Button
            variant="danger"
            icon={<RotateCcw className="size-4" aria-hidden="true" />}
            disabled={!canReset || busy !== null}
            onClick={() => onControl("reset_run")}
          >
            回答・得点をリセット
          </Button>
        </div>
      </Card>

      <Card className="grid content-start gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>友人テスト前チェック</CardTitle>
            <p className="mt-1 text-sm font-bold leading-6 text-slate-600">
              友人に送るのは参加URLだけです。管理URLは共有しないでください。
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl bg-white/80 px-3 py-2 text-sm font-black text-[#075d4b]">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            {checkedCount}/{checklistItems.length}
          </div>
        </div>
        <div className="grid gap-2">
          {checklistItems.map((item, index) => (
            <label
              key={item}
              className="flex items-center gap-3 rounded-xl bg-white/75 p-3 text-sm font-bold text-[#13294b]"
            >
              <input
                type="checkbox"
                checked={pretestChecks[index] ?? false}
                onChange={(event) => {
                  const next = [...pretestChecks];
                  next[index] = event.target.checked;
                  onPretestChange(next);
                }}
              />
              {item}
            </label>
          ))}
        </div>
        <p className="text-xs font-bold leading-5 text-slate-500">
          チェック状態はこのブラウザに保存されます。別PCで本番運用する場合は、そのPCでも確認してください。
        </p>
      </Card>
    </div>
  );
}
