import { expect, test, type Page } from '@playwright/test';
import { e2eUsers } from './helpers/auth';
import { withDb } from './helpers/db';

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/servers$/);
}

async function updateBio(page: Page, bio: string) {
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Edit' }).click();
  await page.getByLabel('Bio').fill(bio);
  await page.getByRole('button', { name: 'Save bio' }).click();
  await expect(page.getByText('Profile updated.')).toBeVisible();
  await expect(page.getByText(bio)).toBeVisible();
}

async function findBioByEmail(email: string) {
  return withDb(async (pool) => {
    const result = await pool.query<{ bio: string | null }>(
      'SELECT bio FROM users WHERE email = $1 LIMIT 1',
      [email],
    );

    return result.rows[0]?.bio ?? null;
  });
}

test.describe.serial('CSRF browser flows', () => {
  test('normal unsafe profile mutation works with CSRF enabled', async ({ page }) => {
    const bio = `CSRF protected profile update ${Date.now()}`;

    await signIn(page, e2eUsers.student.email, e2eUsers.student.password);
    await updateBio(page, bio);

    await expect.poll(() => findBioByEmail(e2eUsers.student.email)).toBe(bio);
  });

  test('stale CSRF token is refetched once and the unsafe mutation recovers', async ({ page }) => {
    const bio = `Recovered from stale CSRF ${Date.now()}`;

    await signIn(page, e2eUsers.logout.email, e2eUsers.logout.password);
    await page.context().addCookies([
      {
        name: 'XSRF-TOKEN',
        value: 'stale-token',
        domain: '127.0.0.1',
        path: '/',
        sameSite: 'Strict',
      },
    ]);

    await updateBio(page, bio);

    await expect.poll(() => findBioByEmail(e2eUsers.logout.email)).toBe(bio);
  });
});
