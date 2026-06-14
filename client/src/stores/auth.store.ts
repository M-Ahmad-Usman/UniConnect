import { create } from 'zustand';
import type { AuthUser } from '@/types/auth.types';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  requiresPasswordChange: boolean;
  setUser: (user: AuthUser) => void;
  clearUser: () => void;
  markPasswordChangeRequired: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  requiresPasswordChange: false,
  setUser: (user) =>
    set({
      user,
      isAuthenticated: true,
      isLoading: false,
      requiresPasswordChange: user.mustChangePassword,
    }),
  clearUser: () =>
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      requiresPasswordChange: false,
    }),
  markPasswordChangeRequired: () =>
    set({
      user: null,
      isAuthenticated: true,
      isLoading: false,
      requiresPasswordChange: true,
    }),
}));
