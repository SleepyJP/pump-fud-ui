import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PanelLayout, PanelType, PanelSkin } from '@/types';

interface DashboardState {
  layouts: PanelLayout[];
  activePanels: PanelType[];
  selectedToken: `0x${string}` | null;
  isLocked: boolean;
  panelSkins: Record<PanelType, PanelSkin>;

  setLayouts: (layouts: PanelLayout[]) => void;
  togglePanel: (panel: PanelType) => void;
  setSelectedToken: (token: `0x${string}` | null) => void;
  resetLayout: () => void;
  toggleLock: () => void;
  setLocked: (locked: boolean) => void;
  setPanelSkin: (panel: PanelType, skin: PanelSkin) => void;
}

const DEFAULT_LAYOUTS: PanelLayout[] = [
  { i: 'chart', x: 0, y: 0, w: 8, h: 5, minW: 4, minH: 3 },
  { i: 'trade', x: 8, y: 0, w: 4, h: 5, minW: 3, minH: 4 },
  { i: 'chat', x: 0, y: 5, w: 3, h: 4, minW: 3, minH: 3 },
  { i: 'board', x: 3, y: 5, w: 3, h: 4, minW: 3, minH: 3 },
  { i: 'holders', x: 6, y: 5, w: 3, h: 4, minW: 3, minH: 3 },
  { i: 'info', x: 9, y: 5, w: 3, h: 4, minW: 3, minH: 3 },
];

const DEFAULT_PANELS: PanelType[] = ['chart', 'trade', 'chat', 'board', 'holders', 'info'];

const DEFAULT_SKINS: Record<PanelType, PanelSkin> = {
  chart: 'default',
  trade: 'default',
  chat: 'default',
  board: 'default',
  holders: 'default',
  info: 'default',
};

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      layouts: DEFAULT_LAYOUTS,
      activePanels: DEFAULT_PANELS,
      selectedToken: null,
      isLocked: true,
      panelSkins: DEFAULT_SKINS,

      setLayouts: (layouts) => set({ layouts }),

      togglePanel: (panel) =>
        set((state) => ({
          activePanels: state.activePanels.includes(panel)
            ? state.activePanels.filter((p) => p !== panel)
            : [...state.activePanels, panel],
        })),

      setSelectedToken: (token) => set({ selectedToken: token }),

      resetLayout: () =>
        set({
          layouts: DEFAULT_LAYOUTS,
          activePanels: DEFAULT_PANELS,
          panelSkins: DEFAULT_SKINS,
        }),

      toggleLock: () => set((state) => ({ isLocked: !state.isLocked })),

      setLocked: (locked) => set({ isLocked: locked }),

      setPanelSkin: (panel, skin) =>
        set((state) => ({
          panelSkins: { ...state.panelSkins, [panel]: skin },
        })),
    }),
    {
      name: 'pump-fud-dashboard',
      version: 3, // Bump version to force proper layouts with all panels
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as DashboardState;

        // Migration: ensure all default panels exist in layouts and activePanels
        // Version 3: Force reset layouts to fix Holders panel positioning
        if (version < 3) {
          return {
            ...state,
            layouts: DEFAULT_LAYOUTS,
            activePanels: DEFAULT_PANELS,
            panelSkins: DEFAULT_SKINS,
            isLocked: true,
          };
        }

        return state;
      },
    }
  )
);
