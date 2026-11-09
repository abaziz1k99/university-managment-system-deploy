import type {
    ActivityLogEntry,
    AdmissionApplication,
    AttendanceRecord,
    ClassSession,
    Course,
    Department,
    Examination,
    Faculty,
    FacultyMember,
    FeeAccount,
    GradeScaleEntry,
    Notice,
    Payment,
    Program,
    Semester,
    Student,
    StudentResult,
    SystemSettings,
    SystemUser
} from '@/app/core/models';

const now = '2025-11-10T08:00:00.000Z';
const ts = (createdAt = now, updatedAt = now) => ({ createdAt, updatedAt });

export const SEED_SCHEMA_VERSION = 1;
export const SEED_STORAGE_KEY = 'unimanage.v1';

export const gradingScale: GradeScaleEntry[] = [
    { grade: 'A+', minPercent: 80, gradePoint: 4.0 },
    { grade: 'A', minPercent: 75, gradePoint: 3.75 },
    { grade: 'A-', minPercent: 70, gradePoint: 3.5 },
    { grade: 'B+', minPercent: 65, gradePoint: 3.25 },
    { grade: 'B', minPercent: 60, gradePoint: 3.0 },
    { grade: 'B-', minPercent: 55, gradePoint: 2.75 },
    { grade: 'C+', minPercent: 50, gradePoint: 2.5 },
    { grade: 'C', minPercent: 45, gradePoint: 2.25 },
    { grade: 'C-', minPercent: 40, gradePoint: 2.0 },
    { grade: 'D', minPercent: 33, gradePoint: 1.0 },
    { grade: 'F', minPercent: 0, gradePoint: 0.0 }
];

export function gradeFromPercent(percent: number, scale = gradingScale): GradeScaleEntry {
    const sorted = [...scale].sort((a, b) => b.minPercent - a.minPercent);
    return sorted.find((g) => percent >= g.minPercent) ?? sorted[sorted.length - 1];
}

export function gradeFromMarks(marks: number, maxMarks: number): { grade: StudentResult['grade']; gradePoint: number; status: StudentResult['status'] } {
    const percent = maxMarks === 0 ? 0 : (marks / maxMarks) * 100;
    const g = gradeFromPercent(percent);
    return { grade: g.grade, gradePoint: g.gradePoint, status: percent >= 40 ? 'PASSED' : 'FAILED' };
}

// ── Faculties ────────────────────────────────────────────────────────────────

export const faculties: Faculty[] = [
    { id: 'fac-eng', name: 'Faculty of Engineering', code: 'FENG', description: 'Engineering and technology programs including CSE and EEE.', status: 'ACTIVE', ...ts() },
    { id: 'fac-biz', name: 'Faculty of Business Studies', code: 'FBS', description: 'Business administration and management programs.', status: 'ACTIVE', ...ts() },
    { id: 'fac-arts', name: 'Faculty of Arts & Humanities', code: 'FAH', description: 'Language, literature and humanities.', status: 'ACTIVE', ...ts() },
    { id: 'fac-sci', name: 'Faculty of Science', code: 'FSC', description: 'Mathematics, economics and pure sciences.', status: 'ACTIVE', ...ts() }
];

// ── Departments ──────────────────────────────────────────────────────────────

export const departments: Department[] = [
    { id: 'dept-cse', name: 'Computer Science & Engineering', code: 'CSE', facultyId: 'fac-eng', headId: 'fm-001', description: 'Software, systems and AI.', status: 'ACTIVE', ...ts() },
    { id: 'dept-eee', name: 'Electrical & Electronic Engineering', code: 'EEE', facultyId: 'fac-eng', headId: 'fm-004', description: 'Electrical systems and electronics.', status: 'ACTIVE', ...ts() },
    { id: 'dept-bba', name: 'Business Administration', code: 'BBA', facultyId: 'fac-biz', headId: 'fm-006', description: 'Management, accounting and marketing.', status: 'ACTIVE', ...ts() },
    { id: 'dept-eng', name: 'English', code: 'ENG', facultyId: 'fac-arts', headId: 'fm-008', description: 'English language and literature.', status: 'ACTIVE', ...ts() },
    { id: 'dept-mat', name: 'Mathematics', code: 'MAT', facultyId: 'fac-sci', headId: 'fm-009', description: 'Pure and applied mathematics.', status: 'ACTIVE', ...ts() },
    { id: 'dept-eco', name: 'Economics', code: 'ECO', facultyId: 'fac-sci', headId: 'fm-010', description: 'Micro, macro and quantitative economics.', status: 'ACTIVE', ...ts() }
];

// ── Programs ─────────────────────────────────────────────────────────────────

export const programs: Program[] = [
    { id: 'prog-bsc-cse', name: 'BSc in Computer Science & Engineering', code: 'BSC-CSE', degreeType: 'BSc', departmentId: 'dept-cse', durationYears: 4, totalSemesters: 8, creditsPerSemester: 18, status: 'ACTIVE', ...ts() },
    { id: 'prog-bsc-eee', name: 'BSc in Electrical & Electronic Engineering', code: 'BSC-EEE', degreeType: 'BSc', departmentId: 'dept-eee', durationYears: 4, totalSemesters: 8, creditsPerSemester: 18, status: 'ACTIVE', ...ts() },
    { id: 'prog-bba', name: 'Bachelor of Business Administration', code: 'BBA', degreeType: 'BBA', departmentId: 'dept-bba', durationYears: 4, totalSemesters: 8, creditsPerSemester: 18, status: 'ACTIVE', ...ts() },
    { id: 'prog-ba-eng', name: 'BA in English', code: 'BA-ENG', degreeType: 'BA', departmentId: 'dept-eng', durationYears: 4, totalSemesters: 8, creditsPerSemester: 16, status: 'ACTIVE', ...ts() },
    { id: 'prog-bsc-mat', name: 'BSc in Mathematics', code: 'BSC-MAT', degreeType: 'BSc', departmentId: 'dept-mat', durationYears: 4, totalSemesters: 8, creditsPerSemester: 16, status: 'ACTIVE', ...ts() },
    { id: 'prog-bsc-eco', name: 'BSc in Economics', code: 'BSC-ECO', degreeType: 'BSc', departmentId: 'dept-eco', durationYears: 4, totalSemesters: 8, creditsPerSemester: 16, status: 'ACTIVE', ...ts() },
    { id: 'prog-msc-cse', name: 'MSc in Computer Science & Engineering', code: 'MSC-CSE', degreeType: 'MSc', departmentId: 'dept-cse', durationYears: 1.5, totalSemesters: 3, creditsPerSemester: 18, status: 'ACTIVE', ...ts() },
    { id: 'prog-mba', name: 'Master of Business Administration', code: 'MBA', degreeType: 'MBA', departmentId: 'dept-bba', durationYears: 2, totalSemesters: 4, creditsPerSemester: 18, status: 'ACTIVE', ...ts() }
];

// ── Semesters ────────────────────────────────────────────────────────────────

export const semesters: Semester[] = [
    { id: 'sem-spring-2024', name: 'Spring 2024', academicYear: '2023-24', startDate: '2024-01-15', endDate: '2024-05-30', registrationDeadline: '2024-01-31', examStartDate: '2024-06-02', examEndDate: '2024-06-20', status: 'CLOSED', ...ts('2024-01-01T00:00:00.000Z') },
    { id: 'sem-fall-2024', name: 'Fall 2024', academicYear: '2024-25', startDate: '2024-08-10', endDate: '2024-12-20', registrationDeadline: '2024-08-25', examStartDate: '2024-12-22', examEndDate: '2025-01-10', status: 'CLOSED', ...ts('2024-07-01T00:00:00.000Z') },
    { id: 'sem-spring-2025', name: 'Spring 2025', academicYear: '2024-25', startDate: '2025-01-15', endDate: '2025-05-30', registrationDeadline: '2025-01-31', examStartDate: '2025-06-01', examEndDate: '2025-06-20', status: 'CLOSED', ...ts('2025-01-01T00:00:00.000Z') },
    { id: 'sem-fall-2025', name: 'Fall 2025', academicYear: '2025-26', startDate: '2025-08-10', endDate: '2025-12-20', registrationDeadline: '2025-08-25', examStartDate: '2025-12-22', examEndDate: '2026-01-10', status: 'ACTIVE', ...ts('2025-07-01T00:00:00.000Z') },
    { id: 'sem-spring-2026', name: 'Spring 2026', academicYear: '2025-26', startDate: '2026-01-15', endDate: '2026-05-30', registrationDeadline: '2026-01-31', examStartDate: '2026-06-01', examEndDate: '2026-06-20', status: 'UPCOMING', ...ts() },
    { id: 'sem-fall-2026', name: 'Fall 2026', academicYear: '2026-27', startDate: '2026-08-10', endDate: '2026-12-20', registrationDeadline: '2026-08-25', examStartDate: '2026-12-22', examEndDate: '2027-01-10', status: 'UPCOMING', ...ts() }
];

// ── Courses (25) ─────────────────────────────────────────────────────────────

