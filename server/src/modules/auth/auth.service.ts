import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { StringValue } from "ms";
import crypto from "crypto";
import { prisma } from "../../config/prisma.js";
import { env } from "../../config/env.js";
import { emailService } from "../../config/email.js";
import { UnauthorizedError } from "../../shared/errors/index.js";
import { parseExpiry } from "../../shared/utils/parseExpiry.js";
import { BCRYPT_ROUNDS } from "../../shared/constants.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateAccessToken(payload: {
  id: number;
  email: string;
  userType: string;
  departmentId: number | null;
  mustChangePassword: boolean;
}): string {
  return jwt.sign({ ...payload, jti: crypto.randomUUID() }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY as StringValue,
  });
}

function generateRefreshToken(userId: number): string {
  return jwt.sign({ id: userId, jti: crypto.randomUUID() }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRY as StringValue,
  });
}

async function storeRefreshToken(userId: number, token: string): Promise<void> {
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + parseExpiry(env.JWT_REFRESH_EXPIRY));

  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt },
  });
}

// ─── Login ──────────────────────────────────────────────────────────────────

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.isActive) {
    console.warn("[AUTH] Failed login attempt", { email, reason: "invalid_credentials", timestamp: new Date().toISOString() });
    throw new UnauthorizedError("Invalid credentials");
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash);
  if (!passwordValid) {
    console.warn("[AUTH] Failed login attempt", { email, reason: "invalid_credentials", timestamp: new Date().toISOString() });
    throw new UnauthorizedError("Invalid credentials");
  }

  const accessToken = generateAccessToken({
    id: user.id,
    email: user.email,
    userType: user.userType,
    departmentId: user.departmentId,
    mustChangePassword: user.mustChangePassword,
  });

  const refreshToken = generateRefreshToken(user.id);
  await storeRefreshToken(user.id, refreshToken);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      userType: user.userType,
      mustChangePassword: user.mustChangePassword,
    },
  };
}

// ─── Refresh ────────────────────────────────────────────────────────────────

export async function refresh(refreshTokenCookie: string) {
  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(refreshTokenCookie, env.JWT_REFRESH_SECRET) as jwt.JwtPayload;
  } catch {
    throw new UnauthorizedError("Invalid refresh token");
  }

  const tokenUserId = Number(payload.id);
  if (!Number.isInteger(tokenUserId) || tokenUserId <= 0) {
    throw new UnauthorizedError("Invalid refresh token");
  }

  const tokenHash = hashToken(refreshTokenCookie);

  return prisma.$transaction(async (tx) => {
    const storedToken = await tx.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true, userId: true },
    });

    if (!storedToken || storedToken.userId !== tokenUserId) {
      throw new UnauthorizedError("Invalid refresh token");
    }

    const revokeResult = await tx.refreshToken.updateMany({
      where: { id: storedToken.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    if (revokeResult.count !== 1) {
      throw new UnauthorizedError("Invalid refresh token");
    }

    const user = await tx.user.findUnique({
      where: { id: storedToken.userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError("Invalid refresh token");
    }

    const newAccessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      userType: user.userType,
      departmentId: user.departmentId,
      mustChangePassword: user.mustChangePassword,
    });

    const newRefreshToken = generateRefreshToken(user.id);
    const newTokenHash = hashToken(newRefreshToken);
    const expiresAt = new Date(Date.now() + parseExpiry(env.JWT_REFRESH_EXPIRY));

    await tx.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: newTokenHash,
        expiresAt,
      },
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  });
}

// ─── Logout ─────────────────────────────────────────────────────────────────

export async function logout(refreshTokenCookie: string | undefined): Promise<void> {
  if (!refreshTokenCookie) return;

  const tokenHash = hashToken(refreshTokenCookie);

  // Revoke if exists — idempotent
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  console.info("[AUTH] Session revoked", { reason: "logout", timestamp: new Date().toISOString() });
}

// ─── Forgot Password ───────────────────────────────────────────────────────

export async function forgotPassword(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });

  // Always return silently to avoid user enumeration
  if (!user) return;

  const resetToken = jwt.sign(
    { id: user.id, email: user.email },
    env.RESET_PASSWORD_SECRET,
    { expiresIn: env.RESET_PASSWORD_EXPIRY as StringValue }
  );

  // Store hash for one-time-use validation
  const tokenHash = hashToken(resetToken);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordResetTokenHash: tokenHash },
  });

  try {
    await emailService.sendResetPasswordEmail(email, resetToken);
  } catch (error) {
    // Log but don't throw — forgotPassword must always return silently
    // to prevent user enumeration via error responses
    console.error("Failed to send reset-password email:", error);
  }
}

// ─── Reset Password ────────────────────────────────────────────────────────

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(token, env.RESET_PASSWORD_SECRET) as jwt.JwtPayload;
  } catch {
    throw new UnauthorizedError("Invalid or expired reset token");
  }

  // Verify token matches stored hash (one-time use)
  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: { passwordResetTokenHash: true },
  });

  const tokenHash = hashToken(token);
  if (!user || user.passwordResetTokenHash !== tokenHash) {
    throw new UnauthorizedError("Invalid or expired reset token");
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  // Clear the hash after successful reset (one-time use)
  await prisma.user.update({
    where: { id: payload.id },
    data: { passwordHash, mustChangePassword: false, passwordResetTokenHash: null },
  });

  // Revoke all refresh tokens for security (force re-login)
  await prisma.refreshToken.updateMany({
    where: { userId: payload.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  console.info("[AUTH] Password reset completed", { userId: payload.id, timestamp: new Date().toISOString() });
}

// ─── Change Password ───────────────────────────────────────────────────────

export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new UnauthorizedError("Invalid credentials");
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError("Current password is incorrect");
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: false },
  });

  // Revoke all refresh tokens for this user (force re-login on other devices)
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  console.info("[AUTH] Password changed", { userId, timestamp: new Date().toISOString() });
}

// ─── Stale Token Cleanup ────────────────────────────────────────────────────

/**
 * Delete refresh tokens that are expired or revoked and older than the
 * retention window. Call on a schedule (e.g., daily cron or after login).
 */
export async function purgeStaleRefreshTokens(retentionDays = 7): Promise<number> {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const { count } = await prisma.refreshToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() }, createdAt: { lt: cutoff } },
        { revokedAt: { not: null }, createdAt: { lt: cutoff } },
      ],
    },
  });

  if (count > 0) {
    console.info("[AUTH] Purged stale refresh tokens", { count, timestamp: new Date().toISOString() });
  }

  return count;
}