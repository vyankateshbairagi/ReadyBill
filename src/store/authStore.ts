import { create } from 'zustand';
import { Platform } from 'react-native';

export type UserRole = 'OWNER' | 'MANAGER' | 'CASHIER';

export interface UserProfile {
  id: string;
  name: string;
  mobile: string;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
}

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: UserProfile) => void;
  logout: () => void;
  initializeAuth: () => void;
}

const STORAGE_KEY_TOKEN = 'readybill_auth_token';
const STORAGE_KEY_USER = 'readybill_auth_user';

function getStoredValue(key: string): string | null {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return null;
}

function setStoredValue(key: string, value: string | null): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    try {
      if (value === null) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Ignore storage errors
    }
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,

  initializeAuth: () => {
    const savedToken = getStoredValue(STORAGE_KEY_TOKEN);
    const savedUserJson = getStoredValue(STORAGE_KEY_USER);

    if (savedToken && savedUserJson) {
      try {
        const savedUser = JSON.parse(savedUserJson) as UserProfile;
        set({
          token: savedToken,
          user: savedUser,
          isAuthenticated: true,
          isLoading: false,
        });
        return;
      } catch {
        // Fallback on corrupt JSON
      }
    }

    set({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  login: (token: string, user: UserProfile) => {
    setStoredValue(STORAGE_KEY_TOKEN, token);
    setStoredValue(STORAGE_KEY_USER, JSON.stringify(user));

    set({
      token,
      user,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  logout: () => {
    setStoredValue(STORAGE_KEY_TOKEN, null);
    setStoredValue(STORAGE_KEY_USER, null);

    set({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },
}));
