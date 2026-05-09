import type { AuthUser, UserProfile } from '@/types';

export function mapProfileToAuthUser(profile: UserProfile): AuthUser {
  return {
    id: profile.id,
    fullName: profile.fullName,
    email: profile.email,
    userType: profile.userType,
    mustChangePassword: profile.mustChangePassword,
    profilePictureUrl: profile.profilePictureUrl,
    roles: profile.roles,
  };
}

export function isAuthUserSyncedWithProfile(user: AuthUser, profile: UserProfile) {
  return (
    user.id === profile.id &&
    user.fullName === profile.fullName &&
    user.email === profile.email &&
    user.userType === profile.userType &&
    user.mustChangePassword === profile.mustChangePassword &&
    user.profilePictureUrl === profile.profilePictureUrl &&
    user.roles === profile.roles
  );
}
