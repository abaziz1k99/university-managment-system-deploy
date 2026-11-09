import { inject, Injectable } from '@angular/core';
import { CoreDataService } from '@/app/core/services/core-data.service';
import { downloadCsv } from '@/app/core/utils/util';
import { AdmissionApplication, Course, Department, Payment, Program, Semester, Student } from '@/app/core/models/index';

/**
 * Shared filter object for every report section. All fields are optional/`null`
 * to mean "no constraint" so callers can spread a partial filter safely.
 */
export interface ReportFilter {
    from?: string | null;
    to?: string | null;
    departmentId?: string | null;
    programId?: string | null;
    semesterId?: string | null;
}

// ── Typed row shapes (one per summary table) ────────────────────────────────

export interface EnrollmentRow {
    department: string;
    code: string;
    count: number;
}

export interface AdmissionsSummary {
    total: number;
    submitted: number;
    underReview: number;
    approved: number;
    rejected: number;
    enrolled: number;
    conversionRate: number;
}

export interface AdmissionStatusRow {
    status: AdmissionApplication['status'];
    label: string;
    count: number;
}

export interface FacultyRow {
    department: string;
    code: string;
    count: number;
}

export interface ProgramSummaryRow {
    program: string;
    code: string;
    degreeType: Program['degreeType'];
    department: string;
    enrolled: number;
    duration: number;
}

export interface CourseSummaryRow {
    code: string;
    title: string;
    department: string;
    type: Course['type'];
    credits: number;
    enrolled: number;
}

export interface AttendanceRow {
    course: string;
    code: string;
    percent: number;
    sessions: number;
}

export interface ExamPerformanceRow {
    exam: string;
    course: string;
    avgMarks: number;
    passRate: number;
}

export interface FeeMethodRow {
    method: Payment['method'];
    label: string;
    amount: number;
    count: number;
}

export interface FeeCollectionSummary {
    collected: number;
    outstanding: number;
    billed: number;
    count: number;
    byMethod: FeeMethodRow[];
}

export interface SemesterCountRow {
    semester: string;
    academicYear: string;
    enrolled: number;
    status: Semester['status'];
}

@Injectable({
    providedIn: 'root'
})
export class ReportService {
    protected readonly core = inject(CoreDataService);

    // ── Scoping helpers ──────────────────────────────────────────────────────

    /** Inclusive 'YYYY-MM-DD' range check; empty bounds are ignored. */
    private inRange(value: string, from?: string | null, to?: string | null): boolean {
        if (from && value < from) {
            return false;
        }
        if (to && value > to) {
            return false;
        }
        return true;
    }

    /** Students narrowed by department, program and current semester. */
    private scopedStudents(filter: ReportFilter): Student[] {
        let students = this.core.students();
        if (filter.departmentId) {
            students = students.filter((s) => s.departmentId === filter.departmentId);
        }
        if (filter.programId) {
            students = students.filter((s) => s.programId === filter.programId);
        }
        if (filter.semesterId) {
            students = students.filter((s) => s.currentSemesterId === filter.semesterId);
        }
        return students;
    }

    /** Courses narrowed by department and program. */
    private scopedCourses(filter: ReportFilter): Course[] {
        let courses = this.core.courses();
        if (filter.departmentId) {
            courses = courses.filter((c) => c.departmentId === filter.departmentId);
        }
        if (filter.programId) {
            const programId = filter.programId;
            courses = courses.filter((c) => c.programIds.includes(programId));
        }
        return courses;
    }

    /** Admission applications narrowed by department, program and submittedAt. */
    private scopedApplications(filter: ReportFilter): AdmissionApplication[] {
        let apps = this.core.admissionApplications();
        if (filter.departmentId) {
            apps = apps.filter((a) => a.departmentId === filter.departmentId);
        }
        if (filter.programId) {
            apps = apps.filter((a) => a.programId === filter.programId);
        }
        return apps.filter((a) => this.inRange(a.submittedAt, filter.from, filter.to));
    }

