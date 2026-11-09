import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ConfirmationService, MessageService } from 'primeng/api';
import { PageHeader } from '@/app/shared/components/page-header';
import { EmptyState } from '@/app/shared/components/empty-state';
import { CoreDataService } from '@/app/core/services/core-data.service';
import { ClassSession, Course, FacultyMember, SystemSettings } from '@/app/core/models/index';

/** Canonical day order — Sunday first (Sun–Thu working week in the demo data). */
const DAY_ORDER = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const DEFAULT_WEEKEND_DAYS = ['Friday', 'Saturday'];

const FALLBACK_START_HOUR = 8;
const FALLBACK_END_HOUR = 18;

interface TimeSlot {
    hour: number;
    label: string;
    startMin: number;
    endMin: number;
}

interface SessionView {
    session: ClassSession;
    courseCode: string;
    courseTitle: string;
    facultyName: string;
    room: string;
}

type GridCell = { kind: 'session'; view: SessionView; rowSpan: number } | { kind: 'empty' } | { kind: 'covered' };

interface GridRow {
    index: number;
    label: string;
    cells: GridCell[];
}

interface Conflict {
    type: 'room' | 'faculty';
    message: string;
}

@Component({
    selector: 'app-routine-list',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        CardModule,
        ButtonModule,
        InputTextModule,
        SelectModule,
        DialogModule,
        ToastModule,
        ConfirmDialogModule,
        ToggleSwitchModule,
        PageHeader,
        EmptyState
    ],
    providers: [ConfirmationService, MessageService],
    template: `
        <app-page-header title="Class Routine" subtitle="Weekly schedule per semester — course, faculty and room with blocking conflict detection">
            <p-button label="Add Session" icon="pi pi-plus" (onClick)="openCreate()"></p-button>
        </app-page-header>

        <p-card>
            <!-- Filters + weekend toggle -->
            <div class="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 mb-3">
                <div class="flex flex-wrap gap-2 items-center">
                    <p-select
                        [ngModel]="departmentFilter()"
                        (ngModelChange)="onDepartmentFilterChange($event)"
                        [options]="departmentFilterOptions()"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Department"
                        styleClass="w-52"
                        [showClear]="true">
                    </p-select>
                    <p-select
                        [ngModel]="programFilter()"
                        (ngModelChange)="programFilter.set($event)"
                        [options]="programFilterOptions()"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Program"
                        styleClass="w-56"
                        [showClear]="true">
                    </p-select>
                    <p-select
                        [ngModel]="semesterFilter()"
                        (ngModelChange)="semesterFilter.set($event)"
                        [options]="semesterFilterOptions()"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Semester"
                        styleClass="w-52"
                        [showClear]="true">
                    </p-select>
                    <p-select
                        [ngModel]="facultyFilter()"
                        (ngModelChange)="facultyFilter.set($event)"
                        [options]="facultyFilterOptions()"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Faculty"
                        styleClass="w-56"
                        [filter]="true"
                        [showClear]="true">
                    </p-select>
                    @if (hasActiveFilters()) {
                        <a class="text-primary text-sm underline cursor-pointer" (click)="clearFilters()">Clear filters</a>
                    }
                </div>
                <div class="flex items-center gap-3">
                    <label class="flex items-center gap-2 text-sm cursor-pointer select-none">
                        <p-toggleswitch [ngModel]="showWeekend()" (ngModelChange)="showWeekend.set($event)"></p-toggleswitch>
                        <span>Show weekend ({{ weekendLabels() }})</span>
                    </label>
                </div>
            </div>

            <p class="text-xs text-muted-color mb-3">
                Showing {{ filteredSessions().length }} of {{ classSessions().length }} sessions · {{ slots().length }} time slots ({{ timeRangeLabel() }})
                @if (hasActiveFilters()) {
                    <span> · filtered</span>
                }
            </p>

            @if (filteredSessions().length === 0) {
                <app-empty-state
                    icon="pi pi-calendar"
                    title="No sessions match your filters"
                    message="Add a class session or adjust the filters to see the weekly routine."
                    [actionLabel]="classSessions().length === 0 ? 'Add Session' : 'Clear filters'"
                    (action)="classSessions().length === 0 ? openCreate() : clearFilters()">
                </app-empty-state>
            } @else {
                <!-- Desktop / tablet: weekly grid -->
                <div class="hidden md:block overflow-x-auto border border-surface-200 dark:border-surface-700 rounded">
                    <table class="w-full border-collapse" style="min-width: 780px">
                        <thead>
                            <tr class="bg-surface-50 dark:bg-surface-800">
                                <th class="text-left text-xs font-semibold p-2 border-b border-surface-200 dark:border-surface-700" style="width:80px">Time</th>
                                @for (day of visibleDays(); track day) {
                                    <th class="text-left text-xs font-semibold p-2 border-b border-l border-surface-200 dark:border-surface-700">{{ day }}</th>
                                }
                            </tr>
                        </thead>
                        <tbody>
                            @for (row of gridRows(); track row.index) {
                                <tr>
                                    <td class="text-[11px] text-muted-color align-top p-2 border-b border-surface-200 dark:border-surface-700" style="width:80px">{{ row.label }}</td>
                                    @for (cell of row.cells; track $index) {
                                        @if (cell.kind === 'session') {
                                            <td [attr.rowspan]="cell.rowSpan" class="align-top p-1 border-b border-l border-surface-200 dark:border-surface-700">
                                                <button
                                                    type="button"
                                                    class="w-full h-full text-left rounded-md border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-950 p-1.5 hover:ring-2 hover:ring-primary-300 dark:hover:ring-primary-700 transition-all"
                                                    (click)="openEdit(cell.view.session)">
                                                    <div class="flex items-start justify-between gap-1">
                                                        <span class="text-[11px] font-semibold text-primary-800 dark:text-primary-200">{{ cell.view.courseCode }}</span>
                                                        <i class="pi pi-pencil text-[10px] text-primary-600 dark:text-primary-300"></i>
                                                    </div>
                                                    <div class="text-[11px] font-medium truncate">{{ cell.view.courseTitle }}</div>
                                                    <div class="text-[10px] text-muted-color mt-0.5">{{ cell.view.session.startTime }}–{{ cell.view.session.endTime }}</div>
                                                    <div class="text-[10px] text-muted-color truncate">{{ cell.view.facultyName }}</div>
                                                    <div class="text-[10px] text-muted-color truncate">Room {{ cell.view.room }}</div>
                                                </button>
                                            </td>
                                        } @else if (cell.kind === 'empty') {
                                            <td class="p-0 border-b border-l border-surface-200 dark:border-surface-700">
                                                <div class="h-14"></div>
                                            </td>
                                        }
                                    }
                                </tr>
                            }
                        </tbody>
                    </table>
                </div>

                <!-- Mobile: stacked day-by-day list -->
                <div class="md:hidden flex flex-col gap-4">
                    @for (group of mobileDays(); track group.day) {
                        <div>
                            <div class="flex items-center justify-between mb-2">
                                <h3 class="text-sm font-semibold">{{ group.day }}</h3>
                                <span class="text-xs text-muted-color">{{ group.items.length }} session(s)</span>
                            </div>
                            <div class="flex flex-col gap-2">
                                @for (item of group.items; track item.session.id) {
                                    <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                                        <div class="flex items-start justify-between gap-2">
                                            <div class="min-w-0">
                                                <div class="flex items-center gap-2">
                                                    <span class="text-xs font-semibold">{{ item.courseCode }}</span>
                                                    <span class="text-xs text-muted-color">{{ item.session.startTime }}–{{ item.session.endTime }}</span>
                                                </div>
                                                <div class="text-sm font-medium truncate">{{ item.courseTitle }}</div>
                                                <div class="text-xs text-muted-color mt-1">
                                                    {{ item.facultyName }} · Room {{ item.room }} · {{ semesterName(item.session.semesterId) }}
                                                </div>
                                            </div>
                                            <div class="flex items-center gap-1 shrink-0">
                                                <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" severity="info" size="small" (onClick)="openEdit(item.session)"></p-button>
                                                <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger" size="small" (onClick)="confirmDelete(item.session)"></p-button>
                                            </div>
                                        </div>
                                    </div>
                                }
                            </div>
                        </div>
                    }
                </div>
            }
        </p-card>

        <!-- Create / Edit dialog -->
        <p-dialog
            [header]="editingSession() ? 'Edit Class Session' : 'Add Class Session'"
            [visible]="formDialogVisible()"
            (visibleChange)="formDialogVisible.set($event)"
            [modal]="true"
            [closable]="true"
            [dismissableMask]="true"
            [style]="{ width: '620px', 'max-width': '95vw' }"
            (onHide)="closeFormDialog()">
            <form [formGroup]="form" (ngSubmit)="save()" class="flex flex-col gap-4">
                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-medium">Course *</label>
                    <p-select
                        formControlName="courseId"
                        [options]="courseOptions()"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Select course"
                        [filter]="true"
                        appendTo="body"
                        (onChange)="onCourseChange()"></p-select>
                    <small class="text-muted-color text-xs">Faculty is auto-filled from the course's assigned faculty.</small>
                    @if (form.get('courseId')?.touched && form.get('courseId')?.hasError('required')) {
                        <small class="text-red-500">Course is required.</small>
                    }
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Faculty *</label>
                        <p-select
                            formControlName="facultyId"
                            [options]="facultyOptions()"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Select faculty"
                            [filter]="true"
                            appendTo="body"></p-select>
                        @if (form.get('facultyId')?.touched && form.get('facultyId')?.hasError('required')) {
                            <small class="text-red-500">Faculty is required.</small>
                        }
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Room *</label>
                        <input pInputText formControlName="room" placeholder="e.g. A-204" />
                        @if (form.get('room')?.touched && form.get('room')?.hasError('required')) {
                            <small class="text-red-500">Room is required.</small>
                        }
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Day *</label>
                        <p-select formControlName="day" [options]="dayOptions()" optionLabel="label" optionValue="value" placeholder="Day" appendTo="body"></p-select>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Start *</label>
                        <p-select formControlName="startTime" [options]="timeOptions" optionLabel="label" optionValue="value" placeholder="Start" appendTo="body"></p-select>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">End *</label>
                        <p-select formControlName="endTime" [options]="timeOptions" optionLabel="label" optionValue="value" placeholder="End" appendTo="body"></p-select>
                    </div>
                </div>

                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-medium">Semester *</label>
                    <p-select formControlName="semesterId" [options]="semesterOptions()" optionLabel="label" optionValue="value" placeholder="Select semester" appendTo="body"></p-select>
                    @if (form.get('semesterId')?.touched && form.get('semesterId')?.hasError('required')) {
                        <small class="text-red-500">Semester is required.</small>
                    }
                </div>

                @if (timeRangeError) {
                    <div class="rounded border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
                        <i class="pi pi-clock mr-1"></i>
                        {{ timeRangeError }}
                    </div>
                }

                @if (conflicts.length > 0) {
                    <div class="rounded border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950 px-3 py-2">
                        <div class="flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-300 mb-1">
                            <i class="pi pi-exclamation-triangle"></i>
                            <span>Scheduling conflict{{ conflicts.length > 1 ? 's' : '' }} — resolve to save</span>
                        </div>
                        <ul class="list-disc pl-5 text-sm text-red-700 dark:text-red-300">
                            @for (c of conflicts; track c.message) {
                                <li>{{ c.message }}</li>
                            }
                        </ul>
                    </div>
                }

                <div class="flex justify-end gap-2 pt-2">
                    <p-button label="Cancel" severity="secondary" [text]="true" (onClick)="closeFormDialog()"></p-button>
                    <p-button
                        [label]="editingSession() ? 'Update' : 'Create'"
                        icon="pi pi-save"
                        type="submit"
                        [disabled]="conflicts.length > 0 || timeRangeError !== null"></p-button>
                </div>
            </form>
        </p-dialog>

        <p-toast></p-toast>
        <p-confirmDialog></p-confirmDialog>
    `
})
export class ClassRoutineList {
    private readonly core = inject(CoreDataService);
    private readonly confirm = inject(ConfirmationService);
    private readonly msg = inject(MessageService);
    private readonly fb = inject(FormBuilder);

