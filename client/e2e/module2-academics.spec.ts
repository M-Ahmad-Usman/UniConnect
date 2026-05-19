import { expect, test, type Page } from '@playwright/test';
import { e2eUsers, findUserByEmail } from './helpers/auth';
import {
  findClassIdByServerName,
  findClassStatus,
  findClassStudentClassId,
  findCourseTeacherName,
  module2Fixtures,
} from './helpers/module2';

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/servers$/);
}

test.describe.serial('Module 2 academic hardening flows', () => {
  test.setTimeout(90_000);

  test('HOD transfers a student between managed classes', async ({ page }) => {
    const targetClassId = await findClassIdByServerName(module2Fixtures.transferTargetServerName);
    const student = await findUserByEmail(e2eUsers.moduleAcademicTransferStudent.email);

    expect(targetClassId).not.toBeNull();
    expect(student).not.toBeNull();

    await signIn(page, e2eUsers.moduleAcademicHod.email, e2eUsers.moduleAcademicHod.password);
    await page.goto(`/academics/classes/${targetClassId}`);

    const transferButton = page.getByRole('button', { name: 'Transfer student' });
    await expect(transferButton).toBeVisible({ timeout: 45_000 });
    await transferButton.click();
    await page.locator('select[name="studentId"]').selectOption(String(student!.id));
    await page.getByRole('button', { name: 'Transfer' }).click();

    await expect(page.getByText(e2eUsers.moduleAcademicTransferStudent.fullName)).toBeVisible();
    await expect.poll(() => findClassStudentClassId(student!.id)).toBe(targetClassId);
  });

  test('PD replaces a teacher with a cross-department teacher', async ({ page }) => {
    const classId = await findClassIdByServerName(module2Fixtures.replacementServerName);
    const crossTeacher = await findUserByEmail(e2eUsers.moduleAcademicCrossTeacher.email);

    expect(classId).not.toBeNull();
    expect(crossTeacher).not.toBeNull();

    await signIn(page, e2eUsers.moduleAcademicPd.email, e2eUsers.moduleAcademicPd.password);
    await page.goto(`/academics/classes/${classId}`);

    await expect(
      page.getByRole('cell', { name: e2eUsers.moduleAcademicOldTeacher.fullName }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Replace teacher' }).click();
    await page.locator('select[name="teacherId"]').selectOption(String(crossTeacher!.id));
    await page.getByRole('button', { name: 'Replace' }).click();

    await expect(
      page.getByRole('cell', { name: e2eUsers.moduleAcademicCrossTeacher.fullName }),
    ).toBeVisible();
    await expect
      .poll(() => findCourseTeacherName(classId!, 'E2E-RP-101'))
      .toBe(e2eUsers.moduleAcademicCrossTeacher.fullName);
  });

  test('HOD advances a class semester with required teacher assignments', async ({ page }) => {
    const classId = await findClassIdByServerName(module2Fixtures.progressionServerName);
    const teacher = await findUserByEmail(e2eUsers.moduleAcademicProgressTeacher.email);

    expect(classId).not.toBeNull();
    expect(teacher).not.toBeNull();

    await signIn(page, e2eUsers.moduleAcademicHod.email, e2eUsers.moduleAcademicHod.password);
    await page.goto(`/academics/classes/${classId}`);

    await page.getByRole('button', { name: 'Semester progression' }).click();
    await page.getByText('E2E-SP-401').waitFor();
    await page.getByRole('combobox').selectOption(String(teacher!.id));
    await page.getByRole('button', { name: 'Advance to semester 4' }).click();

    await expect(page.getByText('Semester advanced')).toBeVisible();
    await expect
      .poll(() => findCourseTeacherName(classId!, 'E2E-SP-401'))
      .toBe(e2eUsers.moduleAcademicProgressTeacher.fullName);
  });

  test('HOD graduates a final-semester class', async ({ page }) => {
    const classId = await findClassIdByServerName(module2Fixtures.graduationServerName);

    expect(classId).not.toBeNull();

    await signIn(page, e2eUsers.moduleAcademicHod.email, e2eUsers.moduleAcademicHod.password);
    await page.goto(`/academics/classes/${classId}`);

    await page.getByRole('button', { name: 'Graduate' }).click();
    await expect(page.getByText('Graduate class')).toBeVisible();
    await page.getByRole('button', { name: 'Graduate' }).last().click();

    await expect(page.getByText('This class is graduated.')).toBeVisible();
    await expect.poll(() => findClassStatus(classId!)).toBe('graduated');
  });
});