    private departmentsFor(filter: ReportFilter): Department[] {
        const departments = this.core.departments();
        return filter.departmentId ? departments.filter((d) => d.id === filter.departmentId) : departments;
    }

    // ── a. Enrollment by department ──────────────────────────────────────────

    getEnrollmentByDepartmentFiltered(filter: ReportFilter = {}): EnrollmentRow[] {
        const students = this.scopedStudents(filter);
        return this.departmentsFor(filter).map((d) => ({
            department: d.name,
            code: d.code,
            count: students.filter((s) => s.departmentId === d.id).length
        }));
    }

    // ── b. Admissions ────────────────────────────────────────────────────────

    getAdmissionsSummary(filter: ReportFilter = {}): AdmissionsSummary {
        const apps = this.scopedApplications(filter);
        const total = apps.length;
        const submitted = apps.filter((a) => a.status === 'SUBMITTED').length;
        const underReview = apps.filter((a) => a.status === 'UNDER_REVIEW').length;
        const approved = apps.filter((a) => a.status === 'APPROVED').length;
        const rejected = apps.filter((a) => a.status === 'REJECTED').length;
        const enrolled = apps.filter((a) => a.status === 'ENROLLED').length;
        return { total, submitted, underReview, approved, rejected, enrolled, conversionRate: total ? (enrolled / total) * 100 : 0 };
    }

    getAdmissionsByStatus(filter: ReportFilter = {}): AdmissionStatusRow[] {
        const apps = this.scopedApplications(filter);
        const order: AdmissionApplication['status'][] = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ENROLLED'];
        return order.map((status) => ({
            status,
            label: this.admissionStatusLabel(status),
            count: apps.filter((a) => a.status === status).length
        }));
    }

    // ── c. Faculty distribution ──────────────────────────────────────────────

    getFacultyDistributionFiltered(filter: ReportFilter = {}): FacultyRow[] {
        const faculty = this.core.facultyMembers().filter((m) => m.employmentStatus === 'ACTIVE');
        return this.departmentsFor(filter).map((d) => ({
            department: d.name,
            code: d.code,
            count: faculty.filter((f) => f.departmentId === d.id).length
        }));
    }

    // ── d. Program / course summary ──────────────────────────────────────────

    getProgramSummaryFiltered(filter: ReportFilter = {}): ProgramSummaryRow[] {
        let programs = this.core.programs();
        if (filter.departmentId) {
            programs = programs.filter((p) => p.departmentId === filter.departmentId);
        }
        if (filter.programId) {
            programs = programs.filter((p) => p.id === filter.programId);
        }
        const students = this.scopedStudents(filter);
        return programs.map((p) => ({
            program: p.name,
            code: p.code,
            degreeType: p.degreeType,
            department: this.core.get<Department>('departments', p.departmentId)?.name ?? '',
            enrolled: students.filter((s) => s.programId === p.id).length,
            duration: p.durationYears
        }));
    }

    getCourseSummaryFiltered(filter: ReportFilter = {}): CourseSummaryRow[] {
        const students = this.scopedStudents(filter);
        return this.scopedCourses(filter).map((c) => ({
            code: c.code,
            title: c.title,
            department: this.core.get<Department>('departments', c.departmentId)?.name ?? '',
            type: c.type,
            credits: c.credits,
            enrolled: students.filter((s) => {
                const p = this.core.get<Program>('programs', s.programId);
                return !!p && c.programIds.includes(p.id);
            }).length
        }));
    }

    // ── e. Attendance ────────────────────────────────────────────────────────

    getAttendanceFiltered(filter: ReportFilter = {}): AttendanceRow[] {
        const records = this.core.attendanceRecords().filter((r) => !filter.semesterId || r.semesterId === filter.semesterId);
        return this.scopedCourses(filter).map((c) => {
            const courseRecords = records.filter((r) => r.courseId === c.id);
            const present = courseRecords.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length;
            return {
                course: c.title,
                code: c.code,
                percent: courseRecords.length ? (present / courseRecords.length) * 100 : 0,
                sessions: courseRecords.length
            };
        });
    }

    // ── f. Exam performance ──────────────────────────────────────────────────

