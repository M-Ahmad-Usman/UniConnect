export function formatClassLabel(classInfo: {
  currentSemester: number;
  section: string;
  program: { code: string };
}) {
  return `${classInfo.program.code}-${classInfo.currentSemester}-${classInfo.section}`;
}
