import { expect, test, type Page } from '@playwright/test';
import { e2eUsers, findUserByEmail } from './helpers/auth';
import {
  findClassByServerName,
  findClassStatus,
  findClassStudentClassId,
  findCourseTeacherName,
  academicShellFixtures,
} from './helpers/academic-shell-fixtures';

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/servers$/);
}

test.describe.serial('Academic management workflows', () => {
  test.setTimeout(90_000);

  test('HOD transfers a student between managed classes', async ({ page }) => {
    const targetClass = await findClassByServerName(academicShellFixtures.transferTargetServerName);
    const student = await findUserByEmail(e2eUsers.moduleAcademicTransferStudent.email);

    expect(targetClass).not.toBeNull();
    expect(student).not.toBeNull();

    await signIn(page, e2eUsers.moduleAcademicHod.email, e2eUsers.moduleAcademicHod.password);
    await page.goto(`/academics/classes/${targetClass!.public_id}`);

    const transferButton = page.getByRole('button', { name: 'Transfer student' });
    await expect(transferButton).toBeVisible({ timeout: 45_000 });
    await transferButton.click();
    await page.locator('select[name="studentPublicId"]').selectOption(student!.public_id);
    await page.getByRole('button', { name: 'Transfer' }).click();

    await expect(page.getByText(e2eUsers.moduleAcademicTransferStudent.fullName)).toBeVisible();
    await expect.poll(() => findClassStudentClassId(student!.id)).toBe(targetClass!.id);
  });

  test('PD replaces a teacher with a cross-department teacher', async ({ page }) => {
    const klass = await findClassByServerName(academicShellFixtures.replacementServerName);
    const crossTeacher = await findUserByEmail(e2eUsers.moduleAcademicCrossTeacher.email);

    expect(klass).not.toBeNull();
    expect(crossTeacher).not.toBeNull();

    await signIn(page, e2eUsers.moduleAcademicPd.email, e2eUsers.moduleAcademicPd.password);
    await page.goto(`/academics/classes/${klass!.public_id}`);

    await expect(
      page.getByRole('cell', { name: e2eUsers.moduleAcademicOldTeacher.fullName }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Replace teacher' }).click();
    await page.locator('select[name="teacherPublicId"]').selectOption(crossTeacher!.public_id);
    await page.getByRole('button', { name: 'Replace' }).click();

    await expect(
      page.getByRole('cell', { name: e2eUsers.moduleAcademicCrossTeacher.fullName }),
    ).toBeVisible();
    await expect
      .poll(() => findCourseTeacherName(klass!.id, 'E2E-RP-101'))
      .toBe(e2eUsers.moduleAcademicCrossTeacher.fullName);
  });

  test('HOD advances a class semester with required teacher assignments', async ({ page }) => {
    const klass = await findClassByServerName(academicShellFixtures.progressionServerName);
    const teacher = await findUserByEmail(e2eUsers.moduleAcademicProgressTeacher.email);

    expect(klass).not.toBeNull();
    expect(teacher).not.toBeNull();

    await signIn(page, e2eUsers.moduleAcademicHod.email, e2eUsers.moduleAcademicHod.password);
    await page.goto(`/academics/classes/${klass!.public_id}`);

    await page.getByRole('button', { name: 'Semester progression' }).click();
    await page.getByText('E2E-SP-401').waitFor();
    await page.getByRole('combobox').selectOption(teacher!.public_id);
    await page.getByRole('button', { name: 'Advance to semester 4' }).click();

    await expect(page.getByText('Semester advanced')).toBeVisible({ timeout: 15_000 });
    await expect
      .poll(() => findCourseTeacherName(klass!.id, 'E2E-SP-401'))
      .toBe(e2eUsers.moduleAcademicProgressTeacher.fullName);
  });

  test('HOD graduates a final-semester class', async ({ page }) => {
    const klass = await findClassByServerName(academicShellFixtures.graduationServerName);

    expect(klass).not.toBeNull();

    await signIn(page, e2eUsers.moduleAcademicHod.email, e2eUsers.moduleAcademicHod.password);
    await page.goto(`/academics/classes/${klass!.public_id}`);

    await page.getByRole('button', { name: 'Graduate' }).click();
    await expect(page.getByText('Graduate class')).toBeVisible();
    await page.getByRole('button', { name: 'Graduate' }).last().click();

    await expect(page.getByText('This class is graduated.')).toBeVisible();
    await expect.poll(() => findClassStatus(klass!.id)).toBe('graduated');
  });
});