    // ── Data signals ─────────────────────────────────────────────────────────
    classSessions = this.core.classSessions;
    courses = this.core.courses;
    facultyMembers = this.core.facultyMembers;
    semesters = this.core.semesters;
    departments = this.core.departments;
    programs = this.core.programs;

    settings = computed<SystemSettings>(() => this.core.store().settings);

    // ── Day / weekend configuration ──────────────────────────────────────────
    private readonly weekendDaySet = computed<Set<string>>(() => {
        const configured = this.settings().weekendDays;
        const days = configured && configured.length ? configured : DEFAULT_WEEKEND_DAYS;
        return new Set(days);
    });

    /** Local toggle; initialised from settings.visibleWeekendDays. */
    showWeekend = signal(this.settings().visibleWeekendDays.some((d) => this.weekendDaySet().has(d)));

    /** Sunday–Thursday by default; every day when the weekend toggle is on. */
    visibleDays = computed<string[]>(() => {
        if (this.showWeekend()) {
            return [...DAY_ORDER];
        }
        return DAY_ORDER.filter((d) => !this.weekendDaySet().has(d));
    });

    weekendLabels = computed(() => [...this.weekendDaySet()].join(', '));

    // ── Lookup maps ──────────────────────────────────────────────────────────
    private readonly courseMap = computed<Map<string, Course>>(() => {
        const map = new Map<string, Course>();
        for (const c of this.courses()) map.set(c.id, c);
        return map;
    });

