import { Injectable, computed, effect, inject, signal } from '@angular/core';
import {
    Faculty,
    Department,
    Program,
    Course,
    Semester,
    Student,
    AdmissionApplication,
    FacultyMember,
    ClassSession,
    AttendanceRecord,
    Examination,
    StudentResult,
    FeeAccount,
    Payment,
    Notice,
    SystemUser,
    SystemSettings,
    ActivityLogEntry,
    StudentStatus,
    AdmissionStatus,
    EmploymentStatus,
    SemesterStatus,
    AttendanceStatus,
    FeeStatus,
    NoticeStatus,
    UserRole
} from '@/app/core/models/index';
import {
    SEED_SCHEMA_VERSION as schemaVersion,
    SEED_STORAGE_KEY as _SEED_STORAGE_KEY,
    faculties as seedFaculties,
    departments as seedDepartments,
    programs as seedPrograms,
    courses as seedCourses,
    facultyMembers as seedFacultyMembers,
    semesters as seedSemesters,
    students as seedStudents,
    admissionApplications as seedAdmissionApplications,
    classSessions as seedClassSessions,
    attendanceRecords as seedAttendanceRecords,
    examinations as seedExaminations,
    studentResults as seedStudentResults,
    feeAccounts as seedFeeAccounts,
    payments as seedPayments,
    notices as seedNotices,
    systemUsers as seedUsers,
    systemSettings as seedSettings,
    activityLog as seedActivityLog
} from '@/app/core/data/seed';
import { StorageService } from '@/app/core/services/storage.service';

export interface Store {
    schemaVersion: number;
    faculties: Faculty[];
    departments: Department[];
    programs: Program[];
    courses: Course[];
    facultyMembers: FacultyMember[];
    semesters: Semester[];
    students: Student[];
    admissionApplications: AdmissionApplication[];
    classSessions: ClassSession[];
    attendanceRecords: AttendanceRecord[];
    examinations: Examination[];
    studentResults: StudentResult[];
    feeAccounts: FeeAccount[];
    payments: Payment[];
    notices: Notice[];
    users: SystemUser[];
    settings: SystemSettings;
    activityLog: ActivityLogEntry[];
}

const STORAGE_KEY = 'unimanage.v1';

@Injectable({
    providedIn: 'root'
})
export class CoreDataService {
    private readonly storage = inject(StorageService);

    private readonly _store = signal<Store>(this.initStore());

    readonly store = this._store.asReadonly();

    readonly faculties = computed(() => this._store().faculties);
    readonly departments = computed(() => this._store().departments);
    readonly programs = computed(() => this._store().programs);
    readonly courses = computed(() => this._store().courses);
    readonly facultyMembers = computed(() => this._store().facultyMembers);
    readonly semesters = computed(() => this._store().semesters);
    readonly students = computed(() => this._store().students);
    readonly admissionApplications = computed(() => this._store().admissionApplications);
    readonly classSessions = computed(() => this._store().classSessions);
    readonly attendanceRecords = computed(() => this._store().attendanceRecords);
    readonly examinations = computed(() => this._store().examinations);
    readonly studentResults = computed(() => this._store().studentResults);
    readonly feeAccounts = computed(() => this._store().feeAccounts);
    readonly payments = computed(() => this._store().payments);
    readonly notices = computed(() => this._store().notices);
    readonly users = computed(() => this._store().users);
    readonly activityLog = computed(() => this._store().activityLog);

    constructor() {
        effect(() => {
            const store = this._store();
            this.flushPersist(store);
        });
    }

    private initStore(): Store {
        const raw = this.storage.get<Store>(STORAGE_KEY);
        if (raw && raw.schemaVersion === schemaVersion) {
            return raw as Store;
        }
        return {
            schemaVersion,
            faculties: [...seedFaculties],
            departments: [...seedDepartments],
            programs: [...seedPrograms],
            courses: [...seedCourses],
            facultyMembers: [...seedFacultyMembers],
            semesters: [...seedSemesters],
            students: [...seedStudents],
            admissionApplications: [...seedAdmissionApplications],
            classSessions: [...seedClassSessions],
            attendanceRecords: [...seedAttendanceRecords],
            examinations: [...seedExaminations],
            studentResults: [...seedStudentResults],
            feeAccounts: [...seedFeeAccounts],
            payments: [...seedPayments],
            notices: [...seedNotices],
            users: [...seedUsers],
            settings: { ...seedSettings },
            activityLog: [...seedActivityLog]
        };
    }

