"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { useAuthStore } from "@/stores/auth-store";
import { queryKeys } from "@/lib/query/query-keys";

const playNotificationSound = () => {
  const audio = new Audio("/sounds/notification.mp3");
  audio.volume = 0.5;
  audio.play().catch((err) => console.log("Audio play error:", err));
};

export function useRealtimeStream() {
  const queryClient = useQueryClient();
  const status = useAuthStore((state) => state.status);
  const accessToken = useAuthStore((state) => state.accessToken);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !accessToken) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      return;
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const connect = async () => {
      try {
        await fetchEventSource(`${process.env.NEXT_PUBLIC_API_URL}/stream`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "text/event-stream",
          },
          signal: abortController.signal,
          async onopen(response) {
            if (response.ok && response.headers.get("content-type")?.includes("text/event-stream")) {
              return; // everything's good
            }
            throw new Error(`Failed to establish SSE connection: ${response.status}`);
          },
          onmessage(msg) {
            if (!msg.data) return;
            try {
              const payload = JSON.parse(msg.data);
              console.log("SSE Received:", { event: msg.event, payload });
              
              if (msg.event === "invalidate") {
                if (payload.entity === "notifications") {
                  playNotificationSound();
                  console.log("Invalidating!", payload.conversationId);
                    void queryClient.invalidateQueries({
                    queryKey: queryKeys.notifications.all(),
                  });
                  void queryClient.invalidateQueries({
                    queryKey: queryKeys.notifications.unreadCount(),
                  });
                  void queryClient.invalidateQueries({
                    queryKey: queryKeys.notifications.list({}),
                  });
                }
                
                if (payload.entity === "support-messages") {
                  if (payload.actorId && payload.actorId !== useAuthStore.getState().user?.id) {
                    playNotificationSound();
                  }
                  void queryClient.invalidateQueries({
                    queryKey: queryKeys.support.unreadCount(),
                  });
                  if (payload.conversationId) {
                    void queryClient.invalidateQueries({
                      queryKey: queryKeys.support.detail(payload.conversationId),
                    });
                    void queryClient.invalidateQueries({
                      queryKey: queryKeys.support.list({}),
                    });
                  }
                }
              }
            } catch (err) {
              console.error("Failed to parse SSE message", err);
            }
          },
          onclose() {
            // connection closed by server, let it auto-reconnect
          },
          onerror(err) {
            console.error("SSE error", err);
            // Wait 5s before reconnecting
            return 5000;
          },
        });
      } catch (err) {
        // Only log if it's not an abort error
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error("SSE connection failed", err);
        }
      }
    };

    void connect();

    return () => {
      abortController.abort();
      abortControllerRef.current = null;
    };
  }, [status, accessToken, queryClient]);
}
