"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/stores/auth-store";
import { queryKeys } from "@/lib/query/query-keys";
import { useRealtimeStore } from "@/stores/realtime-store";
import { resolveSocketOrigin } from "@/lib/realtime/resolve-socket-origin";

const playNotificationSound = () => {
  const audio = new Audio("/sounds/notification.mp3");
  audio.volume = 0.5;
  audio.play().catch((err) => console.log("Audio play error:", err));
};

export function useRealtimeStream() {
  const queryClient = useQueryClient();
  const status = useAuthStore((state) => state.status);
  const accessToken = useAuthStore((state) => state.accessToken);
  const setSocket = useRealtimeStore((state) => state.setSocket);

  // Use refs to avoid recreating the socket when QC changes
  const queryClientRef = useRef(queryClient);
  useEffect(() => {
    queryClientRef.current = queryClient;
  }, [queryClient]);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !accessToken) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      setSocket(null);
      }
      return;
    }

    const socketUrl = resolveSocketOrigin();
    if (!socketUrl) {
      console.error(
        "[realtime] No socket origin: set NEXT_PUBLIC_SSE_URL. Realtime is disabled.",
      );
      return;
    }
    
    const socket = io(socketUrl, {
      auth: {
        token: accessToken
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity
    });

    socketRef.current = socket;
    setSocket(socket);

    // The first `connect` is the handshake; any later one is a reconnect after a
    // drop, so refetch what is on screen to backfill events we missed.
    let hasConnected = false;
    socket.on("connect", () => {
      if (!hasConnected) {
        hasConnected = true;
        return;
      }
      void queryClientRef.current.invalidateQueries({ refetchType: "active" });
    });

    socket.on("invalidate", (payload) => {
      const qc = queryClientRef.current;
      if (!payload || !payload.entity) return;

      if (payload.entity === "support-messages") {
        if (payload.actorId && payload.actorId !== useAuthStore.getState().user?.id) {
          playNotificationSound();
        }
        void qc.invalidateQueries({
          queryKey: queryKeys.support.all(),
          refetchType: "all",
        });
        void qc.invalidateQueries({
          queryKey: queryKeys.support.summary(),
          refetchType: "all",
        });
      }
    });

    socket.on("connect_error", (err) => {
      console.error("WebSocket connection error:", err.message);
    });


    return () => {
      socket.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [status, accessToken, setSocket]);
}