    getExamPerformanceFiltered(filter: ReportFilter = {}): ExamPerformanceRow[] {
        const courseIds = new Set(this.scopedCourses(filter).map((c) => c.id));
        const results = this.core.studentResults();
        return this.core
            .examinations()
            .filter(
                (e) =>
                    courseIds.has(e.courseId) &&
                    this.inRange(e.date, filter.from, filter.to) &&
                    (!filter.semesterId || e.semesterId === filter.semesterId)
            )
            .map((e) => {
                const examResults = results.filter((r) => r.courseId === e.courseId && r.semesterId === e.semesterId);
                const avgMarks = examResults.length ? examResults.reduce((s, r) => s + r.marks, 0) / examResults.length : 0;
                const passRate = examResults.length ? (examResults.filter((r) => r.status === 'PASSED').length / examResults.length) * 100 : 0;
                return {
                    exam: e.title,
                    course: this.core.get<Course>('courses', e.courseId)?.title ?? '',
                    avgMarks,
                    passRate
                };
            });
    }

    // ── g. Fee collection ────────────────────────────────────────────────────

    getFeeCollectionSummary(filter: ReportFilter = {}): FeeCollectionSummary {
        const studentIds = new Set(this.scopedStudents(filter).map((s) => s.id));
        const payments = this.core.payments().filter((p) => studentIds.has(p.studentId) && this.inRange(p.date, filter.from, filter.to));
        const accounts = this.core.feeAccounts().filter((a) => studentIds.has(a.studentId));
        const methods: Payment['method'][] = ['CASH', 'CARD', 'BANK', 'ONLINE'];
        const byMethod = methods.map((method) => {
            const matching = payments.filter((p) => p.method === method);
            return {
                method,
                label: this.paymentMethodLabel(method),
                amount: matching.reduce((s, p) => s + p.amount, 0),
                count: matching.length
            };
        });
        return {
            collected: payments.reduce((s, p) => s + p.amount, 0),
            outstanding: accounts.reduce((s, a) => s + a.balance, 0),
            billed: accounts.reduce((s, a) => s + a.totalBilled, 0),
            count: payments.length,
            byMethod
        };
    }

    // ── h. Semester-wise counts ──────────────────────────────────────────────

    getSemesterCountsFiltered(filter: ReportFilter = {}): SemesterCountRow[] {
        const students = this.scopedStudents(filter);
        const semesters = filter.semesterId ? this.core.semesters().filter((s) => s.id === filter.semesterId) : this.core.semesters();
        return semesters.map((s) => ({
            semester: s.name,
            academicYear: s.academicYear,
            enrolled: students.filter((st) => st.currentSemesterId === s.id).length,
            status: s.status
        }));
    }

    // ── Labels ───────────────────────────────────────────────────────────────

    admissionStatusLabel(status: AdmissionApplication['status']): string {
        const map: Record<AdmissionApplication['status'], string> = {
            SUBMITTED: 'Submitted',
            UNDER_REVIEW: 'Under Review',
            APPROVED: 'Approved',
            REJECTED: 'Rejected',
            ENROLLED: 'Enrolled'
        };
        return map[status];
    }

    paymentMethodLabel(method: Payment['method']): string {
        const map: Record<Payment['method'], string> = {
            CASH: 'Cash',
            CARD: 'Card',
            BANK: 'Bank Transfer',
            ONLINE: 'Online'
        };
        return map[method];
    }

    // ── CSV exports (one per summary table) ──────────────────────────────────

    exportEnrollment(rows: EnrollmentRow[]): void {
        downloadCsv(
            'enrollment-by-department.csv',
            ['Department', 'Code', 'Students'],
            rows.map((r) => [r.department, r.code, r.count])
        );
    }

    exportAdmissionRows(summary: AdmissionsSummary, rows: AdmissionStatusRow[]): void {
        downloadCsv(
            'admissions-report.csv',
            ['Status', 'Count'],
            [...rows.map((r) => [r.label, r.count]), ['Total', summary.total], ['Conversion %', summary.conversionRate.toFixed(2)]]
        );
    }