export const courses: Course[] = [
    { id: 'cse-101', code: 'CSE-101', title: 'Introduction to Computer Systems', departmentId: 'dept-cse', programIds: ['prog-bsc-cse', 'prog-msc-cse'], credits: 3, type: 'CORE', semester: 1, facultyId: 'fm-002', prerequisite: null, status: 'ACTIVE', ...ts() },
    { id: 'cse-103', code: 'CSE-103', title: 'Structured Programming', departmentId: 'dept-cse', programIds: ['prog-bsc-cse'], credits: 3, type: 'CORE', semester: 1, facultyId: 'fm-003', prerequisite: 'CSE-101', status: 'ACTIVE', ...ts() },
    { id: 'cse-201', code: 'CSE-201', title: 'Data Structures', departmentId: 'dept-cse', programIds: ['prog-bsc-cse', 'prog-msc-cse'], credits: 3, type: 'CORE', semester: 3, facultyId: 'fm-002', prerequisite: 'CSE-103', status: 'ACTIVE', ...ts() },
    { id: 'cse-203', code: 'CSE-203', title: 'Object Oriented Programming', departmentId: 'dept-cse', programIds: ['prog-bsc-cse'], credits: 3, type: 'CORE', semester: 3, facultyId: 'fm-003', prerequisite: 'CSE-103', status: 'ACTIVE', ...ts() },
    { id: 'cse-205', code: 'CSE-205', title: 'Database Systems', departmentId: 'dept-cse', programIds: ['prog-bsc-cse', 'prog-msc-cse'], credits: 3, type: 'CORE', semester: 4, facultyId: 'fm-001', prerequisite: 'CSE-201', status: 'ACTIVE', ...ts() },
    { id: 'cse-207', code: 'CSE-207', title: 'Computer Networks', departmentId: 'dept-cse', programIds: ['prog-bsc-cse'], credits: 3, type: 'CORE', semester: 5, facultyId: 'fm-001', prerequisite: null, status: 'ACTIVE', ...ts() },
    { id: 'cse-301', code: 'CSE-301', title: 'Operating Systems', departmentId: 'dept-cse', programIds: ['prog-bsc-cse', 'prog-msc-cse'], credits: 3, type: 'CORE', semester: 6, facultyId: 'fm-002', prerequisite: 'CSE-201', status: 'ACTIVE', ...ts() },
    { id: 'cse-303', code: 'CSE-303', title: 'Machine Learning', departmentId: 'dept-cse', programIds: ['prog-bsc-cse', 'prog-msc-cse'], credits: 3, type: 'ELECTIVE', semester: 7, facultyId: 'fm-001', prerequisite: 'CSE-205', status: 'ACTIVE', ...ts() },
    { id: 'eee-101', code: 'EEE-101', title: 'Electrical Circuits', departmentId: 'dept-eee', programIds: ['prog-bsc-eee'], credits: 3, type: 'CORE', semester: 1, facultyId: 'fm-004', prerequisite: null, status: 'ACTIVE', ...ts() },
    { id: 'eee-201', code: 'EEE-201', title: 'Electronics I', departmentId: 'dept-eee', programIds: ['prog-bsc-eee'], credits: 3, type: 'CORE', semester: 3, facultyId: 'fm-005', prerequisite: 'EEE-101', status: 'ACTIVE', ...ts() },
    { id: 'eee-203', code: 'EEE-203', title: 'Power Systems', departmentId: 'dept-eee', programIds: ['prog-bsc-eee'], credits: 3, type: 'CORE', semester: 5, facultyId: 'fm-004', prerequisite: 'EEE-101', status: 'ACTIVE', ...ts() },
    { id: 'eee-301', code: 'EEE-301', title: 'Digital Signal Processing', departmentId: 'dept-eee', programIds: ['prog-bsc-eee'], credits: 3, type: 'CORE', semester: 6, facultyId: 'fm-005', prerequisite: 'EEE-201', status: 'ACTIVE', ...ts() },
    { id: 'bba-101', code: 'BBA-101', title: 'Principles of Accounting', departmentId: 'dept-bba', programIds: ['prog-bba', 'prog-mba'], credits: 3, type: 'CORE', semester: 1, facultyId: 'fm-006', prerequisite: null, status: 'ACTIVE', ...ts() },
    { id: 'bba-102', code: 'BBA-102', title: 'Business Statistics', departmentId: 'dept-bba', programIds: ['prog-bba', 'prog-mba', 'prog-bsc-eco'], credits: 3, type: 'CORE', semester: 2, facultyId: 'fm-007', prerequisite: null, status: 'ACTIVE', ...ts() },
    { id: 'bba-201', code: 'BBA-201', title: 'Marketing Management', departmentId: 'dept-bba', programIds: ['prog-bba', 'prog-mba'], credits: 3, type: 'CORE', semester: 4, facultyId: 'fm-006', prerequisite: null, status: 'ACTIVE', ...ts() },
    { id: 'bba-301', code: 'BBA-301', title: 'Strategic Management', departmentId: 'dept-bba', programIds: ['prog-bba', 'prog-mba'], credits: 3, type: 'CORE', semester: 6, facultyId: 'fm-007', prerequisite: 'BBA-201', status: 'ACTIVE', ...ts() },
    { id: 'eng-101', code: 'ENG-101', title: 'English Reading & Writing', departmentId: 'dept-eng', programIds: ['prog-ba-eng'], credits: 3, type: 'CORE', semester: 1, facultyId: 'fm-008', prerequisite: null, status: 'ACTIVE', ...ts() },
    { id: 'eng-201', code: 'ENG-201', title: 'Modern English Literature', departmentId: 'dept-eng', programIds: ['prog-ba-eng'], credits: 3, type: 'CORE', semester: 3, facultyId: 'fm-008', prerequisite: 'ENG-101', status: 'ACTIVE', ...ts() },
    { id: 'eng-301', code: 'ENG-301', title: 'Applied Linguistics', departmentId: 'dept-eng', programIds: ['prog-ba-eng'], credits: 3, type: 'ELECTIVE', semester: 6, facultyId: 'fm-008', prerequisite: 'ENG-201', status: 'ACTIVE', ...ts() },
    { id: 'mat-101', code: 'MAT-101', title: 'Calculus I', departmentId: 'dept-mat', programIds: ['prog-bsc-mat', 'prog-bsc-cse', 'prog-bsc-eee', 'prog-bsc-eco'], credits: 3, type: 'CORE', semester: 1, facultyId: 'fm-009', prerequisite: null, status: 'ACTIVE', ...ts() },
    { id: 'mat-201', code: 'MAT-201', title: 'Linear Algebra', departmentId: 'dept-mat', programIds: ['prog-bsc-mat', 'prog-bsc-cse'], credits: 3, type: 'CORE', semester: 3, facultyId: 'fm-009', prerequisite: 'MAT-101', status: 'ACTIVE', ...ts() },
    { id: 'mat-301', code: 'MAT-301', title: 'Numerical Methods', departmentId: 'dept-mat', programIds: ['prog-bsc-mat'], credits: 3, type: 'CORE', semester: 5, facultyId: 'fm-009', prerequisite: 'MAT-201', status: 'ACTIVE', ...ts() },
    { id: 'eco-101', code: 'ECO-101', title: 'Microeconomics', departmentId: 'dept-eco', programIds: ['prog-bsc-eco', 'prog-bba'], credits: 3, type: 'CORE', semester: 1, facultyId: 'fm-010', prerequisite: null, status: 'ACTIVE', ...ts() },
    { id: 'eco-201', code: 'ECO-201', title: 'Macroeconomics', departmentId: 'dept-eco', programIds: ['prog-bsc-eco'], credits: 3, type: 'CORE', semester: 3, facultyId: 'fm-010', prerequisite: 'ECO-101', status: 'ACTIVE', ...ts() },
    { id: 'eco-301', code: 'ECO-301', title: 'Econometrics', departmentId: 'dept-eco', programIds: ['prog-bsc-eco'], credits: 3, type: 'CORE', semester: 5, facultyId: 'fm-010', prerequisite: 'ECO-201', status: 'ACTIVE', ...ts() }
];

// ── Faculty & Staff (12) ─────────────────────────────────────────────────────

export const facultyMembers: FacultyMember[] = [
    { id: 'fm-001', employeeId: 'EMP-2018-0001', firstName: 'Ahmed', lastName: 'Karim', email: 'ahmed.karim@unimanage.edu', phone: '+8801711000001', designation: 'Professor', departmentId: 'dept-cse', courseIds: ['cse-205', 'cse-207', 'cse-303'], joiningDate: '2018-02-10', employmentStatus: 'ACTIVE', qualification: 'Ph.D. in Computer Science, BUET', address: 'House 12, Road 7, Dhanmondi, Dhaka', ...ts('2018-02-10T00:00:00.000Z') },
    { id: 'fm-002', employeeId: 'EMP-2019-0002', firstName: 'Farhana', lastName: 'Islam', email: 'farhana.islam@unimanage.edu', phone: '+8801711000002', designation: 'Associate Professor', departmentId: 'dept-cse', courseIds: ['cse-101', 'cse-201', 'cse-301'], joiningDate: '2019-03-15', employmentStatus: 'ACTIVE', qualification: 'Ph.D. in CSE, University of Dhaka', address: 'Flat 3B, Gulshan 2, Dhaka', ...ts('2019-03-15T00:00:00.000Z') },
    { id: 'fm-003', employeeId: 'EMP-2021-0003', firstName: 'Tariq', lastName: 'Hassan', email: 'tariq.hassan@unimanage.edu', phone: '+8801711000003', designation: 'Lecturer', departmentId: 'dept-cse', courseIds: ['cse-103', 'cse-203'], joiningDate: '2021-08-01', employmentStatus: 'ACTIVE', qualification: 'MSc in CSE, BUET', address: 'Mirpur 10, Dhaka', ...ts('2021-08-01T00:00:00.000Z') },
    { id: 'fm-004', employeeId: 'EMP-2017-0004', firstName: 'Ruhul', lastName: 'Amin', email: 'ruhul.amin@unimanage.edu', phone: '+8801711000004', designation: 'Professor', departmentId: 'dept-eee', courseIds: ['eee-101', 'eee-203'], joiningDate: '2017-01-20', employmentStatus: 'ACTIVE', qualification: 'Ph.D. in EEE, KUET', address: 'Uttara Sector 7, Dhaka', ...ts('2017-01-20T00:00:00.000Z') },
    { id: 'fm-005', employeeId: 'EMP-2020-0005', firstName: 'Nusrat', lastName: 'Jahan', email: 'nusrat.jahan@unimanage.edu', phone: '+8801711000005', designation: 'Lecturer', departmentId: 'dept-eee', courseIds: ['eee-201', 'eee-301'], joiningDate: '2020-09-10', employmentStatus: 'ACTIVE', qualification: 'MSc in EEE, RUET', address: 'Mohammadpur, Dhaka', ...ts('2020-09-10T00:00:00.000Z') },
    { id: 'fm-006', employeeId: 'EMP-2016-0006', firstName: 'Saifur', lastName: 'Rahman', email: 'saifur.rahman@unimanage.edu', phone: '+8801711000006', designation: 'Professor', departmentId: 'dept-bba', courseIds: ['bba-101', 'bba-201'], joiningDate: '2016-05-05', employmentStatus: 'ACTIVE', qualification: 'Ph.D. in Management, IBA-DU', address: 'Banani, Dhaka', ...ts('2016-05-05T00:00:00.000Z') },
    { id: 'fm-007', employeeId: 'EMP-2019-0007', firstName: 'Ayesha', lastName: 'Siddiqua', email: 'ayesha.siddiqua@unimanage.edu', phone: '+8801711000007', designation: 'Associate Professor', departmentId: 'dept-bba', courseIds: ['bba-102', 'bba-301'], joiningDate: '2019-07-12', employmentStatus: 'ON_LEAVE', qualification: 'MBA, North South University', address: 'Dhanmondi 27, Dhaka', ...ts('2019-07-12T00:00:00.000Z') },
    { id: 'fm-008', employeeId: 'EMP-2015-0008', firstName: 'David', lastName: 'Wilson', email: 'david.wilson@unimanage.edu', phone: '+8801711000008', designation: 'Professor', departmentId: 'dept-eng', courseIds: ['eng-101', 'eng-201', 'eng-301'], joiningDate: '2015-03-18', employmentStatus: 'ACTIVE', qualification: 'Ph.D. in English Literature, University of Chittagong', address: 'Wari, Dhaka', ...ts('2015-03-18T00:00:00.000Z') },
    { id: 'fm-009', employeeId: 'EMP-2018-0009', firstName: 'Rokeya', lastName: 'Begum', email: 'rokeya.begum@unimanage.edu', phone: '+8801711000009', designation: 'Associate Professor', departmentId: 'dept-mat', courseIds: ['mat-101', 'mat-201', 'mat-301'], joiningDate: '2018-11-01', employmentStatus: 'ACTIVE', qualification: 'Ph.D. in Mathematics, Jahangirnagar University', address: 'Shyamoli, Dhaka', ...ts('2018-11-01T00:00:00.000Z') },
    { id: 'fm-010', employeeId: 'EMP-2017-0010', firstName: 'Karim', lastName: 'Ullah', email: 'karim.ullah@unimanage.edu', phone: '+8801711000010', designation: 'Professor', departmentId: 'dept-eco', courseIds: ['eco-101', 'eco-201', 'eco-301'], joiningDate: '2017-06-22', employmentStatus: 'ACTIVE', qualification: 'Ph.D. in Economics, Dhaka University', address: 'Lalmatia, Dhaka', ...ts('2017-06-22T00:00:00.000Z') },
    { id: 'fm-011', employeeId: 'EMP-2014-0011', firstName: 'Abdul', lastName: 'Aziz', email: 'abdul.aziz@unimanage.edu', phone: '+8801711000011', designation: 'Registrar', departmentId: 'dept-bba', courseIds: [], joiningDate: '2014-09-01', employmentStatus: 'ACTIVE', qualification: 'MPA, BPATC', address: 'Administrative Building, Campus', ...ts('2014-09-01T00:00:00.000Z') },
    { id: 'fm-012', employeeId: 'EMP-2020-0012', firstName: 'Salma', lastName: 'Khatun', email: 'salma.khatun@unimanage.edu', phone: '+8801711000012', designation: 'Accounts Officer', departmentId: 'dept-bba', courseIds: [], joiningDate: '2020-02-15', employmentStatus: 'ACTIVE', qualification: 'M.Com in Accounting, Dhaka University', address: 'Accounts Office, Campus', ...ts('2020-02-15T00:00:00.000Z') }
];

// ── Students (50) ────────────────────────────────────────────────────────────

type StudentSeed = Omit<Student, 'createdAt' | 'updatedAt'>;

function sid(year: number, n: number): string {
    return `UM-${year}-${String(n).padStart(4, '0')}`;
}

