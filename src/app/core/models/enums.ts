export enum StudentStatus {
    Active = 'ACTIVE',
    Inactive = 'INACTIVE',
    Graduated = 'GRADUATED',
    Suspended = 'SUSPENDED',
    Withdrawn = 'WITHDRAWN'
}

export enum AdmissionStatus {
    Submitted = 'SUBMITTED',
    UnderReview = 'UNDER_REVIEW',
    Approved = 'APPROVED',
    Rejected = 'REJECTED',
    Enrolled = 'ENROLLED'
}

export enum EmploymentStatus {
    Active = 'ACTIVE',
    OnLeave = 'ON_LEAVE',
    Resigned = 'RESIGNED',
    Retired = 'RETIRED'
}

export enum SemesterStatus {
    Upcoming = 'UPCOMING',
    Active = 'ACTIVE',
    Closed = 'CLOSED'
}

export enum AttendanceStatus {
    Present = 'PRESENT',
    Absent = 'ABSENT',
    Late = 'LATE',
    Excused = 'EXCUSED'
}

export enum GradeLetter {
    APlus = 'A+',
    A = 'A',
    AMinus = 'A-',
    BPlus = 'B+',
    B = 'B',
    BMinus = 'B-',
    CPlus = 'C+',
    C = 'C',
    CMinus = 'C-',
    D = 'D',
    F = 'F'
}

export enum FeeStatus {
    Paid = 'PAID',
    Partial = 'PARTIAL',
    Unpaid = 'UNPAID',
    Overdue = 'OVERDUE'
}

export enum NoticeStatus {
    Draft = 'DRAFT',
    Published = 'PUBLISHED',
    Expired = 'EXPIRED'
}

export enum NoticePriority {
    Low = 'LOW',
    Medium = 'MEDIUM',
    High = 'HIGH',
    Urgent = 'URGENT'
}

export enum UserRole {
    SuperAdmin = 'SUPER_ADMIN',
    Registrar = 'REGISTRAR',
    Faculty = 'FACULTY',
    Student = 'STUDENT',
    Accounts = 'ACCOUNTS',
    Librarian = 'LIBRARIAN'
}

export enum NoticeCategory {
    Academic = 'ACADEMIC',
    Exam = 'EXAM',
    Holiday = 'HOLIDAY',
    Event = 'EVENT',
    General = 'GENERAL'
}

export enum PaymentMethod {
    Cash = 'CASH',
    Card = 'CARD',
    Bank = 'BANK',
    Online = 'ONLINE'
}

export enum CourseType {
    Core = 'CORE',
    Elective = 'ELECTIVE',
    Lab = 'LAB'
}

export enum DegreeType {
    BSc = 'BSc',
    BA = 'BA',
    BBA = 'BBA',
    MSc = 'MSc',
    MBA = 'MBA'
}

export enum ExamType {
    Midterm = 'MIDTERM',
    Final = 'FINAL',
    Quiz = 'QUIZ',
    Practical = 'PRACTICAL'
}

export enum ResultStatus {
    Passed = 'PASSED',
    Failed = 'FAILED'
}

export interface Timestamps {
    createdAt: string;
    updatedAt: string;
}