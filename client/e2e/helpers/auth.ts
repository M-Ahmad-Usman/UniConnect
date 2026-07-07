import { createHash } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { withDb } from './db';

export const RESET_PASSWORD_SECRET =
  process.env.E2E_RESET_PASSWORD_SECRET ?? 'test-reset-secret-at-least-32-characters-long';

export const e2eUsers = {
  student: {
    email: 'e2e.student@uniconnect.test',
    password: 'Test@1234',
    fullName: 'E2E Student',
    mustChangePassword: false,
  },
  invalidLogin: {
    email: 'e2e.invalid.login@uniconnect.test',
    password: 'InvalidLogin@1234',
    fullName: 'E2E Invalid Login',
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
  moduleManager: {
    email: 'e2e.module.manager@uniconnect.test',
    password: 'Manager@1234',
    fullName: 'E2E Module Manager',
    mustChangePassword: false,
    userType: 'Teacher',
  },
  moduleViewer: {
    email: 'e2e.module.viewer@uniconnect.test',
    password: 'Viewer@1234',
    fullName: 'E2E Module Viewer',
    mustChangePassword: false,
    userType: 'Student',
  },
  moduleAcademicHod: {
    email: 'e2e.academic.hod@uniconnect.test',
    password: 'AcademicHod@1234',
    fullName: 'E2E Academic HOD',
    mustChangePassword: false,
    userType: 'Teacher',
  },
  moduleEnrollmentOfficer: {
    email: 'e2e.enrollment.officer@uniconnect.test',
    password: 'EnrollmentOfficer@1234',
    fullName: 'E2E Enrollment Officer',
    mustChangePassword: false,
    userType: 'Staff',
  },
  moduleAcademicPd: {
    email: 'e2e.academic.pd@uniconnect.test',
    password: 'AcademicPd@1234',
    fullName: 'E2E Academic PD',
    mustChangePassword: false,
    userType: 'Teacher',
  },
  moduleAcademicOldTeacher: {
    email: 'e2e.academic.old.teacher@uniconnect.test',
    password: 'OldTeacher@1234',
    fullName: 'E2E Current Course Teacher',
    mustChangePassword: false,
    userType: 'Teacher',
  },
  moduleAcademicCrossTeacher: {
    email: 'e2e.academic.cross.teacher@uniconnect.test',
    password: 'CrossTeacher@1234',
    fullName: 'E2E Cross Department Teacher',
    mustChangePassword: false,
    userType: 'Teacher',
  },
  moduleAcademicProgressTeacher: {
    email: 'e2e.academic.progress.teacher@uniconnect.test',
    password: 'ProgressTeacher@1234',
    fullName: 'E2E Progression Teacher',
    mustChangePassword: false,
    userType: 'Teacher',
  },
  moduleAcademicGraduateTeacher: {
    email: 'e2e.academic.graduate.teacher@uniconnect.test',
    password: 'GraduateTeacher@1234',
    fullName: 'E2E Graduation Teacher',
    mustChangePassword: false,
    userType: 'Teacher',
  },
  moduleAcademicTransferStudent: {
    email: 'e2e.academic.transfer.student@uniconnect.test',
    password: 'TransferStudent@1234',
    fullName: 'E2E Transfer Student',
    mustChangePassword: false,
    userType: 'Student',
  },
  moduleSocietyPresident: {
    email: 'e2e.society.president@uniconnect.test',
    password: 'SocietyPresident@1234',
    fullName: 'E2E Society President',
    mustChangePassword: false,
    userType: 'Student',
  },
  moduleSocietyConvenor: {
    email: 'e2e.society.convenor@uniconnect.test',
    password: 'SocietyConvenor@1234',
    fullName: 'E2E Society Convenor',
    mustChangePassword: false,
    userType: 'Teacher',
  },
  moduleSocietyMember: {
    email: 'e2e.society.member@uniconnect.test',
    password: 'SocietyMember@1234',
    fullName: 'E2E Society Member',
    mustChangePassword: false,
    userType: 'Student',
  },
  moduleSocietyApplicant: {
    email: 'e2e.society.applicant@uniconnect.test',
    password: 'SocietyApplicant@1234',
    fullName: 'E2E Society Applicant',
    mustChangePassword: false,
    userType: 'Student',
  },
  moduleSocietyOutsiderTeacher: {
    email: 'e2e.society.outsider.teacher@uniconnect.test',
    password: 'SocietyOutsider@1234',
    fullName: 'E2E Society Outsider Teacher',
    mustChangePassword: false,
    userType: 'Teacher',
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
    const result = await pool.query<{ id: number; public_id: string; email: string }>(
      'SELECT id, public_id, email FROM users WHERE email = $1 LIMIT 1',
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
