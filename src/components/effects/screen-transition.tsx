import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ScreenTransition({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("screen-transition", className)}>{children}</div>;
}
