import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface UserProfile {
  displayName: string;
  bio: string;
  avatarUrl: string;
  socialLinks: {
    twitter?: string;
    telegram?: string;
    website?: string;
  };
  updatedAt: number;
}

interface ProfileState {
  // Profiles keyed by wallet address (lowercase)
  profiles: Record<string, UserProfile>;
  // Hydration flag
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;

  // Get profile for address
  getProfile: (address: string) => UserProfile | null;

  // Update profile for connected wallet
  setProfile: (address: string, profile: Partial<UserProfile>) => void;

  // Clear profile
  clearProfile: (address: string) => void;
}

const DEFAULT_PROFILE: UserProfile = {
  displayName: '',
  bio: '',
  avatarUrl: '',
  socialLinks: {},
  updatedAt: 0,
};

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profiles: {},
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      getProfile: (address: string) => {
        const key = address.toLowerCase();
        return get().profiles[key] || null;
      },

      setProfile: (address: string, profile: Partial<UserProfile>) => {
        const key = address.toLowerCase();
        console.log('[ProfileStore] Saving profile for:', key, profile);
        set((state) => {
          const newProfiles = {
            ...state.profiles,
            [key]: {
              ...DEFAULT_PROFILE,
              ...state.profiles[key],
              ...profile,
              updatedAt: Date.now(),
            },
          };
          console.log('[ProfileStore] New profiles state:', newProfiles);
          return { profiles: newProfiles };
        });
      },

      clearProfile: (address: string) => {
        const key = address.toLowerCase();
        set((state) => {
          const { [key]: _, ...rest } = state.profiles;
          return { profiles: rest };
        });
      },
    }),
    {
      name: 'pump-fud-profiles',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        console.log('[ProfileStore] Hydrated from localStorage:', state?.profiles);
        state?.setHasHydrated(true);
      },
      // Ensure version for migrations
      version: 1,
    }
  )
);

// Hook to wait for hydration
export const useProfileHydration = () => {
  return useProfileStore((state) => state._hasHydrated);
};
