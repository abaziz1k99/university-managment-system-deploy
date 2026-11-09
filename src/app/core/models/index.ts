import { Timestamps } from './enums';
export * from './enums';

export interface Faculty extends Timestamps {
    id: string;
    name: string;
    code: string;
    description: string;
    status: 'ACTIVE' | 'INACTIVE';
}

export interface Department extends Timestamps {
    id: string;
    name: string;
    code: string;
    facultyId: string;
    headId: string | null;
    description: string;
    status: 'ACTIVE' | 'INACTIVE';
}

export interface Program extends Timestamps {
    id: string;
    name: string;
    code: string;
    degreeType: 'BSc' | 'BA' | 'BBA' | 'MSc' | 'MBA';
    departmentId: string;
    durationYears: number;
    totalSemesters: number;
    creditsPerSemester: number;
    status: 'ACTIVE' | 'INACTIVE';
}

export interface Course extends Timestamps {
    id: string;
    code: string;
    title: string;
    departmentId: string;
    programIds: string[];
    credits: number;
    type: 'CORE' | 'ELECTIVE' | 'LAB';
    semester: number;
    facultyId: string | null;
    prerequisite: string | null;
    status: 'ACTIVE' | 'INACTIVE';
}

export interface Semester extends Timestamps {
    id: string;
    name: string;
    academicYear: string;
    startDate: string;
    endDate: string;
    registrationDeadline: string;
    examStartDate: string;
    examEndDate: string;
    status: 'UPCOMING' | 'ACTIVE' | 'CLOSED';
}

export interface ClassSession extends Timestamps {
    id: string;
    courseId: string;
    facultyId: string;
    semesterId: string;
    day: string;
    startTime: string;
    endTime: string;
    room: string;
}

export interface Student extends Timestamps {
    id: string;
    admissionNo: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dob: string;
    gender: 'MALE' | 'FEMALE' | 'OTHER';
    departmentId: string;
    programId: string;
    currentSemesterId: string;
    session: string;
    status: 'ACTIVE' | 'INACTIVE' | 'GRADUATED' | 'SUSPENDED' | 'WITHDRAWN';
    admissionDate: string;
    guardianName: string;
    guardianPhone: string;
    guardianRelation: string;
    address: string;
}

export interface AdmissionApplication extends Timestamps {
    id: string;
    applicantName: string;
    email: string;
    phone: string;
    dob: string;
    gender: 'MALE' | 'FEMALE' | 'OTHER';
    programId: string;
    departmentId: string;
    qualifications: string;
    applicationFeePaid: boolean;
    status: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'ENROLLED';
    studentId: string | null;
    reviewNotes: string;
    submittedAt: string;
    reviewedAt: string | null;
}

export interface FacultyMember extends Timestamps {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    designation: string;
    departmentId: string;
    courseIds: string[];
    joiningDate: string;
    employmentStatus: 'ACTIVE' | 'ON_LEAVE' | 'RESIGNED' | 'RETIRED';
    qualification: string;
    address: string;
}

export interface AttendanceRecord extends Timestamps {
    id: string;
    studentId: string;
    courseId: string;
    semesterId: string;
    date: string;
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
    markedBy: string | null;
}

export interface Examination extends Timestamps {
    id: string;
    courseId: string;
    semesterId: string;
    title: string;
    type: 'MIDTERM' | 'FINAL' | 'QUIZ' | 'PRACTICAL';
    date: string;
    startTime: string;
    endTime: string;
    room: string;
    maxMarks: number;
}

export interface StudentResult extends Timestamps {
    id: string;
    studentId: string;
    courseId: string;
    semesterId: string;
    marks: number;
    maxMarks: number;
    grade: 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D' | 'F';
    gradePoint: number;
    status: 'PASSED' | 'FAILED';
}

export interface FeeCharge {
    id: string;
    title: string;
    amount: number;
    type: 'TUITION' | 'SEMESTER' | 'LAB' | 'OTHER';
    dueDate: string;
}

export interface FeeAccount extends Timestamps {
    id: string;
    studentId: string;
    semesterId: string;
    charges: FeeCharge[];
    totalBilled: number;
    totalPaid: number;
    balance: number;
    status: 'PAID' | 'PARTIAL' | 'UNPAID' | 'OVERDUE';
}

export interface Payment extends Timestamps {
    id: string;
    feeAccountId: string;
    studentId: string;
    amount: number;
    date: string;
    method: 'CASH' | 'CARD' | 'BANK' | 'ONLINE';
    receiptNo: string;
    note: string;
}

export interface Notice extends Timestamps {
    id: string;
    title: string;
    body: string;
    category: 'ACADEMIC' | 'EXAM' | 'HOLIDAY' | 'EVENT' | 'GENERAL';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    audience: string[];
    publishDate: string | null;
    expiryDate: string | null;
    status: 'DRAFT' | 'PUBLISHED' | 'EXPIRED';
    isEvent: boolean;
    eventDate: string | null;
}

export interface SystemUser extends Timestamps {
    id: string;
    name: string;
    email: string;
    role: 'SUPER_ADMIN' | 'REGISTRAR' | 'FACULTY' | 'STUDENT' | 'ACCOUNTS' | 'LIBRARIAN';
    status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
    facultyMemberId: string | null;
    lastLogin: string | null;
}

export interface SystemSettings extends Timestamps {
    universityName: string;
    universityShortName: string;
    logoUrl: string;
    address: string;
    contactEmail: string;
    contactPhone: string;
    currentAcademicYear: string;
    currentSemesterId: string | null;
    attendanceThreshold: number;
    visibleWeekendDays: string[];
    currency: string;
    dateFormat: string;
    gradingScale: GradeScaleEntry[];
    weekendDays: string[];
}

export interface GradeScaleEntry {
    grade: 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D' | 'F';
    minPercent: number;
    gradePoint: number;
}

export interface ActivityLogEntry extends Timestamps {
    id: string;
    userId: string;
    action: string;
    entity: string;
    entityId: string;
    detail: string;
}