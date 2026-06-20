"use client";

import Link from "next/link";
import { useState } from "react";
import { PartyPopper, Plus, ExternalLink } from "lucide-react";
import { fetchJson } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { ErrorMessage } from "@/components/ui/error-message";
import { QRCodeBlock } from "@/components/quiz/qr-code-block";
import type { CreatedEvent } from "@/types/quiz";

export function AdminCreateClient() {
  const [title, setTitle] = useState("Wedding Quiz Live");
  const [created, setCreated] = useState<CreatedEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    try {
      setCreating(true);
      setError(null);
      const result = await fetchJson<CreatedEvent>("/api/admin/events", {
        method: "POST",
        body: JSON.stringify({ title }),
      });
      setCreated(result);
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
            イベントを作成すると、主催者URL・参加URL・スクリーンURLが発行されます。
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
          {error ? <ErrorMessage message={error} /> : null}
          <Button
            size="lg"
            icon={<Plus className="size-5" aria-hidden="true" />}
            onClick={handleCreate}
            disabled={creating || !title.trim()}
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
              </div>
              <Link
                href={`/admin/${created.event.roomCode}?key=${encodeURIComponent(created.adminKey)}`}
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
                <UrlRow label="主催者URL" value={created.adminUrl} secret />
              </div>
            </div>
          </Card>
        ) : null}
      </div>
    </main>
  );
}

function UrlRow({ label, value, secret = false }: { label: string; value: string; secret?: boolean }) {
  async function copySecret() {
    if (
      window.confirm(
        "主催者URLには管理権限が含まれます。ゲストやスクリーンに共有しない前提でコピーしますか？",
      )
    ) {
      await navigator.clipboard?.writeText(value);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white/80 p-4">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-all text-sm font-bold text-[#13294b]">
        {secret ? "管理権限付きURLです。表示せずにコピーのみ許可します。" : value}
      </p>
      {secret ? (
        <button
          type="button"
          onClick={copySecret}
          className="mt-3 min-h-10 rounded-xl border border-[#d9b56d]/60 bg-white px-3 text-sm font-black text-[#13294b]"
        >
          主催者URLをコピー
        </button>
      ) : null}
    </div>
  );
}