    private persistTimer: ReturnType<typeof setTimeout> | undefined;
    private flushPersist(store: Store): void {
        if (this.persistTimer) {
            clearTimeout(this.persistTimer);
        }
        this.persistTimer = setTimeout(() => {
            this.storage.set(STORAGE_KEY, store);
        }, 300);
    }
    private persist(): void {
        if (this.persistTimer) {
            clearTimeout(this.persistTimer);
        }
        this.storage.set(STORAGE_KEY, this._store());
    }

    private now(): string {
        return new Date().toISOString();
    }

    private touch(): void {
        this._store.update((s) => ({ ...s, schemaVersion }));
    }

    private logActivity(userId: string, action: string, entity: string, entityId: string, detail: string): void {
        const entry: ActivityLogEntry = {
            id: this.generateId('act'),
            userId,
            action,
            entity,
            entityId,
            detail,
            createdAt: this.now(),
            updatedAt: this.now()
        };
        this._store.update((s) => ({ ...s, activityLog: [entry, ...s.activityLog].slice(0, 100) }));
    }

    generateId(prefix: string): string {
        return `${prefix}-${Math.random().toString(36).slice(2, 11).toUpperCase()}`;
    }

    resetDemoData(): void {
        const empty = this.initStore();
        this._store.set(empty);
        this.storage.set(STORAGE_KEY, empty);
    }

    list<T extends Faculty | Department | Program | Course | Semester | Student | AdmissionApplication | FacultyMember | ClassSession | AttendanceRecord | Examination | StudentResult | FeeAccount | Payment | Notice | SystemUser | ActivityLogEntry>(
        collection: keyof Store
    ): T[] {
        return ((this._store() as unknown) as Record<string, T[]>)[collection] ?? [];
    }

    get<T extends Faculty | Department | Program | Course | Semester | Student | AdmissionApplication | FacultyMember | ClassSession | AttendanceRecord | Examination | StudentResult | FeeAccount | Payment | Notice | SystemUser | ActivityLogEntry>(
        collection: keyof Store,
        id: string
    ): T | undefined {
        return this.list<T>(collection).find((item: T & { id: string }) => item.id === id);
    }

    create<T extends Faculty | Department | Program | Course | Semester | Student | AdmissionApplication | FacultyMember | ClassSession | AttendanceRecord | Examination | StudentResult | FeeAccount | Payment | Notice | SystemUser | ActivityLogEntry>(
        collection: keyof Store,
        entity: T & Partial<ActivityLogEntry>
    ): T {
        const now = this.now();
        const full = { ...entity, id: (entity as unknown as { id?: string }).id ?? this.generateId(collection.slice(0, -1)), createdAt: (entity as unknown as { createdAt?: string }).createdAt ?? now, updatedAt: now };
        this._store.update((s) => {
            const items = ((s as unknown) as Record<string, unknown[]>)[collection];
            return { ...s, [collection]: [...items, full] } as Store;
        });
        this.logActivity('system', 'create', collection, (full as unknown as { id: string }).id, `Created ${(full as unknown as { id: string }).id ?? 'record'}`);
        return full as unknown as T;
    }

    update<T extends Faculty | Department | Program | Course | Semester | Student | AdmissionApplication | FacultyMember | ClassSession | AttendanceRecord | Examination | StudentResult | FeeAccount | Payment | Notice | SystemUser | ActivityLogEntry>(
        collection: keyof Store,
        entity: T & { id: string }
    ): T {
        const now = this.now();
        const full = { ...entity, updatedAt: now };
        this._store.update((s) => {
            const items = ((s as unknown) as Record<string, unknown[]>)[collection];
            return { ...s, [collection]: items.map((i) => (i as unknown as { id: string }).id === (full as unknown as { id: string }).id ? full : i) } as Store;
        });
        this.logActivity('system', 'update', collection, (full as unknown as { id: string }).id, `Updated ${(full as unknown as { id: string }).id}`);
        return full;
    }

