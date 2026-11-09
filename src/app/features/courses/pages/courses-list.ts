import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { PageHeader } from '@/app/shared/components/page-header';
import { StatusTag } from '@/app/shared/components/status-tag';
import { CoreDataService } from '@/app/core/services/core-data.service';
import { Course, Department, Program, FacultyMember, ClassSession, Semester } from '@/app/core/models/index';

type CourseType = Course['type'];
type CourseStatus = Course['status'];

@Component({
    selector: 'app-courses-list',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        CardModule,
        ButtonModule,
        InputTextModule,
        SelectModule,
        MultiSelectModule,
        TagModule,
        TableModule,
        DialogModule,
        ToastModule,
        ConfirmDialogModule,
        PageHeader,
        StatusTag
    ],
    providers: [ConfirmationService, MessageService],
    template: `
        <app-page-header title="Courses" subtitle="Catalog of courses — searchable, filterable and linked to programs, faculty and schedule">
            <p-button label="Add Course" icon="pi pi-plus" (onClick)="openCreate()"></p-button>
        </app-page-header>

        <p-card>
            <!-- Filters -->
            <div class="flex flex-col xl:flex-row gap-3 mb-4">
                <div class="flex-1">
                    <span class="relative block w-full">
                        <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-muted-color"></i>
                        <input
                            pInputText
                            type="text"
                            placeholder="Search by code or title..."
                            class="w-full pl-10"
                            [ngModel]="search()"
                            (ngModelChange)="search.set($event)" />
                    </span>
                </div>
                <div class="flex gap-2 flex-wrap items-center">
                    <p-select
                        [ngModel]="departmentFilter()"
                        (ngModelChange)="departmentFilter.set($event)"
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
                        [options]="semesterFilterOptions"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Semester"
                        styleClass="w-36"
                        [showClear]="true">
                    </p-select>
                    <p-select
                        [ngModel]="typeFilter()"
                        (ngModelChange)="typeFilter.set($event)"
                        [options]="typeFilterOptions"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Type"
                        styleClass="w-36"
                        [showClear]="true">
                    </p-select>
                    <p-select
                        [ngModel]="statusFilter()"
                        (ngModelChange)="statusFilter.set($event)"
                        [options]="statusFilterOptions"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Status"
                        styleClass="w-36"
                        [showClear]="true">
                    </p-select>
                </div>
            </div>

            <p class="text-xs text-muted-color mb-3">
                Showing {{ filteredCourses().length }} of {{ courses().length }} courses
                @if (search() || departmentFilter() || programFilter() || semesterFilter() || typeFilter() || statusFilter()) {
                    <span> · <a class="text-primary cursor-pointer underline" (click)="clearFilters()">Clear filters</a></span>
                }
            </p>

            <p-table
                [value]="filteredCourses()"
                dataKey="id"
                [paginator]="true"
                [rows]="rows()"
                [rowsPerPageOptions]="rowsPerPageOptions"
                (onPage)="onPageChange($event)"
                sortMode="single"
                [tableStyle]="{ 'min-width': '80rem' }"
                styleClass="w-full"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
                [showCurrentPageReport]="true">
                <ng-template pTemplate="header">
                    <tr>
                        <th pSortableColumn="code" style="width:130px">Code <p-sortIcon field="code"></p-sortIcon></th>
                        <th pSortableColumn="title" style="min-width: 240px">Title <p-sortIcon field="title"></p-sortIcon></th>
                        <th pSortableColumn="departmentId" style="width:170px">Department <p-sortIcon field="departmentId"></p-sortIcon></th>
                        <th style="width:160px">Programs</th>
                        <th pSortableColumn="credits" style="width:90px">Credits <p-sortIcon field="credits"></p-sortIcon></th>
                        <th pSortableColumn="type" style="width:110px">Type <p-sortIcon field="type"></p-sortIcon></th>
                        <th pSortableColumn="semester" style="width:90px">Sem <p-sortIcon field="semester"></p-sortIcon></th>
                        <th style="width:150px">Faculty</th>
                        <th pSortableColumn="status" style="width:110px">Status <p-sortIcon field="status"></p-sortIcon></th>
                        <th style="width:140px">Actions</th>
                    </tr>
                </ng-template>
                <ng-template pTemplate="body" let-row>
                    <tr (click)="openDetail(row)" class="cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800">
                        <td><p-tag [value]="row.code" severity="secondary"></p-tag></td>
                        <td class="font-medium"><span class="hover:underline">{{ row.title }}</span></td>
                        <td class="text-sm">{{ departmentName(row.departmentId) }}</td>
                        <td>
                            <div class="flex flex-wrap gap-1">
                                @for (pid of (row.programIds || []).slice(0,2); track pid) {
                                    <p-tag [value]="programCode(pid)" severity="info"></p-tag>
                                }
                                @if ((row.programIds || []).length > 2) {
                                    <span class="text-xs text-muted-color">+{{ (row.programIds || []).length - 2 }}</span>
                                }
                                @if ((row.programIds || []).length === 0) {
                                    <span class="text-xs text-muted-color">—</span>
                                }
                            </div>
                        </td>
                        <td class="text-center">{{ row.credits }}</td>
                        <td><p-tag [value]="row.type" [severity]="row.type === 'CORE' ? 'success' : row.type === 'LAB' ? 'warn' : 'info'"></p-tag></td>
                        <td class="text-center">{{ row.semester }}</td>
                        <td class="text-sm">{{ facultyDisplay(row.facultyId) }}</td>
                        <td><app-status-tag [status]="row.status"></app-status-tag></td>
                        <td>
                            <div class="flex items-center gap-1">
                                <p-button icon="pi pi-eye" [rounded]="true" [text]="true" severity="secondary" size="small" (onClick)="$event.stopPropagation(); openDetail(row)"></p-button>
                                <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" severity="info" size="small" (onClick)="$event.stopPropagation(); openEdit(row)"></p-button>
                                <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger" size="small" (onClick)="$event.stopPropagation(); confirmDelete(row)"></p-button>
                            </div>
                        </td>
                    </tr>
                </ng-template>
                <ng-template pTemplate="emptymessage">
                    <tr>
                        <td colspan="10" class="text-center py-10 text-muted-color">
                            No courses match your criteria.
                            @if (search() || departmentFilter() || programFilter() || semesterFilter() || typeFilter() || statusFilter()) {
                                <span> Try adjusting filters or <a class="text-primary cursor-pointer underline" (click)="clearFilters()">clear all</a>.</span>
                            }
                        </td>
                    </tr>
                </ng-template>
            </p-table>

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
        </p-card>

        <!-- Inline Detail Section -->
        @if (detailCourse(); as course) {
            <div id="course-detail-inline"></div>
            <p-card styleClass="mt-4">
                <div class="flex items-start justify-between gap-3 mb-4">
                    <div>
                        <h2 class="text-lg font-semibold">{{ course.code }} — {{ course.title }}</h2>
                        <p class="text-xs text-muted-color mt-1">
                            <p-tag [value]="course.code" severity="secondary" class="mr-2"></p-tag>
                            <p-tag [value]="course.type" [severity]="course.type === 'CORE' ? 'success' : course.type === 'LAB' ? 'warn' : 'info'" class="mr-2"></p-tag>
                            {{ departmentName(course.departmentId) }} · Semester {{ course.semester }} · {{ course.credits }} credits
                        </p>
                    </div>
                    <p-button icon="pi pi-times" [rounded]="true" [text]="true" severity="secondary" (onClick)="closeDetail()"></p-button>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                    <div class="rounded border border-surface-200 dark:border-surface-700 p-3">
                        <div class="text-xs text-muted-color">Credits</div>
                        <div class="font-semibold mt-1">{{ course.credits }}</div>
                    </div>
                    <div class="rounded border border-surface-200 dark:border-surface-700 p-3">
                        <div class="text-xs text-muted-color">Type</div>
                        <div class="mt-1"><p-tag [value]="course.type" [severity]="course.type === 'CORE' ? 'success' : course.type === 'LAB' ? 'warn' : 'info'"></p-tag></div>
                    </div>
                    <div class="rounded border border-surface-200 dark:border-surface-700 p-3">
                        <div class="text-xs text-muted-color">Semester</div>
                        <div class="font-semibold mt-1">{{ course.semester }}</div>
                    </div>
                    <div class="rounded border border-surface-200 dark:border-surface-700 p-3">
                        <div class="text-xs text-muted-color">Status</div>
                        <div class="mt-1"><app-status-tag [status]="course.status"></app-status-tag></div>
                    </div>
                    <div class="rounded border border-surface-200 dark:border-surface-700 p-3">
                        <div class="text-xs text-muted-color">Department</div>
                        <div class="text-sm font-medium mt-1">{{ departmentName(course.departmentId) }}</div>
                    </div>
                    <div class="rounded border border-surface-200 dark:border-surface-700 p-3">
                        <div class="text-xs text-muted-color">Prerequisite</div>
                        <div class="text-sm font-medium mt-1">{{ course.prerequisite || '—' }}</div>
                    </div>
                    <div class="rounded border border-surface-200 dark:border-surface-700 p-3 sm:col-span-2">
                        <div class="text-xs text-muted-color">Faculty</div>
                        <div class="text-sm font-medium mt-1">
                            {{ facultyDisplay(course.facultyId) }}
                            @if (isCrossDepartment(course)) {
                                <span class="ml-2 text-xs text-amber-600 dark:text-amber-400">(cross-department)</span>
                            }
                        </div>
                        @if (facultyForDetail(); as fm) {
                            <div class="text-xs text-muted-color mt-1">{{ fm.designation }} · {{ fm.email }}</div>
                            <div class="text-xs text-muted-color">Dept: {{ departmentName(fm.departmentId) }}</div>
                        }
                    </div>
                </div>

                <!-- Programs -->
                <h3 class="text-sm font-semibold mb-2">Programs <span class="ml-2 text-xs font-normal text-muted-color">({{ (course.programIds || []).length }})</span></h3>
                @if ((course.programIds || []).length === 0) {
                    <p class="text-sm text-muted-color bg-surface-50 dark:bg-surface-800 rounded p-3 mb-4">No programs linked to this course.</p>
                } @else {
                    <div class="flex flex-wrap gap-2 mb-4">
                        @for (pid of course.programIds; track pid) {
                            <p-tag [value]="programName(pid) + ' (' + programCode(pid) + ')'" severity="info"></p-tag>
                        }
                    </div>
                }

                <!-- Schedule -->
                <h3 class="text-sm font-semibold mb-2">Schedule <span class="ml-2 text-xs font-normal text-muted-color">({{ detailSessions().length }} session(s))</span></h3>
                @if (detailSessions().length === 0) {
                    <p class="text-sm text-muted-color bg-surface-50 dark:bg-surface-800 rounded p-3">No scheduled class sessions for this course.</p>
                } @else {
                    <div class="border border-surface-200 dark:border-surface-700 rounded overflow-hidden">
                        <p-table [value]="detailSessions()" dataKey="id" [tableStyle]="{ 'min-width': '40rem' }">
                            <ng-template pTemplate="header">
                                <tr>
                                    <th style="width:160px">Semester</th>
                                    <th style="width:120px">Day</th>
                                    <th style="width:160px">Time</th>
                                    <th style="width:120px">Room</th>
                                    <th>Faculty</th>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="body" let-s>
                                <tr>
                                    <td class="text-sm">{{ semesterName(s.semesterId) }}</td>
                                    <td class="text-sm">{{ s.day }}</td>
                                    <td class="text-sm">{{ s.startTime }} — {{ s.endTime }}</td>
                                    <td class="text-sm">{{ s.room }}</td>
                                    <td class="text-sm">{{ facultyDisplay(s.facultyId) }}</td>
                                </tr>
                            </ng-template>
                        </p-table>
                    </div>
                }

                <div class="flex justify-end gap-2 mt-4">
                    <p-button label="Edit Course" icon="pi pi-pencil" (onClick)="openEdit(course)"></p-button>
                    <p-button label="Close Detail" severity="secondary" [text]="true" (onClick)="closeDetail()"></p-button>
                </div>
            </p-card>
        }

        <!-- Create / Edit Dialog -->
        <p-dialog
            [header]="editingCourse() ? 'Edit Course' : 'Add Course'"
            [visible]="formDialogVisible()"
            (visibleChange)="formDialogVisible.set($event)"
            [modal]="true"
            [closable]="true"
            [dismissableMask]="true"
            [style]="{ width: '760px', 'max-width': '95vw' }"
            (onHide)="closeFormDialog()">
            <form [formGroup]="form" (ngSubmit)="save()" class="flex flex-col gap-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Course Code *</label>
                        <input pInputText formControlName="code" placeholder="e.g. CSE-101" class="uppercase" />
                        <small class="text-muted-color text-xs">Unique, stored upper-cased. Trimmed, case-insensitive check.</small>
                        @if (form.get('code')?.touched && form.get('code')?.hasError('required')) {
                            <small class="text-red-500">Code is required.</small>
                        }
                        @if (form.get('code')?.hasError('duplicate')) {
                            <small class="text-red-500">This course code already exists (case-insensitive).</small>
                        }
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Credits * (1-6)</label>
                        <input pInputText formControlName="credits" type="number" min="1" max="6" step="1" placeholder="e.g. 3" />
                        @if (form.get('credits')?.touched && form.get('credits')?.hasError('required')) {
                            <small class="text-red-500">Credits is required.</small>
                        }
                        @if (form.get('credits')?.hasError('min') || form.get('credits')?.hasError('max')) {
                            <small class="text-red-500">Credits must be between 1 and 6.</small>
                        }
                    </div>
                </div>

                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-medium">Title *</label>
                    <input pInputText formControlName="title" placeholder="e.g. Introduction to Computer Systems" />
                    @if (form.get('title')?.touched && form.get('title')?.hasError('required')) {
                        <small class="text-red-500">Title is required.</small>
                    }
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Department *</label>
                        <p-select
                            formControlName="departmentId"
                            [options]="departmentOptions()"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Select department"
                            appendTo="body"
                            (onChange)="onDepartmentChange()"></p-select>
                        @if (form.get('departmentId')?.touched && form.get('departmentId')?.hasError('required')) {
                            <small class="text-red-500">Department is required.</small>
                        }
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Semester * (1-8)</label>
                        <p-select formControlName="semester" [options]="semesterOptions" optionLabel="label" optionValue="value" placeholder="Select semester" appendTo="body"></p-select>
                        @if (form.get('semester')?.touched && form.get('semester')?.hasError('required')) {
                            <small class="text-red-500">Semester is required.</small>
                        }
                    </div>
                </div>

                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-medium">Programs</label>
                    <p-multiselect
                        formControlName="programIds"
                        [options]="programOptions()"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Select programs (optional)"
                        display="chip"
                        [filter]="true"
                        appendTo="body"
                        styleClass="w-full">
                    </p-multiselect>
                    <small class="text-muted-color text-xs">Assign one or more programs. Supports multi-select.</small>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Type *</label>
                        <p-select formControlName="type" [options]="typeOptions" optionLabel="label" optionValue="value" appendTo="body"></p-select>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Status *</label>
                        <p-select formControlName="status" [options]="statusOptions" optionLabel="label" optionValue="value" appendTo="body"></p-select>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Faculty (optional, filtered by department)</label>
                        <p-select
                            formControlName="facultyId"
                            [options]="facultyOptionsForForm()"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Unassigned"
                            [showClear]="true"
                            appendTo="body">
                        </p-select>
                        @if (crossDepartmentWarning()) {
                            <small class="text-amber-600 dark:text-amber-400">Warning: selected faculty belongs to a different department than the course (cross-department soft-allow).</small>
                        }
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Prerequisite (optional)</label>
                        <p-select
                            formControlName="prerequisite"
                            [options]="prerequisiteOptions()"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="None"
                            [showClear]="true"
                            [filter]="true"
                            appendTo="body">
                        </p-select>
                        <small class="text-muted-color text-xs">Must be an existing course code or empty.</small>
                        @if (form.get('prerequisite')?.hasError('invalidPrerequisite')) {
                            <small class="text-red-500">Prerequisite must be an existing course code.</small>
                        }
                        @if (form.get('prerequisite')?.hasError('selfPrerequisite')) {
                            <small class="text-red-500">A course cannot be a prerequisite of itself.</small>
                        }
                    </div>
                </div>

                <div class="flex justify-end gap-2 pt-2">
                    <p-button label="Cancel" severity="secondary" [text]="true" (onClick)="closeFormDialog()"></p-button>
                    <p-button [label]="editingCourse() ? 'Update' : 'Create'" icon="pi pi-save" type="submit"></p-button>
                </div>
            </form>
        </p-dialog>

        <p-toast></p-toast>
        <p-confirmDialog></p-confirmDialog>
    `
})
export class CoursesList {
    private readonly core = inject(CoreDataService);
    private readonly confirm = inject(ConfirmationService);
    private readonly msg = inject(MessageService);
    private readonly fb = inject(FormBuilder);

