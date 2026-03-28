import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CharacterDifficultyState = {
    useSpoilerOverlays: boolean;
    hardImageMode: boolean;
    setUseSpoilerOverlays: (v: boolean) => void;
    setHardImageMode: (v: boolean) => void;
};

export const useCharacterDifficultyStore = create<CharacterDifficultyState>()(
    persist(
        (set) => ({
            useSpoilerOverlays: true,
            hardImageMode: false,
            setUseSpoilerOverlays: (v) => set({ useSpoilerOverlays: v }),
            setHardImageMode: (v) => set({ hardImageMode: v }),
        }),
        {
            name: "character-difficulty-store",
            partialize: (s) => ({
                useSpoilerOverlays: s.useSpoilerOverlays,
                hardImageMode: s.hardImageMode,
            }),
        },
    ),
);
