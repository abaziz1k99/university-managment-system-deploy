import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { DatePickerModule } from 'primeng/datepicker';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { MessageService } from 'primeng/api';
import { PageHeader } from '@/app/shared/components/page-header';
import { StatusTag } from '@/app/shared/components/status-tag';
import { EmptyState } from '@/app/shared/components/empty-state';
import { AttendanceService, CourseDailySummary } from '@/app/core/services/attendance.service';
import { CoreDataService } from '@/app/core/services/core-data.service';
import type { AttendanceRecord, Student } from '@/app/core/models/index';

type AttendanceStatus = AttendanceRecord['status'];

interface SelectOption<T> {
    label: string;
    value: T;
}

interface RosterRow {
    student: Student;
    percent: number;
    attended: number;
    total: number;
    mark: AttendanceStatus | null;
    savedMark: AttendanceStatus | null;
}

interface HistoryStudentRow {
    studentId: string;
    student: Student | null;
    attended: number;
    total: number;
    percent: number;
}

const DEFAULT_THRESHOLD = 75;
const NEAR_THRESHOLD_MARGIN = 10;

@Component({
    selector: 'app-attendance-list',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        CardModule,
        ButtonModule,
        SelectModule,
        TableModule,
        DatePickerModule,
        Tabs,
        TabList,
        Tab,
        TabPanels,
        TabPanel,
        TagModule,
        ToastModule,
        ToggleSwitchModule,
        PageHeader,
        StatusTag,
        EmptyState
    ],
    providers: [MessageService],
    template: `
        <app-page-header title="Attendance" subtitle="Mark daily attendance per course and review per-course history">
            <p-button
                label="Save Attendance"
                icon="pi pi-save"
                [disabled]="!canSave()"
                [loading]="saving()"
                (onClick)="save()"></p-button>
        </app-page-header>

        <!-- Selection bar: semester -> course -> date -->
        <p-card styleClass="mb-4">
            <div class="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 flex-1">
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Semester</label>
                        <p-select
                            [ngModel]="semesterId()"
                            (ngModelChange)="onSemesterChange($event)"
                            [options]="semesterOptions()"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="All semesters"
                            [showClear]="true"
                            styleClass="w-full">
                        </p-select>
                        <small class="text-muted-color text-xs">Courses with sessions in the chosen semester are listed first.</small>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Course</label>
                        <p-select
                            [ngModel]="courseId()"
                            (ngModelChange)="onCourseChange($event)"
                            [options]="courseOptions()"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Select a course"
                            [filter]="true"
                            [showClear]="true"
                            appendTo="body"
                            styleClass="w-full">
                        </p-select>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Date</label>
                        <p-datepicker
                            [ngModel]="selectedDate()"
                            (ngModelChange)="onDateChange($event)"
                            dateFormat="yy-mm-dd"
                            [showIcon]="true"
                            [showButtonBar]="true"
                            [readonlyInput]="true"
                            styleClass="w-full">
                        </p-datepicker>
                        <small class="text-muted-color text-xs">Stored as YYYY-MM-DD ({{ dateStr() || '—' }}).</small>
                    </div>
                </div>

                @if (selectedCourse(); as course) {
                    <div class="flex flex-wrap items-end gap-4">
                        <div class="flex flex-col">
                            <span class="text-xs text-muted-color">Faculty</span>
                            <span class="text-sm font-medium">{{ courseFacultyName() }}</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-xs text-muted-color">Programs</span>
                            <span class="text-sm font-medium">{{ courseProgramsLabel() }}</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-xs text-muted-color">Threshold</span>
                            <span class="text-sm font-medium">{{ threshold() }}%</span>
                        </div>
                    </div>
                }
            </div>
        </p-card>

        <p-tabs [value]="activeTab()" (valueChange)="onTabChange($event)">
            <p-tablist>
                <p-tab value="take">Take Attendance</p-tab>
                <p-tab value="history">History</p-tab>
            </p-tablist>
            <p-tabpanels>
                <!-- ── Take Attendance ─────────────────────────────────────── -->
                <p-tabpanel value="take">
                    @if (!selectedCourse()) {
                        <app-empty-state
                            icon="pi pi-calendar-plus"
                            title="No course selected"
                            message="Choose a semester and course above to load the roster and start marking attendance."
                            actionLabel="Load first scheduled course"
                            (action)="selectDefaultCourse()"></app-empty-state>
                    } @else if (rosterRows().length === 0) {
                        <app-empty-state
                            icon="pi pi-users"
                            title="No students in roster"
                            message="No students are enrolled in this course's program(s). Try including non-active students or pick another course."
                            actionLabel="Include non-active students"
                            (action)="includeInactive.set(true)"></app-empty-state>
                    } @else {
                        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-3">
                            <div class="flex flex-wrap items-center gap-3">
                                <span class="text-sm text-muted-color">{{ rosterRows().length }} student(s) · {{ dateStr() }}</span>
                                <label class="flex items-center gap-2 text-sm cursor-pointer select-none">
                                    <p-toggleswitch
                                        [ngModel]="includeInactive()"
                                        (ngModelChange)="includeInactive.set($event)"></p-toggleswitch>
                                    <span>Include non-active</span>
                                </label>
                                @if (unsavedCount() > 0) {
                                    <p-tag [value]="unsavedCount() + ' unsaved change(s)'" severity="warn"></p-tag>
                                } @else {
                                    <p-tag value="Saved" severity="success"></p-tag>
                                }
                            </div>
                            <div class="flex flex-wrap items-center gap-2">
                                <p-button
                                    label="All Present"
                                    icon="pi pi-check-circle"
                                    severity="success"
                                    [outlined]="true"
                                    size="small"
                                    (onClick)="markAll('PRESENT')"></p-button>
                                <p-button
                                    label="All Absent"
                                    icon="pi pi-times-circle"
                                    severity="danger"
                                    [outlined]="true"
                                    size="small"
                                    (onClick)="markAll('ABSENT')"></p-button>
                                <p-button
                                    label="Clear"
                                    icon="pi pi-eraser"
                                    severity="secondary"
                                    [text]="true"
                                    size="small"
                                    (onClick)="clearAll()"></p-button>
                            </div>
                        </div>

                        <div class="overflow-x-auto">
                            <p-table [value]="rosterRows()" [tableStyle]="{ 'min-width': '60rem' }" styleClass="w-full">
                                <ng-template pTemplate="header">
                                    <tr>
                                        <th style="width:140px">Admission No</th>
                                        <th style="min-width:180px">Student</th>
                                        <th style="min-width:200px">Email</th>
                                        <th style="width:120px">Status</th>
                                        <th style="width:170px">Attendance %</th>
                                        <th style="width:190px">Mark</th>
                                    </tr>
                                </ng-template>
                                <ng-template pTemplate="body" let-row>
                                    <tr>
                                        <td><p-tag [value]="row.student.admissionNo" severity="secondary"></p-tag></td>
                                        <td class="font-medium">{{ row.student.firstName }} {{ row.student.lastName }}</td>
                                        <td class="text-sm text-muted-color">{{ row.student.email }}</td>
                                        <td><app-status-tag [status]="row.student.status"></app-status-tag></td>
                                        <td>
                                            <div class="flex items-center gap-2">
                                                <span [ngClass]="percentClass(row.percent, row.total)">{{ formatPercent(row.percent) }}</span>
                                                <span class="text-xs text-muted-color">({{ row.attended }}/{{ row.total }})</span>
                                            </div>
                                        </td>
                                        <td>
                                            <p-select
                                                [ngModel]="row.mark"
                                                (ngModelChange)="setDraftStatus(row.student.id, $event)"
                                                [options]="statusOptions"
                                                optionLabel="label"
                                                optionValue="value"
                                                placeholder="No mark"
                                                appendTo="body"
                                                styleClass="w-full">
                                            </p-select>
                                        </td>
                                    </tr>
                                </ng-template>
                                <ng-template pTemplate="emptymessage">
                                    <tr>
                                        <td colspan="6" class="text-center py-8 text-muted-color">No students in roster.</td>
                                    </tr>
                                </ng-template>
                            </p-table>
                        </div>
                    }
                </p-tabpanel>

                <!-- ── History ─────────────────────────────────────────────── -->
                <p-tabpanel value="history">
                    @if (!selectedCourse()) {
                        <app-empty-state
                            icon="pi pi-chart-bar"
                            title="No course selected"
                            message="Select a course to view its attendance history."></app-empty-state>
                    } @else if (dailyRows().length === 0) {
                        <app-empty-state
                            icon="pi pi-history"
                            title="No attendance history"
                            message="No attendance has been recorded for this course yet."
                            actionLabel="Take attendance"
                            (action)="onTabChange('take')"></app-empty-state>
                    } @else {
                        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                            <span class="text-sm text-muted-color">
                                {{ selectedCourse()?.code }} — {{ selectedCourse()?.title }}
                            </span>
                            <div class="flex items-center gap-2">
                                <span class="text-xs text-muted-color">View</span>
                                <p-select
                                    [ngModel]="historyView()"
                                    (ngModelChange)="historyView.set($event)"
                                    [options]="historyViewOptions"
                                    optionLabel="label"
                                    optionValue="value"
                                    styleClass="w-40"></p-select>
                            </div>
                        </div>

                        @if (historyView() === 'date') {
                            <div class="overflow-x-auto">
                                <p-table [value]="dailyRows()" [tableStyle]="{ 'min-width': '52rem' }" styleClass="w-full">
                                    <ng-template pTemplate="header">
                                        <tr>
                                            <th style="width:150px">Date</th>
                                            <th style="width:110px">Present</th>
                                            <th style="width:110px">Absent</th>
                                            <th style="width:100px">Late</th>
                                            <th style="width:110px">Excused</th>
                                            <th style="width:100px">Total</th>
                                            <th style="width:130px">Attendance %</th>
                                        </tr>
                                    </ng-template>
                                    <ng-template pTemplate="body" let-row>
                                        <tr>
                                            <td class="font-medium">{{ row.date }}</td>
                                            <td><p-tag [value]="row.present.toString()" severity="success"></p-tag></td>
                                            <td><p-tag [value]="row.absent.toString()" severity="danger"></p-tag></td>
                                            <td><p-tag [value]="row.late.toString()" severity="warn"></p-tag></td>
                                            <td><p-tag [value]="row.excused.toString()" severity="info"></p-tag></td>
                                            <td class="text-center">{{ row.total }}</td>
                                            <td><span [ngClass]="percentClass(row.percent, row.total)">{{ formatPercent(row.percent) }}</span></td>
                                        </tr>
                                    </ng-template>
                                </p-table>
                            </div>
                        } @else {
                            <div class="overflow-x-auto">
                                <p-table [value]="historyStudents()" [tableStyle]="{ 'min-width': '52rem' }" styleClass="w-full">
                                    <ng-template pTemplate="header">
                                        <tr>
                                            <th style="width:140px">Admission No</th>
                                            <th style="min-width:200px">Student</th>
                                            <th style="width:140px">Attended</th>
                                            <th style="width:110px">Total</th>
                                            <th style="width:130px">Attendance %</th>
                                        </tr>
                                    </ng-template>
                                    <ng-template pTemplate="body" let-row>
                                        <tr>
                                            <td>
                                                <p-tag
                                                    [value]="row.student ? row.student.admissionNo : row.studentId"
                                                    severity="secondary"></p-tag>
                                            </td>
                                            <td class="font-medium">
                                                {{ row.student ? row.student.firstName + ' ' + row.student.lastName : row.studentId }}
                                            </td>
                                            <td class="text-center">{{ row.attended }}</td>
                                            <td class="text-center">{{ row.total }}</td>
                                            <td><span [ngClass]="percentClass(row.percent, row.total)">{{ formatPercent(row.percent) }}</span></td>
                                        </tr>
                                    </ng-template>
                                </p-table>
                            </div>
                        }
                    }
                </p-tabpanel>
            </p-tabpanels>
        </p-tabs>

        <p-toast></p-toast>
    `
})
export class AttendanceList {
    private readonly core = inject(CoreDataService);
    private readonly attendance = inject(AttendanceService);
    private readonly msg = inject(MessageService);