    private readonly facultyMap = computed<Map<string, FacultyMember>>(() => {
        const map = new Map<string, FacultyMember>();
        for (const f of this.facultyMembers()) map.set(f.id, f);
        return map;
    });

    // ── Filters ──────────────────────────────────────────────────────────────
    departmentFilter = signal<string | null>(null);
    programFilter = signal<string | null>(null);
    semesterFilter = signal<string | null>(this.settings().currentSemesterId ?? null);
    facultyFilter = signal<string | null>(null);

    hasActiveFilters = computed(
        () => !!(this.departmentFilter() || this.programFilter() || this.semesterFilter() || this.facultyFilter())
    );

    departmentFilterOptions = computed(() => [
        { label: 'All Departments', value: null as string | null },
        ...this.departments().map((d) => ({ label: `${d.name} (${d.code})`, value: d.id as string | null }))
    ]);

    programFilterOptions = computed(() => {
        const dept = this.departmentFilter();
        const programs = dept ? this.programs().filter((p) => p.departmentId === dept) : this.programs();
        return [
            { label: 'All Programs', value: null as string | null },
            ...programs.map((p) => ({ label: `${p.name} (${p.code})`, value: p.id as string | null }))
        ];
    });

    semesterFilterOptions = computed(() => [
        { label: 'All Semesters', value: null as string | null },
        ...this.semesters().map((s) => ({ label: `${s.name} (${s.academicYear})`, value: s.id as string | null }))
    ]);