const studentSeeds: StudentSeed[] = [
    { id: 'stu-001', admissionNo: sid(2021, 1), firstName: 'Arif', lastName: 'Hossain', email: 'arif.hossain@student.unimanage.edu', phone: '+8801810000001', dob: '2002-03-12', gender: 'MALE', departmentId: 'dept-cse', programId: 'prog-bsc-cse', currentSemesterId: 'sem-fall-2025', session: '2021-22', status: 'ACTIVE', admissionDate: '2021-08-15', guardianName: 'Abul Hossain', guardianPhone: '+8801712000001', guardianRelation: 'Father', address: 'Road 5, Dhanmondi, Dhaka' },
    { id: 'stu-002', admissionNo: sid(2021, 2), firstName: 'Nadia', lastName: 'Rahman', email: 'nadia.rahman@student.unimanage.edu', phone: '+8801810000002', dob: '2002-07-22', gender: 'FEMALE', departmentId: 'dept-cse', programId: 'prog-bsc-cse', currentSemesterId: 'sem-fall-2025', session: '2021-22', status: 'ACTIVE', admissionDate: '2021-08-16', guardianName: 'Kamal Rahman', guardianPhone: '+8801712000002', guardianRelation: 'Father', address: 'Gulshan 1, Dhaka' },
    { id: 'stu-003', admissionNo: sid(2021, 3), firstName: 'Tanvir', lastName: 'Ahmed', email: 'tanvir.ahmed@student.unimanage.edu', phone: '+8801810000003', dob: '2001-11-05', gender: 'MALE', departmentId: 'dept-eee', programId: 'prog-bsc-eee', currentSemesterId: 'sem-fall-2025', session: '2021-22', status: 'ACTIVE', admissionDate: '2021-08-17', guardianName: 'Mahmud Ahmed', guardianPhone: '+8801712000003', guardianRelation: 'Father', address: 'Mirpur 12, Dhaka' },
    { id: 'stu-004', admissionNo: sid(2021, 4), firstName: 'Sumaiya', lastName: 'Akter', email: 'sumaiya.akter@student.unimanage.edu', phone: '+8801810000004', dob: '2002-01-30', gender: 'FEMALE', departmentId: 'dept-bba', programId: 'prog-bba', currentSemesterId: 'sem-fall-2025', session: '2021-22', status: 'ACTIVE', admissionDate: '2021-08-18', guardianName: 'Jamal Uddin', guardianPhone: '+8801712000004', guardianRelation: 'Father', address: 'Uttara Sector 3, Dhaka' },
    { id: 'stu-005', admissionNo: sid(2021, 5), firstName: 'Rashed', lastName: 'Khan', email: 'rashed.khan@student.unimanage.edu', phone: '+8801810000005', dob: '2002-09-14', gender: 'MALE', departmentId: 'dept-bba', programId: 'prog-bba', currentSemesterId: 'sem-spring-2026', session: '2021-22', status: 'SUSPENDED', admissionDate: '2021-08-19', guardianName: 'Anwar Khan', guardianPhone: '+8801712000005', guardianRelation: 'Father', address: 'Banani, Dhaka' },
    { id: 'stu-006', admissionNo: sid(2022, 6), firstName: 'Farzana', lastName: 'Haque', email: 'farzana.haque@student.unimanage.edu', phone: '+8801810000006', dob: '2003-02-18', gender: 'FEMALE', departmentId: 'dept-eng', programId: 'prog-ba-eng', currentSemesterId: 'sem-fall-2025', session: '2022-23', status: 'ACTIVE', admissionDate: '2022-08-10', guardianName: 'Moinul Haque', guardianPhone: '+8801712000006', guardianRelation: 'Father', address: 'Wari, Dhaka' },
    { id: 'stu-007', admissionNo: sid(2022, 7), firstName: 'Imran', lastName: 'Hossain', email: 'imran.hossain@student.unimanage.edu', phone: '+8801810000007', dob: '2003-05-28', gender: 'MALE', departmentId: 'dept-mat', programId: 'prog-bsc-mat', currentSemesterId: 'sem-fall-2025', session: '2022-23', status: 'ACTIVE', admissionDate: '2022-08-11', guardianName: 'Delwar Hossain', guardianPhone: '+8801712000007', guardianRelation: 'Father', address: 'Mohammadpur, Dhaka' },
    { id: 'stu-008', admissionNo: sid(2022, 8), firstName: 'Sadia', lastName: 'Islam', email: 'sadia.islam@student.unimanage.edu', phone: '+8801810000008', dob: '2003-08-09', gender: 'FEMALE', departmentId: 'dept-eco', programId: 'prog-bsc-eco', currentSemesterId: 'sem-fall-2025', session: '2022-23', status: 'ACTIVE', admissionDate: '2022-08-12', guardianName: 'Rafiq Islam', guardianPhone: '+8801712000008', guardianRelation: 'Father', address: 'Shyamoli, Dhaka' },
    { id: 'stu-009', admissionNo: sid(2022, 9), firstName: 'Mehedi', lastName: 'Hasan', email: 'mehedi.hasan@student.unimanage.edu', phone: '+8801810000009', dob: '2002-12-02', gender: 'MALE', departmentId: 'dept-cse', programId: 'prog-bsc-cse', currentSemesterId: 'sem-fall-2025', session: '2022-23', status: 'ACTIVE', admissionDate: '2022-08-13', guardianName: 'Hasan Ali', guardianPhone: '+8801712000009', guardianRelation: 'Father', address: 'Dhanmondi 15, Dhaka' },
    { id: 'stu-010', admissionNo: sid(2022, 10), firstName: 'Lamia', lastName: 'Chowdhury', email: 'lamia.chowdhury@student.unimanage.edu', phone: '+8801810000010', dob: '2003-04-11', gender: 'FEMALE', departmentId: 'dept-cse', programId: 'prog-bsc-cse', currentSemesterId: 'sem-fall-2025', session: '2022-23', status: 'ACTIVE', admissionDate: '2022-08-14', guardianName: 'Chowdhury Alam', guardianPhone: '+8801712000010', guardianRelation: 'Father', address: 'Baridhara, Dhaka' },
    { id: 'stu-011', admissionNo: sid(2022, 11), firstName: 'Jahid', lastName: 'Hasan', email: 'jahid.hasan@student.unimanage.edu', phone: '+8801810000011', dob: '2003-06-17', gender: 'MALE', departmentId: 'dept-eee', programId: 'prog-bsc-eee', currentSemesterId: 'sem-fall-2025', session: '2022-23', status: 'INACTIVE', admissionDate: '2022-08-15', guardianName: 'Abdul Hasan', guardianPhone: '+8801712000011', guardianRelation: 'Father', address: 'Khilgaon, Dhaka' },
    { id: 'stu-012', admissionNo: sid(2022, 12), firstName: 'Taslima', lastName: 'Begum', email: 'taslima.begum@student.unimanage.edu', phone: '+8801810000012', dob: '2003-03-25', gender: 'FEMALE', departmentId: 'dept-bba', programId: 'prog-bba', currentSemesterId: 'sem-fall-2025', session: '2022-23', status: 'ACTIVE', admissionDate: '2022-08-16', guardianName: 'Monirul Islam', guardianPhone: '+8801712000012', guardianRelation: 'Husband', address: 'Lalmatia, Dhaka' },
    { id: 'stu-013', admissionNo: sid(2023, 13), firstName: 'Rahim', lastName: 'Uddin', email: 'rahim.uddin@student.unimanage.edu', phone: '+8801810000013', dob: '2004-01-08', gender: 'MALE', departmentId: 'dept-cse', programId: 'prog-bsc-cse', currentSemesterId: 'sem-fall-2025', session: '2023-24', status: 'ACTIVE', admissionDate: '2023-08-10', guardianName: 'Karim Uddin', guardianPhone: '+8801712000013', guardianRelation: 'Father', address: 'Mirpur 1, Dhaka' },
    { id: 'stu-014', admissionNo: sid(2023, 14), firstName: 'Shabnam', lastName: 'Mustari', email: 'shabnam.mustari@student.unimanage.edu', phone: '+8801810000014', dob: '2004-02-20', gender: 'FEMALE', departmentId: 'dept-cse', programId: 'prog-msc-cse', currentSemesterId: 'sem-fall-2025', session: '2023-24', status: 'ACTIVE', admissionDate: '2023-08-11', guardianName: 'Mustafa Kamal', guardianPhone: '+8801712000014', guardianRelation: 'Father', address: 'Gulshan 2, Dhaka' },
    { id: 'stu-015', admissionNo: sid(2023, 15), firstName: 'Fahim', lastName: 'Rahman', email: 'fahim.rahman@student.unimanage.edu', phone: '+8801810000015', dob: '2004-05-16', gender: 'MALE', departmentId: 'dept-eee', programId: 'prog-bsc-eee', currentSemesterId: 'sem-spring-2025', session: '2023-24', status: 'ACTIVE', admissionDate: '2023-08-12', guardianName: 'Mizanur Rahman', guardianPhone: '+8801712000015', guardianRelation: 'Father', address: 'Uttara Sector 10, Dhaka' },
    { id: 'stu-016', admissionNo: sid(2023, 16), firstName: 'Mariam', lastName: 'Sultana', email: 'mariam.sultana@student.unimanage.edu', phone: '+8801810000016', dob: '2004-07-30', gender: 'FEMALE', departmentId: 'dept-eng', programId: 'prog-ba-eng', currentSemesterId: 'sem-fall-2025', session: '2023-24', status: 'ACTIVE', admissionDate: '2023-08-13', guardianName: 'Sultan Ahmed', guardianPhone: '+8801712000016', guardianRelation: 'Father', address: 'Dhanmondi 32, Dhaka' },
    { id: 'stu-017', admissionNo: sid(2023, 17), firstName: 'Shuvo', lastName: 'Das', email: 'shuvo.das@student.unimanage.edu', phone: '+8801810000017', dob: '2004-03-03', gender: 'MALE', departmentId: 'dept-mat', programId: 'prog-bsc-mat', currentSemesterId: 'sem-fall-2025', session: '2023-24', status: 'ACTIVE', admissionDate: '2023-08-14', guardianName: 'Probir Das', guardianPhone: '+8801712000017', guardianRelation: 'Father', address: 'Shankhari Bazar, Dhaka' },
    { id: 'stu-018', admissionNo: sid(2023, 18), firstName: 'Nusrat', lastName: 'Fariha', email: 'nusrat.fariha@student.unimanage.edu', phone: '+8801810000018', dob: '2004-09-12', gender: 'FEMALE', departmentId: 'dept-eco', programId: 'prog-bsc-eco', currentSemesterId: 'sem-fall-2025', session: '2023-24', status: 'ACTIVE', admissionDate: '2023-08-15', guardianName: 'Faruq Ahmed', guardianPhone: '+8801712000018', guardianRelation: 'Father', address: 'Moghbazar, Dhaka' },
    { id: 'stu-019', admissionNo: sid(2023, 19), firstName: 'Sakib', lastName: 'Al Hasan', email: 'sakib.alhasan@student.unimanage.edu', phone: '+8801810000019', dob: '2004-04-28', gender: 'MALE', departmentId: 'dept-cse', programId: 'prog-bsc-cse', currentSemesterId: 'sem-fall-2025', session: '2023-24', status: 'ACTIVE', admissionDate: '2023-08-16', guardianName: 'Azizul Hasan', guardianPhone: '+8801712000019', guardianRelation: 'Father', address: 'Banani DOHS, Dhaka' },
    { id: 'stu-020', admissionNo: sid(2023, 20), firstName: 'Tahmina', lastName: 'Akter', email: 'tahmina.akter@student.unimanage.edu', phone: '+8801810000020', dob: '2004-06-06', gender: 'FEMALE', departmentId: 'dept-bba', programId: 'prog-bba', currentSemesterId: 'sem-fall-2025', session: '2023-24', status: 'ACTIVE', admissionDate: '2023-08-17', guardianName: 'Alamgir Hossain', guardianPhone: '+8801712000020', guardianRelation: 'Father', address: 'Khilkhet, Dhaka' },
    { id: 'stu-021', admissionNo: sid(2023, 21), firstName: 'Emon', lastName: 'Chowdhury', email: 'emon.chowdhury@student.unimanage.edu', phone: '+8801810000021', dob: '2004-08-19', gender: 'MALE', departmentId: 'dept-cse', programId: 'prog-bsc-cse', currentSemesterId: 'sem-fall-2025', session: '2023-24', status: 'ACTIVE', admissionDate: '2023-08-18', guardianName: 'Elias Chowdhury', guardianPhone: '+8801712000021', guardianRelation: 'Father', address: 'Nikunja 2, Dhaka' },
    { id: 'stu-022', admissionNo: sid(2023, 22), firstName: 'Ishrat', lastName: 'Jahan', email: 'ishrat.jahan@student.unimanage.edu', phone: '+8801810000022', dob: '2004-10-02', gender: 'FEMALE', departmentId: 'dept-cse', programId: 'prog-bsc-cse', currentSemesterId: 'sem-fall-2025', session: '2023-24', status: 'ACTIVE', admissionDate: '2023-08-19', guardianName: 'Iqbal Jahan', guardianPhone: '+8801712000022', guardianRelation: 'Father', address: 'Bashundhara R/A, Dhaka' },
    { id: 'stu-023', admissionNo: sid(2023, 23), firstName: 'Hasib', lastName: 'Mahmud', email: 'hasib.mahmud@student.unimanage.edu', phone: '+8801810000023', dob: '2004-11-11', gender: 'MALE', departmentId: 'dept-eee', programId: 'prog-bsc-eee', currentSemesterId: 'sem-fall-2025', session: '2023-24', status: 'WITHDRAWN', admissionDate: '2023-08-20', guardianName: 'Mahmud Hasan', guardianPhone: '+8801712000023', guardianRelation: 'Father', address: 'Rampura, Dhaka' },
    { id: 'stu-024', admissionNo: sid(2024, 24), firstName: 'Anika', lastName: 'Tabassum', email: 'anika.tabassum@student.unimanage.edu', phone: '+8801810000024', dob: '2005-01-15', gender: 'FEMALE', departmentId: 'dept-bba', programId: 'prog-mba', currentSemesterId: 'sem-fall-2025', session: '2024-25', status: 'ACTIVE', admissionDate: '2024-01-20', guardianName: 'Tabassum Ahmed', guardianPhone: '+8801712000024', guardianRelation: 'Mother', address: 'Tejgaon, Dhaka' },
    { id: 'stu-025', admissionNo: sid(2024, 25), firstName: 'Rakib', lastName: 'Hasan', email: 'rakib.hasan@student.unimanage.edu', phone: '+8801810000025', dob: '2005-02-28', gender: 'MALE', departmentId: 'dept-eng', programId: 'prog-ba-eng', currentSemesterId: 'sem-fall-2025', session: '2024-25', status: 'ACTIVE', admissionDate: '2024-01-21', guardianName: 'Rashid Hasan', guardianPhone: '+8801712000025', guardianRelation: 'Father', address: 'Malibagh, Dhaka' },
    { id: 'stu-026', admissionNo: sid(2024, 26), firstName: 'Mim', lastName: 'Akter', email: 'mim.akter@student.unimanage.edu', phone: '+8801810000026', dob: '2005-03-18', gender: 'FEMALE', departmentId: 'dept-cse', programId: 'prog-bsc-cse', currentSemesterId: 'sem-fall-2025', session: '2024-25', status: 'ACTIVE', admissionDate: '2024-08-12', guardianName: 'Mizan Akter', guardianPhone: '+8801712000026', guardianRelation: 'Father', address: 'Mirpur 6, Dhaka' },
    { id: 'stu-027', admissionNo: sid(2024, 27), firstName: 'Shakib', lastName: 'Khan', email: 'shakib.khan@student.unimanage.edu', phone: '+8801810000027', dob: '2005-04-22', gender: 'MALE', departmentId: 'dept-cse', programId: 'prog-bsc-cse', currentSemesterId: 'sem-fall-2025', session: '2024-25', status: 'ACTIVE', admissionDate: '2024-08-13', guardianName: 'Shahid Khan', guardianPhone: '+8801712000027', guardianRelation: 'Father', address: 'Uttara Sector 4, Dhaka' },
    { id: 'stu-028', admissionNo: sid(2024, 28), firstName: 'Orpa', lastName: 'Haque', email: 'orpa.haque@student.unimanage.edu', phone: '+8801810000028', dob: '2005-05-09', gender: 'FEMALE', departmentId: 'dept-mat', programId: 'prog-bsc-mat', currentSemesterId: 'sem-fall-2025', session: '2024-25', status: 'ACTIVE', admissionDate: '2024-08-14', guardianName: 'Enamul Haque', guardianPhone: '+8801712000028', guardianRelation: 'Father', address: 'Azimpur, Dhaka' },
    { id: 'stu-029', admissionNo: sid(2024, 29), firstName: 'Faisal', lastName: 'Ahmed', email: 'faisal.ahmed@student.unimanage.edu', phone: '+8801810000029', dob: '2005-06-14', gender: 'MALE', departmentId: 'dept-eco', programId: 'prog-bsc-eco', currentSemesterId: 'sem-fall-2025', session: '2024-25', status: 'ACTIVE', admissionDate: '2024-08-15', guardianName: 'Faruq Ahmed', guardianPhone: '+8801712000029', guardianRelation: 'Father', address: 'Badda, Dhaka' },
    { id: 'stu-030', admissionNo: sid(2024, 30), firstName: 'Jannat', lastName: 'Ferdous', email: 'jannat.ferdous@student.unimanage.edu', phone: '+8801810000030', dob: '2005-07-20', gender: 'FEMALE', departmentId: 'dept-cse', programId: 'prog-bsc-cse', currentSemesterId: 'sem-fall-2025', session: '2024-25', status: 'ACTIVE', admissionDate: '2024-08-16', guardianName: 'Ferdous Alam', guardianPhone: '+8801712000030', guardianRelation: 'Father', address: 'Dhamrai, Dhaka' },
    { id: 'stu-031', admissionNo: sid(2024, 31), firstName: 'Nayeem', lastName: 'Islam', email: 'nayeem.islam@student.unimanage.edu', phone: '+8801810000031', dob: '2005-08-11', gender: 'MALE', departmentId: 'dept-eee', programId: 'prog-bsc-eee', currentSemesterId: 'sem-fall-2025', session: '2024-25', status: 'ACTIVE', admissionDate: '2024-08-17', guardianName: 'Nazrul Islam', guardianPhone: '+8801712000031', guardianRelation: 'Father', address: 'Savar, Dhaka' },
    { id: 'stu-032', admissionNo: sid(2024, 32), firstName: 'Puja', lastName: 'Roy', email: 'puja.roy@student.unimanage.edu', phone: '+8801810000032', dob: '2005-09-05', gender: 'FEMALE', departmentId: 'dept-bba', programId: 'prog-bba', currentSemesterId: 'sem-fall-2025', session: '2024-25', status: 'ACTIVE', admissionDate: '2024-08-18', guardianName: 'Prodyut Roy', guardianPhone: '+8801712000032', guardianRelation: 'Father', address: 'Old Dhaka, Dhaka' },
    { id: 'stu-033', admissionNo: sid(2024, 33), firstName: 'Asif', lastName: 'Mahmud', email: 'asif.mahmud@student.unimanage.edu', phone: '+8801810000033', dob: '2005-10-18', gender: 'MALE', departmentId: 'dept-cse', programId: 'prog-bsc-cse', currentSemesterId: 'sem-fall-2025', session: '2024-25', status: 'ACTIVE', admissionDate: '2024-08-19', guardianName: 'Mahmud Karim', guardianPhone: '+8801712000033', guardianRelation: 'Father', address: 'Kazipara, Dhaka' },
    { id: 'stu-034', admissionNo: sid(2024, 34), firstName: 'Maliha', lastName: 'Tasnim', email: 'maliha.tasnim@student.unimanage.edu', phone: '+8801810000034', dob: '2005-11-02', gender: 'FEMALE', departmentId: 'dept-eng', programId: 'prog-ba-eng', currentSemesterId: 'sem-fall-2025', session: '2024-25', status: 'ACTIVE', admissionDate: '2024-08-20', guardianName: 'Tasnim Jahan', guardianPhone: '+8801712000034', guardianRelation: 'Mother', address: 'Gulshan 2, Dhaka' },
    { id: 'stu-035', admissionNo: sid(2024, 35), firstName: 'Siam', lastName: 'Ahmed', email: 'siam.ahmed@student.unimanage.edu', phone: '+8801810000035', dob: '2005-12-12', gender: 'MALE', departmentId: 'dept-mat', programId: 'prog-bsc-mat', currentSemesterId: 'sem-spring-2025', session: '2024-25', status: 'GRADUATED', admissionDate: '2024-01-10', guardianName: 'Sami Ahmed', guardianPhone: '+8801712000035', guardianRelation: 'Father', address: 'Farmgate, Dhaka' },
    { id: 'stu-036', admissionNo: sid(2024, 36), firstName: 'Raisa', lastName: 'Chowdhury', email: 'raisa.chowdhury@student.unimanage.edu', phone: '+8801810000036', dob: '2006-01-22', gender: 'FEMALE', departmentId: 'dept-eco', programId: 'prog-bsc-eco', currentSemesterId: 'sem-fall-2025', session: '2024-25', status: 'ACTIVE', admissionDate: '2024-08-21', guardianName: 'Rashed Chowdhury', guardianPhone: '+8801712000036', guardianRelation: 'Father', address: 'Baridhara DOHS, Dhaka' },
    { id: 'stu-037', admissionNo: sid(2024, 37), firstName: 'Ovi', lastName: 'Hasan', email: 'ovi.hasan@student.unimanage.edu', phone: '+8801810000037', dob: '2006-02-14', gender: 'MALE', departmentId: 'dept-cse', programId: 'prog-bsc-cse', currentSemesterId: 'sem-fall-2025', session: '2024-25', status: 'ACTIVE', admissionDate: '2024-08-22', guardianName: 'Hasan Mahmud', guardianPhone: '+8801712000037', guardianRelation: 'Father', address: 'Mirpur 11, Dhaka' },
    { id: 'stu-038', admissionNo: sid(2025, 38), firstName: 'Zara', lastName: 'Khan', email: 'zara.khan@student.unimanage.edu', phone: '+8801810000038', dob: '2006-03-30', gender: 'FEMALE', departmentId: 'dept-cse', programId: 'prog-bsc-cse', currentSemesterId: 'sem-fall-2025', session: '2025-26', status: 'ACTIVE', admissionDate: '2025-08-10', guardianName: 'Zahid Khan', guardianPhone: '+8801712000038', guardianRelation: 'Father', address: 'Dhanmondi 8, Dhaka' },
    { id: 'stu-039', admissionNo: sid(2025, 39), firstName: 'Adnan', lastName: 'Sami', email: 'adnan.sami@student.unimanage.edu', phone: '+8801810000039', dob: '2006-04-17', gender: 'MALE', departmentId: 'dept-eee', programId: 'prog-bsc-eee', currentSemesterId: 'sem-fall-2025', session: '2025-26', status: 'ACTIVE', admissionDate: '2025-08-11', guardianName: 'Sami Uddin', guardianPhone: '+8801712000039', guardianRelation: 'Father', address: 'Mohakhali, Dhaka' },
    { id: 'stu-040', admissionNo: sid(2025, 40), firstName: 'Nabila', lastName: 'Hossain', email: 'nabila.hossain@student.unimanage.edu', phone: '+8801810000040', dob: '2006-05-25', gender: 'FEMALE', departmentId: 'dept-bba', programId: 'prog-bba', currentSemesterId: 'sem-fall-2025', session: '2025-26', status: 'ACTIVE', admissionDate: '2025-08-12', guardianName: 'Hossain Ali', guardianPhone: '+8801712000040', guardianRelation: 'Father', address: 'Niketon, Dhaka' },
    { id: 'stu-041', admissionNo: sid(2025, 41), firstName: 'Shihab', lastName: 'Uddin', email: 'shihab.uddin@student.unimanage.edu', phone: '+8801810000041', dob: '2006-06-18', gender: 'MALE', departmentId: 'dept-eng', programId: 'prog-ba-eng', currentSemesterId: 'sem-fall-2025', session: '2025-26', status: 'ACTIVE', admissionDate: '2025-08-13', guardianName: 'Shihab Uddin Sr', guardianPhone: '+8801712000041', guardianRelation: 'Father', address: 'Tejgaon, Dhaka' },
    { id: 'stu-042', admissionNo: sid(2025, 42), firstName: 'Tania', lastName: 'Sultana', email: 'tania.sultana@student.unimanage.edu', phone: '+8801810000042', dob: '2006-07-08', gender: 'FEMALE', departmentId: 'dept-mat', programId: 'prog-bsc-mat', currentSemesterId: 'sem-fall-2025', session: '2025-26', status: 'ACTIVE', admissionDate: '2025-08-14', guardianName: 'Sultan Mahmud', guardianPhone: '+8801712000042', guardianRelation: 'Father', address: 'Shantinagar, Dhaka' },
    { id: 'stu-043', admissionNo: sid(2025, 43), firstName: 'Rafi', lastName: 'Ahmed', email: 'rafi.ahmed@student.unimanage.edu', phone: '+8801810000043', dob: '2006-08-02', gender: 'MALE', departmentId: 'dept-eco', programId: 'prog-bsc-eco', currentSemesterId: 'sem-fall-2025', session: '2025-26', status: 'ACTIVE', admissionDate: '2025-08-15', guardianName: 'Rafiq Ahmed', guardianPhone: '+8801712000043', guardianRelation: 'Father', address: 'Khilgaon, Dhaka' },
    { id: 'stu-044', admissionNo: sid(2025, 44), firstName: 'Mayesha', lastName: 'Rahman', email: 'mayesha.rahman@student.unimanage.edu', phone: '+8801810000044', dob: '2006-09-14', gender: 'FEMALE', departmentId: 'dept-cse', programId: 'prog-bsc-cse', currentSemesterId: 'sem-fall-2025', session: '2025-26', status: 'ACTIVE', admissionDate: '2025-08-16', guardianName: 'Mizan Rahman', guardianPhone: '+8801712000044', guardianRelation: 'Father', address: 'Uttara Sector 11, Dhaka' },
    { id: 'stu-045', admissionNo: sid(2025, 45), firstName: 'Parvez', lastName: 'Hossain', email: 'parvez.hossain@student.unimanage.edu', phone: '+8801810000045', dob: '2006-10-05', gender: 'MALE', departmentId: 'dept-cse', programId: 'prog-bsc-cse', currentSemesterId: 'sem-fall-2025', session: '2025-26', status: 'ACTIVE', admissionDate: '2025-08-17', guardianName: 'Parvez Hossain Sr', guardianPhone: '+8801712000045', guardianRelation: 'Father', address: 'Mirpur 2, Dhaka' },
    { id: 'stu-046', admissionNo: sid(2025, 46), firstName: 'Samira', lastName: 'Khan', email: 'samira.khan@student.unimanage.edu', phone: '+8801810000046', dob: '2006-11-19', gender: 'FEMALE', departmentId: 'dept-bba', programId: 'prog-bba', currentSemesterId: 'sem-fall-2025', session: '2025-26', status: 'ACTIVE', admissionDate: '2025-08-18', guardianName: 'Samir Khan', guardianPhone: '+8801712000046', guardianRelation: 'Father', address: 'Banani, Dhaka' },
    { id: 'stu-047', admissionNo: sid(2025, 47), firstName: 'Fahad', lastName: 'Ahmed', email: 'fahad.ahmed@student.unimanage.edu', phone: '+8801810000047', dob: '2006-12-03', gender: 'MALE', departmentId: 'dept-cse', programId: 'prog-bsc-cse', currentSemesterId: 'sem-fall-2025', session: '2025-26', status: 'ACTIVE', admissionDate: '2025-08-19', guardianName: 'Fahad Ahmed Sr', guardianPhone: '+8801712000047', guardianRelation: 'Father', address: 'Dhanmondi 27, Dhaka' },
    { id: 'stu-048', admissionNo: sid(2025, 48), firstName: 'Noshin', lastName: 'Anjum', email: 'noshin.anjum@student.unimanage.edu', phone: '+8801810000048', dob: '2007-01-12', gender: 'FEMALE', departmentId: 'dept-eng', programId: 'prog-ba-eng', currentSemesterId: 'sem-fall-2025', session: '2025-26', status: 'INACTIVE', admissionDate: '2025-08-20', guardianName: 'Anjum Hossain', guardianPhone: '+8801712000048', guardianRelation: 'Father', address: 'Gulshan 1, Dhaka' },
    { id: 'stu-049', admissionNo: sid(2025, 49), firstName: 'Wasif', lastName: 'Akram', email: 'wasif.akram@student.unimanage.edu', phone: '+8801810000049', dob: '2007-02-20', gender: 'MALE', departmentId: 'dept-eee', programId: 'prog-bsc-eee', currentSemesterId: 'sem-fall-2025', session: '2025-26', status: 'ACTIVE', admissionDate: '2025-08-21', guardianName: 'Akram Hossain', guardianPhone: '+8801712000049', guardianRelation: 'Father', address: 'Savar, Dhaka' },
    { id: 'stu-050', admissionNo: sid(2025, 50), firstName: 'Hridi', lastName: 'Sharma', email: 'hridi.sharma@student.unimanage.edu', phone: '+8801810000050', dob: '2007-03-08', gender: 'FEMALE', departmentId: 'dept-mat', programId: 'prog-bsc-mat', currentSemesterId: 'sem-fall-2025', session: '2025-26', status: 'ACTIVE', admissionDate: '2025-08-22', guardianName: 'Hridoy Sharma', guardianPhone: '+8801712000050', guardianRelation: 'Father', address: 'Lalbagh, Dhaka' }
];