    /** Sent to AttendanceRecord.markedBy for marks created from this page. */
    private readonly markedBy = 'admin';

    // ── Core data signals ─────────────────────────────────────────────────────
    private readonly courses = this.core.courses;
    private readonly students = this.core.students;
    private readonly semesters = this.core.semesters;
    private readonly classSessions = this.core.classSessions;
    private readonly facultyMembers = this.core.facultyMembers;
    private readonly programs = this.core.programs;

    readonly settings = computed(() => this.core.store().settings);
    readonly threshold = computed(() => this.settings().attendanceThreshold || DEFAULT_THRESHOLD);

    // ── Selection state ───────────────────────────────────────────────────────
    readonly semesterId = signal<string | null>(this.settings().currentSemesterId ?? this.semesters()[0]?.id ?? null);
    readonly courseId = signal<string | null>(this.pickInitialCourse());
    readonly selectedDate = signal<Date | null>(new Date());
    readonly includeInactive = signal(false);
    readonly activeTab = signal<string | number>('take');
    readonly historyView = signal<'date' | 'student'>('date');
    readonly saving = signal(false);

    /** Local draft marks keyed by studentId (null = no mark). */
    readonly draftMarks = signal<Record<string, AttendanceStatus | null>>({});

    readonly statusOptions: SelectOption<AttendanceStatus | null>[] = [
        { label: 'Present', value: 'PRESENT' },
        { label: 'Absent', value: 'ABSENT' },
        { label: 'Late', value: 'LATE' },
        { label: 'Excused', value: 'EXCUSED' },
        { label: 'No mark', value: null }
    ];