    facultyFilterOptions = computed(() => [
        { label: 'All Faculty', value: null as string | null },
        ...this.facultyMembers().map((f) => ({
            label: `${f.firstName} ${f.lastName} (${f.employeeId})`,
            value: f.id as string | null
        }))
    ]);

    onDepartmentFilterChange(value: string | null): void {
        this.departmentFilter.set(value);
        const prog = this.programFilter();
        if (value && prog) {
            const p = this.programs().find((x) => x.id === prog);
            if (p && p.departmentId !== value) this.programFilter.set(null);
        }
    }

    clearFilters(): void {
        this.departmentFilter.set(null);
        this.programFilter.set(null);
        this.semesterFilter.set(null);
        this.facultyFilter.set(null);
    }

    // ── Derived session list ─────────────────────────────────────────────────
    filteredSessions = computed<ClassSession[]>(() => {
        let list = this.classSessions();
        const dept = this.departmentFilter();
        const prog = this.programFilter();
        const sem = this.semesterFilter();
        const fac = this.facultyFilter();
        const courseMap = this.courseMap();
        if (dept) list = list.filter((s) => courseMap.get(s.courseId)?.departmentId === dept);
        if (prog) list = list.filter((s) => (courseMap.get(s.courseId)?.programIds ?? []).includes(prog));
        if (sem) list = list.filter((s) => s.semesterId === sem);
        if (fac) list = list.filter((s) => s.facultyId === fac);
        return list;
    });

    // ── Time grid ────────────────────────────────────────────────────────────
    gridStartHour = computed<number>(() => {
        const starts = this.classSessions()
            .map((s) => this.toMinutes(s.startTime))
            .filter((m) => Number.isFinite(m));
        if (!starts.length) return FALLBACK_START_HOUR;
        return Math.max(0, Math.floor(Math.min(...starts) / 60));
    });

    gridEndHour = computed<number>(() => {
        const ends = this.classSessions()
            .map((s) => this.toMinutes(s.endTime))
            .filter((m) => Number.isFinite(m));
        if (!ends.length) return FALLBACK_END_HOUR;
        const end = Math.ceil(Math.max(...ends) / 60);
        return Math.min(24, Math.max(end, this.gridStartHour() + 1));
    });