export const students: Student[] = studentSeeds.map((s) => ({ ...s, ...ts(s.admissionDate + 'T08:00:00.000Z') }));

// ── Admission Applications (22) ────────────────────────────────────────────

export const admissionApplications: AdmissionApplication[] = [
    { id: 'app-001', applicantName: 'Fahad Ahmed', email: 'fahad.ahmed.app1@unimanage.edu', phone: '+8801811000001', dob: '2006-12-03', gender: 'MALE', programId: 'prog-bsc-cse', departmentId: 'dept-cse', qualifications: 'HSC Science GPA 5.00, SSC GPA 5.00', applicationFeePaid: true, status: 'ENROLLED', studentId: 'stu-047', reviewNotes: 'Excellent academic record. Enrolled as UM-2025-0047.', submittedAt: '2025-05-10T00:00:00.000Z', reviewedAt: '2025-05-15T00:00:00.000Z', ...ts('2025-05-10T00:00:00.000Z') },
    { id: 'app-002', applicantName: 'Zara Khan', email: 'zara.khan.app@unimanage.edu', phone: '+8801811000002', dob: '2006-03-30', gender: 'FEMALE', programId: 'prog-bsc-cse', departmentId: 'dept-cse', qualifications: 'HSC Science GPA 4.92, SSC GPA 5.00', applicationFeePaid: true, status: 'ENROLLED', studentId: 'stu-038', reviewNotes: 'Excellent academic record. Enrolled as UM-2025-0038.', submittedAt: '2025-05-11T00:00:00.000Z', reviewedAt: '2025-05-16T00:00:00.000Z', ...ts('2025-05-11T00:00:00.000Z') },
    { id: 'app-003', applicantName: 'Tanvir Mahmud', email: 'tanvir.mahmud.app@unimanage.edu', phone: '+8801811000003', dob: '2006-01-20', gender: 'MALE', programId: 'prog-bsc-eee', departmentId: 'dept-eee', qualifications: 'HSC Science GPA 4.83', applicationFeePaid: true, status: 'APPROVED', studentId: null, reviewNotes: 'Approved, pending enrollment.', submittedAt: '2025-05-12T00:00:00.000Z', reviewedAt: '2025-05-18T00:00:00.000Z', ...ts('2025-05-12T00:00:00.000Z') },
    { id: 'app-004', applicantName: 'Samira Khan', email: 'samira.khan.app@unimanage.edu', phone: '+8801811000004', dob: '2006-11-19', gender: 'FEMALE', programId: 'prog-bba', departmentId: 'dept-bba', qualifications: 'HSC Business GPA 4.75', applicationFeePaid: true, status: 'ENROLLED', studentId: 'stu-046', reviewNotes: 'Enrolled into BBA.', submittedAt: '2025-05-13T00:00:00.000Z', reviewedAt: '2025-05-19T00:00:00.000Z', ...ts('2025-05-13T00:00:00.000Z') },
    { id: 'app-005', applicantName: 'Fahad Ahmed', email: 'fahad.ahmed.app@unimanage.edu', phone: '+8801811000005', dob: '2006-12-03', gender: 'MALE', programId: 'prog-bsc-cse', departmentId: 'dept-cse', qualifications: 'HSC Science GPA 4.50', applicationFeePaid: false, status: 'SUBMITTED', studentId: null, reviewNotes: '', submittedAt: '2025-08-01T00:00:00.000Z', reviewedAt: null, ...ts('2025-08-01T00:00:00.000Z') },
    { id: 'app-006', applicantName: 'Noshin Anjum', email: 'noshin.anjum.app@unimanage.edu', phone: '+8801811000006', dob: '2007-01-12', gender: 'FEMALE', programId: 'prog-ba-eng', departmentId: 'dept-eng', qualifications: 'HSC Arts GPA 4.60', applicationFeePaid: true, status: 'UNDER_REVIEW', studentId: null, reviewNotes: 'Under review by English department.', submittedAt: '2025-08-02T00:00:00.000Z', reviewedAt: null, ...ts('2025-08-02T00:00:00.000Z') },
    { id: 'app-007', applicantName: 'Wasif Akram', email: 'wasif.akram.app@unimanage.edu', phone: '+8801811000007', dob: '2007-02-20', gender: 'MALE', programId: 'prog-bsc-eee', departmentId: 'dept-eee', qualifications: 'HSC Science GPA 4.40', applicationFeePaid: true, status: 'UNDER_REVIEW', studentId: null, reviewNotes: '', submittedAt: '2025-08-03T00:00:00.000Z', reviewedAt: null, ...ts('2025-08-03T00:00:00.000Z') },
    { id: 'app-008', applicantName: 'Hridi Sharma', email: 'hridi.sharma.app@unimanage.edu', phone: '+8801811000008', dob: '2007-03-08', gender: 'FEMALE', programId: 'prog-bsc-mat', departmentId: 'dept-mat', qualifications: 'HSC Science GPA 4.88', applicationFeePaid: true, status: 'APPROVED', studentId: null, reviewNotes: 'Approved — excellent math scores.', submittedAt: '2025-07-20T00:00:00.000Z', reviewedAt: '2025-07-28T00:00:00.000Z', ...ts('2025-07-20T00:00:00.000Z') },
    { id: 'app-009', applicantName: 'Rafi Ahmed', email: 'rafi.ahmed.app@unimanage.edu', phone: '+8801811000009', dob: '2006-08-02', gender: 'MALE', programId: 'prog-bsc-eco', departmentId: 'dept-eco', qualifications: 'HSC Business GPA 4.20', applicationFeePaid: true, status: 'ENROLLED', studentId: 'stu-043', reviewNotes: 'Enrolled.', submittedAt: '2025-05-14T00:00:00.000Z', reviewedAt: '2025-05-20T00:00:00.000Z', ...ts('2025-05-14T00:00:00.000Z') },
    { id: 'app-010', applicantName: 'Parvez Hossain', email: 'parvez.hossain.app@unimanage.edu', phone: '+8801811000010', dob: '2006-10-05', gender: 'MALE', programId: 'prog-bsc-cse', departmentId: 'dept-cse', qualifications: 'HSC Science GPA 4.67', applicationFeePaid: true, status: 'ENROLLED', studentId: 'stu-045', reviewNotes: 'Enrolled.', submittedAt: '2025-05-15T00:00:00.000Z', reviewedAt: '2025-05-21T00:00:00.000Z', ...ts('2025-05-15T00:00:00.000Z') },
    { id: 'app-011', applicantName: 'Sadia Afrin', email: 'sadia.afrin.app@unimanage.edu', phone: '+8801811000011', dob: '2006-02-14', gender: 'FEMALE', programId: 'prog-bba', departmentId: 'dept-bba', qualifications: 'HSC Business GPA 3.90', applicationFeePaid: false, status: 'REJECTED', studentId: null, reviewNotes: 'Rejected — incomplete documents and unpaid fee.', submittedAt: '2025-06-01T00:00:00.000Z', reviewedAt: '2025-06-10T00:00:00.000Z', ...ts('2025-06-01T00:00:00.000Z') },
    { id: 'app-012', applicantName: 'Khaled Mahmud', email: 'khaled.mahmud.app@unimanage.edu', phone: '+8801811000012', dob: '2005-12-01', gender: 'MALE', programId: 'prog-bsc-cse', departmentId: 'dept-cse', qualifications: 'HSC Science GPA 3.50', applicationFeePaid: true, status: 'REJECTED', studentId: null, reviewNotes: 'Rejected — GPA below threshold.', submittedAt: '2025-06-02T00:00:00.000Z', reviewedAt: '2025-06-11T00:00:00.000Z', ...ts('2025-06-02T00:00:00.000Z') },
    { id: 'app-013', applicantName: 'Maliha Tasnim', email: 'maliha.tasnim.app@unimanage.edu', phone: '+8801811000013', dob: '2005-11-02', gender: 'FEMALE', programId: 'prog-ba-eng', departmentId: 'dept-eng', qualifications: 'HSC Arts GPA 4.70', applicationFeePaid: true, status: 'APPROVED', studentId: null, reviewNotes: 'Approved.', submittedAt: '2025-07-15T00:00:00.000Z', reviewedAt: '2025-07-22T00:00:00.000Z', ...ts('2025-07-15T00:00:00.000Z') },
    { id: 'app-014', applicantName: 'Shihab Uddin', email: 'shihab.uddin.app@unimanage.edu', phone: '+8801811000014', dob: '2006-06-18', gender: 'MALE', programId: 'prog-ba-eng', departmentId: 'dept-eng', qualifications: 'HSC Arts GPA 4.55', applicationFeePaid: true, status: 'ENROLLED', studentId: 'stu-041', reviewNotes: 'Enrolled.', submittedAt: '2025-05-16T00:00:00.000Z', reviewedAt: '2025-05-22T00:00:00.000Z', ...ts('2025-05-16T00:00:00.000Z') },
    { id: 'app-015', applicantName: 'Tania Sultana', email: 'tania.sultana.app@unimanage.edu', phone: '+8801811000015', dob: '2006-07-08', gender: 'FEMALE', programId: 'prog-bsc-mat', departmentId: 'dept-mat', qualifications: 'HSC Science GPA 4.80', applicationFeePaid: true, status: 'ENROLLED', studentId: 'stu-042', reviewNotes: 'Enrolled.', submittedAt: '2025-05-17T00:00:00.000Z', reviewedAt: '2025-05-23T00:00:00.000Z', ...ts('2025-05-17T00:00:00.000Z') },
    { id: 'app-016', applicantName: 'Adnan Sami', email: 'adnan.sami.app@unimanage.edu', phone: '+8801811000016', dob: '2006-04-17', gender: 'MALE', programId: 'prog-bsc-eee', departmentId: 'dept-eee', qualifications: 'HSC Science GPA 4.60', applicationFeePaid: true, status: 'ENROLLED', studentId: 'stu-039', reviewNotes: 'Enrolled.', submittedAt: '2025-05-18T00:00:00.000Z', reviewedAt: '2025-05-24T00:00:00.000Z', ...ts('2025-05-18T00:00:00.000Z') },
    { id: 'app-017', applicantName: 'Nabila Hossain', email: 'nabila.hossain.app@unimanage.edu', phone: '+8801811000017', dob: '2006-05-25', gender: 'FEMALE', programId: 'prog-bba', departmentId: 'dept-bba', qualifications: 'HSC Business GPA 4.40', applicationFeePaid: true, status: 'SUBMITTED', studentId: null, reviewNotes: '', submittedAt: '2025-08-04T00:00:00.000Z', reviewedAt: null, ...ts('2025-08-04T00:00:00.000Z') },
    { id: 'app-018', applicantName: 'Faisal Karim', email: 'faisal.karim.app@unimanage.edu', phone: '+8801811000018', dob: '2006-02-28', gender: 'MALE', programId: 'prog-msc-cse', departmentId: 'dept-cse', qualifications: 'BSc CSE CGPA 3.40', applicationFeePaid: true, status: 'UNDER_REVIEW', studentId: null, reviewNotes: '', submittedAt: '2025-08-05T00:00:00.000Z', reviewedAt: null, ...ts('2025-08-05T00:00:00.000Z') },
    { id: 'app-019', applicantName: 'Anika Tabassum', email: 'anika.tabassum.app2@unimanage.edu', phone: '+8801811000019', dob: '2005-01-15', gender: 'FEMALE', programId: 'prog-mba', departmentId: 'dept-bba', qualifications: 'BBA CGPA 3.55', applicationFeePaid: true, status: 'APPROVED', studentId: null, reviewNotes: 'Approved for MBA.', submittedAt: '2025-07-10T00:00:00.000Z', reviewedAt: '2025-07-18T00:00:00.000Z', ...ts('2025-07-10T00:00:00.000Z') },
    { id: 'app-020', applicantName: 'Mehedi Hasan', email: 'mehedi.hasan.app@unimanage.edu', phone: '+8801811000020', dob: '2006-09-12', gender: 'MALE', programId: 'prog-bsc-eco', departmentId: 'dept-eco', qualifications: 'HSC Business GPA 4.10', applicationFeePaid: false, status: 'SUBMITTED', studentId: null, reviewNotes: '', submittedAt: '2025-08-06T00:00:00.000Z', reviewedAt: null, ...ts('2025-08-06T00:00:00.000Z') },
    { id: 'app-021', applicantName: 'Sumaiya Akter', email: 'sumaiya.akter.app2@unimanage.edu', phone: '+8801811000021', dob: '2006-04-11', gender: 'FEMALE', programId: 'prog-bsc-cse', departmentId: 'dept-cse', qualifications: 'HSC Science GPA 5.00', applicationFeePaid: true, status: 'APPROVED', studentId: null, reviewNotes: 'Approved — top merit.', submittedAt: '2025-07-12T00:00:00.000Z', reviewedAt: '2025-07-20T00:00:00.000Z', ...ts('2025-07-12T00:00:00.000Z') },
    { id: 'app-022', applicantName: 'Rashed Khan', email: 'rashed.khan.app2@unimanage.edu', phone: '+8801811000022', dob: '2006-05-18', gender: 'MALE', programId: 'prog-bsc-eee', departmentId: 'dept-eee', qualifications: 'HSC Science GPA 3.80', applicationFeePaid: true, status: 'REJECTED', studentId: null, reviewNotes: 'Rejected — low entrance score.', submittedAt: '2025-06-03T00:00:00.000Z', reviewedAt: '2025-06-12T00:00:00.000Z', ...ts('2025-06-03T00:00:00.000Z') }
];

