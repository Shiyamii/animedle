import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface UserInfo {
    id: string;
    name: string;
    email: string;
    avatarSeed: string | null;
}

interface UserStore {
    user: UserInfo | null;
    setUser: (user: UserInfo) => void;
    clearUser: () => void;
}

export const useUserStore = create<UserStore>()(
    persist(
        (set) => ({
            user: null,
            setUser: (user) => set({ user }),
            clearUser: () => set({ user: null }),
        }),
        {
            name: "user-storage",
        }
    )
);
