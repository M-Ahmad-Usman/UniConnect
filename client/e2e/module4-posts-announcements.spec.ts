import { expect, test, type Page } from '@playwright/test';
import { e2eUsers } from './helpers/auth';
import {
  findChannelIdByName,
  findPostIdByTitle,
  findServerIdByName,
  module4Fixtures,
} from './helpers/module4';

async function signIn(page: Page, email: string, password: string) {
  if (!page.url().endsWith('/login')) {
    await page.goto('/login');
  }
  await page.getByLabel('Email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/servers$/);
}

function postArticle(page: Page, title: string) {
  return page.locator('article').filter({ hasText: title });
}

test.describe('Module 4 posts and announcements', () => {
  test('feed search, filters, detail view, pin, edit, and delete work for an authorized publisher', async ({
    page,
  }) => {
    const serverId = await findServerIdByName(module4Fixtures.serverName);
    expect(serverId).not.toBeNull();

    const channelId = serverId
      ? await findChannelIdByName(serverId, module4Fixtures.announcementChannelName)
      : null;
    expect(channelId).not.toBeNull();

    await signIn(page, e2eUsers.moduleManager.email, e2eUsers.moduleManager.password);
    await page.goto(`/servers/${serverId}/channels/${channelId}`);

    await expect(page.getByRole('heading', { name: 'Posts and announcements' })).toBeVisible();
    await expect(postArticle(page, module4Fixtures.pinnedPostTitle)).toContainText('Pinned');

    await page.getByPlaceholder('Search posts in this channel').fill('Important Date');
    await expect(page).toHaveURL(/search=Important\+Date|search=Important%20Date/);
    await expect(postArticle(page, module4Fixtures.importantPostTitle)).toBeVisible();
    await expect(postArticle(page, module4Fixtures.pinnedPostTitle)).toHaveCount(0);

    await page.getByLabel('Priority').selectOption('IMPORTANT');
    await expect(page).toHaveURL(/priority=IMPORTANT/);
    await page.getByLabel('From').fill(new Date().toISOString().slice(0, 10));
    await expect(page).toHaveURL(/priority=IMPORTANT/);
    await expect(postArticle(page, module4Fixtures.importantPostTitle)).toBeVisible();

    await postArticle(page, module4Fixtures.importantPostTitle)
      .getByText(module4Fixtures.importantPostTitle)
      .click();
    await expect(page.getByRole('dialog')).toContainText('Important content for priority and date filtering.');
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Clear' }).click();
    await page.getByPlaceholder('Search posts in this channel').fill('');
    await expect(page).not.toHaveURL(/search=/);
    await expect(postArticle(page, module4Fixtures.expiredPostTitle)).toBeVisible();
    await postArticle(page, module4Fixtures.expiredPostTitle)
      .getByRole('button', { name: 'Open post actions' })
      .click();
    await expect(page.getByRole('menuitem', { name: 'Edit post' })).toHaveCount(0);
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'New post' }).click();
    await page.getByLabel('Title').fill(module4Fixtures.createdPostTitle);
    await page.getByRole('button', { name: 'Important' }).click();
    await page.locator('.ProseMirror').fill('Runtime content created from Playwright.');
    await page.getByRole('button', { name: 'Publish' }).click();

    await expect(postArticle(page, module4Fixtures.createdPostTitle)).toBeVisible();
    await expect.poll(() => findPostIdByTitle(module4Fixtures.createdPostTitle)).not.toBeNull();

    await postArticle(page, module4Fixtures.createdPostTitle)
      .getByRole('button', { name: 'Open post actions' })
      .click();
    await page.getByRole('menuitem', { name: 'Edit post' }).click();
    await page.getByLabel('Title').fill(module4Fixtures.editedPostTitle);
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(postArticle(page, module4Fixtures.editedPostTitle)).toBeVisible();

    await postArticle(page, module4Fixtures.editedPostTitle)
      .getByRole('button', { name: 'Open post actions' })
      .click();
    await page.getByRole('menuitem', { name: 'Pin post' }).click();
    await page.getByRole('button', { name: 'Pin' }).focus();
    await page.keyboard.press('Enter');
    await expect(postArticle(page, module4Fixtures.editedPostTitle)).toContainText('Pinned');

    await postArticle(page, module4Fixtures.editedPostTitle)
      .getByRole('button', { name: 'Open post actions' })
      .click();
    await page.getByRole('menuitem', { name: 'Delete post' }).click();
    await page.getByRole('button', { name: 'Delete' }).focus();
    await page.keyboard.press('Enter');
    await expect(postArticle(page, module4Fixtures.editedPostTitle)).toHaveCount(0);
  });

  test('unauthorized and locked channels hide the publishing affordance', async ({ page }) => {
    const serverId = await findServerIdByName(module4Fixtures.serverName);
    expect(serverId).not.toBeNull();

    const announcementChannelId = serverId
      ? await findChannelIdByName(serverId, module4Fixtures.announcementChannelName)
      : null;
    const lockedCourseChannelId = serverId
      ? await findChannelIdByName(serverId, module4Fixtures.lockedCourseChannelName)
      : null;
    expect(announcementChannelId).not.toBeNull();
    expect(lockedCourseChannelId).not.toBeNull();

    await signIn(page, e2eUsers.moduleViewer.email, e2eUsers.moduleViewer.password);
    await page.goto(`/servers/${serverId}/channels/${announcementChannelId}`);
    await expect(page.getByRole('button', { name: 'New post' })).toHaveCount(0);

    await page.context().clearCookies();
    const managerPage = await page.context().newPage();
    await signIn(managerPage, e2eUsers.moduleManager.email, e2eUsers.moduleManager.password);
    await managerPage.goto(`/servers/${serverId}/channels/${lockedCourseChannelId}`);
    await expect(managerPage.getByRole('button', { name: 'New post' })).toHaveCount(0);
    await managerPage.close();
  });
});
