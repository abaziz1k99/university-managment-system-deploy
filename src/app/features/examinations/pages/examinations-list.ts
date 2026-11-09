import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { DatePickerModule } from 'primeng/datepicker';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { PageHeader } from '@/app/shared/components/page-header';
import { StatusTag } from '@/app/shared/components/status-tag';
import { EmptyState } from '@/app/shared/components/empty-state';
import { CoreDataService } from '@/app/core/services/core-data.service';
import { ExamService } from '@/app/core/services/exam.service';
import type { Examination } from '@/app/core/models/index';

type ExamType = Examination['type'];
type TagSeverity = 'success' | 'info' | 'warn' | 'danger' | 'contrast';

interface SelectOption<T> {
    label: string;
    value: T;
}

interface UpcomingGroup {
    key: string;
    label: string;
    items: Examination[];
}

@Component({
    selector: 'app-examinations-list',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        CardModule,
        ButtonModule,
        InputTextModule,
        InputNumberModule,
        SelectModule,
        TableModule,
        DialogModule,
        DatePickerModule,
        Tabs,
        TabList,
        Tab,
        TabPanels,
        TabPanel,
        TagModule,
        ToastModule,
        ConfirmDialogModule,
        TooltipModule,
        PageHeader,
        StatusTag,
        EmptyState
    ],
    providers: [ConfirmationService, MessageService],
    template: `
        <app-page-header title="Examinations" subtitle="Schedule exams, detect room/duplicate conflicts and track upcoming sessions">
            <p-button label="Add Exam" icon="pi pi-plus" (onClick)="openCreate()"></p-button>
        </app-page-header>

        <p-tabs [value]="activeTab()" (valueChange)="onTabChange($event)">
            <p-tablist>
                <p-tab value="schedule">Schedule</p-tab>
                <p-tab value="calendar">Calendar</p-tab>
            </p-tablist>
            <p-tabpanels>
                <!-- ── Schedule ─────────────────────────────────────────────── -->
                <p-tabpanel value="schedule">
                    <p-card>
                        <!-- Filters -->
                        <div class="flex flex-col xl:flex-row gap-3 mb-4">
                            <div class="flex-1">
                                <span class="relative block w-full">
                                    <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-muted-color"></i>
                                    <input
                                        pInputText
                                        type="text"
                                        placeholder="Search by title, course code or room..."
                                        class="w-full pl-10"
                                        [ngModel]="search()"
                                        (ngModelChange)="search.set($event)" />
                                </span>
                            </div>
                            <div class="flex gap-2 flex-wrap items-center">
                                <p-select
                                    [ngModel]="semesterFilter()"
                                    (ngModelChange)="semesterFilter.set($event)"
                                    [options]="semesterFilterOptions()"
                                    optionLabel="label"
                                    optionValue="value"
                                    placeholder="Semester"
                                    styleClass="w-52"
                                    appendTo="body"
                                    [showClear]="true">
                                </p-select>
                                <p-select
                                    [ngModel]="typeFilter()"
                                    (ngModelChange)="typeFilter.set($event)"
                                    [options]="typeFilterOptions"
                                    optionLabel="label"
                                    optionValue="value"
                                    placeholder="Type"
                                    styleClass="w-40"
                                    appendTo="body"
                                    [showClear]="true">
                                </p-select>
                            </div>
                        </div>

                        <div class="flex flex-wrap items-center gap-3 mb-3 text-xs text-muted-color">
                            <span>Showing {{ filteredExams().length }} of {{ exams().length }} exam(s)</span>
                            <span class="inline-flex items-center gap-1.5">
                                <span class="w-2 h-2 rounded-full bg-primary inline-block"></span>
                                {{ upcomingCount() }} upcoming
                            </span>
                            <span class="inline-flex items-center gap-1.5">
                                <span class="w-2 h-2 rounded-full bg-surface-300 dark:bg-surface-600 inline-block"></span>
                                {{ pastCount() }} past
                            </span>
                            @if (hasFilters()) {
                                <a class="text-primary cursor-pointer underline" (click)="clearFilters()">Clear filters</a>
                            }
                        </div>

                        @if (filteredExams().length === 0) {
                            <app-empty-state
                                icon="pi pi-calendar-plus"
                                [title]="hasFilters() ? 'No matching exams' : 'No exams scheduled'"
                                [message]="hasFilters() ? 'Adjust or clear the filters to see more examinations.' : 'Create your first examination to build the exam schedule.'"
                                [actionLabel]="hasFilters() ? 'Clear filters' : 'Add Exam'"
                                (action)="onEmptyAction()"></app-empty-state>
                        } @else {
                            <div class="overflow-x-auto">
                                <p-table
                                    [value]="filteredExams()"
                                    dataKey="id"
                                    [paginator]="true"
                                    [rows]="rows()"
                                    [rowsPerPageOptions]="rowsPerPageOptions"
                                    (onPage)="onPageChange($event)"
                                    sortMode="single"
                                    [tableStyle]="{ 'min-width': '76rem' }"
                                    styleClass="w-full"
                                    currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
                                    [showCurrentPageReport]="true">
                                    <ng-template pTemplate="header">
                                        <tr>
                                            <th pSortableColumn="courseId" style="width:120px">Course <p-sortIcon field="courseId"></p-sortIcon></th>
                                            <th pSortableColumn="title" style="min-width:200px">Title <p-sortIcon field="title"></p-sortIcon></th>
                                            <th pSortableColumn="type" style="width:120px">Type <p-sortIcon field="type"></p-sortIcon></th>
                                            <th pSortableColumn="semesterId" style="width:150px">Semester <p-sortIcon field="semesterId"></p-sortIcon></th>
                                            <th pSortableColumn="date" style="width:130px">Date <p-sortIcon field="date"></p-sortIcon></th>
                                            <th style="width:140px">Time</th>
                                            <th pSortableColumn="room" style="width:110px">Room <p-sortIcon field="room"></p-sortIcon></th>
                                            <th pSortableColumn="maxMarks" style="width:100px">Max <p-sortIcon field="maxMarks"></p-sortIcon></th>
                                            <th style="width:120px">Status</th>
                                            <th style="width:120px">Actions</th>
                                        </tr>
                                    </ng-template>
                                    <ng-template pTemplate="body" let-row>
                                        <tr>
                                            <td><p-tag [value]="courseCode(row.courseId)" severity="secondary"></p-tag></td>
                                            <td class="font-medium">{{ row.title }}</td>
                                            <td>
                                                <p-tag [value]="row.type" [severity]="typeSeverity(row.type)"></p-tag>
                                            </td>
                                            <td class="text-sm">{{ semesterName(row.semesterId) }}</td>
                                            <td class="text-sm">{{ row.date }}</td>
                                            <td class="text-sm">{{ row.startTime }} – {{ row.endTime }}</td>
                                            <td class="text-sm">{{ row.room }}</td>
                                            <td class="text-center">{{ row.maxMarks }}</td>
                                            <td>
                                                <app-status-tag
                                                    [status]="examStatus(row.date)"
                                                    [customSeverity]="statusSeverity(examStatus(row.date))"></app-status-tag>
                                            </td>
                                            <td>
                                                <div class="flex items-center gap-1">
                                                    <p-button
                                                        icon="pi pi-pencil"
                                                        [rounded]="true"
                                                        [text]="true"
                                                        severity="info"
                                                        size="small"
                                                        pTooltip="Edit exam"
                                                        tooltipPosition="top"
                                                        (onClick)="openEdit(row)"></p-button>
                                                    <p-button
                                                        icon="pi pi-trash"
                                                        [rounded]="true"
                                                        [text]="true"
                                                        severity="danger"
                                                        size="small"
                                                        pTooltip="Delete exam"
                                                        tooltipPosition="top"
                                                        (onClick)="confirmDelete(row)"></p-button>
                                                </div>
                                            </td>
                                        </tr>
                                    </ng-template>
                                    <ng-template pTemplate="emptymessage">
                                        <tr>
                                            <td colspan="10" class="text-center py-10 text-muted-color">No exams match the current filters.</td>
                                        </tr>
                                    </ng-template>
                                </p-table>
                            </div>

                            <div class="flex justify-end items-center gap-2 mt-3">
                                <span class="text-xs text-muted-color">Rows per page</span>
                                <p-select
                                    [ngModel]="rows()"
                                    (ngModelChange)="rows.set($event)"
                                    [options]="pageSizeOptions"
                                    optionLabel="label"
                                    optionValue="value"
                                    styleClass="w-24">
                                </p-select>
                            </div>
                        }
                    </p-card>
                </p-tabpanel>

                <!-- ── Calendar ─────────────────────────────────────────────── -->
                <p-tabpanel value="calendar">
                    <p-card>
                        <div class="flex items-center justify-between mb-4">
                            <div>
                                <h2 class="text-sm font-semibold">Upcoming exams</h2>
                                <p class="text-xs text-muted-color mt-0.5">Grouped by month · {{ upcomingCount() }} session(s) from today onwards</p>
                            </div>
                            <p-button label="Add Exam" icon="pi pi-plus" size="small" [outlined]="true" (onClick)="openCreate()"></p-button>
                        </div>

                        @if (upcomingGroups().length === 0) {
                            <app-empty-state
                                icon="pi pi-calendar"
                                title="No upcoming exams"
                                message="There are no examinations scheduled from today onwards. Create one to populate the timeline."
                                actionLabel="Add Exam"
                                (action)="openCreate()"></app-empty-state>
                        } @else {
                            @for (group of upcomingGroups(); track group.key) {
                                <div class="mb-5">
                                    <div class="flex items-center gap-2 mb-2">
                                        <span class="inline-block w-2.5 h-2.5 rounded-full bg-primary"></span>
                                        <h3 class="text-sm font-semibold">{{ group.label }}</h3>
                                        <span class="text-xs text-muted-color">({{ group.items.length }})</span>
                                    </div>
                                    <div class="flex flex-col gap-2 border-l-2 border-surface-200 dark:border-surface-700 pl-4">
                                        @for (ex of group.items; track ex.id) {
                                            <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                                <div class="flex items-center gap-3">
                                                    <div class="w-14 shrink-0 text-center">
                                                        <div class="text-lg font-bold leading-none">{{ dayOfMonth(ex.date) }}</div>
                                                        <div class="text-[10px] uppercase text-muted-color">{{ dayName(ex.date) }}</div>
                                                    </div>
                                                    <div class="min-w-0">
                                                        <div class="font-medium truncate">{{ courseCode(ex.courseId) }} — {{ ex.title }}</div>
                                                        <div class="text-xs text-muted-color mt-0.5">
                                                            {{ ex.date }} · {{ ex.startTime }}–{{ ex.endTime }} · Room {{ ex.room }} · Max {{ ex.maxMarks }}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div class="flex items-center gap-2 shrink-0">
                                                    <p-tag [value]="ex.type" [severity]="typeSeverity(ex.type)"></p-tag>
                                                    <p-button
                                                        icon="pi pi-pencil"
                                                        [rounded]="true"
                                                        [text]="true"
                                                        severity="secondary"
                                                        size="small"
                                                        pTooltip="Edit exam"
                                                        tooltipPosition="top"
                                                        (onClick)="openEdit(ex)"></p-button>
                                                </div>
                                            </div>
                                        }
                                    </div>
                                </div>
                            }
                        }
                    </p-card>
                </p-tabpanel>
            </p-tabpanels>
        </p-tabs>

        <!-- Create / Edit Dialog -->
        <p-dialog
            [header]="editingExam() ? 'Edit Exam' : 'Schedule Exam'"
            [visible]="formDialogVisible()"
            (visibleChange)="formDialogVisible.set($event)"
            [modal]="true"
            [closable]="true"
            [dismissableMask]="true"
            [style]="{ width: '720px', 'max-width': '95vw' }"
            (onHide)="closeFormDialog()">
            <form [formGroup]="form" (ngSubmit)="save()" class="flex flex-col gap-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Course *</label>
                        <p-select
                            formControlName="courseId"
                            [options]="courseOptions()"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Select course"
                            [filter]="true"
                            appendTo="body">
                        </p-select>
                        @if (form.get('courseId')?.touched && form.get('courseId')?.hasError('required')) {
                            <small class="text-red-500">Course is required.</small>
                        }
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Semester *</label>
                        <p-select
                            formControlName="semesterId"
                            [options]="semesterOptions()"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Select semester"
                            appendTo="body">
                        </p-select>
                        @if (form.get('semesterId')?.touched && form.get('semesterId')?.hasError('required')) {
                            <small class="text-red-500">Semester is required.</small>
                        }
                    </div>
                </div>

                @if (selectedSemester(); as sem) {
                    <p class="text-xs text-muted-color -mt-2">
                        Term window: <span class="font-medium">{{ sem.startDate }} – {{ sem.endDate }}</span>. The exam date must fall inside this range.
                    </p>
                }

                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-medium">Title *</label>
                    <input pInputText formControlName="title" placeholder="e.g. CSE-201 Final" />
                    @if (form.get('title')?.touched && form.get('title')?.hasError('required')) {
                        <small class="text-red-500">Title is required.</small>
                    }
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Type *</label>
                        <p-select formControlName="type" [options]="typeOptions" optionLabel="label" optionValue="value" appendTo="body"></p-select>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Date *</label>
                        <p-datepicker formControlName="date" dateFormat="yy-mm-dd" [showIcon]="true" placeholder="YYYY-MM-DD" appendTo="body" styleClass="w-full"></p-datepicker>
                        @if (form.get('date')?.touched && form.get('date')?.hasError('required')) {
                            <small class="text-red-500">Date is required.</small>
                        }
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Start Time *</label>
                        <input pInputText type="time" step="300" formControlName="startTime" class="w-full" />
                        @if (form.get('startTime')?.touched && form.get('startTime')?.hasError('required')) {
                            <small class="text-red-500">Start time is required.</small>
                        }
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">End Time *</label>
                        <input pInputText type="time" step="300" formControlName="endTime" class="w-full" />
                        @if (form.get('endTime')?.touched && form.get('endTime')?.hasError('required')) {
                            <small class="text-red-500">End time is required.</small>
                        }
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Room *</label>
                        <input pInputText formControlName="room" placeholder="e.g. A-201" />
                        @if (form.get('room')?.touched && form.get('room')?.hasError('required')) {
                            <small class="text-red-500">Room is required.</small>
                        }
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Max Marks *</label>
                        <p-inputnumber formControlName="maxMarks" [min]="1" [max]="1000" [showButtons]="true" styleClass="w-full"></p-inputnumber>
                        @if (form.get('maxMarks')?.touched && (form.get('maxMarks')?.hasError('required') || form.get('maxMarks')?.hasError('min'))) {
                            <small class="text-red-500">Max marks must be greater than 0.</small>
                        }
                    </div>
                </div>

                @if (conflicts().length > 0) {
                    <div class="rounded border border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                        <div class="font-medium flex items-center gap-2 mb-1">
                            <i class="pi pi-exclamation-triangle"></i>
                            {{ conflicts().length }} conflict(s) — resolve before saving
                        </div>
                        <ul class="list-disc pl-5 space-y-0.5">
                            @for (conflict of conflicts(); track conflict) {
                                <li>{{ conflict }}</li>
                            }
                        </ul>
                    </div>
                }

                <div class="flex justify-end gap-2 pt-2">
                    <p-button label="Cancel" severity="secondary" [text]="true" (onClick)="closeFormDialog()"></p-button>
                    <p-button [label]="editingExam() ? 'Update' : 'Create'" icon="pi pi-save" type="submit"></p-button>
                </div>
            </form>
        </p-dialog>

        <p-toast></p-toast>
        <p-confirmDialog></p-confirmDialog>
    `
})
export class ExaminationsList {
    private readonly core = inject(CoreDataService);
    private readonly exam = inject(ExamService);
    private readonly fb = inject(FormBuilder);
    private readonly confirm = inject(ConfirmationService);
    private readonly msg = inject(MessageService);

