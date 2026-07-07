import { expect, test, type Page } from '@playwright/test';
import { e2eUsers } from './helpers/auth';
import {
  clearSocietyRequestAndMembership,
  ensurePendingSocietyRequest,
  findSocietyByName,
  findUserPublicIdByEmail,
  prepareSuspendedSocietyLeadershipConflict,
  serverSocietyFixtures,
} from './helpers/server-society-fixtures';

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/servers$/);
}

test.describe('Society workflows', () => {
  test.describe.configure({ mode: 'serial' });

  test('unrelated teacher opens society overview without protected-tab errors', async ({ page }) => {
    const society = await findSocietyByName(serverSocietyFixtures.societyName);
    expect(society).not.toBeNull();

    await signIn(
      page,
      e2eUsers.moduleSocietyOutsiderTeacher.email,
      e2eUsers.moduleSocietyOutsiderTeacher.password,
    );
    await page.goto(`/societies/${society!.publicId}?tab=members`);

    await expect(page.getByRole('heading', { name: serverSocietyFixtures.societyName })).toBeVisible();
    await expect(page).toHaveURL(
      new RegExp(`/societies/${society!.publicId}\\?tab=overview&page=1$`),
    );
    await expect(page.getByRole('button', { name: 'members' })).toHaveCount(0);
    await expect(page.getByText('Could not load data')).toHaveCount(0);
  });

  test('student non-member can request to join', async ({ page }) => {
    const society = await findSocietyByName(serverSocietyFixtures.societyName);
    expect(society).not.toBeNull();

    await clearSocietyRequestAndMembership(society!.id, e2eUsers.moduleSocietyApplicant.email);
    await signIn(
      page,
      e2eUsers.moduleSocietyApplicant.email,
      e2eUsers.moduleSocietyApplicant.password,
    );
    await page.goto(`/societies/${society!.publicId}`);

    await page.getByRole('button', { name: 'Request to join' }).click();
    await expect(page.getByRole('button', { name: 'Request sent' })).toBeVisible();
  });

  test('society president can approve a request and see member list update', async ({ page }) => {
    const society = await findSocietyByName(serverSocietyFixtures.societyName);
    expect(society).not.toBeNull();

    await clearSocietyRequestAndMembership(society!.id, e2eUsers.moduleSocietyApplicant.email);
    await ensurePendingSocietyRequest(society!.id, e2eUsers.moduleSocietyApplicant.email);
    await signIn(
      page,
      e2eUsers.moduleSocietyPresident.email,
      e2eUsers.moduleSocietyPresident.password,
    );
    await page.goto(`/societies/${society!.publicId}?tab=requests`);

    await expect(page.getByText(e2eUsers.moduleSocietyApplicant.fullName)).toBeVisible();
    await page.getByRole('button', { name: 'Approve' }).click();
    await page.getByRole('tab', { name: 'members' }).click();
    await expect(page.getByText(e2eUsers.moduleSocietyApplicant.fullName)).toBeVisible();
  });

  test('department HOD changes society leadership to a cross-department student', async ({ page }) => {
    const society = await findSocietyByName(serverSocietyFixtures.societyName);
    const crossPresidentPublicId = await findUserPublicIdByEmail(
      e2eUsers.moduleSocietyCrossPresident.email,
    );
    expect(society).not.toBeNull();
    expect(crossPresidentPublicId).not.toBeNull();

    await signIn(
      page,
      e2eUsers.moduleSocietyConvenor.email,
      e2eUsers.moduleSocietyConvenor.password,
    );
    await page.goto(`/societies/${society!.publicId}`);

    await page.getByRole('button', { name: 'Edit society' }).click();
    await expect(page.getByText('Search eligible students across the university.')).toBeVisible();
    await page.getByPlaceholder('Search students').fill(e2eUsers.moduleSocietyCrossPresident.fullName);
    await expect(
      page.locator('select').first().locator('option', {
        hasText: e2eUsers.moduleSocietyCrossPresident.fullName,
      }),
    ).toHaveCount(1);
    await page.locator('select').first().selectOption(crossPresidentPublicId!);
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(
      page
        .getByRole('tabpanel', { name: 'overview' })
        .getByText(e2eUsers.moduleSocietyCrossPresident.fullName, { exact: true }),
    ).toBeVisible();
  });

  test('department HOD sees leadership conflict before activating a suspended society', async ({ page }) => {
    const society = await findSocietyByName(serverSocietyFixtures.societyName);
    expect(society).not.toBeNull();
    await prepareSuspendedSocietyLeadershipConflict(society!.id);

    await signIn(
      page,
      e2eUsers.moduleSocietyConvenor.email,
      e2eUsers.moduleSocietyConvenor.password,
    );
    await page.goto(`/societies/${society!.publicId}`);

    await expect(page.getByText('This society is read-only while suspended.')).toBeVisible();
    await page.getByRole('button', { name: 'Activate' }).click();
    await expect(page.getByText('Leadership availability')).toBeVisible();
    await expect(page.getByText(/already active as president/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'activate' })).toBeDisabled();
  });
});
