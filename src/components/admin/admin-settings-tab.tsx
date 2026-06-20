"use client";

import { Flag, KeyRound, RefreshCw, RotateCcw, Save, ShieldAlert } from "lucide-react";
import { adminPasswordPlaceholders, minAdminPasswordLength } from "@/lib/admin-password";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import type { AdminAction, Phase } from "@/types/quiz";

export interface AdminPasswordFormState {
  currentPassword: string;
  newPassword: string;
  newPasswordConfirm: string;
}

export function AdminSettingsTab({
  phase,
  eventTitle,
  editingLocked,
  adminAuthorized,
  busy,
  passwordForm,
  canFinish,
  canReopen,
  canReset,
  onEventTitleChange,
  onSaveEventTitle,
  onPasswordFormChange,
  onChangeAdminPassword,
  onControl,
}: {
  phase: Phase;
  eventTitle: string;
  editingLocked: boolean;
  adminAuthorized: boolean;
  busy: string | null;
  passwordForm: AdminPasswordFormState;
  canFinish: boolean;
  canReopen: boolean;
  canReset: boolean;
  onEventTitleChange: (title: string) => void;
  onSaveEventTitle: () => Promise<void>;
  onPasswordFormChange: (form: AdminPasswordFormState) => void;
  onChangeAdminPassword: () => Promise<void>;
  onControl: (action: AdminAction) => Promise<void>;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="grid content-start gap-5">
        <Card className="grid gap-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>イベント基本情報</CardTitle>
              <p className="mt-1 text-sm font-bold text-slate-600">
                イベント名は後から変更できます。roomCode とURLは変わりません。
              </p>
            </div>
            {editingLocked ? (
              <div className="inline-flex items-center gap-2 rounded-xl bg-[#fff6d8] px-3 py-2 text-xs font-black text-[#6d4b00]">
                <ShieldAlert className="size-4" aria-hidden="true" />
                回答受付中
              </div>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              value={eventTitle}
              onChange={(event) => onEventTitleChange(event.target.value.slice(0, 80))}
              className="min-h-12 rounded-xl border border-[#d9b56d]/60 bg-white px-4 text-lg font-bold outline-none ring-[#d9b56d] focus:ring-4"
              maxLength={80}
            />
            <Button
              icon={<Save className="size-4" aria-hidden="true" />}
              onClick={onSaveEventTitle}
              disabled={busy !== null || !adminAuthorized || !eventTitle.trim()}
            >
              保存
            </Button>
          </div>
        </Card>

        <Card className="grid gap-4">
          <CardTitle>管理者用パスワード</CardTitle>
          <p className="text-sm font-bold leading-6 text-slate-700">
            管理URLを共有してしまった場合は、管理者用パスワードを変更してください。
            参加URLとスクリーンURLは変わりません。
          </p>
          <input
            type="password"
            value={passwordForm.currentPassword}
            onChange={(event) =>
              onPasswordFormChange({ ...passwordForm, currentPassword: event.target.value })
            }
            className="min-h-12 rounded-xl border border-[#d9b56d]/60 bg-white px-4 font-bold outline-none ring-[#d9b56d] placeholder:text-slate-400 focus:ring-4"
            placeholder={adminPasswordPlaceholders.currentPassword}
            autoComplete="current-password"
          />
          <input
            type="password"
            value={passwordForm.newPassword}
            onChange={(event) =>
              onPasswordFormChange({ ...passwordForm, newPassword: event.target.value })
            }
            className="min-h-12 rounded-xl border border-[#d9b56d]/60 bg-white px-4 font-bold outline-none ring-[#d9b56d] placeholder:text-slate-400 focus:ring-4"
            placeholder={adminPasswordPlaceholders.newPassword}
            autoComplete="new-password"
          />
          <input
            type="password"
            value={passwordForm.newPasswordConfirm}
            onChange={(event) =>
              onPasswordFormChange({ ...passwordForm, newPasswordConfirm: event.target.value })
            }
            className="min-h-12 rounded-xl border border-[#d9b56d]/60 bg-white px-4 font-bold outline-none ring-[#d9b56d] placeholder:text-slate-400 focus:ring-4"
            placeholder={adminPasswordPlaceholders.newPasswordConfirm}
            autoComplete="new-password"
          />
          <Button
            icon={<KeyRound className="size-4" aria-hidden="true" />}
            onClick={onChangeAdminPassword}
            disabled={
              busy !== null ||
              passwordForm.currentPassword.length < minAdminPasswordLength ||
              passwordForm.newPassword.length < minAdminPasswordLength ||
              passwordForm.newPassword !== passwordForm.newPasswordConfirm
            }
          >
            変更する
          </Button>
        </Card>
      </div>

      <Card className="grid content-start gap-4 border-[#b42335]/20 bg-[#fff5f6]/80">
        <CardTitle className="text-[#8f1d2b]">終了・リセット</CardTitle>
        <p className="text-sm font-bold leading-6 text-[#8f1d2b]">
          本番中に押し間違えると進行へ影響する操作です。通常の進行では使いません。
        </p>
        {phase === "finished" ? (
          <div className="rounded-xl bg-[#fff6d8] p-3 text-sm font-black leading-6 text-[#6d4b00]">
            イベントは終了状態です。ゲストは回答できません。管理者は編集・リセット・再開できます。
          </div>
        ) : null}
        <Button
          variant="ghost"
          icon={<Flag className="size-4" aria-hidden="true" />}
          disabled={!canFinish || busy !== null}
          onClick={() => onControl("finish_event")}
        >
          イベント終了
        </Button>
        <Button
          variant="secondary"
          icon={<RefreshCw className="size-4" aria-hidden="true" />}
          disabled={!canReopen || busy !== null}
          onClick={() => onControl("reopen_event")}
        >
          終了状態を解除して待機に戻す
        </Button>
        <Button
          variant="danger"
          icon={<RotateCcw className="size-4" aria-hidden="true" />}
          disabled={!canReset || busy !== null}
          onClick={() => onControl("reset_run")}
        >
          回答・得点をリセットして再利用する
        </Button>
        <p className="text-xs font-bold leading-5 text-[#8f1d2b]">
          回答・得点だけをリセットします。イベント名・問題・URLは残ります。
        </p>
      </Card>
    </div>
  );
}
