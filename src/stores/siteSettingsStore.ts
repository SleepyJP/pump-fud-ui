import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PanelType } from '@/types';

// Your wallet address - only this wallet can access admin settings
export const ADMIN_WALLET = '0x49bBEFa1d94702C0e9a5EAdDEc7c3C5D3eb9086B';

export interface SiteSettings {
  // Global backgrounds
  globalBackground: string | null;
  globalBackgroundOpacity: number;
  globalBackgroundBlur: number;

  // Header customization
  headerHeight: number;
  headerLogo: string | null;
  headerLogoPosition: 'left' | 'center' | 'right';
  headerBackgroundColor: string;
  headerBackgroundImage: string | null;

  // Panel-specific backgrounds
  panelBackgrounds: Record<PanelType, string | null>;

  // Token card skin
  tokenCardPattern: string | null;
  tokenCardPatternOpacity: number;

  // Homepage customization
  homepageHeroImage: string | null;
  homepageBannerText: string;

  // Color overrides
  accentColor: string;
  secondaryAccent: string;

  // Saved patterns/images library
  savedPatterns: { id: string; name: string; url: string; type: 'pattern' | 'image' }[];

  // Hidden/deleted tokens (frontend only - for tokens we want to hide from UI)
  hiddenTokens: `0x${string}`[];
}

interface SiteSettingsState extends SiteSettings {
  // Setters
  setGlobalBackground: (url: string | null) => void;
  setGlobalBackgroundOpacity: (opacity: number) => void;
  setGlobalBackgroundBlur: (blur: number) => void;

  // Header setters
  setHeaderHeight: (height: number) => void;
  setHeaderLogo: (url: string | null) => void;
  setHeaderLogoPosition: (position: 'left' | 'center' | 'right') => void;
  setHeaderBackgroundColor: (color: string) => void;
  setHeaderBackgroundImage: (url: string | null) => void;

  setPanelBackground: (panel: PanelType, url: string | null) => void;
  setTokenCardPattern: (url: string | null) => void;
  setTokenCardPatternOpacity: (opacity: number) => void;
  setHomepageHeroImage: (url: string | null) => void;
  setHomepageBannerText: (text: string) => void;
  setAccentColor: (color: string) => void;
  setSecondaryAccent: (color: string) => void;
  addSavedPattern: (pattern: { name: string; url: string; type: 'pattern' | 'image' }) => void;
  removeSavedPattern: (id: string) => void;

  // Token management
  hideToken: (address: `0x${string}`) => void;
  unhideToken: (address: `0x${string}`) => void;
  isTokenHidden: (address: `0x${string}`) => boolean;

  resetAllSettings: () => void;
}

const DEFAULT_SETTINGS: SiteSettings = {
  globalBackground: null,
  globalBackgroundOpacity: 30,
  globalBackgroundBlur: 0,

  headerHeight: 64,
  headerLogo: null,
  headerLogoPosition: 'left',
  headerBackgroundColor: '#0a0a0a',
  headerBackgroundImage: null,

  panelBackgrounds: {
    chart: null,
    trade: null,
    chat: null,
    board: null,
    holders: null,
    info: null,
  },
  tokenCardPattern: null,
  tokenCardPatternOpacity: 20,
  homepageHeroImage: null,
  homepageBannerText: 'PUMP.FUD - Launch your token on PulseChain',
  accentColor: '#00ff88',
  secondaryAccent: '#8b5cf6',
  savedPatterns: [],
  hiddenTokens: [],
};

export const useSiteSettings = create<SiteSettingsState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SETTINGS,

      setGlobalBackground: (url) => set({ globalBackground: url }),
      setGlobalBackgroundOpacity: (opacity) => set({ globalBackgroundOpacity: opacity }),
      setGlobalBackgroundBlur: (blur) => set({ globalBackgroundBlur: blur }),

      // Header setters
      setHeaderHeight: (height) => set({ headerHeight: height }),
      setHeaderLogo: (url) => set({ headerLogo: url }),
      setHeaderLogoPosition: (position) => set({ headerLogoPosition: position }),
      setHeaderBackgroundColor: (color) => set({ headerBackgroundColor: color }),
      setHeaderBackgroundImage: (url) => set({ headerBackgroundImage: url }),

      setPanelBackground: (panel, url) =>
        set((state) => ({
          panelBackgrounds: { ...state.panelBackgrounds, [panel]: url },
        })),

      setTokenCardPattern: (url) => set({ tokenCardPattern: url }),
      setTokenCardPatternOpacity: (opacity) => set({ tokenCardPatternOpacity: opacity }),

      setHomepageHeroImage: (url) => set({ homepageHeroImage: url }),
      setHomepageBannerText: (text) => set({ homepageBannerText: text }),

      setAccentColor: (color) => set({ accentColor: color }),
      setSecondaryAccent: (color) => set({ secondaryAccent: color }),

      addSavedPattern: (pattern) =>
        set((state) => ({
          savedPatterns: [
            ...state.savedPatterns,
            { ...pattern, id: `pattern-${Date.now()}` },
          ],
        })),

      removeSavedPattern: (id) =>
        set((state) => ({
          savedPatterns: state.savedPatterns.filter((p) => p.id !== id),
        })),

      // Token management
      hideToken: (address) =>
        set((state) => ({
          hiddenTokens: [...state.hiddenTokens, address],
        })),

      unhideToken: (address) =>
        set((state) => ({
          hiddenTokens: state.hiddenTokens.filter((a) => a.toLowerCase() !== address.toLowerCase()),
        })),

      isTokenHidden: (address) => {
        const state = get();
        return state.hiddenTokens.some((a) => a.toLowerCase() === address.toLowerCase());
      },

      resetAllSettings: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: 'pump-fud-site-settings',
    }
  )
);

// Helper to check if connected wallet is admin
export const isAdminWallet = (address: string | undefined): boolean => {
  if (!address) return false;
  return address.toLowerCase() === ADMIN_WALLET.toLowerCase();
};
