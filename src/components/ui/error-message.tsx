import { AlertTriangle } from "lucide-react";

interface ErrorMessageProps {
  message: string;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[#ffb4c0] bg-[#fff1f3] p-4 text-[#9f1239]">
      <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <p className="text-sm font-bold leading-6">{message}</p>
    </div>
  );
}