    readonly historyViewOptions: SelectOption<'date' | 'student'>[] = [
        { label: 'By Date', value: 'date' },
        { label: 'By Student', value: 'student' }
    ];

    // ── Derived selection ─────────────────────────────────────────────────────
    readonly dateStr = computed(() => {
        const d = this.selectedDate();
        return d ? this.toIsoDate(d) : '';
    });

    readonly selectedCourse = computed(() => this.courses().find((c) => c.id === this.courseId()) ?? null);

    readonly semesterOptions = computed<SelectOption<string | null>[]>(() => [
        { label: 'All semesters', value: null },
        ...this.semesters().map((s) => ({ label: `${s.name} (${s.academicYear})`, value: s.id }))
    ]);

    /** All courses, but when a semester is chosen courses that have sessions there are listed first and flagged. */
    readonly courseOptions = computed<SelectOption<string>[]>(() => {
        const sem = this.semesterId();
        const scheduledIds = new Set(sem ? this.classSessions().filter((cs) => cs.semesterId === sem).map((cs) => cs.courseId) : []);
        const entries = this.courses().map((c) => ({ course: c, scheduled: scheduledIds.has(c.id) }));

        entries.sort((a, b) => {
            if (sem && a.scheduled !== b.scheduled) {
                return a.scheduled ? -1 : 1;
            }
            return a.course.code.localeCompare(b.course.code);
        });

        return entries.map(({ course, scheduled }) => {
            const suffix = sem ? (scheduled ? '' : ' (no sessions)') : '';
            return { label: `${course.code} — ${course.title}${suffix}`, value: course.id };
        });
    });

