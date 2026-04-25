import { expect, test, type Page } from '@playwright/test';
import { e2eUsers } from './helpers/auth';
import { findChannelIdByName, findServerIdByName, module3Fixtures } from './helpers/module3';

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/servers$/);
}

test.describe('Module 3 server and channel flows', () => {
  test('authorized manager can create, edit, lock, unlock, and delete a channel', async ({ page }) => {
    const serverId = await findServerIdByName(module3Fixtures.serverName);
    expect(serverId).not.toBeNull();

    const announcementChannelId = serverId
      ? await findChannelIdByName(serverId, module3Fixtures.announcementChannelName)
      : null;
    expect(announcementChannelId).not.toBeNull();

    await signIn(page, e2eUsers.moduleManager.email, e2eUsers.moduleManager.password);
    await page.goto(`/servers/${serverId}/channels/${announcementChannelId}`);

    await expect(page.getByRole('button', { name: 'New channel' })).toBeVisible();

    await page.getByRole('button', { name: 'New channel' }).click();
    await page.getByLabel('Channel name').fill(module3Fixtures.createdChannelName);
    await page
      .getByLabel('Description')
      .fill('Created from Playwright to validate Module 3 channel-management runtime wiring.');
    await page.locator('#create-channel-name').evaluate((input) => {
      (input as HTMLInputElement).form?.requestSubmit();
    });

    let createdChannelId: number | null = null;
    await expect
      .poll(
        async () => {
          createdChannelId = await findChannelIdByName(serverId as number, module3Fixtures.createdChannelName);
          return createdChannelId;
        },
        { timeout: 15000 },
      )
      .not.toBeNull();

    await page.goto(`/servers/${serverId}/channels/${createdChannelId}`);
    await expect(page.getByRole('heading', { name: module3Fixtures.createdChannelName })).toBeVisible();

    await page.getByRole('button', { name: 'Open channel actions' }).click();
    await page.getByRole('menuitem', { name: 'Edit channel' }).click();

    await page.getByLabel('Channel name').fill(module3Fixtures.editedChannelName);
    await page
      .getByLabel('Description')
      .fill('Edited from Playwright to validate update flow and query invalidation.');
    await page.locator('#edit-channel-name').evaluate((input) => {
      (input as HTMLInputElement).form?.requestSubmit();
    });

    await expect(page.getByRole('heading', { name: module3Fixtures.editedChannelName })).toBeVisible();

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

    await expect(page).toHaveURL(new RegExp(`/servers/${serverId}/channels/\\d+$`));
    await expect(
      page.getByRole('heading', { name: module3Fixtures.announcementChannelName, exact: true }),
    ).toBeVisible();
  });

  test('viewer does not see channel management controls', async ({ page }) => {
    const serverId = await findServerIdByName(module3Fixtures.serverName);
    expect(serverId).not.toBeNull();

    const announcementChannelId = serverId
      ? await findChannelIdByName(serverId, module3Fixtures.announcementChannelName)
      : null;
    expect(announcementChannelId).not.toBeNull();

    await signIn(page, e2eUsers.moduleViewer.email, e2eUsers.moduleViewer.password);
    await page.goto(`/servers/${serverId}/channels/${announcementChannelId}`);

    await expect(page.getByRole('button', { name: 'New channel' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Open channel actions' })).toHaveCount(0);
  });

  test('members route renders paginated cards with role badges', async ({ page }) => {
    const serverId = await findServerIdByName(module3Fixtures.serverName);
    expect(serverId).not.toBeNull();

    await signIn(page, e2eUsers.moduleManager.email, e2eUsers.moduleManager.password);
    await page.goto(`/servers/${serverId}/members`);

    await expect(page.getByRole('heading', { name: 'Server members' })).toBeVisible();
    await expect(page.getByText('Showing 1-20 of 24')).toBeVisible();
    await expect(page.getByText('HOD').first()).toBeVisible();
    await expect(page.locator('article')).toHaveCount(20);

    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page).toHaveURL(/\/servers\/\d+\/members\?page=2$/);
    await expect(page.getByText('Showing 21-24 of 24')).toBeVisible();
    await expect(page.locator('article')).toHaveCount(4);
  });
});
