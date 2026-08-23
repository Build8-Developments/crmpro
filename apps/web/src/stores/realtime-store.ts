import { create } from "zustand";
import type { Socket } from "socket.io-client";

interface RealtimeState {
  socket: Socket | null;
  setSocket: (socket: Socket | null) => void;
}

export const useRealtimeStore = create<RealtimeState>((set) => ({
  socket: null,
  setSocket: (socket) => set({ socket }),
}));
