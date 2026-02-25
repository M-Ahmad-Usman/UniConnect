import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { StringValue } from "ms";
import crypto from "crypto";
import { prisma } from "../../config/prisma.js";
import { env } from "../../config/env.js";
import { emailService } from "../../config/email.js";
import { UnauthorizedError } from "../../shared/errors/index.js";

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

function parseExpiry(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 15 * 60 * 1000; // fallback 15m
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return value * (multipliers[unit] ?? 60 * 1000);
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
    throw new UnauthorizedError("Invalid credentials");
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash);
  if (!passwordValid) {
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

  const tokenHash = hashToken(refreshTokenCookie);

  const storedToken = await prisma.refreshToken.findFirst({
    where: {
      tokenHash,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!storedToken) {
    throw new UnauthorizedError("Invalid refresh token");
  }

  // Revoke old token
  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { revokedAt: new Date() },
  });

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
  });

  if (!user || !user.isActive) {
    throw new UnauthorizedError("Invalid refresh token");
  }

  // Issue new pair
  const newAccessToken = generateAccessToken({
    id: user.id,
    email: user.email,
    userType: user.userType,
    departmentId: user.departmentId,
    mustChangePassword: user.mustChangePassword,
  });

  const newRefreshToken = generateRefreshToken(user.id);
  await storeRefreshToken(user.id, newRefreshToken);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
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

  await emailService.sendResetPasswordEmail(email, resetToken);
}

// ─── Reset Password ────────────────────────────────────────────────────────

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(token, env.RESET_PASSWORD_SECRET) as jwt.JwtPayload;
  } catch {
    throw new UnauthorizedError("Invalid or expired reset token");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: payload.id },
    data: { passwordHash, mustChangePassword: false },
  });

  // Revoke all refresh tokens for security (force re-login)
  await prisma.refreshToken.updateMany({
    where: { userId: payload.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
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

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: false },
  });

  // Revoke all refresh tokens for this user (force re-login on other devices)
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