    readonly courseFacultyName = computed(() => {
        const course = this.selectedCourse();
        if (!course) {
            return '—';
        }
        if (!course.facultyId) {
            return 'Unassigned';
        }
        const fm = this.facultyMembers().find((f) => f.id === course.facultyId);
        return fm ? `${fm.firstName} ${fm.lastName}` : 'Unassigned';
    });

    readonly courseProgramsLabel = computed(() => {
        const course = this.selectedCourse();
        if (!course) {
            return '—';
        }
        const codes = (course.programIds ?? []).map((id) => this.programs().find((p) => p.id === id)?.code ?? id);
        return codes.length ? codes.join(', ') : '—';
    });

    // ── Roster ────────────────────────────────────────────────────────────────
    private readonly studentById = computed(() => {
        const map = new Map<string, Student>();
        for (const s of this.students()) {
            map.set(s.id, s);
        }
        return map;
    });

    readonly roster = computed<Student[]>(() => {
        const course = this.selectedCourse();
        if (!course) {
            return [];
        }
        const programIds = course.programIds ?? [];
        const includeInactive = this.includeInactive();
        return this.students()
            .filter((s) => programIds.includes(s.programId))
            .filter((s) => includeInactive || s.status === 'ACTIVE')
            .sort((a, b) => {
                const aActive = a.status === 'ACTIVE';
                const bActive = b.status === 'ACTIVE';
                if (aActive !== bActive) {
                    return aActive ? -1 : 1;
                }
                return a.admissionNo.localeCompare(b.admissionNo);
            });
    });

