import type { Section } from './enums';

export interface DepartmentListItem {
  id: number;
  name: string;
  code: string;
  serverId: number;
}

export interface ProgramListItem {
  id: number;
  code: string;
  semesters: number;
  departmentId: number;
  discipline: {
    id: number;
    name: string;
  };
  degreeLevel: {
    id: number;
    level: string;
  };
}

export interface ClassListItem {
  id: number;
  currentSemester: number;
  academicYear: number;
  admissionYear: number;
  section: Section;
  serverId: number;
  program: {
    id: number;
    code: string;
    department: {
      id: number;
      name: string;
    };
  };
}
