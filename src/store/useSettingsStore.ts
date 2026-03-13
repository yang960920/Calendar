import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
    heatmapColor: string;
    setHeatmapColor: (color: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            heatmapColor: 'green',
            setHeatmapColor: (color) => set({ heatmapColor: color }),
        }),
        {
            name: 'keeper-settings-storage',
        }
    )
);
