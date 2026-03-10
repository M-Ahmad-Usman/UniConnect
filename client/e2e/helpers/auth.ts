import { createHash } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { withDb } from './db';

export const RESET_PASSWORD_SECRET =
  process.env.E2E_RESET_PASSWORD_SECRET ??
  'test-reset-secret-at-least-32-characters-long';

export const e2eUsers = {
  student: {
    email: 'e2e.student@uniconnect.test',
    password: 'Test@1234',
    fullName: 'E2E Student',
    mustChangePassword: false,
  },
  logout: {
    email: 'e2e.logout@uniconnect.test',
    password: 'Logout@1234',
    fullName: 'E2E Logout User',
    mustChangePassword: false,
  },
  forcedRedirect: {
    email: 'e2e.force.redirect@uniconnect.test',
    password: 'TEMP_Force@1234',
    fullName: 'E2E Forced Redirect',
    mustChangePassword: true,
  },
  forcedChange: {
    email: 'e2e.force.change@uniconnect.test',
    password: 'TEMP_Change@1234',
    fullName: 'E2E Forced Change',
    mustChangePassword: true,
  },
  forgotPassword: {
    email: 'e2e.forgot@uniconnect.test',
    password: 'Forgot@1234',
    fullName: 'E2E Forgot Password',
    mustChangePassword: false,
  },
  resetPassword: {
    email: 'e2e.reset@uniconnect.test',
    password: 'Reset@1234',
    fullName: 'E2E Reset Password',
    mustChangePassword: false,
  },
  moduleShell: {
    email: 'e2e.module.shell@uniconnect.test',
    password: 'Shell@1234',
    fullName: 'E2E Module Shell',
    mustChangePassword: false,
  },
  moduleNotifications: {
    email: 'e2e.module.notifications@uniconnect.test',
    password: 'Notify@1234',
    fullName: 'E2E Module Notifications',
    mustChangePassword: false,
  },
} as const;

export function generateResetToken(userId: number, email: string) {
  return jwt.sign({ id: userId, email }, RESET_PASSWORD_SECRET, {
    expiresIn: '1h',
  });
}

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function findUserByEmail(email: string) {
  return withDb(async (pool) => {
    const result = await pool.query<{ id: number; email: string }>(
      'SELECT id, email FROM users WHERE email = $1 LIMIT 1',
      [email],
    );

    return result.rows[0] ?? null;
  });
}

export async function storeResetTokenHash(userId: number, token: string) {
  await withDb(async (pool) => {
    await pool.query('UPDATE users SET password_reset_token_hash = $2 WHERE id = $1', [
      userId,
      hashToken(token),
    ]);
  });
}