    exportFaculty(rows: FacultyRow[]): void {
        downloadCsv(
            'faculty-distribution.csv',
            ['Department', 'Code', 'Faculty'],
            rows.map((r) => [r.department, r.code, r.count])
        );
    }

    exportPrograms(rows: ProgramSummaryRow[]): void {
        downloadCsv(
            'program-summary.csv',
            ['Program', 'Code', 'Degree', 'Department', 'Enrolled', 'Duration (years)'],
            rows.map((r) => [r.program, r.code, r.degreeType, r.department, r.enrolled, r.duration])
        );
    }

    exportCourses(rows: CourseSummaryRow[]): void {
        downloadCsv(
            'course-summary.csv',
            ['Code', 'Title', 'Department', 'Type', 'Credits', 'Enrolled'],
            rows.map((r) => [r.code, r.title, r.department, r.type, r.credits, r.enrolled])
        );
    }

    exportAttendance(rows: AttendanceRow[]): void {
        downloadCsv(
            'attendance-percent.csv',
            ['Course', 'Code', 'Attendance %', 'Sessions'],
            rows.map((r) => [r.course, r.code, r.percent.toFixed(2), r.sessions])
        );
    }

    exportExamPerformance(rows: ExamPerformanceRow[]): void {
        downloadCsv(
            'exam-performance.csv',
            ['Exam', 'Course', 'Avg Marks', 'Pass Rate %'],
            rows.map((r) => [r.exam, r.course, r.avgMarks.toFixed(2), r.passRate.toFixed(2)])
        );
    }

    exportFees(summary: FeeCollectionSummary): void {
        downloadCsv(
            'fee-collection.csv',
            ['Method', 'Amount', 'Count'],
            [...summary.byMethod.map((r) => [r.label, r.amount, r.count]), ['Collected', summary.collected, summary.count], ['Outstanding', summary.outstanding, ''], ['Billed', summary.billed, '']]
        );
    }

    exportSemesters(rows: SemesterCountRow[]): void {
        downloadCsv(
            'semester-counts.csv',
            ['Semester', 'Academic Year', 'Enrolled', 'Status'],
            rows.map((r) => [r.semester, r.academicYear, r.enrolled, r.status])
        );
    }

    // ── Legacy non-filtered helpers (kept for backward compatibility) ────────

    getEnrollmentByDepartment(): EnrollmentRow[] {
        return this.getEnrollmentByDepartmentFiltered();
    }

    getAdmissionsReport(start: string, end: string): AdmissionsSummary {
        return this.getAdmissionsSummary({ from: start, to: end });
    }

    getFacultyDistribution(): FacultyRow[] {
        return this.getFacultyDistributionFiltered();
    }

    getProgramSummary(): ProgramSummaryRow[] {
        return this.getProgramSummaryFiltered();
    }

    getCourseSummary(): CourseSummaryRow[] {
        return this.getCourseSummaryFiltered();
    }

    getAttendancePercent(): AttendanceRow[] {
        return this.getAttendanceFiltered();
    }

    getExamPerformance(start: string, end: string): ExamPerformanceRow[] {
        return this.getExamPerformanceFiltered({ from: start, to: end });
    }

    getFeeCollection(start: string, end: string): { total: number; count: number; byMethod: { method: Payment['method']; amount: number }[] } {
        const summary = this.getFeeCollectionSummary({ from: start, to: end });
        return {
            total: summary.collected,
            count: summary.count,
            byMethod: summary.byMethod.map((m) => ({ method: m.method, amount: m.amount }))
        };
    }

    getSemesterCounts(): SemesterCountRow[] {
        return this.getSemesterCountsFiltered();
    }

    exportEnrollmentByDepartment(): void {
        this.exportEnrollment(this.getEnrollmentByDepartmentFiltered());
    }

    exportAdmissions(): void {
        const range = { from: '1900-01-01', to: '2100-12-31' };
        this.exportAdmissionRows(this.getAdmissionsSummary(range), this.getAdmissionsByStatus(range));
    }
}
