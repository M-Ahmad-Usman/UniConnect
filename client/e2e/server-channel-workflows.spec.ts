import { expect, test, type Page } from '@playwright/test';
import { e2eUsers } from './helpers/auth';
import {
  findChannelPublicIdByName,
  findServerPublicIdByName,
  serverSocietyFixtures,
} from './helpers/server-society-fixtures';

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/servers$/);
}

test.describe('Server and channel workflows', () => {
  test('authorized manager can create, edit, lock, unlock, and delete a channel', async ({ page }) => {
    const serverPublicId = await findServerPublicIdByName(serverSocietyFixtures.serverName);
    expect(serverPublicId).not.toBeNull();

    const announcementChannelPublicId = serverPublicId
      ? await findChannelPublicIdByName(serverPublicId, serverSocietyFixtures.announcementChannelName)
      : null;
    expect(announcementChannelPublicId).not.toBeNull();

    await signIn(page, e2eUsers.moduleManager.email, e2eUsers.moduleManager.password);
    await page.goto(`/servers/${serverPublicId}/channels/${announcementChannelPublicId}`);

    await expect(page.getByRole('button', { name: 'New channel' })).toBeVisible();

    await page.getByRole('button', { name: 'New channel' }).click();
    await page.getByLabel('Channel name').fill(serverSocietyFixtures.createdChannelName);
    await page
      .getByLabel('Description')
      .fill('Created from Playwright to validate server-channel management runtime wiring.');
    await page.locator('#create-channel-name').evaluate((input) => {
      (input as HTMLInputElement).form?.requestSubmit();
    });

    let createdChannelPublicId: string | null = null;
    await expect
      .poll(
        async () => {
          createdChannelPublicId = await findChannelPublicIdByName(
            serverPublicId as string,
            serverSocietyFixtures.createdChannelName,
          );
          return createdChannelPublicId;
        },
        { timeout: 15000 },
      )
      .not.toBeNull();

    await page.goto(`/servers/${serverPublicId}/channels/${createdChannelPublicId}`);
    await expect(page.getByRole('heading', { name: serverSocietyFixtures.createdChannelName })).toBeVisible();

    await page.getByRole('button', { name: 'Open channel actions' }).click();
    await page.getByRole('menuitem', { name: 'Edit channel' }).click();

    await page.getByLabel('Channel name').fill(serverSocietyFixtures.editedChannelName);
    await page
      .getByLabel('Description')
      .fill('Edited from Playwright to validate update flow and query invalidation.');
    await page.locator('#edit-channel-name').evaluate((input) => {
      (input as HTMLInputElement).form?.requestSubmit();
    });

    await expect(page.getByRole('heading', { name: serverSocietyFixtures.editedChannelName })).toBeVisible();

    await page.getByRole('button', { name: 'Open channel actions' }).click();
    await page.getByRole('menuitem', { name: 'Lock channel' }).click();
    await expect(page.locator('main').getByText('Locked', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Open channel actions' }).click();
    await page.getByRole('menuitem', { name: 'Unlock channel' }).click();
    await expect(page.locator('main').getByText('Unlocked', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Open channel actions' }).click();
    await page.getByRole('menuitem', { name: 'Delete channel' }).click();
    await page.getByRole('button', { name: 'Delete' }).focus();
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(
      new RegExp(`/servers/${serverPublicId}/channels/${announcementChannelPublicId}$`),
    );
    await expect(
      page.getByRole('heading', { name: serverSocietyFixtures.announcementChannelName, exact: true }),
    ).toBeVisible();
  });

  test('viewer does not see channel management controls', async ({ page }) => {
    const serverPublicId = await findServerPublicIdByName(serverSocietyFixtures.serverName);
    expect(serverPublicId).not.toBeNull();

    const announcementChannelPublicId = serverPublicId
      ? await findChannelPublicIdByName(serverPublicId, serverSocietyFixtures.announcementChannelName)
      : null;
    expect(announcementChannelPublicId).not.toBeNull();

    await signIn(page, e2eUsers.moduleViewer.email, e2eUsers.moduleViewer.password);
    await page.goto(`/servers/${serverPublicId}/channels/${announcementChannelPublicId}`);

    await expect(page.getByRole('button', { name: 'New channel' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Open channel actions' })).toHaveCount(0);
  });

  test('members route renders paginated cards with role badges', async ({ page }) => {
    const serverPublicId = await findServerPublicIdByName(serverSocietyFixtures.serverName);
    expect(serverPublicId).not.toBeNull();

    await signIn(page, e2eUsers.moduleManager.email, e2eUsers.moduleManager.password);
    await page.goto(`/servers/${serverPublicId}/members`);

    await expect(page.getByRole('heading', { name: 'Server members' })).toBeVisible();
    await expect(page.getByText('Showing 1-20 of 24')).toBeVisible();
    await expect(page.getByText('HOD').first()).toBeVisible();
    await expect(page.locator('article')).toHaveCount(20);

    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page).toHaveURL(new RegExp(`/servers/${serverPublicId}/members\\?page=2$`));
    await expect(page.getByText('Showing 21-24 of 24')).toBeVisible();
    await expect(page.locator('article')).toHaveCount(4);
  });
});
