import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PanelType } from '@/types';

// Your wallet address - only this wallet can access admin settings
export const ADMIN_WALLET = '0x49bBEFa1d94702C0e9a5EAdDEc7c3C5D3eb9086B';

export interface ThemeColors {
  // Primary colors
  accentPrimary: string;
  accentSecondary: string;
  accentTertiary: string;

  // Background colors
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgCard: string;

  // Text colors
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textAccent: string;

  // Border colors
  borderPrimary: string;
  borderSecondary: string;
  borderGlow: string;

  // Button colors
  buttonPrimary: string;
  buttonPrimaryText: string;
  buttonSecondary: string;
  buttonSecondaryText: string;
  buttonDanger: string;
  buttonDangerText: string;

  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;

  // Effects
  glowColor: string;
  shadowColor: string;
}

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

  // Page-specific backgrounds
  pageBackgrounds: {
    home: string | null;
    tokens: string | null;
    tokenDashboard: string | null;
    profile: string | null;
    settings: string | null;
    launch: string | null;
    leaderboard: string | null;
    livestream: string | null;
  };

  // Floating elements (admin can place text/images on pages)
  floatingElements: {
    id: string;
    type: 'text' | 'image';
    content: string;
    page: string;
    x: number;
    y: number;
    width: number;
    height: number;
    locked: boolean;
    style?: {
      fontSize?: string;
      color?: string;
      backgroundColor?: string;
      borderRadius?: string;
      opacity?: number;
    };
  }[];

  // Ad carousel
  adCarousel: {
    enabled: boolean;
    ads: {
      id: string;
      imageUrl: string;
      linkUrl: string;
      title: string;
      active: boolean;
    }[];
    rotationSpeed: number; // seconds
  };

  // Full theme colors
  theme: ThemeColors;

  // Legacy color overrides (kept for backwards compat)
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

  // Page backgrounds
  setPageBackground: (page: keyof SiteSettings['pageBackgrounds'], url: string | null) => void;

  // Floating elements
  addFloatingElement: (element: Omit<SiteSettings['floatingElements'][0], 'id'>) => void;
  updateFloatingElement: (id: string, updates: Partial<SiteSettings['floatingElements'][0]>) => void;
  removeFloatingElement: (id: string) => void;
  lockFloatingElement: (id: string, locked: boolean) => void;

  // Ad carousel
  setAdCarouselEnabled: (enabled: boolean) => void;
  setAdRotationSpeed: (speed: number) => void;
  addAd: (ad: Omit<SiteSettings['adCarousel']['ads'][0], 'id'>) => void;
  updateAd: (id: string, updates: Partial<SiteSettings['adCarousel']['ads'][0]>) => void;
  removeAd: (id: string) => void;
  toggleAdActive: (id: string) => void;

  // Theme setters
  setThemeColor: (key: keyof ThemeColors, value: string) => void;
  setFullTheme: (theme: Partial<ThemeColors>) => void;
  resetTheme: () => void;

  // Token management
  hideToken: (address: `0x${string}`) => void;
  unhideToken: (address: `0x${string}`) => void;
  isTokenHidden: (address: `0x${string}`) => boolean;

  resetAllSettings: () => void;
}

