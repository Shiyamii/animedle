import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ChallengeStore {
  hostRoomId: string | null;
  setHostRoomId: (roomId: string) => void;
  clearHostRoomId: () => void;
}

export const useChallengeStore = create<ChallengeStore>()(
  persist(
    (set) => ({
      hostRoomId: null,
      setHostRoomId: (roomId) => set({ hostRoomId: roomId }),
      clearHostRoomId: () => set({ hostRoomId: null }),
    }),
    {
      name: 'challenge-store',
    },
  ),
);