    /** Saved marks for the current course + date (baseline for change detection). */
    private readonly savedMarks = computed<Record<string, AttendanceStatus>>(() => {
        const courseId = this.courseId();
        const date = this.dateStr();
        const map: Record<string, AttendanceStatus> = {};
        if (!courseId || !date) {
            return map;
        }
        for (const r of this.attendance.getByCourseAndDate(courseId, date)) {
            map[r.studentId] = r.status;
        }
        return map;
    });

    /** Per-student attendance stats for the whole course. */
    private readonly studentStats = computed<Record<string, { percent: number; attended: number; total: number }>>(() => {
        const courseId = this.courseId();
        const map: Record<string, { percent: number; attended: number; total: number }> = {};
        if (!courseId) {
            return map;
        }
        const totals = new Map(this.attendance.getCourseSummary(courseId).students.map((s) => [s.studentId, s] as const));
        for (const student of this.roster()) {
            const agg = totals.get(student.id);
            map[student.id] = {
                percent: this.attendance.getCourseAttendancePercent(courseId, student.id),
                attended: agg?.attended ?? 0,
                total: agg?.total ?? 0
            };
        }
        return map;
    });

    readonly rosterRows = computed<RosterRow[]>(() => {
        const stats = this.studentStats();
        const draft = this.draftMarks();
        const saved = this.savedMarks();
        return this.roster().map((student) => {
            const agg = stats[student.id] ?? { percent: 0, attended: 0, total: 0 };
            return {
                student,
                percent: agg.percent,
                attended: agg.attended,
                total: agg.total,
                mark: draft[student.id] ?? null,
                savedMark: saved[student.id] ?? null
            };
        });
    });

    readonly unsavedCount = computed(() => this.rosterRows().filter((row) => row.mark !== row.savedMark).length);

    /** True when a roster student's draft mark differs from what is stored. */
    readonly hasChanges = computed(() => {
        if (!this.courseId() || !this.dateStr()) {
            return false;
        }
        return this.rosterRows().some((row) => row.mark !== row.savedMark);
    });

    readonly canSave = computed(() => !!this.courseId() && !!this.dateStr() && this.hasChanges());

    // ── History ───────────────────────────────────────────────────────────────
    readonly dailyRows = computed<CourseDailySummary[]>(() => {
        const courseId = this.courseId();
        if (!courseId) {
            return [];
        }
        return this.attendance.getCourseSummary(courseId).daily.slice().reverse();
    });

    readonly historyStudents = computed<HistoryStudentRow[]>(() => {
        const courseId = this.courseId();
        if (!courseId) {
            return [];
        }
        const totals = new Map(this.attendance.getCourseSummary(courseId).students.map((s) => [s.studentId, s] as const));
        const byId = this.studentById();
        return this.roster().map((student) => {
            const agg = totals.get(student.id);
            const total = agg?.total ?? 0;
            const attended = agg?.attended ?? 0;
            return {
                studentId: student.id,
                student: byId.get(student.id) ?? null,
                attended,
                total,
                percent: total ? (attended / total) * 100 : 0
            };
        });
    });

    constructor() {
        // Reload the local draft whenever the course, date or stored records change.
        effect(() => {
            const courseId = this.courseId();
            const date = this.dateStr();
            if (!courseId || !date) {
                this.draftMarks.set({});
                return;
            }
            const next: Record<string, AttendanceStatus | null> = {};
            for (const r of this.attendance.getByCourseAndDate(courseId, date)) {
                next[r.studentId] = r.status;
            }
            this.draftMarks.set(next);
        });
    }

    // ── Selection handlers ────────────────────────────────────────────────────
    onSemesterChange(value: string | null): void {
        this.semesterId.set(value);
    }

    onCourseChange(value: string | null): void {
        this.courseId.set(value);
    }

    onDateChange(value: Date | null): void {
        this.selectedDate.set(value ?? null);
    }

    onTabChange(value: string | number | undefined): void {
        this.activeTab.set(value ?? 'take');
    }

