import { clamp, cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
}

export function ProgressBar({
  value,
  max = 100,
  className,
  barClassName,
}: ProgressBarProps) {
  const percent = max <= 0 ? 0 : clamp((value / max) * 100, 0, 100);

  return (
    <div className={cn("h-3 overflow-hidden rounded-full bg-slate-200", className)}>
      <div
        className={cn(
          "h-full rounded-full bg-gradient-to-r from-[#f3b23d] via-[#ff6f91] to-[#13294b] transition-all",
          barClassName,
        )}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