    slots = computed<TimeSlot[]>(() => {
        const start = this.gridStartHour();
        const end = this.gridEndHour();
        const out: TimeSlot[] = [];
        for (let h = start; h < end; h++) {
            out.push({ hour: h, label: this.minutesToLabel(h * 60), startMin: h * 60, endMin: (h + 1) * 60 });
        }
        if (!out.length) out.push({ hour: FALLBACK_START_HOUR, label: '08:00', startMin: 480, endMin: 540 });
        return out;
    });

    timeRangeLabel = computed(() => {
        const s = this.slots();
        const start = s.length ? s[0].label : '08:00';
        return `${start}–${this.minutesToLabel(this.gridEndHour() * 60)}`;
    });

    gridRows = computed<GridRow[]>(() => {
        const days = this.visibleDays();
        const slots = this.slots();
        const dayCells = days.map((d) => this.buildDayCells(d, slots.length));
        return slots.map((slot, i) => ({
            index: i,
            label: slot.label,
            cells: dayCells.map((col) => col[i])
        }));
    });

    mobileDays = computed(() =>
        this.visibleDays()
            .map((day) => ({ day, items: this.sessionsForDay(day) }))
            .filter((g) => g.items.length > 0)
    );

    private sessionsForDay(day: string): SessionView[] {
        return this.filteredSessions()
            .filter((s) => s.day === day)
            .map((s) => this.toView(s))
            .sort((a, b) => this.toMinutes(a.session.startTime) - this.toMinutes(b.session.startTime));
    }

    private buildDayCells(day: string, slotCount: number): GridCell[] {
        const cells: GridCell[] = Array.from({ length: slotCount }, () => ({ kind: 'empty' }) as GridCell);
        const slots = this.slots();
        if (!slots.length) return cells;

        for (const view of this.sessionsForDay(day)) {
            const s = view.session;
            const sm = this.toMinutes(s.startTime);
            const em = this.toMinutes(s.endTime);
            if (!Number.isFinite(sm) || !Number.isFinite(em) || em <= sm) continue;

            let startIdx = slots.findIndex((sl) => sm >= sl.startMin && sm < sl.endMin);
            if (startIdx < 0) startIdx = sm < slots[0].startMin ? 0 : slots.length - 1;

            let span = 0;
            for (let i = startIdx; i < slots.length; i++) {
                if (this.overlaps(sm, em, slots[i].startMin, slots[i].endMin)) span++;
                else if (slots[i].startMin >= em) break;
            }
            if (span < 1) span = 1;
            span = Math.min(span, slots.length - startIdx);

            if (cells[startIdx].kind !== 'empty') continue; // already occupied by an earlier block
            cells[startIdx] = { kind: 'session', view, rowSpan: span };
            for (let i = startIdx + 1; i < startIdx + span; i++) {
                if (cells[i].kind === 'empty') cells[i] = { kind: 'covered' };
            }
        }
        return cells;
    }

    // ── Display helpers ──────────────────────────────────────────────────────
    private toView(s: ClassSession): SessionView {
        const c = this.courseMap().get(s.courseId);
        return {
            session: s,
            courseCode: c?.code ?? s.courseId,
            courseTitle: c?.title ?? '—',
            facultyName: this.facultyName(s.facultyId),
            room: s.room
        };
    }

    courseCode(id: string): string {
        return this.courseMap().get(id)?.code ?? id;
    }

    facultyName(id: string | null | undefined): string {
        if (!id) return '—';
        const f = this.facultyMap().get(id);
        return f ? `${f.firstName} ${f.lastName}` : id;
    }

    semesterName(id: string): string {
        return this.semesters().find((s) => s.id === id)?.name ?? id;
    }

    private toMinutes(hhmm: string): number {
        const parts = (hhmm ?? '').split(':');
        const h = Number(parts[0]);
        const m = Number(parts[1]);
        if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
        return h * 60 + m;
    }

    private minutesToLabel(total: number): string {
        const h = Math.floor(total / 60);
        const m = total % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    private isValidTime(t: string): boolean {
        if (!/^\d{2}:\d{2}$/.test(t)) return false;
        const mins = this.toMinutes(t);
        return Number.isFinite(mins) && mins >= 0 && mins <= 24 * 60;
    }

    /** Overlap rule: aStart < bEnd && bStart < aEnd */
    private overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
        return aStart < bEnd && bStart < aEnd;
    }

