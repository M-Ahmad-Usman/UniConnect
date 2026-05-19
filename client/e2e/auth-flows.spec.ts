import { expect, test } from '@playwright/test';
import { e2eUsers } from './helpers/auth';

async function signIn(page: Parameters<typeof test>[0]['page'], email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

test.describe('authentication flows', () => {
  test.describe.configure({ mode: 'serial' });

  test('login with valid credentials redirects to the server list', async ({ page }) => {
    await signIn(page, e2eUsers.student.email, e2eUsers.student.password);

    await expect(page).toHaveURL(/\/servers$/);
    await expect(page.getByRole('button', { name: 'Open user menu' })).toBeVisible();
  });

  test('login with invalid credentials shows an inline error', async ({ page }) => {
    await signIn(page, e2eUsers.invalidLogin.email, 'WrongPassword@123');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText('Invalid credentials')).toBeVisible();
  });

  test('logout clears the session and protected routes redirect to sign in', async ({ page }) => {
    await signIn(page, e2eUsers.logout.email, e2eUsers.logout.password);
    await expect(page).toHaveURL(/\/servers$/);

    const response = await page.evaluate(async () => {
      const result = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      return {
        status: result.status,
      };
    });

    expect(response.status).toBe(200);

    await page.goto('/servers');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('protected routes redirect unauthenticated users to sign in', async ({ page }) => {
    await page.goto('/servers');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });
});
