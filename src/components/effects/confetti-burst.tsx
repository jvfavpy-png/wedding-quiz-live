"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

const colors = [
  "var(--wql-confetti-a)",
  "var(--wql-confetti-b)",
  "var(--wql-confetti-c)",
  "var(--wql-accent-soft)",
  "var(--wql-accent)",
];

export function ConfettiBurst({
  active,
  className,
}: {
  active: boolean;
  className?: string;
}) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 26 }, (_, index) => ({
        id: index,
        left: 8 + ((index * 17) % 84),
        delay: (index % 8) * 70,
        color: colors[index % colors.length],
        rotate: (index * 37) % 180,
      })),
    [],
  );

  if (!active) {
    return null;
  }

  return (
    <div className={cn("confetti-burst pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden="true">
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className="absolute top-0 h-3 w-2 rounded-sm opacity-0"
          style={{
            left: `${piece.left}%`,
            backgroundColor: piece.color,
            transform: `rotate(${piece.rotate}deg)`,
            animation: `confetti-fall 1500ms ease-out ${piece.delay}ms forwards`,
          }}
        />
      ))}
    </div>
  );
}