    // ── Form ─────────────────────────────────────────────────────────────────
    formDialogVisible = signal(false);
    editingSession = signal<ClassSession | null>(null);

    courseOptions = computed(() => this.courses().map((c) => ({ label: `${c.code} — ${c.title}`, value: c.id })));

    facultyOptions = computed(() =>
        this.facultyMembers().map((f) => ({ label: `${f.firstName} ${f.lastName} (${f.employeeId})`, value: f.id }))
    );

    semesterOptions = computed(() =>
        this.semesters().map((s) => ({ label: `${s.name} (${s.academicYear})`, value: s.id }))
    );

    dayOptions = computed(() => {
        const days = [...this.visibleDays()];
        const editing = this.editingSession();
        if (editing && !days.includes(editing.day)) days.push(editing.day);
        return days.map((d) => ({ label: d, value: d }));
    });

    readonly timeOptions = this.buildTimeOptions();

    form = this.fb.nonNullable.group({
        courseId: ['', Validators.required],
        facultyId: ['', Validators.required],
        room: ['', Validators.required],
        day: ['Sunday', Validators.required],
        startTime: ['09:00', Validators.required],
        endTime: ['10:00', Validators.required],
        semesterId: ['', Validators.required]
    });

    private buildTimeOptions(): { label: string; value: string }[] {
        const out: { label: string; value: string }[] = [];
        for (let m = 7 * 60; m <= 21 * 60; m += 30) {
            const label = this.minutesToLabel(m);
            out.push({ label, value: label });
        }
        return out;
    }

    /** Live start < end validation shown inline. */
    get timeRangeError(): string | null {
        const raw = this.form.getRawValue();
        const start = raw.startTime;
        const end = raw.endTime;
        if (!start || !end) return null;
        if (!this.isValidTime(start) || !this.isValidTime(end)) return 'Enter valid times in HH:mm format.';
        if (this.toMinutes(start) >= this.toMinutes(end)) {
            return `Start time (${start}) must be earlier than end time (${end}).`;
        }
        return null;
    }

    /** Blocking room + faculty conflict detection, excluding the record being edited. */
    get conflicts(): Conflict[] {
        const raw = this.form.getRawValue();
        const out: Conflict[] = [];
        const start = raw.startTime;
        const end = raw.endTime;
        const day = raw.day;
        const semesterId = raw.semesterId;
        if (!day || !semesterId) return out;
        if (!this.isValidTime(start) || !this.isValidTime(end)) return out;
        const sm = this.toMinutes(start);
        const em = this.toMinutes(end);
        if (sm >= em) return out;

        const editingId = this.editingSession()?.id ?? null;
        const room = raw.room.trim();
        const others = this.classSessions().filter(
            (s) => s.id !== editingId && s.day === day && s.semesterId === semesterId
        );

        if (room) {
            const rc = others.find(
                (s) =>
                    s.room.trim().toLowerCase() === room.toLowerCase() &&
                    this.overlaps(sm, em, this.toMinutes(s.startTime), this.toMinutes(s.endTime))
            );
            if (rc) {
                out.push({
                    type: 'room',
                    message: `Room ${rc.room} is occupied by ${this.courseCode(rc.courseId)} at ${rc.startTime}.`
                });
            }
        }

        const facultyId = raw.facultyId;
        if (facultyId) {
            const fc = others.find(
                (s) =>
                    s.facultyId === facultyId &&
                    this.overlaps(sm, em, this.toMinutes(s.startTime), this.toMinutes(s.endTime))
            );
            if (fc) {
                out.push({
                    type: 'faculty',
                    message: `Faculty ${this.facultyName(fc.facultyId)} already teaches ${this.courseCode(fc.courseId)} at ${fc.startTime}.`
                });
            }
        }
        return out;
    }

    /** When a course is chosen, default faculty to that course's assigned faculty (guarding null). */
    onCourseChange(): void {
        const courseId = (this.form.get('courseId')?.value as string | null) ?? null;
        if (!courseId) return;
        const course = this.courseMap().get(courseId);
        if (course?.facultyId) {
            this.form.get('facultyId')?.setValue(course.facultyId);
        }
    }