const DEFAULT_THEME: ThemeColors = {
  // Primary colors
  accentPrimary: '#00ff88',
  accentSecondary: '#8b5cf6',
  accentTertiary: '#f97316',

  // Background colors
  bgPrimary: '#0a0a0a',
  bgSecondary: '#141414',
  bgTertiary: '#1f1f1f',
  bgCard: '#0d0d0d',

  // Text colors
  textPrimary: '#ffffff',
  textSecondary: '#e5e7eb',
  textMuted: '#9ca3af',
  textAccent: '#00ff88',

  // Border colors
  borderPrimary: '#333333',
  borderSecondary: '#444444',
  borderGlow: 'rgba(0, 255, 136, 0.3)',

  // Button colors
  buttonPrimary: '#00ff88',
  buttonPrimaryText: '#000000',
  buttonSecondary: '#333333',
  buttonSecondaryText: '#ffffff',
  buttonDanger: '#ef4444',
  buttonDangerText: '#ffffff',

  // Status colors
  success: '#00ff88',
  warning: '#f97316',
  error: '#ef4444',
  info: '#3b82f6',

  // Effects
  glowColor: 'rgba(0, 255, 136, 0.5)',
  shadowColor: 'rgba(0, 0, 0, 0.5)',
};

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
  pageBackgrounds: {
    home: null,
    tokens: null,
    tokenDashboard: null,
    profile: null,
    settings: null,
    launch: null,
    leaderboard: null,
    livestream: null,
  },
  floatingElements: [],
  adCarousel: {
    enabled: false,
    ads: [],
    rotationSpeed: 5,
  },
  theme: DEFAULT_THEME,
  accentColor: '#00ff88',
  secondaryAccent: '#8b5cf6',
  savedPatterns: [],
  // Pre-hidden test tokens for clean launch
  hiddenTokens: [
    '0x993ff7f0bfc0a4338367342a747513bd9b014554', // NAH - Nanner's
    '0x71d92fcd589df9b22578af11073199137f610b88', // DWB - DickWifButt
    '0x97abfde56c6c3bec676899c97de50c1ec679e2c4', // TEST - TESTIES
    '0x9ec33905f672bec08b1e95e44f5d2046d733a3e9', // TEST2 - TESTIE 2
    '0x6a4885c6a60a52ff270ec0a98ce6232eb7e0c95a', // FCKNBUTT - BUTT FUCKIN AMAZING
  ] as `0x${string}`[],
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

      // Page backgrounds
      setPageBackground: (page, url) =>
        set((state) => ({
          pageBackgrounds: { ...state.pageBackgrounds, [page]: url },
        })),

      // Floating elements
      addFloatingElement: (element) =>
        set((state) => ({
          floatingElements: [
            ...state.floatingElements,
            { ...element, id: `float-${Date.now()}` },
          ],
        })),

      updateFloatingElement: (id, updates) =>
        set((state) => ({
          floatingElements: state.floatingElements.map((el) =>
            el.id === id ? { ...el, ...updates } : el
          ),
        })),

      removeFloatingElement: (id) =>
        set((state) => ({
          floatingElements: state.floatingElements.filter((el) => el.id !== id),
        })),

      lockFloatingElement: (id, locked) =>
        set((state) => ({
          floatingElements: state.floatingElements.map((el) =>
            el.id === id ? { ...el, locked } : el
          ),
        })),

      // Ad carousel
      setAdCarouselEnabled: (enabled) =>
        set((state) => ({
          adCarousel: { ...state.adCarousel, enabled },
        })),

      setAdRotationSpeed: (speed) =>
        set((state) => ({
          adCarousel: { ...state.adCarousel, rotationSpeed: speed },
        })),

      addAd: (ad) =>
        set((state) => ({
          adCarousel: {
            ...state.adCarousel,
            ads: [...state.adCarousel.ads, { ...ad, id: `ad-${Date.now()}` }],
          },
        })),

      updateAd: (id, updates) =>
        set((state) => ({
          adCarousel: {
            ...state.adCarousel,
            ads: state.adCarousel.ads.map((ad) =>
              ad.id === id ? { ...ad, ...updates } : ad
            ),
          },
        })),

      removeAd: (id) =>
        set((state) => ({
          adCarousel: {
            ...state.adCarousel,
            ads: state.adCarousel.ads.filter((ad) => ad.id !== id),
          },
        })),

      toggleAdActive: (id) =>
        set((state) => ({
          adCarousel: {
            ...state.adCarousel,
            ads: state.adCarousel.ads.map((ad) =>
              ad.id === id ? { ...ad, active: !ad.active } : ad
            ),
          },
        })),

      // Theme setters
      setThemeColor: (key, value) =>
        set((state) => ({
          theme: { ...state.theme, [key]: value },
        })),

      setFullTheme: (theme) =>
        set((state) => ({
          theme: { ...state.theme, ...theme },
        })),

      resetTheme: () => set({ theme: DEFAULT_THEME }),

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
      version: 2, // Bump this when changing defaults
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as SiteSettings;
        // Version 2: Add pre-hidden test tokens for clean launch
        if (version < 2) {
          const testTokens: `0x${string}`[] = [
            '0x993ff7f0bfc0a4338367342a747513bd9b014554',
            '0x71d92fcd589df9b22578af11073199137f610b88',
            '0x97abfde56c6c3bec676899c97de50c1ec679e2c4',
            '0x9ec33905f672bec08b1e95e44f5d2046d733a3e9',
            '0x6a4885c6a60a52ff270ec0a98ce6232eb7e0c95a',
          ];
          const existingHidden = state.hiddenTokens || [];
          const merged = [...new Set([...existingHidden, ...testTokens])];
          return { ...state, hiddenTokens: merged };
        }
        return state;
      },
    }
  )
);

// Helper to check if connected wallet is admin
export const isAdminWallet = (address: string | undefined): boolean => {
  if (!address) return false;
  return address.toLowerCase() === ADMIN_WALLET.toLowerCase();
};