    selectDefaultCourse(): void {
        const sem = this.semesterId();
        const scheduled = sem ? this.classSessions().filter((cs) => cs.semesterId === sem).map((cs) => cs.courseId) : [];
        const course = scheduled.length ? this.courses().find((c) => c.id === scheduled[0]) : this.courses()[0];
        if (course) {
            this.courseId.set(course.id);
        }
    }

    // ── Draft editing ─────────────────────────────────────────────────────────
    setDraftStatus(studentId: string, status: AttendanceStatus | null): void {
        this.draftMarks.update((map) => ({ ...map, [studentId]: status }));
    }

    markAll(status: AttendanceStatus): void {
        const ids = this.roster().map((s) => s.id);
        this.draftMarks.update((map) => {
            const next = { ...map };
            for (const id of ids) {
                next[id] = status;
            }
            return next;
        });
        this.msg.add({ severity: 'info', summary: 'Bulk mark', detail: `Marked ${ids.length} student(s) as ${status.toLowerCase()}.` });
    }

    clearAll(): void {
        this.draftMarks.set({});
        this.msg.add({ severity: 'info', summary: 'Cleared', detail: 'Local selection cleared. Save to apply the removal.' });
    }

    // ── Persistence ───────────────────────────────────────────────────────────
    save(): void {
        const courseId = this.courseId();
        const date = this.dateStr();
        if (!courseId || !date) {
            this.msg.add({ severity: 'warn', summary: 'Nothing to save', detail: 'Select a course and a date first.' });
            return;
        }
        if (!this.hasChanges()) {
            this.msg.add({ severity: 'info', summary: 'No changes', detail: 'There are no changes to save.' });
            return;
        }

        const semesterId = this.effectiveSemesterId();
        const now = new Date().toISOString();
        const toUpsert: AttendanceRecord[] = [];
        const toRemove: string[] = [];

        for (const row of this.rosterRows()) {
            if (row.mark === row.savedMark) {
                continue;
            }
            if (row.mark === null) {
                if (row.savedMark !== null) {
                    toRemove.push(row.student.id);
                }
            } else {
                toUpsert.push({
                    id: `att-tmp-${row.student.id}`,
                    studentId: row.student.id,
                    courseId,
                    semesterId,
                    date,
                    status: row.mark,
                    markedBy: this.markedBy,
                    createdAt: now,
                    updatedAt: now
                });
            }
        }

        this.saving.set(true);
        try {
            if (toRemove.length) {
                this.attendance.removeMarks(courseId, date, toRemove);
            }
            if (toUpsert.length) {
                this.attendance.upsert(toUpsert);
            }
            const label = this.selectedCourse() ? `${this.selectedCourse()?.code}` : courseId;
            this.msg.add({
                severity: 'success',
                summary: 'Attendance saved',
                detail: `Saved ${toUpsert.length} mark(s)${toRemove.length ? `, cleared ${toRemove.length}` : ''} for ${label} on ${date}.`
            });
        } finally {
            this.saving.set(false);
        }
    }

    private effectiveSemesterId(): string {
        const sem = this.semesterId();
        if (sem) {
            return sem;
        }
        const courseId = this.courseId();
        const session = this.classSessions().find((cs) => cs.courseId === courseId);
        if (session) {
            return session.semesterId;
        }
        return this.settings().currentSemesterId ?? this.semesters()[0]?.id ?? '';
    }

    // ── Display helpers ───────────────────────────────────────────────────────
    percentClass(percent: number, total: number): string {
        if (total === 0) {
            return 'text-muted-color';
        }
        const threshold = this.threshold();
        if (percent < threshold) {
            return 'text-red-600 dark:text-red-400 font-semibold';
        }
        if (percent < threshold + NEAR_THRESHOLD_MARGIN) {
            return 'text-amber-600 dark:text-amber-400 font-semibold';
        }
        return 'text-green-600 dark:text-green-400 font-medium';
    }

    formatPercent(percent: number): string {
        return `${percent.toFixed(1)}%`;
    }

    private pickInitialCourse(): string | null {
        const sem = this.semesterId();
        const scheduled = sem ? this.classSessions().filter((cs) => cs.semesterId === sem).map((cs) => cs.courseId) : [];
        const course = scheduled.length ? this.courses().find((c) => c.id === scheduled[0]) : this.courses()[0];
        return course?.id ?? null;
    }

    private toIsoDate(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}