    // ── Core data signals ─────────────────────────────────────────────────────
    private readonly courses = this.core.courses;
    private readonly semesters = this.core.semesters;
    private readonly studentResults = this.core.studentResults;

    readonly exams = computed<Examination[]>(() => this.exam.list());

    // ── Filters / paging ──────────────────────────────────────────────────────
    readonly search = signal('');
    readonly semesterFilter = signal<string | null>(null);
    readonly typeFilter = signal<ExamType | null>(null);
    readonly rows = signal(10);
    readonly rowsPerPageOptions: number[] = [10, 25, 50, 100];
    readonly pageSizeOptions: SelectOption<number>[] = [
        { label: '10', value: 10 },
        { label: '25', value: 25 },
        { label: '50', value: 50 },
        { label: '100', value: 100 }
    ];
    readonly activeTab = signal<string | number>('schedule');

    readonly typeOptions: SelectOption<ExamType>[] = [
        { label: 'Midterm', value: 'MIDTERM' },
        { label: 'Final', value: 'FINAL' },
        { label: 'Quiz', value: 'QUIZ' },
        { label: 'Practical', value: 'PRACTICAL' }
    ];

    readonly typeFilterOptions: SelectOption<ExamType | null>[] = [
        { label: 'All Types', value: null },
        { label: 'Midterm', value: 'MIDTERM' },
        { label: 'Final', value: 'FINAL' },
        { label: 'Quiz', value: 'QUIZ' },
        { label: 'Practical', value: 'PRACTICAL' }
    ];

