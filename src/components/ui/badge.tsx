import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "navy" | "gold" | "pink" | "green" | "red" | "gray";

const toneClass: Record<BadgeTone, string> = {
  navy: "bg-[#13294b] text-white",
  gold: "bg-[#ffe7a3] text-[#6d4b00]",
  pink: "bg-[#ffe1ea] text-[#9f1239]",
  green: "bg-[#d8f7eb] text-[#075d4b]",
  red: "bg-[#ffe0e5] text-[#9f1239]",
  gray: "bg-slate-100 text-slate-700",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ className, tone = "gray", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center rounded-full px-3 text-sm font-black",
        toneClass[tone],
        className,
      )}
      {...props}
    />
  );
}
