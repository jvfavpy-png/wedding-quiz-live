import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-white/70 bg-white/88 p-5 shadow-xl shadow-[#13294b]/10 backdrop-blur",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("text-xl font-black tracking-normal text-[#13294b]", className)}
      {...props}
    />
  );
}