    readonly semesterFilterOptions = computed<SelectOption<string | null>[]>(() => [
        { label: 'All Semesters', value: null },
        ...this.semesters().map((s) => ({ label: `${s.name} (${s.academicYear})`, value: s.id }))
    ]);

    readonly semesterOptions = computed<SelectOption<string>[]>(() =>
        this.semesters().map((s) => ({ label: `${s.name} (${s.academicYear})`, value: s.id }))
    );

    readonly courseOptions = computed<SelectOption<string>[]>(() =>
        [...this.courses()]
            .sort((a, b) => a.code.localeCompare(b.code))
            .map((c) => ({ label: `${c.code} — ${c.title}`, value: c.id }))
    );

    // ── Derived views ─────────────────────────────────────────────────────────
    readonly todayStr = computed(() => this.toIsoDate(new Date()));

    readonly filteredExams = computed<Examination[]>(() => {
        const q = this.search().trim().toLowerCase();
        const semester = this.semesterFilter();
        const type = this.typeFilter();
        let list = this.exams();

        if (semester) {
            list = list.filter((e) => e.semesterId === semester);
        }
        if (type) {
            list = list.filter((e) => e.type === type);
        }
        if (q) {
            list = list.filter((e) => {
                const code = this.courseCode(e.courseId).toLowerCase();
                return e.title.toLowerCase().includes(q) || e.room.toLowerCase().includes(q) || code.includes(q);
            });
        }

        return [...list].sort((a, b) => (a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)));
    });

    readonly hasFilters = computed(() => !!this.search().trim() || !!this.semesterFilter() || !!this.typeFilter());

    readonly upcomingCount = computed(() => this.exams().filter((e) => e.date >= this.todayStr()).length);
    readonly pastCount = computed(() => this.exams().filter((e) => e.date < this.todayStr()).length);

    /** Upcoming exams (date >= today), sorted by date then start time. */
    readonly upcoming = computed<Examination[]>(() =>
        this.exams()
            .filter((e) => e.date >= this.todayStr())
            .sort((a, b) => (a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)))
    );

    /** Upcoming exams grouped by calendar month. */
    readonly upcomingGroups = computed<UpcomingGroup[]>(() => {
        const groups = new Map<string, Examination[]>();
        for (const e of this.upcoming()) {
            const key = e.date.slice(0, 7);
            const bucket = groups.get(key);
            if (bucket) {
                bucket.push(e);
            } else {
                groups.set(key, [e]);
            }
        }
        return [...groups.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([key, items]) => ({ key, label: this.monthLabel(key), items }));
    });

    // ── Dialog / form state ───────────────────────────────────────────────────
    readonly formDialogVisible = signal(false);
    readonly editingExam = signal<Examination | null>(null);

    /** Bumped on every form change so the `conflicts` computed re-evaluates. */
    private readonly formTick = signal(0);

    readonly form = this.fb.nonNullable.group({
        courseId: ['', Validators.required],
        semesterId: ['', Validators.required],
        title: ['', Validators.required],
        type: ['MIDTERM' as ExamType, Validators.required],
        date: [null as Date | null, Validators.required],
        startTime: ['', Validators.required],
        endTime: ['', Validators.required],
        room: ['', Validators.required],
        maxMarks: [100 as number | null, [Validators.required, Validators.min(1)]]
    });

    readonly selectedSemester = computed(() => {
        const semesterId = this.form.get('semesterId')?.value ?? '';
        return semesterId ? this.semesters().find((s) => s.id === semesterId) ?? null : null;
    });

    /**
     * Live, blocking conflict checks for the current form values. Mirrors the
     * server-side rule set and is shown inline in the dialog and enforced on submit.
     */
    readonly conflicts = computed<string[]>(() => {
        this.formTick();
        const raw = this.form.getRawValue();
        const editingId = this.editingExam()?.id ?? null;
        const all = this.exam.list();
        const list: string[] = [];

        const courseId = raw.courseId;
        const semesterId = raw.semesterId;
        const type = raw.type;
        const date = raw.date ? this.toIsoDate(raw.date) : '';
        const startTime = raw.startTime.trim();
        const endTime = raw.endTime.trim();
        const room = raw.room.trim();
        const maxMarks = raw.maxMarks ?? 0;

        if (startTime && endTime && startTime >= endTime) {
            list.push(`Start time (${startTime}) must be before end time (${endTime}).`);
        }
        if (maxMarks <= 0) {
            list.push('Max marks must be greater than 0.');
        }

        const sem = semesterId ? this.semesters().find((s) => s.id === semesterId) ?? null : null;
        if (sem && date && (date < sem.startDate || date > sem.endDate)) {
            list.push(`Exam date must be within ${sem.name} (${sem.startDate} – ${sem.endDate}).`);
        }

        if (courseId && semesterId && type) {
            const duplicate = all.find((e) => e.id !== editingId && e.courseId === courseId && e.semesterId === semesterId && e.type === type);
            const course = this.courses().find((c) => c.id === courseId);
            if (duplicate && sem && course) {
                list.push(`A ${type} exam for ${course.code} already exists in ${sem.name}.`);
            }
        }

        if (room && date && startTime && endTime && startTime < endTime) {
            const clash = all.find(
                (e) =>
                    e.id !== editingId &&
                    e.room.trim().toLowerCase() === room.toLowerCase() &&
                    e.date === date &&
                    startTime < e.endTime &&
                    e.startTime < endTime
            );
            if (clash) {
                list.push(`Room ${clash.room} is already booked by ${clash.title} at ${clash.startTime}-${clash.endTime}.`);
            }
        }

        return list;
    });

    constructor() {
        // Any keystroke/selection re-runs the conflict detection above.
        this.form.valueChanges.subscribe(() => this.formTick.update((v) => v + 1));
    }

    // ── Display helpers ───────────────────────────────────────────────────────
    courseCode(id: string): string {
        return this.courses().find((c) => c.id === id)?.code ?? id;
    }

    semesterName(id: string): string {
        return this.semesters().find((s) => s.id === id)?.name ?? id;
    }

    typeSeverity(type: ExamType): TagSeverity {
        switch (type) {
            case 'FINAL':
                return 'danger';
            case 'MIDTERM':
                return 'info';
            case 'QUIZ':
                return 'warn';
            case 'PRACTICAL':
                return 'success';
            default:
                return 'contrast';
        }
    }

    examStatus(date: string): 'UPCOMING' | 'TODAY' | 'COMPLETED' {
        const today = this.todayStr();
        if (date < today) {
            return 'COMPLETED';
        }
        if (date === today) {
            return 'TODAY';
        }
        return 'UPCOMING';
    }

    statusSeverity(status: string): TagSeverity | undefined {
        if (status === 'TODAY') {
            return 'warn';
        }
        if (status === 'COMPLETED') {
            return 'contrast';
        }
        return undefined;
    }

    dayOfMonth(iso: string): string {
        return iso.slice(8, 10);
    }

    dayName(iso: string): string {
        const d = this.toDate(iso);
        return d ? d.toLocaleDateString('en-US', { weekday: 'short' }) : '';
    }

    monthLabel(key: string): string {
        const year = Number(key.slice(0, 4));
        const month = Number(key.slice(5, 7));
        return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    // ── Filter / paging handlers ──────────────────────────────────────────────
    onTabChange(value: string | number | undefined): void {
        this.activeTab.set(value ?? 'schedule');
    }

    onPageChange(event: { rows: number }): void {
        if (event.rows !== this.rows()) {
            this.rows.set(event.rows);
        }
    }

    clearFilters(): void {
        this.search.set('');
        this.semesterFilter.set(null);
        this.typeFilter.set(null);
    }

    onEmptyAction(): void {
        if (this.hasFilters()) {
            this.clearFilters();
        } else {
            this.openCreate();
        }
    }

    // ── Create / edit ─────────────────────────────────────────────────────────
    openCreate(): void {
        this.editingExam.set(null);
        const activeSemester = this.semesters().find((s) => s.status === 'ACTIVE') ?? this.semesters()[0];
        this.form.reset({
            courseId: this.courses()[0]?.id ?? '',
            semesterId: activeSemester?.id ?? '',
            title: '',
            type: 'MIDTERM',
            date: null,
            startTime: '10:00',
            endTime: '12:00',
            room: '',
            maxMarks: 100
        });
        this.formTick.update((v) => v + 1);
        this.formDialogVisible.set(true);
    }

    openEdit(row: Examination): void {
        this.editingExam.set(row);
        this.form.reset({
            courseId: row.courseId,
            semesterId: row.semesterId,
            title: row.title,
            type: row.type,
            date: this.toDate(row.date),
            startTime: row.startTime,
            endTime: row.endTime,
            room: row.room,
            maxMarks: row.maxMarks
        });
        this.formTick.update((v) => v + 1);
        this.formDialogVisible.set(true);
    }

    closeFormDialog(): void {
        this.formDialogVisible.set(false);
        this.editingExam.set(null);
    }

    save(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.msg.add({ severity: 'warn', summary: 'Validation', detail: 'Please fix the highlighted errors.' });
            return;
        }

        const conflicts = this.conflicts();
        if (conflicts.length > 0) {
            const extra = conflicts.length > 1 ? ` (+${conflicts.length - 1} more)` : '';
            this.msg.add({ severity: 'error', summary: 'Cannot save exam', detail: conflicts[0] + extra });
            return;
        }

        const raw = this.form.getRawValue();
        const courseId = raw.courseId;
        const semesterId = raw.semesterId;
        const title = raw.title.trim();
        const type = raw.type;
        const date = raw.date ? this.toIsoDate(raw.date) : '';
        const startTime = raw.startTime.trim();
        const endTime = raw.endTime.trim();
        const room = raw.room.trim();
        const maxMarks = Number(raw.maxMarks ?? 0);

        const editing = this.editingExam();
        if (editing) {
            const updated: Examination = {
                ...editing,
                courseId,
                semesterId,
                title,
                type,
                date,
                startTime,
                endTime,
                room,
                maxMarks,
                updatedAt: new Date().toISOString()
            };
            this.exam.update(updated);
            this.msg.add({ severity: 'success', summary: 'Updated', detail: `Exam "${title}" updated.` });
        } else {
            this.exam.create({ courseId, semesterId, title, type, date, startTime, endTime, room, maxMarks });
            this.msg.add({ severity: 'success', summary: 'Scheduled', detail: `Exam "${title}" created.` });
        }
        this.closeFormDialog();
    }

    confirmDelete(row: Examination): void {
        const code = this.courseCode(row.courseId);
        const results = this.studentResults().filter((r) => r.courseId === row.courseId);
        if (results.length > 0) {
            this.confirm.confirm({
                message: `Cannot delete "${row.title}": ${results.length} result(s) already exist for ${code}. Remove those results first.`,
                header: 'Delete Blocked',
                icon: 'pi pi-ban',
                acceptLabel: 'OK',
                rejectVisible: false,
                accept: () => {}
            });
            return;
        }
        this.confirm.confirm({
            message: `Delete exam "${row.title}" (${code}, ${row.date})? This cannot be undone.`,
            header: 'Delete Exam',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Delete',
            rejectLabel: 'Cancel',
            accept: () => {
                try {
                    this.exam.remove(row.id);
                    this.msg.add({ severity: 'success', summary: 'Deleted', detail: `Exam "${row.title}" removed.` });
                } catch (error) {
                    const detail = error instanceof Error ? error.message : 'Unable to delete this examination.';
                    this.msg.add({ severity: 'error', summary: 'Delete failed', detail });
                }
            }
        });
    }

    // ── Date helpers (local parts, never toISOString) ─────────────────────────
    private toIsoDate(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    private toDate(iso: string): Date | null {
        if (!iso) {
            return null;
        }
        const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
        if (match) {
            return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
        }
        const d = new Date(iso);
        return Number.isNaN(d.getTime()) ? null : d;
    }
}
