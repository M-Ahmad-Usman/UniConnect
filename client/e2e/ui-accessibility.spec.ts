import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { e2eUsers } from './helpers/auth';
import { findClassByServerName, academicShellFixtures } from './helpers/academic-shell-fixtures';
import { findSocietyByName, serverSocietyFixtures } from './helpers/server-society-fixtures';

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/servers$/);
}

async function expectNoCriticalA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .disableRules(['color-contrast'])
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(results.violations).toEqual([]);
}

test.describe.serial('UI and accessibility workflows', () => {
  test.setTimeout(90_000);

  test('theme, role management, class detail, and mobile shell stay accessible', async ({
    page,
  }) => {
    const klass = await findClassByServerName(academicShellFixtures.transferTargetServerName);
    expect(klass).not.toBeNull();

    await signIn(page, e2eUsers.moduleAcademicHod.email, e2eUsers.moduleAcademicHod.password);

    await page.getByRole('button', { name: /Theme:/ }).click();
    await page.getByRole('menuitem', { name: /Dark/ }).click();

    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.goto('/roles');
    await expect(page.getByRole('heading', { name: 'Role Management' })).toBeVisible();
    await expect(page.getByText('Choose a scope before searching users.')).toBeVisible();

    const revokeButton = page.getByRole('button', { name: 'Revoke' }).first();
    if (await revokeButton.isVisible()) {
      await revokeButton.focus();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('alertdialog', { name: 'Revoke role assignment' })).toBeVisible();
      await page.getByRole('button', { name: 'Cancel' }).click();
    }

    await expectNoCriticalA11yViolations(page);
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto('/roles');
    await expect(page.locator('main')).toBeVisible();
    await expectNoPageOverflow(page);

    await page.goto(`/academics/classes/${klass!.public_id}`);

    await expect(page.getByRole('heading', { name: 'Students', exact: true })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Assigned courses', exact: true }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Transfer student' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Transfer student' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Transfer student' })).toHaveCount(0);
    await expectNoPageOverflow(page);
  });

  test('society detail tabs and destructive confirmation are keyboard reachable', async ({
    page,
  }) => {
    const society = await findSocietyByName(serverSocietyFixtures.societyName);
    expect(society).not.toBeNull();

    await signIn(
      page,
      e2eUsers.moduleSocietyPresident.email,
      e2eUsers.moduleSocietyPresident.password,
    );
    await page.goto(`/societies/${society!.publicId}`);

    await expect(page.getByRole('tablist', { name: 'Society detail sections' })).toBeVisible();
    await page.getByRole('tab', { name: 'members' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('tabpanel', { name: 'members' })).toBeVisible();

    const removeButton = page.getByRole('button', { name: 'Remove' }).first();
    await removeButton.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('alertdialog', { name: 'Remove society member' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/societies/${society!.publicId}`);
    await expectNoPageOverflow(page);
    await expectNoCriticalA11yViolations(page);
  });
});

async function expectNoPageOverflow(page: Page) {
  const hasPageOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 2,
  );
  expect(hasPageOverflow).toBe(false);
}
