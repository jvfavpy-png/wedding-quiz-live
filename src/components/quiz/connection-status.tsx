"use client";

import { AlertTriangle, CheckCircle2, RefreshCw, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type RealtimeStatus = "disabled" | "connecting" | "connected" | "reconnecting";

export function ConnectionStatus({
  status,
  error,
  lastRefreshedLabel,
  onRefresh,
  screen = false,
}: {
  status: RealtimeStatus | string;
  error?: string | null;
  lastRefreshedLabel?: string;
  onRefresh: () => Promise<unknown> | void;
  screen?: boolean;
}) {
  const hasError = Boolean(error);
  const reconnecting = status === "reconnecting" || status === "connecting";
  const stable = !hasError && !reconnecting;
  const message = hasError
    ? "最新状態を取得できませんでした。画面を再読み込みしてください。"
    : reconnecting
      ? "通信が不安定です。再接続しています。"
      : "最新状態を取得しました。";

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between",
        stable ? "border-[#d8f7eb] bg-[#f1fff9] text-[#075d4b]" : undefined,
        reconnecting ? "border-[#f59e0b]/40 bg-[#fff6d8] text-[#6d4b00]" : undefined,
        hasError ? "border-[#b42335]/30 bg-[#fff5f6] text-[#8f1d2b]" : undefined,
        screen ? "text-xl font-black" : "text-sm font-bold",
      )}
      role={hasError ? "alert" : "status"}
    >
      <div className="flex min-w-0 items-center gap-2">
        {hasError ? (
          <AlertTriangle className="size-5 shrink-0" aria-hidden="true" />
        ) : reconnecting ? (
          <Wifi className="size-5 shrink-0" aria-hidden="true" />
        ) : (
          <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />
        )}
        <span className="min-w-0">{message}</span>
        {lastRefreshedLabel && !hasError ? (
          <span className="hidden text-current/70 sm:inline">（{lastRefreshedLabel}）</span>
        ) : null}
      </div>
      <Button
        type="button"
        size="sm"
        variant={hasError ? "danger" : "ghost"}
        icon={<RefreshCw className="size-4" aria-hidden="true" />}
        onClick={onRefresh}
        className={screen ? "min-h-12 text-base" : undefined}
      >
        再読み込み
      </Button>
    </div>
  );
}