// ── Class Sessions (2 depts × 2 semesters) ───────────────────────────────────

export const classSessions: ClassSession[] = [
    // CSE — Fall 2025
    { id: 'cs-fall25-1', courseId: 'cse-201', facultyId: 'fm-002', semesterId: 'sem-fall-2025', day: 'Sunday', startTime: '09:00', endTime: '10:30', room: 'A-201', ...ts() },
    { id: 'cs-fall25-2', courseId: 'cse-201', facultyId: 'fm-002', semesterId: 'sem-fall-2025', day: 'Tuesday', startTime: '09:00', endTime: '10:30', room: 'A-201', ...ts() },
    { id: 'cs-fall25-3', courseId: 'cse-205', facultyId: 'fm-001', semesterId: 'sem-fall-2025', day: 'Sunday', startTime: '11:00', endTime: '12:30', room: 'A-204', ...ts() },
    { id: 'cs-fall25-4', courseId: 'cse-205', facultyId: 'fm-001', semesterId: 'sem-fall-2025', day: 'Wednesday', startTime: '11:00', endTime: '12:30', room: 'A-204', ...ts() },
    { id: 'cs-fall25-5', courseId: 'cse-207', facultyId: 'fm-001', semesterId: 'sem-fall-2025', day: 'Monday', startTime: '14:00', endTime: '15:30', room: 'A-301', ...ts() },
    { id: 'cs-fall25-6', courseId: 'mat-101', facultyId: 'fm-009', semesterId: 'sem-fall-2025', day: 'Tuesday', startTime: '11:00', endTime: '12:30', room: 'B-101', ...ts() },
    { id: 'cs-fall25-7', courseId: 'cse-103', facultyId: 'fm-003', semesterId: 'sem-fall-2025', day: 'Wednesday', startTime: '09:00', endTime: '10:30', room: 'A-102', ...ts() },
    // CSE — Spring 2025
    { id: 'cs-spring25-1', courseId: 'cse-101', facultyId: 'fm-002', semesterId: 'sem-spring-2025', day: 'Sunday', startTime: '09:00', endTime: '10:30', room: 'A-201', ...ts() },
    { id: 'cs-spring25-2', courseId: 'cse-203', facultyId: 'fm-003', semesterId: 'sem-spring-2025', day: 'Monday', startTime: '10:00', endTime: '11:30', room: 'A-102', ...ts() },
    { id: 'cs-spring25-3', courseId: 'mat-201', facultyId: 'fm-009', semesterId: 'sem-spring-2025', day: 'Tuesday', startTime: '14:00', endTime: '15:30', room: 'B-101', ...ts() },
    // BBA — Fall 2025
    { id: 'cs-fall25-8', courseId: 'bba-101', facultyId: 'fm-006', semesterId: 'sem-fall-2025', day: 'Sunday', startTime: '09:00', endTime: '10:30', room: 'C-201', ...ts() },
    { id: 'cs-fall25-9', courseId: 'bba-101', facultyId: 'fm-006', semesterId: 'sem-fall-2025', day: 'Wednesday', startTime: '09:00', endTime: '10:30', room: 'C-201', ...ts() },
    { id: 'cs-fall25-10', courseId: 'bba-201', facultyId: 'fm-006', semesterId: 'sem-fall-2025', day: 'Monday', startTime: '11:00', endTime: '12:30', room: 'C-202', ...ts() },
    { id: 'cs-fall25-11', courseId: 'eco-101', facultyId: 'fm-010', semesterId: 'sem-fall-2025', day: 'Tuesday', startTime: '10:00', endTime: '11:30', room: 'C-301', ...ts() },
    // BBA — Spring 2025
    { id: 'cs-spring25-4', courseId: 'bba-102', facultyId: 'fm-007', semesterId: 'sem-spring-2025', day: 'Sunday', startTime: '14:00', endTime: '15:30', room: 'C-201', ...ts() },
    { id: 'cs-spring25-5', courseId: 'bba-201', facultyId: 'fm-006', semesterId: 'sem-spring-2025', day: 'Wednesday', startTime: '11:00', endTime: '12:30', room: 'C-202', ...ts() },
    { id: 'cs-spring25-6', courseId: 'eco-101', facultyId: 'fm-010', semesterId: 'sem-spring-2025', day: 'Thursday', startTime: '09:00', endTime: '10:30', room: 'C-301', ...ts() }
];

