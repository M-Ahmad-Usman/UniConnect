import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '../auth.store';
import type { AuthUser } from '@/types/auth.types';
import { UserType } from '@/types/enums';

const testUser: AuthUser = {
  publicId: '0198f1f0-0000-7000-8000-000000000001',
  fullName: 'Ahmad Ali',
  email: 'ahmad@ntu.edu.pk',
  userType: UserType.STUDENT,
  mustChangePassword: false,
};

const forceChangeUser: AuthUser = {
  ...testUser,
  mustChangePassword: true,
};

function resetStore() {
  useAuthStore.setState({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    requiresPasswordChange: false,
  });
}

describe('auth store', () => {
  beforeEach(resetStore);

  it('starts in the loading state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(true);
    expect(state.requiresPasswordChange).toBe(false);
  });

  describe('setUser', () => {
    it('stores the user and marks as authenticated', () => {
      useAuthStore.getState().setUser(testUser);
      const state = useAuthStore.getState();

      expect(state.user).toEqual(testUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.requiresPasswordChange).toBe(false);
    });

    it('sets requiresPasswordChange when user must change password', () => {
      useAuthStore.getState().setUser(forceChangeUser);
      const state = useAuthStore.getState();

      expect(state.requiresPasswordChange).toBe(true);
      expect(state.isAuthenticated).toBe(true);
    });
  });

  describe('clearUser', () => {
    it('resets all auth state', () => {
      useAuthStore.getState().setUser(testUser);
      useAuthStore.getState().clearUser();
      const state = useAuthStore.getState();

      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.requiresPasswordChange).toBe(false);
    });
  });

  describe('markPasswordChangeRequired', () => {
    it('sets requiresPasswordChange without a user object', () => {
      useAuthStore.getState().markPasswordChangeRequired();
      const state = useAuthStore.getState();

      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(true);
      expect(state.requiresPasswordChange).toBe(true);
      expect(state.isLoading).toBe(false);
    });
  });
});
