"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchJson } from "@/lib/api-client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AnswerDistribution, RankingEntry, RoomSnapshot } from "@/types/quiz";

type RealtimeStatus = "disabled" | "connecting" | "connected" | "reconnecting";

export interface LiveRoomState {
  snapshot: RoomSnapshot | null;
  distribution: AnswerDistribution | null;
  ranking: RankingEntry[];
  loading: boolean;
  error: string | null;
  realtimeStatus: RealtimeStatus;
  lastRefreshedAt: number | null;
  serverNowOffsetMs: number;
  refresh: () => Promise<void>;
}

export function useLiveRoom(roomCode: string): LiveRoomState {
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [distribution, setDistribution] = useState<AnswerDistribution | null>(null);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("connecting");
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null);
  const [serverNowOffsetMs, setServerNowOffsetMs] = useState(0);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const encodedRoomCode = encodeURIComponent(roomCode);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const nextSnapshot = await fetchJson<RoomSnapshot>(
        `/api/rooms/${encodedRoomCode}/snapshot`,
      );
      const fetchedAt = Date.now();
      const serverNowMs = new Date(nextSnapshot.serverNow).getTime();
      setSnapshot(nextSnapshot);
      setLastRefreshedAt(fetchedAt);
      setServerNowOffsetMs(Number.isFinite(serverNowMs) ? serverNowMs - fetchedAt : 0);

      const distributionUrl = nextSnapshot.liveState.currentQuestionId
        ? `/api/rooms/${encodedRoomCode}/distribution?questionId=${encodeURIComponent(
            nextSnapshot.liveState.currentQuestionId,
          )}`
        : `/api/rooms/${encodedRoomCode}/distribution`;

      const [nextDistribution, nextRanking] = await Promise.all([
        fetchJson<AnswerDistribution>(distributionUrl),
        fetchJson<RankingEntry[]>(`/api/rooms/${encodedRoomCode}/ranking`),
      ]);

      setDistribution(nextDistribution);
      setRanking(nextRanking);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "通信に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [encodedRoomCode]);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) {
      return;
    }

    refreshTimer.current = setTimeout(() => {
      refreshTimer.current = null;
      void refresh();
    }, 400);
  }, [refresh]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void refresh();
    }, 0);

    return () => clearTimeout(timer);
  }, [refresh]);

  useEffect(() => {
    const poller = setInterval(() => {
      void refresh();
    }, 15000);

    return () => clearInterval(poller);
  }, [refresh]);

  useEffect(() => {
    const eventId = snapshot?.event.id;
    const supabase = getSupabaseBrowserClient();

    if (!eventId || !supabase) {
      const poller = setInterval(() => {
        void refresh();
      }, 3000);
      return () => clearInterval(poller);
    }

    const filter = `event_id=eq.${eventId}`;
    const channel = supabase
      .channel(`room:${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_state", filter },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_stats", filter },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "question_stats", filter },
        scheduleRefresh,
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeStatus("connected");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setRealtimeStatus("reconnecting");
          scheduleRefresh();
        } else if (status === "CLOSED") {
          setRealtimeStatus("disabled");
        }
      });

    return () => {
      if (refreshTimer.current) {
        clearTimeout(refreshTimer.current);
        refreshTimer.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [refresh, scheduleRefresh, snapshot?.event.id]);

  return {
    snapshot,
    distribution,
    ranking,
    loading,
    error,
    realtimeStatus,
    lastRefreshedAt,
    serverNowOffsetMs,
    refresh,
  };
}