// ── Attendance (3–4 courses × several dates, varied + some low) ─────────────

function att(id: string, studentId: string, courseId: string, semesterId: string, date: string, status: AttendanceRecord['status']): AttendanceRecord {
    return { id, studentId, courseId, semesterId, date, status, markedBy: 'fm-002', ...ts(date + 'T10:00:00.000Z') };
}

const attendanceDatesCSE201 = ['2025-09-07', '2025-09-09', '2025-09-14', '2025-09-16', '2025-09-21', '2025-09-23', '2025-09-28', '2025-09-30', '2025-10-05', '2025-10-07'];
const attendanceDatesCSE205 = ['2025-09-07', '2025-09-10', '2025-09-14', '2025-09-17', '2025-09-21', '2025-09-24', '2025-09-28', '2025-10-01'];
const attendanceDatesBBA101 = ['2025-09-07', '2025-09-10', '2025-09-14', '2025-09-17', '2025-09-21', '2025-09-24', '2025-09-28', '2025-10-01'];
const attendanceDatesMAT101 = ['2025-09-09', '2025-09-16', '2025-09-23', '2025-09-30', '2025-10-07', '2025-10-14'];

const cse201Students = ['stu-001', 'stu-002', 'stu-009', 'stu-010', 'stu-013', 'stu-019', 'stu-021', 'stu-022', 'stu-026', 'stu-027', 'stu-030', 'stu-033'];
const cse205Students = ['stu-001', 'stu-002', 'stu-009', 'stu-013', 'stu-019', 'stu-021', 'stu-026', 'stu-030'];
const bba101Students = ['stu-004', 'stu-012', 'stu-020', 'stu-024', 'stu-032', 'stu-040', 'stu-046'];
const mat101Students = ['stu-007', 'stu-017', 'stu-026', 'stu-028', 'stu-035', 'stu-042', 'stu-050'];

function buildAttendance(): AttendanceRecord[] {
    const out: AttendanceRecord[] = [];
    let c = 1;

    const hash01 = (s: string): number => {
        let h = 0;
        for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100;
        return h;
    };

    // CSE-201: mostly present, stu-013 low attendance (~60%)
    for (const date of attendanceDatesCSE201) {
        for (const sid of cse201Students) {
            let status: AttendanceRecord['status'] = 'PRESENT';
            if (sid === 'stu-013' && ['2025-09-14', '2025-09-21', '2025-09-30', '2025-10-07'].includes(date)) status = 'ABSENT';
            else if (sid === 'stu-022' && date === '2025-09-16') status = 'LATE';
            else if (sid === 'stu-027' && date === '2025-09-23') status = 'ABSENT';
            else if (hash01(sid + date) < 6) status = 'ABSENT';
            if (sid === 'stu-009' && date === '2025-09-28') status = 'ABSENT';
            if (sid === 'stu-030' && date === '2025-09-09') status = 'LATE';
            out.push(att(`att-${String(c++).padStart(4, '0')}`, sid, 'cse-201', 'sem-fall-2025', date, status));
        }
    }
    // CSE-205: varied
    for (const date of attendanceDatesCSE205) {
        for (const sid of cse205Students) {
            let status: AttendanceRecord['status'] = 'PRESENT';
            if (sid === 'stu-026' && ['2025-09-14', '2025-09-24', '2025-10-01'].includes(date)) status = 'ABSENT';
            if (sid === 'stu-019' && date === '2025-09-17') status = 'LATE';
            out.push(att(`att-${String(c++).padStart(4, '0')}`, sid, 'cse-205', 'sem-fall-2025', date, status));
        }
    }
    // BBA-101: high attendance
    for (const date of attendanceDatesBBA101) {
        for (const sid of bba101Students) {
            let status: AttendanceRecord['status'] = 'PRESENT';
            if (sid === 'stu-040' && date === '2025-09-17') status = 'ABSENT';
            out.push(att(`att-${String(c++).padStart(4, '0')}`, sid, 'bba-101', 'sem-fall-2025', date, status));
        }
    }
    // MAT-101: one low student stu-035 (~50%)
    for (const date of attendanceDatesMAT101) {
        for (const sid of mat101Students) {
            let status: AttendanceRecord['status'] = 'PRESENT';
            if (sid === 'stu-035' && ['2025-09-16', '2025-09-30', '2025-10-14'].includes(date)) status = 'ABSENT';
            if (sid === 'stu-050' && date === '2025-10-07') status = 'LATE';
            out.push(att(`att-${String(c++).padStart(4, '0')}`, sid, 'mat-101', 'sem-fall-2025', date, status));
        }
    }
    return out;
}

export const attendanceRecords: AttendanceRecord[] = buildAttendance();

// ── Examinations (completed semesters) ───────────────────────────────────────

