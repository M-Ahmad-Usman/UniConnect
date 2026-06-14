import { describe, expect, it } from 'vitest';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  passwordSchema,
  resetPasswordSchema,
} from '../schemas';

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    const result = loginSchema.safeParse({ email: 'test@ntu.edu.pk', password: 'secret' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({ email: 'notanemail', password: 'secret' });
    expect(result.success).toBe(false);
  });

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({ email: 'test@ntu.edu.pk', password: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing fields', () => {
    expect(loginSchema.safeParse({}).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'test@ntu.edu.pk' }).success).toBe(false);
  });
});

describe('passwordSchema', () => {
  const valid = 'Strong1!a';

  it('accepts a password meeting all rules', () => {
    expect(passwordSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects passwords shorter than 8 characters', () => {
    expect(passwordSchema.safeParse('Sh1!').success).toBe(false);
  });

  it('rejects passwords without a lowercase letter', () => {
    expect(passwordSchema.safeParse('STRONG1!A').success).toBe(false);
  });

  it('rejects passwords without an uppercase letter', () => {
    expect(passwordSchema.safeParse('strong1!a').success).toBe(false);
  });

  it('rejects passwords without a digit', () => {
    expect(passwordSchema.safeParse('Strong!!a').success).toBe(false);
  });

  it('rejects passwords without a special character', () => {
    expect(passwordSchema.safeParse('Strong1aa').success).toBe(false);
  });
});

describe('forgotPasswordSchema', () => {
  it('accepts a valid email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'user@ntu.edu.pk' }).success).toBe(true);
  });

  it('rejects an invalid email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'bad' }).success).toBe(false);
  });
});

describe('resetPasswordSchema', () => {
  it('accepts a valid token and strong password', () => {
    const result = resetPasswordSchema.safeParse({
      token: 'abc123',
      newPassword: 'Strong1!a',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty token', () => {
    const result = resetPasswordSchema.safeParse({
      token: '',
      newPassword: 'Strong1!a',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a weak new password', () => {
    const result = resetPasswordSchema.safeParse({
      token: 'abc123',
      newPassword: 'weak',
    });
    expect(result.success).toBe(false);
  });
});

describe('changePasswordSchema', () => {
  it('accepts valid current and new passwords', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'OldPass1!',
      newPassword: 'NewPass1!',
    });
    expect(result.success).toBe(true);
  });

  it('rejects when new password equals current password', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'SamePass1!',
      newPassword: 'SamePass1!',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty current password', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: '',
      newPassword: 'Strong1!a',
    });
    expect(result.success).toBe(false);
  });

  it('rejects weak new password', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'OldPass1!',
      newPassword: 'weak',
    });
    expect(result.success).toBe(false);
  });
});
