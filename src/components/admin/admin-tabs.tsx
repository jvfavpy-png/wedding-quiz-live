"use client";

import type { ComponentType, SVGProps } from "react";
import { CheckCircle2, ClipboardList, KeyRound, Link2, Play, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export type AdminTabId = "progress" | "questions" | "participants" | "urls" | "rehearsal" | "settings";

interface AdminTabMeta {
  id: AdminTabId;
  label: string;
  shortLabel: string;
  description: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}

export const adminTabs: AdminTabMeta[] = [
  {
    id: "progress",
    label: "進行",
    shortLabel: "進行",
    description: "本番操作",
    Icon: Play,
  },
  {
    id: "questions",
    label: "問題編集",
    shortLabel: "問題",
    description: "事前準備",
    Icon: ClipboardList,
  },
  {
    id: "participants",
    label: "参加者管理",
    shortLabel: "参加者",
    description: "名前と点数",
    Icon: Users,
  },
  {
    id: "urls",
    label: "URL管理",
    shortLabel: "URL",
    description: "共有とQR",
    Icon: Link2,
  },
  {
    id: "rehearsal",
    label: "リハーサル",
    shortLabel: "確認",
    description: "本番前確認",
    Icon: CheckCircle2,
  },
  {
    id: "settings",
    label: "設定",
    shortLabel: "設定",
    description: "名前と権限",
    Icon: KeyRound,
  },
];

const fallbackTab: AdminTabId = "progress";

export function isAdminTabId(value: string | null): value is AdminTabId {
  return adminTabs.some((tab) => tab.id === value);
}

export function adminTabStorageKey(roomCode: string): string {
  return `wql-admin-tab-${roomCode}`;
}

export function readAdminTab(roomCode: string): AdminTabId {
  if (typeof window === "undefined") {
    return fallbackTab;
  }

  const stored = window.localStorage.getItem(adminTabStorageKey(roomCode));
  return isAdminTabId(stored) ? stored : fallbackTab;
}

export function writeAdminTab(roomCode: string, tabId: AdminTabId): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(adminTabStorageKey(roomCode), tabId);
}

export function AdminTabs({
  activeTab,
  onChange,
}: {
  activeTab: AdminTabId;
  onChange: (tabId: AdminTabId) => void;
}) {
  return (
    <nav
      className="flex gap-2 overflow-x-auto rounded-2xl border border-white/70 bg-[var(--wql-card)] p-2 shadow-xl shadow-[#13294b]/10 backdrop-blur"
      aria-label="管理画面のタブ"
    >
      {adminTabs.map(({ id, label, shortLabel, description, Icon }) => {
        const active = activeTab === id;

        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn(
              "grid min-w-[116px] flex-1 place-items-center gap-1 rounded-xl px-3 py-3 text-center transition",
              active
                ? "bg-[var(--wql-text)] text-white shadow-lg shadow-[#13294b]/20"
                : "bg-white/65 text-[var(--wql-text)] hover:bg-[var(--wql-accent-soft)]",
            )}
            aria-current={active ? "page" : undefined}
          >
            <span className="flex items-center gap-2 text-sm font-black">
              <Icon className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{shortLabel}</span>
            </span>
            <span className={cn("text-[11px] font-bold", active ? "text-white/75" : "text-slate-500")}>
              {description}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
