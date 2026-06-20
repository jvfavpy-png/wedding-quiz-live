import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = "読み込み中です" }: LoadingStateProps) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-2xl bg-white/75 p-8 text-[#13294b]">
      <Loader2 className="size-8 animate-spin" aria-hidden="true" />
      <p className="text-base font-bold">{label}</p>
    </div>
  );
}
