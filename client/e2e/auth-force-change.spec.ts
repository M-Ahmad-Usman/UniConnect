import { expect, test, type Page } from '@playwright/test';
import { e2eUsers } from './helpers/auth';

async function signIn(page: Page, email: string, password: string) {
  if (!page.url().endsWith('/login')) {
    await page.goto('/login');
  }
  await page.getByLabel('Email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

test.describe('forced password change flow', () => {
  test('login with a temporary password redirects to change password', async ({ page }) => {
    await signIn(page, e2eUsers.forcedRedirect.email, e2eUsers.forcedRedirect.password);

    await expect(page).toHaveURL(/\/change-password$/);
    await expect(page.getByText('Change temporary password')).toBeVisible();
    await expect(
      page.getByText('You must change your temporary password before you can continue using UniConnect.'),
    ).toBeVisible();
  });

  test('forced users cannot access protected routes until their password is changed', async ({ page }) => {
    await signIn(page, e2eUsers.forcedRedirect.email, e2eUsers.forcedRedirect.password);
    await expect(page).toHaveURL(/\/change-password$/);

    await page.goto('/servers');

    await expect(page).toHaveURL(/\/change-password$/);
    await expect(page.getByText('Change temporary password')).toBeVisible();
  });

  test('changing a temporary password signs the user out and the new password works', async ({ page }) => {
    const updatedPassword = 'Changed@1234';

    await signIn(page, e2eUsers.forcedChange.email, e2eUsers.forcedChange.password);
    await expect(page).toHaveURL(/\/change-password$/);

    await page.locator('#forced-current-password').fill(e2eUsers.forcedChange.password);
    await page.locator('#forced-new-password').fill(updatedPassword);
    await page.getByRole('button', { name: 'Update password' }).click();

    await expect(page).toHaveURL(/\/login$/);

    await signIn(page, e2eUsers.forcedChange.email, updatedPassword);

    await expect(page).toHaveURL(/\/servers$/);
    await expect(page.getByRole('button', { name: 'Open user menu' })).toBeVisible();
  });
});
