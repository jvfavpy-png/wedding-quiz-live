interface EmptyStateProps {
  title: string;
  description?: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-[#d9b56d] bg-white/70 p-6 text-center">
      <p className="text-lg font-black text-[#13294b]">{title}</p>
      {description ? <p className="mt-2 text-sm font-semibold text-slate-600">{description}</p> : null}
    </div>
  );
}
