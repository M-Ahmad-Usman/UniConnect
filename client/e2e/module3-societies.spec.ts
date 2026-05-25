import { expect, test, type Page } from '@playwright/test';
import { e2eUsers } from './helpers/auth';
import {
  clearSocietyRequestAndMembership,
  ensurePendingSocietyRequest,
  findSocietyIdByName,
  module3Fixtures,
} from './helpers/module3';

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/servers$/);
}

test.describe('Module 3 society hardening flows', () => {
  test.describe.configure({ mode: 'serial' });

  test('unrelated teacher opens society overview without protected-tab errors', async ({ page }) => {
    const societyId = await findSocietyIdByName(module3Fixtures.societyName);
    expect(societyId).not.toBeNull();

    await signIn(
      page,
      e2eUsers.moduleSocietyOutsiderTeacher.email,
      e2eUsers.moduleSocietyOutsiderTeacher.password,
    );
    await page.goto(`/societies/${societyId}?tab=members`);

    await expect(page.getByRole('heading', { name: module3Fixtures.societyName })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/societies/${societyId}\\?tab=overview&page=1$`));
    await expect(page.getByRole('button', { name: 'members' })).toHaveCount(0);
    await expect(page.getByText('Could not load data')).toHaveCount(0);
  });

  test('student non-member can request to join', async ({ page }) => {
    const societyId = await findSocietyIdByName(module3Fixtures.societyName);
    expect(societyId).not.toBeNull();

    await clearSocietyRequestAndMembership(societyId as number, e2eUsers.moduleSocietyApplicant.email);
    await signIn(
      page,
      e2eUsers.moduleSocietyApplicant.email,
      e2eUsers.moduleSocietyApplicant.password,
    );
    await page.goto(`/societies/${societyId}`);

    await page.getByRole('button', { name: 'Request to join' }).click();
    await expect(page.getByRole('button', { name: 'Request sent' })).toBeVisible();
  });

  test('society president can approve a request and see member list update', async ({ page }) => {
    const societyId = await findSocietyIdByName(module3Fixtures.societyName);
    expect(societyId).not.toBeNull();

    await clearSocietyRequestAndMembership(societyId as number, e2eUsers.moduleSocietyApplicant.email);
    await ensurePendingSocietyRequest(societyId as number, e2eUsers.moduleSocietyApplicant.email);
    await signIn(
      page,
      e2eUsers.moduleSocietyPresident.email,
      e2eUsers.moduleSocietyPresident.password,
    );
    await page.goto(`/societies/${societyId}?tab=requests`);

    await expect(page.getByText(e2eUsers.moduleSocietyApplicant.fullName)).toBeVisible();
    await page.getByRole('button', { name: 'Approve' }).click();
    await page.getByRole('tab', { name: 'members' }).click();
    await expect(page.getByText(e2eUsers.moduleSocietyApplicant.fullName)).toBeVisible();
  });
});
