import type { ClassStatus, Section } from './enums';
import type { PaginationParams } from './api.types';
import type { ClassPermissions } from './permission.types';

export interface DepartmentListItem {
  id: number;
  name: string;
  code: string;
  serverPublicId: string;
}

export interface DepartmentDetail extends DepartmentListItem {
  hod: {
    designation: string;
    user: {
      publicId: string;
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

export interface ImpactGroup<TPreview> {
  count: number;
  preview: TPreview[];
  hasMore: boolean;
}

export interface CommunicationImpact {
  channels?: ImpactGroup<{
    publicId: string;
    name: string;
    type: string;
    isDeleted: boolean;
    isArchived: boolean;
  }>;
  posts: { count: number };
  serverMemberships?: { count: number };
  notificationPreferences: { count: number };
  platformRoleAssignments: { count: number };
}

export interface DepartmentDeletionImpact {
  department: DepartmentListItem;
  canDelete: boolean;
  checksComplete: true;
  pendingChecks: string[];
  blockers: {
    programs: ImpactGroup<ProgramListItem>;
    departmentUsers: ImpactGroup<{
      publicId: string;
      fullName: string;
      email: string;
      userType: string;
      status: string;
      isDeleted: boolean;
    }> & { byUserType: Record<string, number> };
    societies: ImpactGroup<{
      publicId: string;
      name: string;
      status: string;
      isDeleted: boolean;
    }>;
    dependentCourses: ImpactGroup<CourseListItem & {
      _count: {
        curriculum: number;
        teaches: number;
        channels: number;
      };
    }>;
  };
  communicationImpact: CommunicationImpact;
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
    designation: string;
    user: {
      publicId: string;
      fullName: string;
      email: string;
    };
  } | null;
  _count: {
    classes: number;
    curriculum: number;
  };
}

export interface ProgramDeletionImpact {
  program: ProgramDetail;
  canDelete: boolean;
  checksComplete: true;
  pendingChecks: string[];
  blockers: {
    enrolledClasses: ImpactGroup<{
      publicId: string;
      currentSemester: number;
      academicYear: number;
      admissionYear: number;
      section: Section;
      status: ClassStatus;
    }>;
  };
  cleanupImpact: {
    curriculumEntries: ImpactGroup<CurriculumEntry>;
  };
  communicationImpact: CommunicationImpact;
}

export interface ProgramListParams extends PaginationParams {
  departmentId?: number;
  disciplineId?: number;
  degreeLevelId?: number;
  search?: string;
}

export interface ClassListItem {
  publicId: string;
  currentSemester: number;
  academicYear: number;
  admissionYear: number;
  section: Section;
  serverPublicId: string;
  status: ClassStatus;
  graduatedAt: string | null;
  graduatedByPublicId: string | null;
  program: {
    id: number;
    code: string;
    semesters?: number;
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
    user: {
      publicId: string;
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
  permissions: ClassPermissions;
}

export interface ClassDeletionImpact {
  class: {
    publicId: string;
    programId: number;
    programCode: string;
    department: { id: number; name: string; code: string };
    section: Section;
    currentSemester: number;
    academicYear: number;
    admissionYear: number;
    status: ClassStatus;
    serverPublicId: string;
  };
  canDelete: boolean;
  checksComplete: true;
  pendingChecks: string[];
  blockers: {
    enrolledStudents: ImpactGroup<{
      rollNumber: string;
      user: {
        publicId: string;
        fullName: string;
        email: string;
        status: string;
        isDeleted: boolean;
      };
    }>;
    activeTeachingAssignments: ImpactGroup<{
      course: { id: number; code: string; title: string };
      teacher: {
        designation: string;
        user: { publicId: string; fullName: string; email: string };
      };
    }>;
  };
  communicationImpact: CommunicationImpact;
}

export interface ClassListParams extends PaginationParams {
  programId?: number;
  departmentId?: number;
  semester?: number;
  section?: Section;
  status?: ClassStatus | 'ALL';
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

export interface CourseDeletionImpact {
  course: CourseDetail;
  canDelete: boolean;
  checksComplete: true;
  pendingChecks: string[];
  blockers: {
    curriculumEntries: ImpactGroup<{
      id: number;
      semesterNumber: number;
      batchYear: number;
      program: {
        id: number;
        code: string;
        department: { id: number; name: string; code: string };
      };
    }>;
    activeTeachingAssignments: ImpactGroup<{
      class: {
        publicId: string;
        currentSemester: number;
        admissionYear: number;
        section: Section;
        status: ClassStatus;
        program: { id: number; code: string };
      };
      teacher: {
        designation: string;
        user: { publicId: string; fullName: string; email: string };
      };
    }>;
    courseChannels: ImpactGroup<{
      publicId: string;
      name: string;
      type: string;
      isDeleted: boolean;
      isArchived: boolean;
      server: { publicId: string; name: string; type: string };
    }>;
  };
  communicationImpact: Omit<CommunicationImpact, 'channels' | 'serverMemberships'>;
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
  teacherPublicId: string;
  classPublicId: string;
  course: {
    id: number;
    title: string;
    code: string;
    creditHours: number;
  };
  teacher: {
    designation: string;
    user: {
      publicId: string;
      fullName: string;
      email: string;
    };
  };
}

export interface TeacherAssignmentInput {
  courseId: number;
  teacherPublicId: string;
}

export interface ClassStudent {
  studentPublicId: string;
  rollNumber: string;
  user: {
    fullName: string;
    email: string;
    departmentId: number | null;
  };
  class: {
    publicId: string;
    currentSemester: number;
    section: Section;
    program: {
      id: number;
      code: string;
    };
  };
}

export interface TeacherCandidate {
  teacherPublicId: string;
  designation: string;
  user: {
    fullName: string;
    email: string;
    departmentId: number | null;
  };
}