    courses = this.core.courses;
    departments = this.core.departments;
    programs = this.core.programs;
    facultyMembers = this.core.facultyMembers;
    semesters = this.core.semesters;
    classSessions = this.core.classSessions;

    // Filters
    search = signal('');
    departmentFilter = signal<string | null>(null);
    programFilter = signal<string | null>(null);
    semesterFilter = signal<number | null>(null);
    typeFilter = signal<string | null>(null);
    statusFilter = signal<string | null>(null);

    rows = signal(10);
    rowsPerPageOptions: number[] = [10, 25, 50, 100];
    pageSizeOptions = [
        { label: '10', value: 10 },
        { label: '25', value: 25 },
        { label: '50', value: 50 },
        { label: '100', value: 100 }
    ];

    typeFilterOptions = [
        { label: 'All Types', value: null },
        { label: 'CORE', value: 'CORE' as CourseType },
        { label: 'ELECTIVE', value: 'ELECTIVE' as CourseType },
        { label: 'LAB', value: 'LAB' as CourseType }
    ];

    statusFilterOptions = [
        { label: 'All Statuses', value: null },
        { label: 'Active', value: 'ACTIVE' as CourseStatus },
        { label: 'Inactive', value: 'INACTIVE' as CourseStatus }
    ];

    semesterFilterOptions = [
        { label: 'All Semesters', value: null },
        ...Array.from({ length: 8 }, (_, i) => ({ label: `Semester ${i + 1}`, value: i + 1 }))
    ];

