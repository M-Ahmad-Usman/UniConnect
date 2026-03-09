import { expect, test } from '@playwright/test';

test.describe('public auth pages', () => {
  test('login page renders the sign-in form', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByText('UniConnect')).toBeVisible();
    await expect(page.locator('[data-slot="card-title"]', { hasText: 'Sign in' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.locator('#login-password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('forgot-password page renders the reset request form', async ({ page }) => {
    await page.goto('/forgot-password');

    await expect(page.getByText('Forgot password')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send reset link' })).toBeVisible();
  });

  test('reset-password without token shows the invalid link state', async ({ page }) => {
    await page.goto('/reset-password');

    await expect(page.getByText('Invalid reset link')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Back to sign in' })).toBeVisible();
  });
});