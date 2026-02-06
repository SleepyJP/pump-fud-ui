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
  // Track if synced with on-chain
  onChainSynced?: boolean;
}

interface ProfileState {
  // Profiles keyed by wallet address (lowercase)
  profiles: Record<string, UserProfile>;
  // Hydration flag
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;

  // Get profile for address
  getProfile: (address: string) => UserProfile | null;

  // Update profile for connected wallet (local cache only)
  setProfile: (address: string, profile: Partial<UserProfile>) => void;

  // Update profile from on-chain data
  setProfileFromChain: (address: string, profile: UserProfile) => void;

  // Clear profile
  clearProfile: (address: string) => void;
}

const DEFAULT_PROFILE: UserProfile = {
  displayName: '',
  bio: '',
  avatarUrl: '',
  socialLinks: {},
  updatedAt: 0,
  onChainSynced: false,
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
              onChainSynced: false, // Mark as needing sync
            },
          };
          console.log('[ProfileStore] New profiles state:', newProfiles);
          return { profiles: newProfiles };
        });
      },

      setProfileFromChain: (address: string, profile: UserProfile) => {
        const key = address.toLowerCase();
        console.log('[ProfileStore] Setting profile from chain:', key, profile);
        set((state) => ({
          profiles: {
            ...state.profiles,
            [key]: {
              ...profile,
              onChainSynced: true,
            },
          },
        }));
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
      version: 2, // Bump version for migration
    }
  )
);

// Hook to wait for hydration
export const useProfileHydration = () => {
  return useProfileStore((state) => state._hasHydrated);
};

// ProfileRegistry contract address
export const PROFILE_REGISTRY_ADDRESS = '0x0b0489332D9Cba8609DE2EaA31ecD36D0bb6c2E1';

// ProfileRegistry ABI (minimal for reading/writing)
export const PROFILE_REGISTRY_ABI = [
  {
    name: 'setProfile',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'displayName', type: 'string' },
      { name: 'bio', type: 'string' },
      { name: 'avatarUrl', type: 'string' },
      { name: 'twitter', type: 'string' },
      { name: 'telegram', type: 'string' },
      { name: 'website', type: 'string' },
    ],
    outputs: [],
  },
  {
    name: 'getProfile',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      { name: 'displayName', type: 'string' },
      { name: 'bio', type: 'string' },
      { name: 'avatarUrl', type: 'string' },
      { name: 'twitter', type: 'string' },
      { name: 'telegram', type: 'string' },
      { name: 'website', type: 'string' },
      { name: 'updatedAt', type: 'uint256' },
    ],
  },
  {
    name: 'hasProfile',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'clearProfile',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
] as const;
