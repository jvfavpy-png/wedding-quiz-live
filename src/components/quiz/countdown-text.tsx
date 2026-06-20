"use client";

import { useEffect, useState } from "react";
import { secondsRemaining } from "@/lib/utils";

interface CountdownTextProps {
  startedAt: string | null;
  limitSec: number;
  serverNowOffsetMs?: number;
  className?: string;
}

export function CountdownText({
  startedAt,
  limitSec,
  serverNowOffsetMs = 0,
  className,
}: CountdownTextProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 250);

    return () => clearInterval(timer);
  }, []);

  const remaining = secondsRemaining(startedAt, limitSec, nowMs + serverNowOffsetMs);
  return <span className={className}>{remaining}</span>;
}
