import { expect, test, type Page } from '@playwright/test';
import { e2eUsers } from './helpers/auth';
import {
  findChannelPublicIdByName,
  findServerPublicIdByName,
  module2Fixtures,
} from './helpers/module2';

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/servers$/);
}

test.describe('Module 2 shell flows', () => {
  test('server routes redirect to the default announcement channel and channel search syncs with the URL', async ({
    page,
  }) => {
    const serverPublicId = await findServerPublicIdByName(module2Fixtures.shellServerName);
    const announcementChannelPublicId = serverPublicId
      ? await findChannelPublicIdByName(serverPublicId, module2Fixtures.announcementChannelName)
      : null;

    expect(serverPublicId).not.toBeNull();
    expect(announcementChannelPublicId).not.toBeNull();

    await signIn(page, e2eUsers.moduleShell.email, e2eUsers.moduleShell.password);
    await page.goto(`/servers/${serverPublicId}`);

    await expect(page).toHaveURL(
      new RegExp(`/servers/${serverPublicId}/channels/${announcementChannelPublicId}$`),
    );
    await expect(
      page.getByRole('heading', { name: module2Fixtures.announcementChannelName, exact: true }),
    ).toBeVisible();

    const searchInput = page.getByPlaceholder('Search posts in this channel');
    await searchInput.fill('Architecture');

    await expect(page).toHaveURL(/search=Architecture/);
    await expect(page.getByText(module2Fixtures.searchablePostTitle)).toBeVisible();
    await expect(page.getByText(module2Fixtures.filteredOutPostTitle)).toHaveCount(0);
  });

  test('mobile drawer supports server navigation and channel-step navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await signIn(page, e2eUsers.moduleShell.email, e2eUsers.moduleShell.password);
    await expect(page).toHaveURL(/\/servers$/);

    await page.getByRole('button', { name: 'Open navigation' }).click();
    await expect(page.getByRole('heading', { name: 'Servers' })).toBeVisible();
    await expect(page.getByRole('link', { name: module2Fixtures.shellServerName })).toBeVisible();

    await page.getByRole('link', { name: module2Fixtures.shellServerName }).click();
    await expect(page.getByRole('heading', { name: 'Channels' })).toBeVisible();
    await expect(page.getByRole('link', { name: module2Fixtures.announcementChannelName })).toBeVisible();

    await page.getByRole('button', { name: 'Back to servers' }).click();
    await expect(page.getByRole('heading', { name: 'Servers' })).toBeVisible();
    await expect(page.getByRole('link', { name: module2Fixtures.shellServerName })).toBeVisible();
  });

  test('notification preview shows unread count and routes into the linked channel', async ({ page }) => {
    const serverPublicId = await findServerPublicIdByName(module2Fixtures.notificationServerName);
    const channelPublicId = serverPublicId
      ? await findChannelPublicIdByName(serverPublicId, module2Fixtures.notificationChannelName)
      : null;

    expect(serverPublicId).not.toBeNull();
    expect(channelPublicId).not.toBeNull();

    await signIn(page, e2eUsers.moduleNotifications.email, e2eUsers.moduleNotifications.password);
    await expect(page.getByRole('button', { name: 'Notifications' })).toContainText('2');
    await page.getByRole('button', { name: 'Notifications' }).click();

    await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible();
    await expect(page.getByText(module2Fixtures.notificationTitle)).toBeVisible();

    await page.getByRole('button', { name: new RegExp(module2Fixtures.notificationTitle) }).first().click();

    await expect(page).toHaveURL(
      new RegExp(`/servers/${serverPublicId}/channels/${channelPublicId}$`),
    );
    await expect(
      page.getByRole('heading', { name: module2Fixtures.notificationChannelName, exact: true }),
    ).toBeVisible();
  });
});
