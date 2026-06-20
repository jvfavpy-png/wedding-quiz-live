"use client";

import { ExternalLink, Link2, ShieldAlert } from "lucide-react";
import { QRCodeBlock } from "@/components/quiz/qr-code-block";
import { UrlCopy } from "@/components/admin/admin-room-shared";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";

export function AdminUrlsTab({
  urls,
  roomCode,
  onCopy,
}: {
  urls: {
    adminUrl: string;
    joinUrl: string;
    screenUrl: string;
  };
  roomCode: string;
  onCopy: (value: string) => Promise<void>;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(280px,360px)_1fr]">
      <Card className="grid content-start gap-4">
        <CardTitle>URL管理</CardTitle>
        <div className="rounded-xl bg-[#d8f7eb] p-3 text-sm font-black leading-6 text-[#075d4b]">
          友人やゲストに送るのは参加URLだけです。管理URLは問題編集や進行操作ができるため共有しないでください。
        </div>
        <QRCodeBlock value={urls.joinUrl} label="参加URL" />
        <Button
          variant="ghost"
          icon={<ExternalLink className="size-4" aria-hidden="true" />}
          onClick={() => window.open(urls.joinUrl, "_blank", "noopener,noreferrer")}
        >
          参加URLを開く
        </Button>
      </Card>

      <div className="grid content-start gap-5">
        <Card className="grid gap-4">
          <div className="flex items-center gap-2">
            <Link2 className="size-5 text-[#b08a2e]" aria-hidden="true" />
            <CardTitle>共有リンク</CardTitle>
          </div>
          <p className="text-sm font-bold leading-6 text-slate-700">
            このイベントのURLは固定です。事前準備、リハーサル、本番当日に同じURLを使えます。
          </p>
          <div className="grid gap-3">
            <UrlCopy label="参加URL" value={urls.joinUrl} onCopy={onCopy} />
            <UrlCopy label="スクリーンURL" value={urls.screenUrl} onCopy={onCopy} />
            <UrlCopy label="管理URL" value={urls.adminUrl} onCopy={onCopy} secret roomCode={roomCode} />
          </div>
        </Card>

        <Card className="grid gap-3 border-[#f59e0b]/30 bg-[#fff6d8]/80">
          <div className="flex items-center gap-2 text-[#6d4b00]">
            <ShieldAlert className="size-5" aria-hidden="true" />
            <CardTitle className="text-[#6d4b00]">共有時の注意</CardTitle>
          </div>
          <p className="text-sm font-black leading-6 text-[#6d4b00]">
            参加URLはゲスト用、スクリーンURLは会場表示用、管理URLは主催者用です。
            管理URLを送ってしまった場合は、設定タブで管理者用パスワードを変更してください。
          </p>
        </Card>
      </div>
    </div>
  );
}