export const examinations: Examination[] = [
    // Spring 2024 — CLOSED
    { id: 'exam-s24-01', courseId: 'cse-101', semesterId: 'sem-spring-2024', title: 'CSE-101 Final', type: 'FINAL', date: '2024-06-05', startTime: '10:00', endTime: '13:00', room: 'A-201', maxMarks: 100, ...ts('2024-06-05T00:00:00.000Z') },
    { id: 'exam-s24-02', courseId: 'mat-101', semesterId: 'sem-spring-2024', title: 'MAT-101 Final', type: 'FINAL', date: '2024-06-08', startTime: '10:00', endTime: '13:00', room: 'B-101', maxMarks: 100, ...ts('2024-06-08T00:00:00.000Z') },
    { id: 'exam-s24-03', courseId: 'bba-101', semesterId: 'sem-spring-2024', title: 'BBA-101 Final', type: 'FINAL', date: '2024-06-10', startTime: '14:00', endTime: '17:00', room: 'C-201', maxMarks: 100, ...ts('2024-06-10T00:00:00.000Z') },
    { id: 'exam-s24-04', courseId: 'eco-101', semesterId: 'sem-spring-2024', title: 'ECO-101 Final', type: 'FINAL', date: '2024-06-12', startTime: '10:00', endTime: '13:00', room: 'C-301', maxMarks: 100, ...ts('2024-06-12T00:00:00.000Z') },
    // Fall 2024 — CLOSED
    { id: 'exam-f24-01', courseId: 'cse-201', semesterId: 'sem-fall-2024', title: 'CSE-201 Final', type: 'FINAL', date: '2024-12-23', startTime: '10:00', endTime: '13:00', room: 'A-201', maxMarks: 100, ...ts('2024-12-23T00:00:00.000Z') },
    { id: 'exam-f24-02', courseId: 'cse-205', semesterId: 'sem-fall-2024', title: 'CSE-205 Final', type: 'FINAL', date: '2024-12-26', startTime: '10:00', endTime: '13:00', room: 'A-204', maxMarks: 100, ...ts('2024-12-26T00:00:00.000Z') },
    { id: 'exam-f24-03', courseId: 'eee-101', semesterId: 'sem-fall-2024', title: 'EEE-101 Final', type: 'FINAL', date: '2024-12-28', startTime: '14:00', endTime: '17:00', room: 'A-301', maxMarks: 100, ...ts('2024-12-28T00:00:00.000Z') },
    { id: 'exam-f24-04', courseId: 'bba-102', semesterId: 'sem-fall-2024', title: 'BBA-102 Final', type: 'FINAL', date: '2025-01-02', startTime: '10:00', endTime: '13:00', room: 'C-201', maxMarks: 100, ...ts('2025-01-02T00:00:00.000Z') },
    { id: 'exam-f24-05', courseId: 'eng-101', semesterId: 'sem-fall-2024', title: 'ENG-101 Final', type: 'FINAL', date: '2025-01-05', startTime: '10:00', endTime: '13:00', room: 'D-101', maxMarks: 100, ...ts('2025-01-05T00:00:00.000Z') },
    // Spring 2025 — CLOSED
    { id: 'exam-s25-01', courseId: 'cse-201', semesterId: 'sem-spring-2025', title: 'CSE-201 Midterm', type: 'MIDTERM', date: '2025-03-10', startTime: '10:00', endTime: '12:00', room: 'A-201', maxMarks: 50, ...ts('2025-03-10T00:00:00.000Z') },
    { id: 'exam-s25-02', courseId: 'cse-203', semesterId: 'sem-spring-2025', title: 'CSE-203 Final', type: 'FINAL', date: '2025-06-03', startTime: '10:00', endTime: '13:00', room: 'A-102', maxMarks: 100, ...ts('2025-06-03T00:00:00.000Z') },
    { id: 'exam-s25-03', courseId: 'mat-201', semesterId: 'sem-spring-2025', title: 'MAT-201 Final', type: 'FINAL', date: '2025-06-06', startTime: '10:00', endTime: '13:00', room: 'B-101', maxMarks: 100, ...ts('2025-06-06T00:00:00.000Z') },
    { id: 'exam-s25-04', courseId: 'bba-201', semesterId: 'sem-spring-2025', title: 'BBA-201 Final', type: 'FINAL', date: '2025-06-10', startTime: '14:00', endTime: '17:00', room: 'C-202', maxMarks: 100, ...ts('2025-06-10T00:00:00.000Z') },
    // Fall 2025 — ACTIVE (upcoming)
    { id: 'exam-f25-01', courseId: 'cse-201', semesterId: 'sem-fall-2025', title: 'CSE-201 Midterm', type: 'MIDTERM', date: '2025-12-24', startTime: '10:00', endTime: '12:00', room: 'A-201', maxMarks: 50, ...ts() },
    { id: 'exam-f25-02', courseId: 'cse-205', semesterId: 'sem-fall-2025', title: 'CSE-205 Final', type: 'FINAL', date: '2025-12-26', startTime: '10:00', endTime: '13:00', room: 'A-204', maxMarks: 100, ...ts() },
    { id: 'exam-f25-03', courseId: 'bba-101', semesterId: 'sem-fall-2025', title: 'BBA-101 Final', type: 'FINAL', date: '2025-12-27', startTime: '14:00', endTime: '17:00', room: 'C-201', maxMarks: 100, ...ts() },
    { id: 'exam-f25-04', courseId: 'mat-101', semesterId: 'sem-fall-2025', title: 'MAT-101 Final', type: 'FINAL', date: '2025-12-28', startTime: '10:00', endTime: '13:00', room: 'B-101', maxMarks: 100, ...ts() }
];

// ── Results (marks → grade derived, consistent) ─────────────────────────────

function result(id: string, studentId: string, courseId: string, semesterId: string, marks: number, maxMarks = 100): StudentResult {
    const { grade, gradePoint, status } = gradeFromMarks(marks, maxMarks);
    return { id, studentId, courseId, semesterId, marks, maxMarks, grade, gradePoint, status, ...ts() };
}

export const studentResults: StudentResult[] = [
    // Spring 2024
    result('res-001', 'stu-001', 'cse-101', 'sem-spring-2024', 82),
    result('res-002', 'stu-002', 'cse-101', 'sem-spring-2024', 78),
    result('res-003', 'stu-009', 'cse-101', 'sem-spring-2024', 65),
    result('res-004', 'stu-010', 'cse-101', 'sem-spring-2024', 58),
    result('res-005', 'stu-001', 'mat-101', 'sem-spring-2024', 74),
    result('res-006', 'stu-002', 'mat-101', 'sem-spring-2024', 88),
    result('res-007', 'stu-007', 'mat-101', 'sem-spring-2024', 91),
    result('res-008', 'stu-004', 'bba-101', 'sem-spring-2024', 69),
    result('res-009', 'stu-012', 'bba-101', 'sem-spring-2024', 55),
    result('res-010', 'stu-008', 'eco-101', 'sem-spring-2024', 62),
    result('res-011', 'stu-018', 'eco-101', 'sem-spring-2024', 43),
    // Fall 2024
    result('res-012', 'stu-001', 'cse-201', 'sem-fall-2024', 77),
    result('res-013', 'stu-002', 'cse-201', 'sem-fall-2024', 84),
    result('res-014', 'stu-009', 'cse-201', 'sem-fall-2024', 49),
    result('res-015', 'stu-010', 'cse-201', 'sem-fall-2024', 35),
    result('res-016', 'stu-001', 'cse-205', 'sem-fall-2024', 68),
    result('res-017', 'stu-002', 'cse-205', 'sem-fall-2024', 90),
    result('res-018', 'stu-003', 'eee-101', 'sem-fall-2024', 72),
    result('res-019', 'stu-011', 'eee-101', 'sem-fall-2024', 28),
    result('res-020', 'stu-004', 'bba-102', 'sem-fall-2024', 81),
    result('res-021', 'stu-006', 'eng-101', 'sem-fall-2024', 76),
    result('res-022', 'stu-016', 'eng-101', 'sem-fall-2024', 62),
    // Spring 2025
    result('res-023', 'stu-001', 'cse-203', 'sem-spring-2025', 71),
    result('res-024', 'stu-002', 'cse-203', 'sem-spring-2025', 86),
    result('res-025', 'stu-009', 'cse-203', 'sem-spring-2025', 54),
    result('res-026', 'stu-013', 'cse-203', 'sem-spring-2025', 61),
    result('res-027', 'stu-007', 'mat-201', 'sem-spring-2025', 79),
    result('res-028', 'stu-017', 'mat-201', 'sem-spring-2025', 52),
    result('res-029', 'stu-004', 'bba-201', 'sem-spring-2025', 67),
    result('res-030', 'stu-012', 'bba-201', 'sem-spring-2025', 48),
    result('res-031', 'stu-001', 'cse-201', 'sem-spring-2025', 38, 50),
    result('res-032', 'stu-002', 'cse-201', 'sem-spring-2025', 44, 50),
    result('res-033', 'stu-009', 'cse-201', 'sem-spring-2025', 22, 50)
];

// ── Fee Accounts + Payments (paid/partial/unpaid mixes) ──────────────────────

function feeAccount(id: string, studentId: string, semesterId: string, billed: number, paid: number): FeeAccount {
    const balance = billed - paid;
    let status: FeeAccount['status'] = 'UNPAID';
    if (paid >= billed) status = 'PAID';
    else if (paid > 0) status = 'PARTIAL';
    const tuition = Math.round(billed * 0.7);
    const semesterFee = Math.round(billed * 0.2);
    const lab = billed - tuition - semesterFee;
    return {
        id,
        studentId,
        semesterId,
        charges: [
            { id: id + '-c1', title: 'Tuition Fee', amount: tuition, type: 'TUITION', dueDate: '2025-09-15' },
            { id: id + '-c2', title: 'Semester Fee', amount: semesterFee, type: 'SEMESTER', dueDate: '2025-09-15' },
            { id: id + '-c3', title: 'Lab & Library', amount: lab, type: 'LAB', dueDate: '2025-09-15' }
        ],
        totalBilled: billed,
        totalPaid: paid,
        balance,
        status,
        ...ts()
    };
}

export const feeAccounts: FeeAccount[] = [
    feeAccount('fee-001', 'stu-001', 'sem-fall-2025', 45000, 45000),
    feeAccount('fee-002', 'stu-002', 'sem-fall-2025', 45000, 25000),
    feeAccount('fee-003', 'stu-003', 'sem-fall-2025', 42000, 0),
    feeAccount('fee-004', 'stu-004', 'sem-fall-2025', 38000, 38000),
    feeAccount('fee-005', 'stu-006', 'sem-fall-2025', 28000, 15000),
    feeAccount('fee-006', 'stu-007', 'sem-fall-2025', 30000, 30000),
    feeAccount('fee-007', 'stu-008', 'sem-fall-2025', 32000, 10000),
    feeAccount('fee-008', 'stu-009', 'sem-fall-2025', 45000, 45000),
    feeAccount('fee-009', 'stu-010', 'sem-fall-2025', 45000, 0),
    feeAccount('fee-010', 'stu-013', 'sem-fall-2025', 45000, 20000),
    feeAccount('fee-011', 'stu-019', 'sem-fall-2025', 45000, 45000),
    feeAccount('fee-012', 'stu-026', 'sem-fall-2025', 45000, 30000),
    feeAccount('fee-013', 'stu-027', 'sem-fall-2025', 45000, 0),
    feeAccount('fee-014', 'stu-030', 'sem-fall-2025', 45000, 45000),
    feeAccount('fee-015', 'stu-040', 'sem-fall-2025', 38000, 38000),
    feeAccount('fee-016', 'stu-042', 'sem-fall-2025', 30000, 10000),
    feeAccount('fee-017', 'stu-001', 'sem-spring-2025', 45000, 45000),
    feeAccount('fee-018', 'stu-002', 'sem-spring-2025', 45000, 45000),
    feeAccount('fee-019', 'stu-004', 'sem-spring-2025', 38000, 20000),
    feeAccount('fee-020', 'stu-007', 'sem-spring-2025', 30000, 30000)
];

