"use client";

import Link from "next/link";
import { useState } from "react";
import { PartyPopper, Plus, ExternalLink } from "lucide-react";
import { adminPasswordPlaceholders, minAdminPasswordLength } from "@/lib/admin-password";
import { fetchJson } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { ErrorMessage } from "@/components/ui/error-message";
import { QRCodeBlock } from "@/components/quiz/qr-code-block";
import type { CreatedEvent } from "@/types/quiz";

export function AdminCreateClient() {
  const [title, setTitle] = useState("Wedding Quiz Live");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState("");
  const [created, setCreated] = useState<CreatedEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    try {
      setCreating(true);
      setError(null);
      const result = await fetchJson<CreatedEvent>("/api/admin/events", {
        method: "POST",
        body: JSON.stringify({ title, adminPassword, adminPasswordConfirm }),
      });
      setCreated(result);
      window.setTimeout(() => {
        window.location.assign(result.adminUrl);
      }, 1200);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "イベント作成に失敗しました");
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#fff8e7_0%,#ffffff_38%,#ffe1ea_70%,#dfe9ff_100%)] px-4 py-8 text-[#13294b]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-black shadow">
            <PartyPopper className="size-5 text-[#d89a22]" aria-hidden="true" />
            Wedding Quiz Live
          </div>
          <h1 className="text-4xl font-black tracking-normal sm:text-5xl">
            結婚式・二次会の早押しクイズ進行
          </h1>
          <p className="max-w-2xl text-base font-semibold leading-7 text-slate-700">
            イベントを作成すると、管理URL・参加URL・スクリーンURLが発行されます。
            サンプル問題5問を入れてあるので、すぐリハーサルできます。
          </p>
        </header>

        <Card className="grid gap-4">
          <CardTitle>イベント作成</CardTitle>
          <label className="grid gap-2">
            <span className="text-sm font-black text-slate-700">イベントタイトル</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="min-h-14 rounded-xl border border-[#d9b56d]/60 bg-white px-4 text-lg font-bold outline-none ring-[#d9b56d] focus:ring-4"
              maxLength={80}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-black text-slate-700">管理者用パスワード</span>
              <input
                type="password"
                value={adminPassword}
                onChange={(event) => setAdminPassword(event.target.value)}
                className="min-h-14 rounded-xl border border-[#d9b56d]/60 bg-white px-4 text-lg font-bold outline-none ring-[#d9b56d] placeholder:text-slate-400 focus:ring-4"
                autoComplete="new-password"
                placeholder={adminPasswordPlaceholders.password}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-black text-slate-700">管理者用パスワード（確認）</span>
              <input
                type="password"
                value={adminPasswordConfirm}
                onChange={(event) => setAdminPasswordConfirm(event.target.value)}
                className="min-h-14 rounded-xl border border-[#d9b56d]/60 bg-white px-4 text-lg font-bold outline-none ring-[#d9b56d] placeholder:text-slate-400 focus:ring-4"
                autoComplete="new-password"
                placeholder={adminPasswordPlaceholders.passwordConfirm}
              />
            </label>
          </div>
          <p className="text-sm font-bold leading-6 text-slate-600">
            管理画面を開くときに使うパスワードです。ゲストには共有しないでください。
            参加URLとスクリーンURLは、ゲストに共有できます。
          </p>
          {error ? <ErrorMessage message={error} /> : null}
          <Button
            size="lg"
            icon={<Plus className="size-5" aria-hidden="true" />}
            onClick={handleCreate}
            disabled={
              creating ||
              !title.trim() ||
              adminPassword.length < minAdminPasswordLength ||
              adminPassword !== adminPasswordConfirm
            }
          >
            {creating ? "作成中" : "イベントを作成"}
          </Button>
        </Card>

        {created ? (
          <Card className="grid gap-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>作成完了</CardTitle>
                <p className="mt-1 text-sm font-bold text-slate-600">
                  roomCode: <span className="text-lg text-[#13294b]">{created.event.roomCode}</span>
                </p>
                <p className="mt-2 text-sm font-bold leading-6 text-[#6d4b00]">
                  このイベントのURLは後からも使えます。準備用・本番用として、管理URLを安全な場所に保存してください。
                  まもなく主催者画面へ移動します。
                </p>
              </div>
              <Link
                href={`/admin/${created.event.roomCode}`}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#13294b] px-4 font-black text-white shadow-lg"
              >
                主催者画面へ <ExternalLink className="size-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
              <QRCodeBlock value={created.joinUrl} label="参加用QRコード" />
              <div className="grid gap-3">
                <UrlRow label="参加URL" value={created.joinUrl} />
                <UrlRow label="スクリーンURL" value={created.screenUrl} />
                <UrlRow label="管理URL" value={created.adminUrl} secret />
              </div>
            </div>
          </Card>
        ) : null}
      </div>
    </main>
  );
}

function UrlRow({ label, value, secret = false }: { label: string; value: string; secret?: boolean }) {
  async function copyValue() {
    await navigator.clipboard?.writeText(value);
  }

  async function copySecret() {
    if (
      window.confirm(
        "管理URLでは、問題編集や進行操作ができます。ゲストやスクリーンに共有しない前提でコピーしますか？",
      )
    ) {
      await navigator.clipboard?.writeText(value);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white/80 p-4">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-all text-sm font-bold text-[#13294b]">
        {secret ? "問題編集や進行操作ができる大切なURLです。表示せずにコピーのみ許可します。" : value}
      </p>
      {secret ? (
        <button
          type="button"
          onClick={copySecret}
          className="mt-3 min-h-10 rounded-xl border border-[#d9b56d]/60 bg-white px-3 text-sm font-black text-[#13294b]"
        >
          管理URLをコピー
        </button>
      ) : (
        <button
          type="button"
          onClick={copyValue}
          className="mt-3 min-h-10 rounded-xl border border-[#d9b56d]/60 bg-white px-3 text-sm font-black text-[#13294b]"
        >
          コピー
        </button>
      )}
    </div>
  );
}
