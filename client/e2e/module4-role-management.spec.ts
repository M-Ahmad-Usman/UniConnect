import { expect, test, type Page } from '@playwright/test';
import { e2eUsers, findUserByEmail } from './helpers/auth';
import { module2Fixtures } from './helpers/module2';
import { module3Fixtures } from './helpers/module3';
import {
  clearClassCr,
  clearServerModerator,
  ensureServerMembership,
  findClassByServerName,
  findClassCrId,
  findSocietyServerByName,
  hasServerModerator,
  prepareStudentForClass,
  setClassCr,
} from './helpers/role-management';

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/servers$/);
}

async function assignRoleByValues(page: Page, input: { role: string; scopeId: number; userId: number }) {
  await page.goto('/roles');
  await page.locator('select').nth(0).selectOption(input.role);
  await page.locator('select').nth(1).selectOption(String(input.scopeId));
  await expect(page.locator('select').nth(2)).toBeEnabled();
  await page.locator('select').nth(2).selectOption(String(input.userId));
  await page.getByRole('button', { name: 'Assign role' }).click();
}

test.describe.serial('Module 4 role management hardening flows', () => {
  test.setTimeout(90_000);

  test('HOD assigns CR within department', async ({ page }) => {
    const classRecord = await findClassByServerName(module2Fixtures.transferTargetServerName);
    const student = await findUserByEmail(e2eUsers.moduleSocietyMember.email);
    expect(classRecord).not.toBeNull();
    expect(student).not.toBeNull();

    await clearClassCr(classRecord!.id);
    await prepareStudentForClass(student!.id, classRecord!.id, classRecord!.department_id);

    await signIn(page, e2eUsers.moduleAcademicHod.email, e2eUsers.moduleAcademicHod.password);
    await assignRoleByValues(page, { role: 'cr', scopeId: classRecord!.id, userId: student!.id });

    await expect.poll(() => findClassCrId(classRecord!.id)).toBe(student!.id);
  });

  test('PD assigns CR within own program', async ({ page }) => {
    const classRecord = await findClassByServerName(module2Fixtures.replacementServerName);
    const student = await findUserByEmail(e2eUsers.moduleSocietyApplicant.email);
    expect(classRecord).not.toBeNull();
    expect(student).not.toBeNull();

    await clearClassCr(classRecord!.id);
    await prepareStudentForClass(student!.id, classRecord!.id, classRecord!.department_id);

    await signIn(page, e2eUsers.moduleAcademicPd.email, e2eUsers.moduleAcademicPd.password);
    await assignRoleByValues(page, { role: 'cr', scopeId: classRecord!.id, userId: student!.id });

    await expect.poll(() => findClassCrId(classRecord!.id)).toBe(student!.id);
  });

  test('CR assigns server moderator only in own class server', async ({ page }) => {
    const classRecord = await findClassByServerName(module2Fixtures.transferTargetServerName);
    const cr = await findUserByEmail(e2eUsers.moduleSocietyMember.email);
    const target = await findUserByEmail(e2eUsers.moduleSocietyApplicant.email);
    expect(classRecord).not.toBeNull();
    expect(cr).not.toBeNull();
    expect(target).not.toBeNull();

    await prepareStudentForClass(cr!.id, classRecord!.id, classRecord!.department_id);
    await setClassCr(classRecord!.id, cr!.id);
    await ensureServerMembership(target!.id, classRecord!.server_id);
    await clearServerModerator(target!.id, classRecord!.server_id);

    await signIn(page, e2eUsers.moduleSocietyMember.email, e2eUsers.moduleSocietyMember.password);
    await page.goto('/roles');
    await page.locator('select').nth(0).selectOption('server_moderator');
    await expect(page.locator('select').nth(1)).toContainText('Academic Transfer Target Class');
    await page.locator('select').nth(1).selectOption(String(classRecord!.server_id));
    await page.locator('select').nth(2).selectOption(String(target!.id));
    await page.getByRole('button', { name: 'Assign role' }).click();

    await expect.poll(() => hasServerModerator(target!.id, classRecord!.server_id)).toBe(true);
  });

  test('society leader assigns society server moderator', async ({ page }) => {
    const society = await findSocietyServerByName(module3Fixtures.societyName);
    const target = await findUserByEmail(e2eUsers.moduleSocietyMember.email);
    expect(society).not.toBeNull();
    expect(target).not.toBeNull();

    await ensureServerMembership(target!.id, society!.server_id);
    await clearServerModerator(target!.id, society!.server_id);

    await signIn(
      page,
      e2eUsers.moduleSocietyPresident.email,
      e2eUsers.moduleSocietyPresident.password,
    );
    await page.goto('/roles');
    await page.locator('select').nth(0).selectOption('server_moderator');
    await page.locator('select').nth(1).selectOption(String(society!.server_id));
    await page.locator('select').nth(2).selectOption(String(target!.id));
    await page.getByRole('button', { name: 'Assign role' }).click();

    await expect.poll(() => hasServerModerator(target!.id, society!.server_id)).toBe(true);
  });
});