export const payments: Payment[] = [
    { id: 'pay-001', feeAccountId: 'fee-001', studentId: 'stu-001', amount: 25000, date: '2025-08-20', method: 'ONLINE', receiptNo: 'RCPT-2025-0001', note: 'Tuition advance', ...ts('2025-08-20T00:00:00.000Z') },
    { id: 'pay-002', feeAccountId: 'fee-001', studentId: 'stu-001', amount: 20000, date: '2025-09-10', method: 'BANK', receiptNo: 'RCPT-2025-0002', note: 'Balance', ...ts('2025-09-10T00:00:00.000Z') },
    { id: 'pay-003', feeAccountId: 'fee-002', studentId: 'stu-002', amount: 25000, date: '2025-09-05', method: 'CARD', receiptNo: 'RCPT-2025-0003', note: 'Partial', ...ts('2025-09-05T00:00:00.000Z') },
    { id: 'pay-004', feeAccountId: 'fee-004', studentId: 'stu-004', amount: 38000, date: '2025-08-22', method: 'CASH', receiptNo: 'RCPT-2025-0004', note: 'Full', ...ts('2025-08-22T00:00:00.000Z') },
    { id: 'pay-005', feeAccountId: 'fee-005', studentId: 'stu-006', amount: 15000, date: '2025-09-12', method: 'ONLINE', receiptNo: 'RCPT-2025-0005', note: 'Partial', ...ts('2025-09-12T00:00:00.000Z') },
    { id: 'pay-006', feeAccountId: 'fee-006', studentId: 'stu-007', amount: 30000, date: '2025-08-25', method: 'BANK', receiptNo: 'RCPT-2025-0006', note: 'Full', ...ts('2025-08-25T00:00:00.000Z') },
    { id: 'pay-007', feeAccountId: 'fee-007', studentId: 'stu-008', amount: 10000, date: '2025-09-01', method: 'CASH', receiptNo: 'RCPT-2025-0007', note: 'Advance', ...ts('2025-09-01T00:00:00.000Z') },
    { id: 'pay-008', feeAccountId: 'fee-008', studentId: 'stu-009', amount: 45000, date: '2025-08-28', method: 'ONLINE', receiptNo: 'RCPT-2025-0008', note: 'Full', ...ts('2025-08-28T00:00:00.000Z') },
    { id: 'pay-009', feeAccountId: 'fee-010', studentId: 'stu-013', amount: 20000, date: '2025-09-08', method: 'CARD', receiptNo: 'RCPT-2025-0009', note: 'Partial', ...ts('2025-09-08T00:00:00.000Z') },
    { id: 'pay-010', feeAccountId: 'fee-011', studentId: 'stu-019', amount: 45000, date: '2025-08-20', method: 'BANK', receiptNo: 'RCPT-2025-0010', note: 'Full', ...ts('2025-08-20T00:00:00.000Z') },
    { id: 'pay-011', feeAccountId: 'fee-012', studentId: 'stu-026', amount: 15000, date: '2025-08-30', method: 'ONLINE', receiptNo: 'RCPT-2025-0011', note: 'Advance', ...ts('2025-08-30T00:00:00.000Z') },
    { id: 'pay-012', feeAccountId: 'fee-012', studentId: 'stu-026', amount: 15000, date: '2025-09-15', method: 'CASH', receiptNo: 'RCPT-2025-0012', note: 'Second installment', ...ts('2025-09-15T00:00:00.000Z') },
    { id: 'pay-013', feeAccountId: 'fee-014', studentId: 'stu-030', amount: 45000, date: '2025-08-18', method: 'ONLINE', receiptNo: 'RCPT-2025-0013', note: 'Full', ...ts('2025-08-18T00:00:00.000Z') },
    { id: 'pay-014', feeAccountId: 'fee-015', studentId: 'stu-040', amount: 38000, date: '2025-08-19', method: 'CARD', receiptNo: 'RCPT-2025-0014', note: 'Full', ...ts('2025-08-19T00:00:00.000Z') },
    { id: 'pay-015', feeAccountId: 'fee-016', studentId: 'stu-042', amount: 10000, date: '2025-09-02', method: 'BANK', receiptNo: 'RCPT-2025-0015', note: 'Advance', ...ts('2025-09-02T00:00:00.000Z') },
    { id: 'pay-016', feeAccountId: 'fee-017', studentId: 'stu-001', amount: 45000, date: '2025-02-10', method: 'ONLINE', receiptNo: 'RCPT-2025-0016', note: 'Spring 2025 full', ...ts('2025-02-10T00:00:00.000Z') },
    { id: 'pay-017', feeAccountId: 'fee-018', studentId: 'stu-002', amount: 45000, date: '2025-02-11', method: 'BANK', receiptNo: 'RCPT-2025-0017', note: 'Spring 2025 full', ...ts('2025-02-11T00:00:00.000Z') }
];

// ── Notices (published + draft) + Events ─────────────────────────────────────

export const notices: Notice[] = [
    { id: 'notice-001', title: 'Fall 2025 Registration Deadline Extended', body: 'Registration deadline for Fall 2025 has been extended to August 28, 2025. Late registration will incur a fee of BDT 1000.', category: 'ACADEMIC', priority: 'HIGH', audience: ['STUDENT', 'FACULTY'], publishDate: '2025-08-20', expiryDate: '2025-08-28', status: 'PUBLISHED', isEvent: false, eventDate: null, ...ts('2025-08-20T00:00:00.000Z') },
    { id: 'notice-002', title: 'Midterm Examinations Schedule — Fall 2025', body: 'Midterm exams for Fall 2025 will be held from December 22 to January 10. Detailed room allocations will be published one week prior.', category: 'EXAM', priority: 'URGENT', audience: ['STUDENT', 'FACULTY'], publishDate: '2025-11-01', expiryDate: '2026-01-10', status: 'PUBLISHED', isEvent: true, eventDate: '2025-12-22', ...ts('2025-11-01T00:00:00.000Z') },
    { id: 'notice-003', title: 'Annual Sports Week 2025', body: 'Annual sports week will be held from November 15–20. Inter-department competitions include cricket, football and badminton.', category: 'EVENT', priority: 'MEDIUM', audience: ['STUDENT', 'FACULTY', 'STAFF'], publishDate: '2025-11-05', expiryDate: '2025-11-21', status: 'PUBLISHED', isEvent: true, eventDate: '2025-11-15', ...ts('2025-11-05T00:00:00.000Z') },
    { id: 'notice-004', title: 'National Mourning Day — Campus Closed', body: 'University will remain closed on August 15 for National Mourning Day. All classes and offices suspended.', category: 'HOLIDAY', priority: 'HIGH', audience: ['ALL'], publishDate: '2025-08-10', expiryDate: '2025-08-16', status: 'PUBLISHED', isEvent: true, eventDate: '2025-08-15', ...ts('2025-08-10T00:00:00.000Z') },
    { id: 'notice-005', title: 'Library Membership Renewal', body: 'All students must renew library membership by September 30. Bring student ID and one passport photo.', category: 'GENERAL', priority: 'MEDIUM', audience: ['STUDENT'], publishDate: '2025-09-01', expiryDate: '2025-09-30', status: 'PUBLISHED', isEvent: false, eventDate: null, ...ts('2025-09-01T00:00:00.000Z') },
    { id: 'notice-006', title: 'CSE Department Seminar: AI in Healthcare', body: 'Guest lecture by Prof. Mahfuz Alam on applications of machine learning in healthcare. Venue: Auditorium, Dec 5, 10:00 AM.', category: 'ACADEMIC', priority: 'MEDIUM', audience: ['STUDENT', 'FACULTY'], publishDate: '2025-11-20', expiryDate: '2025-12-05', status: 'PUBLISHED', isEvent: true, eventDate: '2025-12-05', ...ts('2025-11-20T00:00:00.000Z') },
    { id: 'notice-007', title: 'Fee Payment Reminder — Fall 2025', body: 'Outstanding fees for Fall 2025 must be cleared by October 31 to avoid late penalties.', category: 'GENERAL', priority: 'HIGH', audience: ['STUDENT'], publishDate: null, expiryDate: null, status: 'DRAFT', isEvent: false, eventDate: null, ...ts() },
    { id: 'notice-008', title: 'New Grading Policy Draft (Internal)', body: 'Proposal to revise grade thresholds for 2026. Under review by academic council — not yet published.', category: 'ACADEMIC', priority: 'LOW', audience: ['FACULTY'], publishDate: null, expiryDate: null, status: 'DRAFT', isEvent: false, eventDate: null, ...ts() },
    { id: 'notice-009', title: 'Winter Vacation Schedule', body: 'University will be closed for winter vacation from December 20 to January 02. Dormitories remain open.', category: 'HOLIDAY', priority: 'MEDIUM', audience: ['ALL'], publishDate: '2025-12-01', expiryDate: '2026-01-03', status: 'PUBLISHED', isEvent: true, eventDate: '2025-12-20', ...ts('2025-12-01T00:00:00.000Z') },
    { id: 'notice-010', title: 'Scholarship Application Open — Spring 2026', body: 'Merit-based scholarship applications for Spring 2026 are open until January 31. Apply via student portal.', category: 'ACADEMIC', priority: 'HIGH', audience: ['STUDENT'], publishDate: '2025-12-10', expiryDate: '2026-01-31', status: 'PUBLISHED', isEvent: false, eventDate: null, ...ts('2025-12-10T00:00:00.000Z') }
];

// ── System Users (6 roles) ───────────────────────────────────────────────────

export const systemUsers: SystemUser[] = [
    { id: 'user-001', name: 'Super Admin', email: 'admin@unimanage.edu', role: 'SUPER_ADMIN', status: 'ACTIVE', facultyMemberId: null, lastLogin: '2025-11-09T08:30:00.000Z', ...ts() },
    { id: 'user-002', name: 'Abdul Aziz', email: 'abdul.aziz@unimanage.edu', role: 'REGISTRAR', status: 'ACTIVE', facultyMemberId: 'fm-011', lastLogin: '2025-11-09T09:00:00.000Z', ...ts() },
    { id: 'user-003', name: 'Ahmed Karim', email: 'ahmed.karim@unimanage.edu', role: 'FACULTY', status: 'ACTIVE', facultyMemberId: 'fm-001', lastLogin: '2025-11-08T14:20:00.000Z', ...ts() },
    { id: 'user-004', name: 'Arif Hossain', email: 'arif.hossain@student.unimanage.edu', role: 'STUDENT', status: 'ACTIVE', facultyMemberId: null, lastLogin: '2025-11-09T10:00:00.000Z', ...ts() },
    { id: 'user-005', name: 'Salma Khatun', email: 'salma.khatun@unimanage.edu', role: 'ACCOUNTS', status: 'ACTIVE', facultyMemberId: 'fm-012', lastLogin: '2025-11-08T16:00:00.000Z', ...ts() },
    { id: 'user-006', name: 'Library Admin', email: 'library@unimanage.edu', role: 'LIBRARIAN', status: 'ACTIVE', facultyMemberId: null, lastLogin: '2025-11-07T11:00:00.000Z', ...ts() },
    { id: 'user-007', name: 'Farhana Islam', email: 'farhana.islam@unimanage.edu', role: 'FACULTY', status: 'ACTIVE', facultyMemberId: 'fm-002', lastLogin: '2025-11-09T07:45:00.000Z', ...ts() },
    { id: 'user-008', name: 'Nadia Rahman', email: 'nadia.rahman@student.unimanage.edu', role: 'STUDENT', status: 'INACTIVE', facultyMemberId: null, lastLogin: '2025-10-20T08:00:00.000Z', ...ts() }
];

// ── Settings ─────────────────────────────────────────────────────────────────

export const systemSettings: SystemSettings = {
    universityName: 'UniManage University',
    universityShortName: 'UMU',
    logoUrl: '',
    address: '123 University Avenue, Dhanmondi, Dhaka 1209, Bangladesh',
    contactEmail: 'info@unimanage.edu',
    contactPhone: '+8809612000000',
    currentAcademicYear: '2025-26',
    currentSemesterId: 'sem-fall-2025',
    attendanceThreshold: 75,
    visibleWeekendDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
    currency: 'BDT',
    dateFormat: 'YYYY-MM-DD',
    gradingScale,
    weekendDays: ['Friday', 'Saturday'],
    ...ts()
};

// ── Activity Log (seeded) ────────────────────────────────────────────────────

export const activityLog: ActivityLogEntry[] = [
    { id: 'act-001', userId: 'user-002', action: 'CREATE', entity: 'Student', entityId: 'stu-038', detail: 'Registered Zara Khan (UM-2025-0038) into BSc CSE', ...ts('2025-08-10T10:00:00.000Z', '2025-08-10T10:00:00.000Z') },
    { id: 'act-002', userId: 'user-003', action: 'UPDATE', entity: 'Attendance', entityId: 'att-0001', detail: 'Marked attendance for CSE-201 on 2025-09-07', ...ts('2025-09-07T11:00:00.000Z', '2025-09-07T11:00:00.000Z') },
    { id: 'act-003', userId: 'user-005', action: 'CREATE', entity: 'Payment', entityId: 'pay-001', detail: 'Recorded payment RCPT-2025-0001 for Arif Hossain', ...ts('2025-08-20T09:00:00.000Z', '2025-08-20T09:00:00.000Z') },
    { id: 'act-004', userId: 'user-002', action: 'UPDATE', entity: 'Admission', entityId: 'app-003', detail: 'Approved application app-003 (Tanvir Mahmud)', ...ts('2025-05-18T00:00:00.000Z', '2025-05-18T00:00:00.000Z') },
    { id: 'act-005', userId: 'user-001', action: 'CREATE', entity: 'Notice', entityId: 'notice-001', detail: 'Published notice: Fall 2025 Registration Deadline Extended', ...ts('2025-08-20T00:00:00.000Z', '2025-08-20T00:00:00.000Z') }
];

export const seedData = {
    schemaVersion: SEED_SCHEMA_VERSION,
    faculties,
    departments,
    programs,
    courses,
    semesters,
    facultyMembers,
    students,
    admissionApplications,
    classSessions,
    attendanceRecords,
    examinations,
    studentResults,
    feeAccounts,
    payments,
    notices,
    systemUsers,
    systemSettings,
    activityLog
};

export type SeedData = typeof seedData;
