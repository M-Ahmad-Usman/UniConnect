import { expect, test, type Page } from '@playwright/test';
import {
  e2eUsers,
  findUserByEmail,
  generateResetToken,
  storeResetTokenHash,
} from './helpers/auth';

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

test.describe('reset password flow', () => {
  test('forgot password always shows a success confirmation', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.getByLabel('Email').fill(e2eUsers.forgotPassword.email);
    await page.getByRole('button', { name: 'Send reset link' }).click();

    await expect(
      page.getByText('If an account exists with that email address, a reset link has been sent.'),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to sign in' })).toBeVisible();
  });

  test('reset password accepts a valid token and allows sign-in with the new password', async ({ page }) => {
    const user = await findUserByEmail(e2eUsers.resetPassword.email);
    const updatedPassword = 'ResetDone@1234';

    expect(user).not.toBeNull();

    const token = generateResetToken(user!.id, user!.email);
    await storeResetTokenHash(user!.id, token);

    await page.goto(`/reset-password?token=${encodeURIComponent(token)}`);
    await page.locator('#reset-password-new').fill(updatedPassword);
    await page.getByRole('button', { name: 'Reset password' }).click();

    await expect(page).toHaveURL(/\/login$/);

    await signIn(page, e2eUsers.resetPassword.email, updatedPassword);

    await expect(page).toHaveURL(/\/servers$/);
    await expect(page.getByText('Servers')).toBeVisible();
  });

  test('reset password shows an error for an invalid token', async ({ page }) => {
    await page.goto('/reset-password?token=not-a-valid-token');
    await page.locator('#reset-password-new').fill('Broken@1234');
    await page.getByRole('button', { name: 'Reset password' }).click();

    await expect(page).toHaveURL(/\/reset-password\?token=not-a-valid-token$/);
    await expect(page.getByText('Invalid or expired reset token')).toBeVisible();
  });
});