    remove<T extends Faculty | Department | Program | Course | Semester | Student | AdmissionApplication | FacultyMember | ClassSession | AttendanceRecord | Examination | StudentResult | FeeAccount | Payment | Notice | SystemUser | ActivityLogEntry>(
        collection: keyof Store,
        id: string
    ): void {
        this._store.update((s) => {
            const items = ((s as unknown) as Record<string, unknown[]>)[collection];
            return { ...s, [collection]: items.filter((i) => (i as unknown as { id: string }).id !== id) } as Store;
        });
        this.logActivity('system', 'delete', collection, id, `Deleted ${id}`);
    }

    upsert<T extends Faculty | Department | Program | Course | Semester | Student | AdmissionApplication | FacultyMember | ClassSession | AttendanceRecord | Examination | StudentResult | FeeAccount | Payment | Notice | SystemUser | ActivityLogEntry>(
        collection: keyof Store,
        entity: T & { id: string }
    ): T {
        const exists = this.get<T>(collection, entity.id);
        return exists ? this.update(collection, entity) : this.create(collection, entity);
    }

    updateSettings(patch: Partial<SystemSettings>): void {
        this._store.update((s) => ({ ...s, settings: { ...s.settings, ...patch, updatedAt: this.now() } }));
    }

    getSettings(): SystemSettings {
        return this._store().settings;
    }

    replaceStore(store: Store): void {
        this._store.set(store);
        if (this.persistTimer) {
            clearTimeout(this.persistTimer);
        }
        this.storage.set(STORAGE_KEY, store);
    }

    findDepartment(facultyId: string): Department[] {
        return this._store().departments.filter((d) => d.facultyId === facultyId);
    }

    findPrograms(departmentId: string): Program[] {
        return this._store().programs.filter((p) => p.departmentId === departmentId);
    }

    findCoursesByDepartment(departmentId: string): Course[] {
        return this._store().courses.filter((c) => c.departmentId === departmentId);
    }

    findCoursesByFaculty(facultyId: string): Course[] {
        return this._store().courses.filter((c) => c.facultyId === facultyId);
    }

    findStudentEnrollments(_studentId: string): Course[] {
        return this._store().courses;
    }

    getStudentFeeAccounts(studentId: string): FeeAccount[] {
        return this._store().feeAccounts.filter((f) => f.studentId === studentId);
    }

    getCourseFaculty(courseId: string): FacultyMember | undefined {
        const course = this._store().courses.find((c) => c.id === courseId);
        if (!course?.facultyId) {
            return undefined;
        }
        return this._store().facultyMembers.find((f) => f.id === course.facultyId);
    }

    getCourseAttendance(courseId: string): AttendanceRecord[] {
        return this._store().attendanceRecords.filter((a) => a.courseId === courseId);
    }

    getStudentResults(studentId: string): StudentResult[] {
        return this._store().studentResults.filter((r) => r.studentId === studentId);
    }

    getStudentAttendance(studentId: string, courseId?: string): AttendanceRecord[] {
        return this._store().attendanceRecords.filter((a) => a.studentId === studentId && (!courseId || a.courseId === courseId));
    }

    getSemesterResults(semesterId: string): StudentResult[] {
        return this._store().studentResults.filter((r) => r.semesterId === semesterId);
    }

    getSemesterExams(semesterId: string): Examination[] {
        return this._store().examinations.filter((e) => e.semesterId === semesterId);
    }

    async deleteDepartmentGuard(id: string): Promise<{ allowed: boolean; reason?: string }> {
        const programs = this._store().programs.filter((p) => p.departmentId === id);
        const courses = this._store().courses.filter((c) => c.departmentId === id);
        const students = this._store().students.filter((s) => s.departmentId === id);
        const faculty = this._store().facultyMembers.filter((f) => f.departmentId === id);
        const total = programs.length + courses.length + students.length + faculty.length;
        if (total > 0) {
            return { allowed: false, reason: `Cannot delete department: it has ${programs.length} program(s), ${courses.length} course(s), ${students.length} student(s), and ${faculty.length} faculty member(s). Reassign or remove these first.` };
        }
        return { allowed: true };
    }

    getDepartmentCounts(): { departments: number; programs: number; students: number; faculty: number } {
        const depts = this._store().departments;
        const programs = this._store().programs;
        const students = this._store().students;
        const faculty = this._store().facultyMembers;
        return {
            departments: depts.length,
            programs: programs.length,
            students: students.length,
            faculty: faculty.length
        };
    }
}