    typeOptions = [
        { label: 'CORE', value: 'CORE' as CourseType },
        { label: 'ELECTIVE', value: 'ELECTIVE' as CourseType },
        { label: 'LAB', value: 'LAB' as CourseType }
    ];

    statusOptions = [
        { label: 'Active', value: 'ACTIVE' as CourseStatus },
        { label: 'Inactive', value: 'INACTIVE' as CourseStatus }
    ];

    semesterOptions = Array.from({ length: 8 }, (_, i) => ({ label: `Semester ${i + 1}`, value: i + 1 }));

    departmentFilterOptions = computed(() => [
        { label: 'All Departments', value: null },
        ...this.departments().map((d) => ({ label: `${d.name} (${d.code})`, value: d.id }))
    ]);

    departmentOptions = computed(() => this.departments().map((d) => ({ label: `${d.name} (${d.code})`, value: d.id })));

    programFilterOptions = computed(() => [
        { label: 'All Programs', value: null },
        ...this.programs().map((p) => ({ label: `${p.name} (${p.code})`, value: p.id }))
    ]);

    programOptions = computed(() =>
        this.programs().map((p) => ({ label: `${p.name} (${p.code})`, value: p.id, departmentId: p.departmentId }))
    );

    filteredCourses = computed(() => {
        let list = this.courses();
        const q = this.search().trim().toLowerCase();
        const dept = this.departmentFilter();
        const prog = this.programFilter();
        const sem = this.semesterFilter();
        const type = this.typeFilter();
        const status = this.statusFilter();

        if (dept) list = list.filter((c) => c.departmentId === dept);
        if (prog) list = list.filter((c) => (c.programIds || []).includes(prog));
        if (sem) list = list.filter((c) => c.semester === sem);
        if (type) list = list.filter((c) => c.type === type);
        if (status) list = list.filter((c) => c.status === status);
        if (q) {
            list = list.filter((c) => c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q));
        }
        return [...list].sort((a, b) => a.code.localeCompare(b.code));
    });

    departmentName(id: string): string {
        return this.departments().find((d) => d.id === id)?.name ?? id;
    }

    programName(id: string): string {
        return this.programs().find((p) => p.id === id)?.name ?? id;
    }

    programCode(id: string): string {
        return this.programs().find((p) => p.id === id)?.code ?? id;
    }

    facultyDisplay(id: string | null | undefined): string {
        if (!id) return '—';
        const fm = this.facultyMembers().find((f) => f.id === id);
        if (!fm) return id;
        return `${fm.firstName} ${fm.lastName}`;
    }

    semesterName(id: string): string {
        return this.semesters().find((s) => s.id === id)?.name ?? id;
    }

    clearFilters(): void {
        this.search.set('');
        this.departmentFilter.set(null);
        this.programFilter.set(null);
        this.semesterFilter.set(null);
        this.typeFilter.set(null);
        this.statusFilter.set(null);
    }

    onPageChange(event: { rows: number }): void {
        if (event.rows !== this.rows()) this.rows.set(event.rows);
    }

    // Detail
    detailCourse = signal<Course | null>(null);

    detailSessions = computed(() => {
        const c = this.detailCourse();
        if (!c) return [] as ClassSession[];
        return this.classSessions().filter((s) => s.courseId === c.id);
    });

    facultyForDetail = computed(() => {
        const c = this.detailCourse();
        if (!c?.facultyId) return null;
        return this.facultyMembers().find((f) => f.id === c.facultyId) ?? null;
    });

    isCrossDepartment(course: Course): boolean {
        if (!course.facultyId) return false;
        const fm = this.facultyMembers().find((f) => f.id === course.facultyId);
        if (!fm) return false;
        return fm.departmentId !== course.departmentId;
    }

    openDetail(row: Course): void {
        this.detailCourse.set(row);
        queueMicrotask(() => document.getElementById('course-detail-inline')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }

    closeDetail(): void {
        this.detailCourse.set(null);
    }

    // Form
    formDialogVisible = signal(false);
    editingCourse = signal<Course | null>(null);

    form = this.fb.nonNullable.group({
        code: ['', Validators.required],
        title: ['', Validators.required],
        departmentId: ['', Validators.required],
        programIds: [[] as string[]],
        credits: [3 as number | null, [Validators.required, Validators.min(1), Validators.max(6)]],
        type: ['CORE' as CourseType, Validators.required],
        semester: [1 as number | null, Validators.required],
        facultyId: [null as string | null],
        prerequisite: [null as string | null],
        status: ['ACTIVE' as CourseStatus, Validators.required]
    });

    prerequisiteOptions = computed(() => {
        const editing = this.editingCourse();
        const list = this.courses();
        const filtered = editing ? list.filter((c) => c.id !== editing.id) : list;
        const opts = filtered.map((c) => ({ label: `${c.code} — ${c.title}`, value: c.code }));
        return [{ label: 'None', value: null as unknown as string }, ...opts];
    });

    facultyOptionsForForm = computed(() => {
        // depend on departments, facultyMembers and form department value via signal tracking
        // We read form value directly and also track core signals to stay reactive
        const deptId = (this.form.get('departmentId')?.value as string | null) ?? null;
        const all = this.facultyMembers();
        // ensure computed re-evaluates when form changes: we also read a dummy signal that updates on department change
        void this.formDepartmentSignal();
        if (!deptId) {
            return [{ label: 'Unassigned', value: null as unknown as string }, ...all.map((f) => ({ label: `${f.firstName} ${f.lastName} (${f.employeeId}) — ${this.departmentName(f.departmentId)}`, value: f.id }))];
        }
        const editingFacultyId = this.editingCourse()?.facultyId ?? (this.form.get('facultyId')?.value as string | null);
        const filtered = all.filter((f) => f.departmentId === deptId || f.id === editingFacultyId);
        const opts = filtered.map((f) => ({ label: `${f.firstName} ${f.lastName} (${f.employeeId})${f.departmentId !== deptId ? ' — ⚠ cross-dept' : ''}`, value: f.id }));
        return [{ label: 'Unassigned', value: null as unknown as string }, ...opts];
    });

    // helper signal to trigger recompute on department change
    private formDepartmentSignal = signal(0);

    crossDepartmentWarning = computed(() => {
        const deptId = (this.form.get('departmentId')?.value as string | null) ?? null;
        const facultyId = (this.form.get('facultyId')?.value as string | null) ?? null;
        if (!deptId || !facultyId) return false;
        const fm = this.facultyMembers().find((f) => f.id === facultyId);
        if (!fm) return false;
        return fm.departmentId !== deptId;
    });

    onDepartmentChange(): void {
        this.formDepartmentSignal.update((v) => v + 1);
        // if selected faculty no longer in filtered list and is cross-dept, keep it but warn. Do not auto-clear.
    }

    openCreate(): void {
        this.editingCourse.set(null);
        this.form.reset({
            code: '',
            title: '',
            departmentId: this.departments()[0]?.id ?? '',
            programIds: [],
            credits: 3,
            type: 'CORE' as CourseType,
            semester: 1,
            facultyId: null,
            prerequisite: null,
            status: 'ACTIVE' as CourseStatus
        });
        this.form.get('code')?.setErrors(null);
        this.form.get('prerequisite')?.setErrors(null);
        this.formDepartmentSignal.update((v) => v + 1);
        this.formDialogVisible.set(true);
    }

    openEdit(row: Course): void {
        this.editingCourse.set(row);
        this.form.reset({
            code: row.code,
            title: row.title,
            departmentId: row.departmentId,
            programIds: [...(row.programIds || [])],
            credits: row.credits,
            type: row.type,
            semester: row.semester,
            facultyId: row.facultyId ?? null,
            prerequisite: row.prerequisite ?? null,
            status: row.status
        });
        this.form.get('code')?.setErrors(null);
        this.form.get('prerequisite')?.setErrors(null);
        this.formDepartmentSignal.update((v) => v + 1);
        this.formDialogVisible.set(true);
    }

    closeFormDialog(): void {
        this.formDialogVisible.set(false);
        this.editingCourse.set(null);
    }

    private normalizeCode(code: string): string {
        return code.trim().toUpperCase();
    }

    private isDuplicateCode(normalizedCode: string, excludeId?: string): boolean {
        const normLower = normalizedCode.trim().toLowerCase();
        return this.courses().some((c) => c.code.trim().toLowerCase() === normLower && c.id !== excludeId);
    }

    save(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.msg.add({ severity: 'warn', summary: 'Validation', detail: 'Please fix the highlighted errors.' });
            return;
        }
        const raw = this.form.getRawValue();
        const codeNormalized = this.normalizeCode(raw.code);
        const title = raw.title.trim();
        const departmentId = raw.departmentId;
        const programIds: string[] = [...(raw.programIds || [])];
        const credits = Number(raw.credits);
        const type = raw.type as CourseType;
        const semester = Number(raw.semester);
        let facultyId: string | null = raw.facultyId ? (raw.facultyId as string) : null;
        // p-select with showClear may return sentinel or empty string, normalize to null
        if (facultyId === '' || facultyId === (null as unknown as string)) facultyId = null;
        let prerequisite: string | null = raw.prerequisite ? this.normalizeCode(raw.prerequisite as string) : null;
        if (prerequisite === '' || prerequisite?.trim() === '') prerequisite = null;
        const status = raw.status as CourseStatus;

        if (!codeNormalized) {
            this.form.get('code')?.setErrors({ required: true });
            this.msg.add({ severity: 'warn', summary: 'Validation', detail: 'Course code is required.' });
            return;
        }
        if (!title) {
            this.form.get('title')?.setErrors({ required: true });
            this.msg.add({ severity: 'warn', summary: 'Validation', detail: 'Title is required.' });
            return;
        }
        if (!departmentId) {
            this.msg.add({ severity: 'warn', summary: 'Validation', detail: 'Department is required.' });
            return;
        }
        if (!(credits >= 1 && credits <= 6)) {
            this.form.get('credits')?.setErrors({ min: true });
            this.msg.add({ severity: 'warn', summary: 'Validation', detail: 'Credits must be between 1 and 6.' });
            return;
        }
        if (!(semester >= 1 && semester <= 8)) {
            this.form.get('semester')?.setErrors({ required: true });
            this.msg.add({ severity: 'warn', summary: 'Validation', detail: 'Semester must be between 1 and 8.' });
            return;
        }

        const editing = this.editingCourse();
        const duplicate = this.isDuplicateCode(codeNormalized, editing?.id);
        if (duplicate) {
            this.form.get('code')?.setErrors({ duplicate: true });
            this.msg.add({ severity: 'error', summary: 'Duplicate code', detail: `Course code "${codeNormalized}" is already in use (case-insensitive).` });
            return;
        }

        // Validate department exists
        const deptExists = this.departments().some((d) => d.id === departmentId);
        if (!deptExists) {
            this.msg.add({ severity: 'error', summary: 'Invalid department', detail: 'Selected department does not exist.' });
            return;
        }

        // Validate programs exist
        for (const pid of programIds) {
            if (!this.programs().some((p) => p.id === pid)) {
                this.msg.add({ severity: 'error', summary: 'Invalid program', detail: `Program ${pid} does not exist.` });
                return;
            }
        }

        // Validate faculty exists if set
        if (facultyId) {
            const fmExists = this.facultyMembers().some((f) => f.id === facultyId);
            if (!fmExists) {
                this.msg.add({ severity: 'error', summary: 'Invalid faculty', detail: 'Selected faculty does not exist.' });
                return;
            }
        }

        // Validate prerequisite
        if (prerequisite) {
            const normalizedPrereqUpper = prerequisite.trim().toUpperCase();
            const prereqExists = this.courses().some((c) => c.code.trim().toUpperCase() === normalizedPrereqUpper && c.id !== editing?.id);
            // Also allow prerequisite to be the editing course's own previous code? No self prerequisite check:
            if (normalizedPrereqUpper === codeNormalized) {
                this.form.get('prerequisite')?.setErrors({ selfPrerequisite: true });
                this.msg.add({ severity: 'error', summary: 'Invalid prerequisite', detail: 'A course cannot be a prerequisite of itself.' });
                return;
            }
            if (!prereqExists) {
                // also check case where prerequisite is same as editing course's own code trimmed? Already handled self.
                // If prerequisite code exists but is the course being edited (old code) we already filtered? For edit, we excluded self, so need to check if prerequisite equals self's code? Already self check.
                // So if not found, error
                this.form.get('prerequisite')?.setErrors({ invalidPrerequisite: true });
                this.msg.add({ severity: 'error', summary: 'Invalid prerequisite', detail: `Prerequisite course code "${prerequisite}" does not exist.` });
                return;
            }
            prerequisite = normalizedPrereqUpper;
        } else {
            prerequisite = null;
        }

        // Cross-department soft-allow warning
        let crossDeptWarn = false;
        if (facultyId) {
            const fm = this.facultyMembers().find((f) => f.id === facultyId);
            if (fm && fm.departmentId !== departmentId) {
                crossDeptWarn = true;
            }
        }

        const now = new Date().toISOString();
        const previousFacultyId = editing?.facultyId ?? null;

        if (editing) {
            const updated: Course = {
                ...editing,
                code: codeNormalized,
                title,
                departmentId,
                programIds,
                credits,
                type,
                semester,
                facultyId: facultyId ?? null,
                prerequisite: prerequisite ?? null,
                status,
                updatedAt: now
            };
            this.core.update<Course & { id: string }>('courses', updated);
            this.syncFacultyAssignment(updated.id, previousFacultyId, facultyId, departmentId, crossDeptWarn);
            this.msg.add({ severity: 'success', summary: 'Updated', detail: `Course "${codeNormalized}" updated.` });
            if (crossDeptWarn) {
                this.msg.add({ severity: 'warn', summary: 'Cross-department assignment', detail: 'Faculty department differs from course department — soft-allowed with warning.' });
            }
            if (this.detailCourse()?.id === editing.id) {
                this.detailCourse.set(updated);
            }
        } else {
            const id = this.core.generateId('course');
            const created: Course = {
                id,
                code: codeNormalized,
                title,
                departmentId,
                programIds,
                credits,
                type,
                semester,
                facultyId: facultyId ?? null,
                prerequisite: prerequisite ?? null,
                status,
                createdAt: now,
                updatedAt: now
            };
            this.core.create<Course & { id: string }>('courses', created as Course & { id: string });
            this.syncFacultyAssignment(id, null, facultyId, departmentId, crossDeptWarn);
            this.msg.add({ severity: 'success', summary: 'Created', detail: `Course "${codeNormalized}" created.` });
            if (crossDeptWarn) {
                this.msg.add({ severity: 'warn', summary: 'Cross-department assignment', detail: 'Faculty department differs from course department — soft-allowed with warning.' });
            }
        }
        this.closeFormDialog();
    }

    private syncFacultyAssignment(courseId: string, prevFacultyId: string | null, newFacultyId: string | null, _courseDepartmentId?: string, _warn?: boolean): void {
        if (prevFacultyId === newFacultyId) return;
        // Remove from previous faculty
        if (prevFacultyId) {
            const prevFm = this.core.get<FacultyMember>('facultyMembers', prevFacultyId);
            if (prevFm) {
                const ids = prevFm.courseIds ?? [];
                if (ids.includes(courseId)) {
                    const updated: FacultyMember = { ...prevFm, courseIds: ids.filter((id) => id !== courseId) };
                    this.core.update<FacultyMember & { id: string }>('facultyMembers', updated as FacultyMember & { id: string });
                }
            }
        }
        // Add to new faculty
        if (newFacultyId) {
            const newFm = this.core.get<FacultyMember>('facultyMembers', newFacultyId);
            if (newFm) {
                const ids = newFm.courseIds ?? [];
                if (!ids.includes(courseId)) {
                    const updated: FacultyMember = { ...newFm, courseIds: [...ids, courseId] };
                    this.core.update<FacultyMember & { id: string }>('facultyMembers', updated as FacultyMember & { id: string });
                }
            }
        }
    }

    confirmDelete(row: Course): void {
        this.confirm.confirm({
            message: `Delete course "${row.code} — ${row.title}"? This cannot be undone.`,
            header: 'Delete Course',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Delete',
            rejectLabel: 'Cancel',
            accept: () => {
                // Remove from any faculty's courseIds
                const facultyMembers = this.facultyMembers();
                for (const fm of facultyMembers) {
                    if ((fm.courseIds || []).includes(row.id)) {
                        const updated: FacultyMember = { ...fm, courseIds: (fm.courseIds || []).filter((id) => id !== row.id) };
                        this.core.update<FacultyMember & { id: string }>('facultyMembers', updated as FacultyMember & { id: string });
                    }
                }
                // Also handle courses where facultyId points to this course - already in loop, but also need to handle course.facultyId references? The course being deleted itself is removed.
                // No need to nullify other courses.
                this.core.remove('courses', row.id);
                this.msg.add({ severity: 'success', summary: 'Deleted', detail: `Course "${row.code}" removed.` });
                if (this.detailCourse()?.id === row.id) this.closeDetail();
            }
        });
    }
}
