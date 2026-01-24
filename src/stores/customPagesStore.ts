import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PanelType } from '@/types';

export interface CustomPagePanel {
  id: string;
  type: PanelType;
  x: number;
  y: number;
  w: number;
  h: number;
  visible: boolean;
  settings?: Record<string, unknown>;
}

export interface CustomPage {
  id: string;
  name: string;
  slug: string;
  description: string;
  panels: CustomPagePanel[];
  background: string | null;
  isPublic: boolean;
  createdAt: number;
  updatedAt: number;
}

interface CustomPagesState {
  customPages: CustomPage[];

  addPage: (page: Omit<CustomPage, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updatePage: (id: string, updates: Partial<Omit<CustomPage, 'id' | 'createdAt'>>) => void;
  deletePage: (id: string) => void;

  addPanelToPage: (pageId: string, panel: Omit<CustomPagePanel, 'id'>) => void;
  removePanelFromPage: (pageId: string, panelId: string) => void;
  updatePanelPosition: (pageId: string, panelId: string, updates: Partial<CustomPagePanel>) => void;

  getPageBySlug: (slug: string) => CustomPage | undefined;
  duplicatePage: (id: string, newName: string, newSlug: string) => void;
}

export const useCustomPages = create<CustomPagesState>()(
  persist(
    (set, get) => ({
      customPages: [],

      addPage: (page) =>
        set((state) => ({
          customPages: [
            ...state.customPages,
            {
              ...page,
              id: `page-${Date.now()}`,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          ],
        })),

      updatePage: (id, updates) =>
        set((state) => ({
          customPages: state.customPages.map((page) =>
            page.id === id
              ? { ...page, ...updates, updatedAt: Date.now() }
              : page
          ),
        })),

      deletePage: (id) =>
        set((state) => ({
          customPages: state.customPages.filter((page) => page.id !== id),
        })),

      addPanelToPage: (pageId, panel) =>
        set((state) => ({
          customPages: state.customPages.map((page) =>
            page.id === pageId
              ? {
                  ...page,
                  panels: [
                    ...page.panels,
                    { ...panel, id: `panel-${Date.now()}-${Math.random().toString(36).slice(2)}` },
                  ],
                  updatedAt: Date.now(),
                }
              : page
          ),
        })),

      removePanelFromPage: (pageId, panelId) =>
        set((state) => ({
          customPages: state.customPages.map((page) =>
            page.id === pageId
              ? {
                  ...page,
                  panels: page.panels.filter((p) => p.id !== panelId),
                  updatedAt: Date.now(),
                }
              : page
          ),
        })),

      updatePanelPosition: (pageId, panelId, updates) =>
        set((state) => ({
          customPages: state.customPages.map((page) =>
            page.id === pageId
              ? {
                  ...page,
                  panels: page.panels.map((p) =>
                    p.id === panelId ? { ...p, ...updates } : p
                  ),
                  updatedAt: Date.now(),
                }
              : page
          ),
        })),

      getPageBySlug: (slug) => {
        const state = get();
        return state.customPages.find((page) => page.slug === slug);
      },

      duplicatePage: (id, newName, newSlug) =>
        set((state) => {
          const original = state.customPages.find((p) => p.id === id);
          if (!original) return state;

          return {
            customPages: [
              ...state.customPages,
              {
                ...original,
                id: `page-${Date.now()}`,
                name: newName,
                slug: newSlug,
                panels: original.panels.map((p) => ({
                  ...p,
                  id: `panel-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                })),
                createdAt: Date.now(),
                updatedAt: Date.now(),
              },
            ],
          };
        }),
    }),
    {
      name: 'pump-fud-custom-pages',
    }
  )
);