    openCreate(): void {
        this.editingSession.set(null);
        const defaultDay = this.visibleDays()[0] ?? 'Sunday';
        const defaultSemester =
            this.semesterFilter() ?? this.settings().currentSemesterId ?? this.semesters()[0]?.id ?? '';
        this.form.reset({
            courseId: '',
            facultyId: '',
            room: '',
            day: defaultDay,
            startTime: '09:00',
            endTime: '10:00',
            semesterId: defaultSemester
        });
        this.formDialogVisible.set(true);
    }

    openEdit(session: ClassSession): void {
        this.editingSession.set(session);
        this.form.reset({
            courseId: session.courseId,
            facultyId: session.facultyId,
            room: session.room,
            day: session.day,
            startTime: session.startTime,
            endTime: session.endTime,
            semesterId: session.semesterId
        });
        this.formDialogVisible.set(true);
    }

    closeFormDialog(): void {
        this.formDialogVisible.set(false);
        this.editingSession.set(null);
    }

    save(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.msg.add({ severity: 'warn', summary: 'Validation', detail: 'Please fix the highlighted errors.' });
            return;
        }
        const raw = this.form.getRawValue();
        const courseId = raw.courseId;
        const facultyId = raw.facultyId;
        const room = raw.room.trim();
        const day = raw.day;
        const startTime = raw.startTime;
        const endTime = raw.endTime;
        const semesterId = raw.semesterId;

        if (!this.isValidTime(startTime) || !this.isValidTime(endTime)) {
            this.msg.add({ severity: 'error', summary: 'Invalid time', detail: 'Times must be in HH:mm format.' });
            return;
        }
        if (this.toMinutes(startTime) >= this.toMinutes(endTime)) {
            this.msg.add({
                severity: 'error',
                summary: 'Invalid time range',
                detail: `Start time (${startTime}) must be earlier than end time (${endTime}).`
            });
            return;
        }
        if (!room) {
            this.msg.add({ severity: 'error', summary: 'Validation', detail: 'Room is required.' });
            return;
        }
        if (!this.courses().some((c) => c.id === courseId)) {
            this.msg.add({ severity: 'error', summary: 'Invalid course', detail: 'Selected course does not exist.' });
            return;
        }
        if (!this.facultyMembers().some((f) => f.id === facultyId)) {
            this.msg.add({ severity: 'error', summary: 'Invalid faculty', detail: 'Selected faculty does not exist.' });
            return;
        }
        if (!this.semesters().some((s) => s.id === semesterId)) {
            this.msg.add({ severity: 'error', summary: 'Invalid semester', detail: 'Selected semester does not exist.' });
            return;
        }

        const active = this.conflicts;
        if (active.length) {
            this.msg.add({
                severity: 'error',
                summary: 'Schedule conflict',
                detail: active.map((c) => c.message).join(' ')
            });
            return;
        }

        const now = new Date().toISOString();
        const editing = this.editingSession();
        if (editing) {
            const updated: ClassSession = {
                ...editing,
                courseId,
                facultyId,
                room,
                day,
                startTime,
                endTime,
                semesterId,
                updatedAt: now
            };
            this.core.update<ClassSession & { id: string }>('classSessions', updated);
            this.msg.add({
                severity: 'success',
                summary: 'Updated',
                detail: `${this.courseCode(courseId)} on ${day} ${startTime}–${endTime} updated.`
            });
        } else {
            const created: ClassSession = {
                id: this.core.generateId('cs'),
                courseId,
                facultyId,
                room,
                day,
                startTime,
                endTime,
                semesterId,
                createdAt: now,
                updatedAt: now
            };
            this.core.create<ClassSession & { id: string }>('classSessions', created);
            this.msg.add({
                severity: 'success',
                summary: 'Created',
                detail: `${this.courseCode(courseId)} scheduled for ${day} ${startTime}–${endTime}.`
            });
        }
        this.closeFormDialog();
    }

    confirmDelete(session: ClassSession): void {
        const label = `${this.courseCode(session.courseId)} · ${session.day} ${session.startTime}–${session.endTime} · Room ${session.room}`;
        this.confirm.confirm({
            message: `Delete session "${label}"? This cannot be undone.`,
            header: 'Delete Class Session',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Delete',
            rejectLabel: 'Cancel',
            accept: () => {
                this.core.remove('classSessions', session.id);
                this.msg.add({ severity: 'success', summary: 'Deleted', detail: `Session for ${this.courseCode(session.courseId)} removed.` });
            }
        });
    }
}
