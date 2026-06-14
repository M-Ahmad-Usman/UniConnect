import { expect, test, type Page } from '@playwright/test';
import { e2eUsers } from './helpers/auth';
import {
  findChannelPublicIdByName,
  findPostIdByTitle,
  findServerPublicIdByName,
  postFixtures,
} from './helpers/post-fixtures';

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

test.describe('Posts and announcements workflows', () => {
  test('feed search, filters, detail view, pin, edit, and delete work for an authorized publisher', async ({
    page,
  }) => {
    const serverPublicId = await findServerPublicIdByName(postFixtures.serverName);
    expect(serverPublicId).not.toBeNull();

    const channelPublicId = serverPublicId
      ? await findChannelPublicIdByName(serverPublicId, postFixtures.announcementChannelName)
      : null;
    expect(channelPublicId).not.toBeNull();

    await signIn(page, e2eUsers.moduleManager.email, e2eUsers.moduleManager.password);
    await page.goto(`/servers/${serverPublicId}/channels/${channelPublicId}`);

    await expect(
      page.getByRole('heading', { name: postFixtures.announcementChannelName, exact: true }),
    ).toBeVisible();
    await expect(postArticle(page, postFixtures.pinnedPostTitle)).toContainText('Pinned');

    await page.getByPlaceholder('Search posts in this channel').fill('Important Date');
    await expect(page).toHaveURL(/search=Important\+Date|search=Important%20Date/);
    await expect(postArticle(page, postFixtures.importantPostTitle)).toBeVisible();
    await expect(postArticle(page, postFixtures.pinnedPostTitle)).toHaveCount(0);

    await page.getByLabel('Priority').selectOption('IMPORTANT');
    await expect(page).toHaveURL(/priority=IMPORTANT/);
    await page.getByLabel('From').fill(new Date().toISOString().slice(0, 10));
    await expect(page).toHaveURL(/priority=IMPORTANT/);
    await expect(postArticle(page, postFixtures.importantPostTitle)).toBeVisible();

    await postArticle(page, postFixtures.importantPostTitle)
      .getByText(postFixtures.importantPostTitle)
      .click();
    await expect(page.getByRole('dialog')).toContainText('Important content for priority and date filtering.');
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Clear' }).click();
    await page.getByPlaceholder('Search posts in this channel').fill('');
    await expect(page).not.toHaveURL(/search=/);
    await expect(postArticle(page, postFixtures.expiredPostTitle)).toBeVisible();
    await postArticle(page, postFixtures.expiredPostTitle)
      .getByRole('button', { name: 'Open post actions' })
      .click();
    await expect(page.getByRole('menuitem', { name: 'Edit post' })).toHaveCount(0);
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'New post' }).click();
    await page.getByLabel('Title').fill(postFixtures.createdPostTitle);
    await page.getByRole('button', { name: 'Important' }).click();
    await page.locator('.ProseMirror').fill('Runtime content created from Playwright.');
    await page.getByRole('button', { name: 'Publish' }).click();

    await expect(postArticle(page, postFixtures.createdPostTitle)).toBeVisible();
    await expect.poll(() => findPostIdByTitle(postFixtures.createdPostTitle)).not.toBeNull();

    await postArticle(page, postFixtures.createdPostTitle)
      .getByRole('button', { name: 'Open post actions' })
      .click();
    await page.getByRole('menuitem', { name: 'Edit post' }).click();
    await page.getByLabel('Title').fill(postFixtures.editedPostTitle);
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(postArticle(page, postFixtures.editedPostTitle)).toBeVisible();

    await postArticle(page, postFixtures.editedPostTitle)
      .getByRole('button', { name: 'Open post actions' })
      .click();
    await page.getByRole('menuitem', { name: 'Pin post' }).click();
    await page.getByRole('button', { name: 'Pin' }).focus();
    await page.keyboard.press('Enter');
    await expect(postArticle(page, postFixtures.editedPostTitle)).toContainText('Pinned');

    await postArticle(page, postFixtures.editedPostTitle)
      .getByRole('button', { name: 'Open post actions' })
      .click();
    await page.getByRole('menuitem', { name: 'Delete post' }).click();
    await page.getByRole('button', { name: 'Delete' }).focus();
    await page.keyboard.press('Enter');
    await expect(postArticle(page, postFixtures.editedPostTitle)).toHaveCount(0);
  });

  test('unauthorized and locked channels hide the publishing affordance', async ({ page }) => {
    const serverPublicId = await findServerPublicIdByName(postFixtures.serverName);
    expect(serverPublicId).not.toBeNull();

    const announcementChannelPublicId = serverPublicId
      ? await findChannelPublicIdByName(serverPublicId, postFixtures.announcementChannelName)
      : null;
    const lockedCourseChannelPublicId = serverPublicId
      ? await findChannelPublicIdByName(serverPublicId, postFixtures.lockedCourseChannelName)
      : null;
    expect(announcementChannelPublicId).not.toBeNull();
    expect(lockedCourseChannelPublicId).not.toBeNull();

    await signIn(page, e2eUsers.moduleViewer.email, e2eUsers.moduleViewer.password);
    await page.goto(`/servers/${serverPublicId}/channels/${announcementChannelPublicId}`);
    await expect(page.getByRole('button', { name: 'New post' })).toHaveCount(0);

    await page.context().clearCookies();
    const managerPage = await page.context().newPage();
    await signIn(managerPage, e2eUsers.moduleManager.email, e2eUsers.moduleManager.password);
    await managerPage.goto(`/servers/${serverPublicId}/channels/${lockedCourseChannelPublicId}`);
    await expect(managerPage.getByRole('button', { name: 'New post' })).toHaveCount(0);
    await managerPage.close();
  });
});
