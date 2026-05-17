import type { Section } from './enums';
import type { PaginationParams } from './api.types';

export interface DepartmentListItem {
  id: number;
  name: string;
  code: string;
  serverId: number;
}

export interface DepartmentDetail extends DepartmentListItem {
  hod: {
    teacherId: number;
    designation: string;
    user: {
      fullName: string;
      email: string;
    };
  } | null;
  _count: {
    programs: number;
  };
}

export interface DepartmentStats {
  departmentId: number;
  students: number;
  teachers: number;
  classes: number;
  societies: number;
}

export interface DegreeLevel {
  id: number;
  level: string;
}

export interface Discipline {
  id: number;
  name: string;
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

export interface ProgramDetail extends ProgramListItem {
  department: DepartmentListItem;
  programDirector: {
    teacherId: number;
    designation: string;
    user: {
      fullName: string;
      email: string;
    };
  } | null;
  _count: {
    classes: number;
    curriculum: number;
  };
}

export interface ProgramListParams extends PaginationParams {
  departmentId?: number;
  disciplineId?: number;
  degreeLevelId?: number;
  search?: string;
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
      code: string;
    };
    discipline?: {
      id: number;
      name: string;
    };
    degreeLevel?: {
      id: number;
      level: string;
    };
  };
  cr: {
    studentId: number;
    user: {
      fullName: string;
      email: string;
    };
  } | null;
}

export interface ClassDetail extends ClassListItem {
  _count: {
    students: number;
    teaches: number;
  };
}

export interface ClassListParams extends PaginationParams {
  programId?: number;
  departmentId?: number;
  semester?: number;
  section?: Section;
}

export interface CourseListItem {
  id: number;
  title: string;
  code: string;
  creditHours: number;
  departmentId: number;
}

export interface CourseDetail extends CourseListItem {
  department: {
    id: number;
    name: string;
  };
}

export interface CourseListParams extends PaginationParams {
  departmentId?: number;
  search?: string;
}

export interface CurriculumEntry {
  id: number;
  semesterNumber: number;
  batchYear: number;
  course: {
    id: number;
    code: string;
    title: string;
    creditHours: number;
  };
}

export interface ClassCourseAssignment {
  courseId: number;
  teacherId: number;
  classId: number;
  course: {
    id: number;
    title: string;
    code: string;
    creditHours: number;
  };
  teacher: {
    teacherId: number;
    designation: string;
    user: {
      fullName: string;
      email: string;
    };
  };
}

export interface TeacherAssignmentInput {
  courseId: number;
  teacherId: number;
}
