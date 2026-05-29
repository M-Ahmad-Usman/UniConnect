import type { AuthUser, UserProfile } from '@/types';

export function mapProfileToAuthUser(profile: UserProfile): AuthUser {
  return {
    publicId: profile.publicId,
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
    user.publicId === profile.publicId &&
    user.fullName === profile.fullName &&
    user.email === profile.email &&
    user.userType === profile.userType &&
    user.mustChangePassword === profile.mustChangePassword &&
    user.profilePictureUrl === profile.profilePictureUrl &&
    user.roles === profile.roles
  );
}
