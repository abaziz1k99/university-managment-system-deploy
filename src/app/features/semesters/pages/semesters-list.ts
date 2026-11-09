import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { ConfirmationService, MessageService } from 'primeng/api';
import { PageHeader } from '@/app/shared/components/page-header';
import { StatusTag } from '@/app/shared/components/status-tag';
import { CoreDataService } from '@/app/core/services/core-data.service';
import { Semester, Student, Examination, FeeAccount } from '@/app/core/models/index';

type SemesterStatus = Semester['status'];

@Component({
    selector: 'app-semesters-list',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        CardModule,
        ButtonModule,
        InputTextModule,
        SelectModule,
        TagModule,
        TableModule,
        DialogModule,
        ToastModule,
        ConfirmDialogModule,
        DatePickerModule,
        PageHeader,
        StatusTag
    ],
    providers: [ConfirmationService, MessageService],
    template: `
        <app-page-header title="Semesters" subtitle="Manage academic terms — timeline, validation, activation and enrollment detail">
            <p-button label="Add Semester" icon="pi pi-plus" (onClick)="openCreate()"></p-button>
        </app-page-header>

        <!-- Timeline -->
        <p-card styleClass="mb-4">
            <div class="flex items-center justify-between mb-3">
                <h2 class="text-sm font-semibold">Timeline</h2>
                <span class="text-xs text-muted-color">Sorted by start date · ACTIVE highlighted</span>
            </div>
            @if (timelineSemesters().length === 0) {
                <p class="text-sm text-muted-color">No semesters yet.</p>
            } @else {
                <div class="relative">
                    <!-- horizontal line -->
                    <div class="hidden sm:block absolute left-0 right-0 top-[2.55rem] h-[2px] bg-surface-200 dark:bg-surface-700"></div>
                    <div class="flex gap-3 overflow-x-auto pb-3 pt-1 snap-x snap-mandatory" style="scrollbar-width: thin">
                        @for (sem of timelineSemesters(); track sem.id) {
                            <div
                                class="snap-start shrink-0 w-[220px] sm:w-[240px] rounded-lg border p-3 cursor-pointer transition-all"
                                [class.border-primary]="sem.status === 'ACTIVE'"
                                [class.bg-primary-50]="sem.status === 'ACTIVE'"
                                [class.dark:bg-primary-950]="sem.status === 'ACTIVE'"
                                [class.border-surface-200]="sem.status !== 'ACTIVE'"
                                [class.dark:border-surface-700]="sem.status !== 'ACTIVE'"
                                [class.bg-surface-0]="sem.status !== 'ACTIVE'"
                                [class.dark:bg-surface-900]="sem.status !== 'ACTIVE'"
                                [class.opacity-80]="sem.status === 'CLOSED'"
                                [class.ring-2]="sem.status === 'ACTIVE'"
                                [class.ring-primary-200]="sem.status === 'ACTIVE'"
                                (click)="openDetail(sem)"
                                [title]="sem.name + ' · ' + sem.academicYear">
                                <div class="flex items-center justify-between gap-2 mb-2">
                                    <span class="text-xs font-semibold truncate">{{ sem.name }}</span>
                                    <app-status-tag [status]="sem.status"></app-status-tag>
                                </div>
                                <div class="text-xs text-muted-color">{{ sem.academicYear }}</div>
                                <div class="text-xs mt-1">{{ formatDate(sem.startDate) }} → {{ formatDate(sem.endDate) }}</div>
                                <div class="text-xs text-muted-color mt-1">Reg: {{ formatDate(sem.registrationDeadline) }}</div>
                                <div class="text-xs text-muted-color">Exam: {{ formatDate(sem.examStartDate) }} → {{ formatDate(sem.examEndDate) }}</div>
                                <!-- dot -->
                                <div class="mt-3 flex justify-center">
                                    <span
                                        class="inline-block w-3 h-3 rounded-full border-2 bg-surface-0 dark:bg-surface-900"
                                        [class.bg-primary]="sem.status === 'ACTIVE'"
                                        [class.border-primary]="sem.status === 'ACTIVE'"
                                        [class.border-surface-400]="sem.status !== 'ACTIVE'"
                                        [class.bg-surface-300]="sem.status === 'CLOSED'">
                                    </span>
                                </div>
                                <div class="text-center mt-1">
                                    <span class="text-[10px] px-1.5 py-0.5 rounded bg-surface-100 dark:bg-surface-800">{{ sem.status }}</span>
                                </div>
                            </div>
                        }
                    </div>
                </div>
                <!-- vertical fallback legend -->
                <div class="flex flex-wrap gap-2 mt-2 text-xs text-muted-color">
                    <span class="inline-flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-primary inline-block"></span> ACTIVE (current term)</span>
                    <span class="inline-flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-surface-300 dark:bg-surface-600 inline-block"></span> CLOSED</span>
                    <span class="inline-flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-surface-0 border border-surface-400 inline-block"></span> UPCOMING</span>
                </div>
            }
        </p-card>

        <!-- Filters + Table -->
        <p-card>
            <div class="flex flex-col xl:flex-row gap-3 mb-4">
                <div class="flex-1">
                    <span class="relative block w-full">
                        <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-muted-color"></i>
                        <input
                            pInputText
                            type="text"
                            placeholder="Search by name or academic year..."
                            class="w-full pl-10"
                            [ngModel]="search()"
                            (ngModelChange)="search.set($event)" />
                    </span>
                </div>
                <div class="flex gap-2 flex-wrap items-center">
                    <p-select
                        [ngModel]="statusFilter()"
                        (ngModelChange)="statusFilter.set($event)"
                        [options]="statusFilterOptions"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Status"
                        styleClass="w-40"
                        [showClear]="true">
                    </p-select>
                    <p-select
                        [ngModel]="academicYearFilter()"
                        (ngModelChange)="academicYearFilter.set($event)"
                        [options]="academicYearFilterOptions()"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Academic Year"
                        styleClass="w-44"
                        [showClear]="true">
                    </p-select>
                </div>
            </div>

            <p class="text-xs text-muted-color mb-3">
                Showing {{ filteredSemesters().length }} of {{ semesters().length }} semesters
                @if (search() || statusFilter() || academicYearFilter()) {
                    <span> · <a class="text-primary cursor-pointer underline" (click)="clearFilters()">Clear filters</a></span>
                }
            </p>

            <p-table
                [value]="filteredSemesters()"
                dataKey="id"
                [paginator]="true"
                [rows]="rows()"
                [rowsPerPageOptions]="rowsPerPageOptions"
                (onPage)="onPageChange($event)"
                sortMode="single"
                [tableStyle]="{ 'min-width': '78rem' }"
                styleClass="w-full"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
                [showCurrentPageReport]="true">
                <ng-template pTemplate="header">
                    <tr>
                        <th pSortableColumn="name" style="min-width:160px">Name <p-sortIcon field="name"></p-sortIcon></th>
                        <th pSortableColumn="academicYear" style="width:130px">Academic Year <p-sortIcon field="academicYear"></p-sortIcon></th>
                        <th pSortableColumn="startDate" style="width:130px">Start <p-sortIcon field="startDate"></p-sortIcon></th>
                        <th pSortableColumn="endDate" style="width:130px">End <p-sortIcon field="endDate"></p-sortIcon></th>
                        <th pSortableColumn="registrationDeadline" style="width:140px">Registration Deadline <p-sortIcon field="registrationDeadline"></p-sortIcon></th>
                        <th style="width:200px">Exam Period</th>
                        <th pSortableColumn="status" style="width:120px">Status <p-sortIcon field="status"></p-sortIcon></th>
                        <th style="width:220px">Actions</th>
                    </tr>
                </ng-template>
                <ng-template pTemplate="body" let-row>
                    <tr (click)="openDetail(row)" class="cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800" [class.bg-primary-50]="row.status === 'ACTIVE'" [class.dark:bg-primary-950]="row.status === 'ACTIVE'">
                        <td class="font-medium"><span class="hover:underline">{{ row.name }}</span></td>
                        <td class="text-sm">{{ row.academicYear }}</td>
                        <td class="text-sm">{{ formatDate(row.startDate) }}</td>
                        <td class="text-sm">{{ formatDate(row.endDate) }}</td>
                        <td class="text-sm">{{ formatDate(row.registrationDeadline) }}</td>
                        <td class="text-sm">{{ formatDate(row.examStartDate) }} → {{ formatDate(row.examEndDate) }}</td>
                        <td><app-status-tag [status]="row.status"></app-status-tag></td>
                        <td>
                            <div class="flex items-center gap-1">
                                <p-button icon="pi pi-eye" [rounded]="true" [text]="true" severity="secondary" size="small" (onClick)="$event.stopPropagation(); openDetail(row)" pTooltip="View detail"></p-button>
                                <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" severity="info" size="small" (onClick)="$event.stopPropagation(); openEdit(row)"></p-button>
                                @if (row.status !== 'ACTIVE') {
                                    <p-button label="Activate" icon="pi pi-bolt" [rounded]="true" [text]="true" severity="success" size="small" (onClick)="$event.stopPropagation(); confirmActivate(row)"></p-button>
                                }
                                @if (row.status !== 'CLOSED') {
                                    <p-button label="Close" icon="pi pi-lock" [rounded]="true" [text]="true" severity="secondary" size="small" (onClick)="$event.stopPropagation(); confirmClose(row)"></p-button>
                                }
                                <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger" size="small" (onClick)="$event.stopPropagation(); confirmDelete(row)"></p-button>
                            </div>
                        </td>
                    </tr>
                </ng-template>
                <ng-template pTemplate="emptymessage">
                    <tr>
                        <td colspan="8" class="text-center py-10 text-muted-color">
                            No semesters match your criteria.
                            @if (search() || statusFilter() || academicYearFilter()) {
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
        @if (detailSemester(); as sem) {
            <div id="semester-detail-inline"></div>
            <p-card styleClass="mt-4">
                <div class="flex items-start justify-between gap-3 mb-4">
                    <div>
                        <h2 class="text-lg font-semibold">{{ sem.name }} — Detail</h2>
                        <p class="text-xs text-muted-color mt-1">
                            <p-tag [value]="sem.academicYear" severity="secondary" class="mr-2"></p-tag>
                            <app-status-tag [status]="sem.status" class="mr-2"></app-status-tag>
                            {{ formatDate(sem.startDate) }} → {{ formatDate(sem.endDate) }} · Reg: {{ formatDate(sem.registrationDeadline) }} · Exam: {{ formatDate(sem.examStartDate) }} → {{ formatDate(sem.examEndDate) }}
                        </p>
                    </div>
                    <p-button icon="pi pi-times" [rounded]="true" [text]="true" severity="secondary" (onClick)="closeDetail()"></p-button>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                    <div class="rounded border border-surface-200 dark:border-surface-700 p-3">
                        <div class="text-xs text-muted-color uppercase tracking-wide">Students</div>
                        <div class="text-2xl font-bold mt-1">{{ detailStudents().length }}</div>
                        <div class="text-xs text-muted-color">currentSemesterId == semester.id</div>
                    </div>
                    <div class="rounded border border-surface-200 dark:border-surface-700 p-3">
                        <div class="text-xs text-muted-color uppercase tracking-wide">Examinations</div>
                        <div class="text-2xl font-bold mt-1">{{ detailExams().length }}</div>
                        <div class="text-xs text-muted-color">semesterId == semester.id</div>
                    </div>
                    <div class="rounded border border-surface-200 dark:border-surface-700 p-3">
                        <div class="text-xs text-muted-color uppercase tracking-wide">Fee Accounts</div>
                        <div class="text-2xl font-bold mt-1">{{ detailFeeAccounts().length }}</div>
                        <div class="text-xs text-muted-color">semesterId == semester.id</div>
                    </div>
                    <div class="rounded border border-surface-200 dark:border-surface-700 p-3">
                        <div class="text-xs text-muted-color uppercase tracking-wide">Duration</div>
                        <div class="text-2xl font-bold mt-1">{{ durationDays(sem) }}<span class="text-sm font-normal"> days</span></div>
                        <div class="text-xs text-muted-color">end - start</div>
                    </div>
                </div>

                <!-- Enrolled Students -->
                <h3 class="text-sm font-semibold mb-2">Enrolled Students <span class="ml-2 text-xs font-normal text-muted-color">({{ detailStudents().length }})</span></h3>
                @if (detailStudents().length === 0) {
                    <p class="text-sm text-muted-color bg-surface-50 dark:bg-surface-800 rounded p-3 mb-4">No students currently assigned to this semester (currentSemesterId match).</p>
                } @else {
                    <div class="border border-surface-200 dark:border-surface-700 rounded overflow-hidden mb-4">
                        <p-table [value]="detailStudents().slice(0, detailStudentLimit())" dataKey="id" [tableStyle]="{ 'min-width': '40rem' }">
                            <ng-template pTemplate="header">
                                <tr>
                                    <th style="width:140px">Admission No</th>
                                    <th>Name</th>
                                    <th style="width:220px">Email</th>
                                    <th style="width:110px">Status</th>
                                    <th style="width:110px">Session</th>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="body" let-s>
                                <tr>
                                    <td class="text-sm font-mono">{{ s.admissionNo }}</td>
                                    <td class="text-sm font-medium">{{ s.firstName }} {{ s.lastName }}</td>
                                    <td class="text-sm text-muted-color truncate max-w-[220px]">{{ s.email }}</td>
                                    <td><app-status-tag [status]="s.status"></app-status-tag></td>
                                    <td class="text-sm">{{ s.session }}</td>
                                </tr>
                            </ng-template>
                        </p-table>
                        @if (detailStudents().length > detailStudentLimit()) {
                            <div class="flex justify-center p-2 border-t border-surface-200 dark:border-surface-700">
                                <p-button label="Show all {{ detailStudents().length }}" [text]="true" size="small" (onClick)="detailStudentLimit.set(detailStudents().length)"></p-button>
                            </div>
                        }
                        @if (detailStudents().length > 10 && detailStudentLimit() === detailStudents().length) {
                            <div class="flex justify-center p-2 border-t border-surface-200 dark:border-surface-700">
                                <p-button label="Show less" [text]="true" size="small" (onClick)="detailStudentLimit.set(10)"></p-button>
                            </div>
                        }
                    </div>
                }

                <!-- Examinations -->
                <h3 class="text-sm font-semibold mb-2">Examinations <span class="ml-2 text-xs font-normal text-muted-color">({{ detailExams().length }})</span></h3>
                @if (detailExams().length === 0) {
                    <p class="text-sm text-muted-color bg-surface-50 dark:bg-surface-800 rounded p-3 mb-4">No examinations for this semester.</p>
                } @else {
                    <div class="border border-surface-200 dark:border-surface-700 rounded overflow-hidden mb-4">
                        <p-table [value]="detailExams()" dataKey="id" [tableStyle]="{ 'min-width': '44rem' }">
                            <ng-template pTemplate="header">
                                <tr>
                                    <th style="width:220px">Title</th>
                                    <th style="width:110px">Type</th>
                                    <th style="width:130px">Date</th>
                                    <th style="width:140px">Time</th>
                                    <th style="width:100px">Room</th>
                                    <th style="width:90px">Max Marks</th>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="body" let-e>
                                <tr>
                                    <td class="text-sm font-medium">{{ e.title }}</td>
                                    <td><p-tag [value]="e.type" severity="info"></p-tag></td>
                                    <td class="text-sm">{{ formatDate(e.date) }}</td>
                                    <td class="text-sm">{{ e.startTime }} — {{ e.endTime }}</td>
                                    <td class="text-sm">{{ e.room }}</td>
                                    <td class="text-center">{{ e.maxMarks }}</td>
                                </tr>
                            </ng-template>
                        </p-table>
                    </div>
                }

                <!-- Fee Accounts -->
                <h3 class="text-sm font-semibold mb-2">Fee Accounts <span class="ml-2 text-xs font-normal text-muted-color">({{ detailFeeAccounts().length }})</span></h3>
                @if (detailFeeAccounts().length === 0) {
                    <p class="text-sm text-muted-color bg-surface-50 dark:bg-surface-800 rounded p-3">No fee accounts for this semester.</p>
                } @else {
                    <div class="border border-surface-200 dark:border-surface-700 rounded overflow-hidden">
                        <p-table [value]="detailFeeAccounts().slice(0, detailFeeLimit())" dataKey="id" [tableStyle]="{ 'min-width': '44rem' }">
                            <ng-template pTemplate="header">
                                <tr>
                                    <th style="width:160px">Student</th>
                                    <th style="width:110px">Billed</th>
                                    <th style="width:110px">Paid</th>
                                    <th style="width:110px">Balance</th>
                                    <th style="width:110px">Status</th>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="body" let-fa>
                                <tr>
                                    <td class="text-sm">{{ studentDisplay(fa.studentId) }}</td>
                                    <td class="text-sm">{{ fa.totalBilled }}</td>
                                    <td class="text-sm">{{ fa.totalPaid }}</td>
                                    <td class="text-sm font-medium">{{ fa.balance }}</td>
                                    <td><app-status-tag [status]="fa.status"></app-status-tag></td>
                                </tr>
                            </ng-template>
                        </p-table>
                        @if (detailFeeAccounts().length > detailFeeLimit()) {
                            <div class="flex justify-center p-2 border-t border-surface-200 dark:border-surface-700">
                                <p-button label="Show all {{ detailFeeAccounts().length }}" [text]="true" size="small" (onClick)="detailFeeLimit.set(detailFeeAccounts().length)"></p-button>
                            </div>
                        }
                        @if (detailFeeAccounts().length > 10 && detailFeeLimit() === detailFeeAccounts().length) {
                            <div class="flex justify-center p-2 border-t border-surface-200 dark:border-surface-700">
                                <p-button label="Show less" [text]="true" size="small" (onClick)="detailFeeLimit.set(10)"></p-button>
                            </div>
                        }
                    </div>
                }

                <div class="flex justify-end gap-2 mt-4">
                    <p-button label="Edit Semester" icon="pi pi-pencil" (onClick)="openEdit(sem)"></p-button>
                    @if (sem.status !== 'ACTIVE') {
                        <p-button label="Activate" icon="pi pi-bolt" severity="success" [outlined]="true" (onClick)="confirmActivate(sem)"></p-button>
                    }
                    @if (sem.status !== 'CLOSED') {
                        <p-button label="Close Semester" icon="pi pi-lock" severity="secondary" [outlined]="true" (onClick)="confirmClose(sem)"></p-button>
                    }
                    <p-button label="Close Detail" severity="secondary" [text]="true" (onClick)="closeDetail()"></p-button>
                </div>
            </p-card>
        }

        <!-- Create / Edit Dialog -->
        <p-dialog
            [header]="editingSemester() ? 'Edit Semester' : 'Add Semester'"
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
                        <label class="text-sm font-medium">Name *</label>
                        <input pInputText formControlName="name" placeholder="e.g. Fall 2026" />
                        @if (form.get('name')?.touched && form.get('name')?.hasError('required')) {
                            <small class="text-red-500">Name is required.</small>
                        }
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Academic Year *</label>
                        <p-select formControlName="academicYear" [options]="academicYearOptions()" optionLabel="label" optionValue="value" placeholder="Select academic year" appendTo="body" [filter]="true" filterBy="label" [editable]="true"></p-select>
                        @if (form.get('academicYear')?.touched && form.get('academicYear')?.hasError('required')) {
                            <small class="text-red-500">Academic year is required (e.g. 2025-26).</small>
                        }
                        @if (form.get('academicYear')?.hasError('pattern')) {
                            <small class="text-red-500">Use format YYYY-YY (e.g. 2025-26).</small>
                        }
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Start Date *</label>
                        <p-datepicker formControlName="startDate" dateFormat="yy-mm-dd" [showIcon]="true" placeholder="YYYY-MM-DD" appendTo="body" styleClass="w-full"></p-datepicker>
                        @if (form.get('startDate')?.touched && form.get('startDate')?.hasError('required')) {
                            <small class="text-red-500">Start date is required.</small>
                        }
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">End Date *</label>
                        <p-datepicker formControlName="endDate" dateFormat="yy-mm-dd" [showIcon]="true" placeholder="YYYY-MM-DD" appendTo="body" styleClass="w-full"></p-datepicker>
                        @if (form.get('endDate')?.touched && form.get('endDate')?.hasError('required')) {
                            <small class="text-red-500">End date is required.</small>
                        }
                    </div>
                </div>

                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-medium">Registration Deadline *</label>
                    <p-datepicker formControlName="registrationDeadline" dateFormat="yy-mm-dd" [showIcon]="true" placeholder="YYYY-MM-DD" appendTo="body" styleClass="w-full"></p-datepicker>
                    <small class="text-muted-color text-xs">Must be within term: start ≤ deadline ≤ end.</small>
                    @if (form.get('registrationDeadline')?.touched && form.get('registrationDeadline')?.hasError('required')) {
                        <small class="text-red-500">Registration deadline is required.</small>
                    }
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Exam Start Date *</label>
                        <p-datepicker formControlName="examStartDate" dateFormat="yy-mm-dd" [showIcon]="true" placeholder="YYYY-MM-DD" appendTo="body" styleClass="w-full"></p-datepicker>
                        @if (form.get('examStartDate')?.touched && form.get('examStartDate')?.hasError('required')) {
                            <small class="text-red-500">Exam start is required.</small>
                        }
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Exam End Date *</label>
                        <p-datepicker formControlName="examEndDate" dateFormat="yy-mm-dd" [showIcon]="true" placeholder="YYYY-MM-DD" appendTo="body" styleClass="w-full"></p-datepicker>
                        <small class="text-muted-color text-xs">Exam end ≥ exam start; exam must start ≥ term start (overlap with term end is allowed).</small>
                        @if (form.get('examEndDate')?.touched && form.get('examEndDate')?.hasError('required')) {
                            <small class="text-red-500">Exam end is required.</small>
                        }
                    </div>
                </div>

                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-medium">Status *</label>
                    <p-select formControlName="status" [options]="statusOptions" optionLabel="label" optionValue="value" appendTo="body"></p-select>
                </div>

                @if (formError()) {
                    <div class="rounded border border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-300">{{ formError() }}</div>
                }

                <div class="flex justify-end gap-2 pt-2">
                    <p-button label="Cancel" severity="secondary" [text]="true" (onClick)="closeFormDialog()"></p-button>
                    <p-button [label]="editingSemester() ? 'Update' : 'Create'" icon="pi pi-save" type="submit"></p-button>
                </div>
            </form>
        </p-dialog>

        <p-toast></p-toast>
        <p-confirmDialog></p-confirmDialog>
    `
})
export class SemestersList {
    private readonly core = inject(CoreDataService);
    private readonly confirm = inject(ConfirmationService);
    private readonly msg = inject(MessageService);
    private readonly fb = inject(FormBuilder);

    semesters = this.core.semesters;
    students = this.core.students;
    examinations = this.core.examinations;
    feeAccounts = this.core.feeAccounts;

    // Filters
    search = signal('');
    statusFilter = signal<SemesterStatus | null>(null);
    academicYearFilter = signal<string | null>(null);

    rows = signal(10);
    rowsPerPageOptions: number[] = [10, 25, 50, 100];
    pageSizeOptions = [
        { label: '10', value: 10 },
        { label: '25', value: 25 },
        { label: '50', value: 50 },
        { label: '100', value: 100 }
    ];

    statusFilterOptions = [
        { label: 'All Statuses', value: null },
        { label: 'UPCOMING', value: 'UPCOMING' as SemesterStatus },
        { label: 'ACTIVE', value: 'ACTIVE' as SemesterStatus },
        { label: 'CLOSED', value: 'CLOSED' as SemesterStatus }
    ];

    statusOptions = [
        { label: 'UPCOMING', value: 'UPCOMING' as SemesterStatus },
        { label: 'ACTIVE', value: 'ACTIVE' as SemesterStatus },
        { label: 'CLOSED', value: 'CLOSED' as SemesterStatus }
    ];

    academicYearFilterOptions = computed(() => {
        const distinct = [...new Set(this.semesters().map((s) => s.academicYear))].sort();
        return [{ label: 'All Academic Years', value: null }, ...distinct.map((y) => ({ label: y, value: y }))];
    });

    academicYearOptions = computed(() => {
        const distinct = [...new Set(this.semesters().map((s) => s.academicYear))].sort();
        // ensure common years are offered even if not yet present
        const generated = ['2023-24', '2024-25', '2025-26', '2026-27', '2027-28', '2028-29'];
        const all = [...new Set([...distinct, ...generated])].sort();
        return all.map((y) => ({ label: y, value: y }));
    });

    filteredSemesters = computed(() => {
        let list = this.semesters();
        const q = this.search().trim().toLowerCase();
        const status = this.statusFilter();
        const ay = this.academicYearFilter();
        if (status) list = list.filter((s) => s.status === status);
        if (ay) list = list.filter((s) => s.academicYear === ay);
        if (q) list = list.filter((s) => s.name.toLowerCase().includes(q) || s.academicYear.toLowerCase().includes(q));
        return [...list].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    });

    timelineSemesters = computed(() => [...this.semesters()].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()));

    clearFilters(): void {
        this.search.set('');
        this.statusFilter.set(null);
        this.academicYearFilter.set(null);
    }

    onPageChange(event: { rows: number }): void {
        if (event.rows !== this.rows()) this.rows.set(event.rows);
    }

    formatDate(iso: string): string {
        if (!iso) return '—';
        // iso is YYYY-MM-DD or full ISO; normalize to YYYY-MM-DD for display
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return iso;
        // Use locale-safe YYYY-MM-DD
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        // If input was YYYY-MM-DD, UTC parsing shifts? Use split fallback
        if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
        return `${y}-${m}-${day}`;
    }

    durationDays(sem: Semester): number {
        const s = this.toDate(sem.startDate);
        const e = this.toDate(sem.endDate);
        if (!s || !e) return 0;
        return Math.max(0, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
    }

    studentDisplay(id: string): string {
        const s = this.students().find((st) => st.id === id);
        if (!s) return id;
        return `${s.firstName} ${s.lastName} (${s.admissionNo})`;
    }

    // Detail
    detailSemester = signal<Semester | null>(null);
    detailStudentLimit = signal(10);
    detailFeeLimit = signal(10);

    detailStudents = computed(() => {
        const sem = this.detailSemester();
        if (!sem) return [] as Student[];
        return this.students().filter((s) => s.currentSemesterId === sem.id);
    });

    detailExams = computed(() => {
        const sem = this.detailSemester();
        if (!sem) return [] as Examination[];
        return this.examinations().filter((e) => e.semesterId === sem.id);
    });

    detailFeeAccounts = computed(() => {
        const sem = this.detailSemester();
        if (!sem) return [] as FeeAccount[];
        return this.feeAccounts().filter((fa) => fa.semesterId === sem.id);
    });

    openDetail(row: Semester): void {
        this.detailSemester.set(row);
        this.detailStudentLimit.set(10);
        this.detailFeeLimit.set(10);
        queueMicrotask(() => document.getElementById('semester-detail-inline')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }

    closeDetail(): void {
        this.detailSemester.set(null);
    }

    // Form
    formDialogVisible = signal(false);
    editingSemester = signal<Semester | null>(null);
    formError = signal<string | null>(null);

    form = this.fb.nonNullable.group({
        name: ['', Validators.required],
        academicYear: ['', [Validators.required, Validators.pattern(/^\d{4}-\d{2}$/)]],
        startDate: [null as Date | null, Validators.required],
        endDate: [null as Date | null, Validators.required],
        registrationDeadline: [null as Date | null, Validators.required],
        examStartDate: [null as Date | null, Validators.required],
        examEndDate: [null as Date | null, Validators.required],
        status: ['UPCOMING' as SemesterStatus, Validators.required]
    });

    openCreate(): void {
        this.editingSemester.set(null);
        this.formError.set(null);
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() + 1, 10);
        const end = new Date(now.getFullYear(), now.getMonth() + 5, 20);
        this.form.reset({
            name: '',
            academicYear: this.academicYearOptions()[0]?.value ?? '2025-26',
            startDate: null,
            endDate: null,
            registrationDeadline: null,
            examStartDate: null,
            examEndDate: null,
            status: 'UPCOMING' as SemesterStatus
        });
        // set defaults without triggering pattern error: academicYear already set
        void start;
        void end;
        this.formDialogVisible.set(true);
    }

    openEdit(row: Semester): void {
        this.editingSemester.set(row);
        this.formError.set(null);
        this.form.reset({
            name: row.name,
            academicYear: row.academicYear,
            startDate: this.toDate(row.startDate),
            endDate: this.toDate(row.endDate),
            registrationDeadline: this.toDate(row.registrationDeadline),
            examStartDate: this.toDate(row.examStartDate),
            examEndDate: this.toDate(row.examEndDate),
            status: row.status
        });
        this.formDialogVisible.set(true);
    }

    closeFormDialog(): void {
        this.formDialogVisible.set(false);
        this.editingSemester.set(null);
        this.formError.set(null);
    }

    private toDate(iso: string): Date | null {
        if (!iso) return null;
        // Handle YYYY-MM-DD without timezone shift: construct local date
        if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
            const [y, m, d] = iso.split('-').map(Number);
            return new Date(y, m - 1, d, 12, 0, 0, 0);
        }
        const dt = new Date(iso);
        return Number.isNaN(dt.getTime()) ? null : dt;
    }

    private toISODate(d: Date | null): string {
        if (!d) return '';
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    private normalizeDay(d: Date | null): Date | null {
        if (!d) return null;
        return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
    }

    save(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.msg.add({ severity: 'warn', summary: 'Validation', detail: 'Please fix the highlighted errors.' });
            return;
        }
        const raw = this.form.getRawValue();
        const name = raw.name.trim();
        const academicYear = raw.academicYear.trim();
        const startD = this.normalizeDay(raw.startDate);
        const endD = this.normalizeDay(raw.endDate);
        const deadlineD = this.normalizeDay(raw.registrationDeadline);
        const examStartD = this.normalizeDay(raw.examStartDate);
        const examEndD = this.normalizeDay(raw.examEndDate);
        const status = raw.status as SemesterStatus;

        if (!name) {
            this.form.get('name')?.setErrors({ required: true });
            this.msg.add({ severity: 'warn', summary: 'Validation', detail: 'Name is required.' });
            return;
        }
        if (!academicYear || !/^\d{4}-\d{2}$/.test(academicYear)) {
            this.form.get('academicYear')?.setErrors({ pattern: true });
            this.msg.add({ severity: 'warn', summary: 'Validation', detail: 'Academic year must be YYYY-YY (e.g. 2025-26).' });
            return;
        }
        if (!startD || !endD || !deadlineD || !examStartD || !examEndD) {
            this.msg.add({ severity: 'warn', summary: 'Validation', detail: 'All dates are required.' });
            return;
        }

        // Validations per spec
        if (!(endD.getTime() > startD.getTime())) {
            this.formError.set('End date must be after start date (end > start).');
            this.msg.add({ severity: 'error', summary: 'Validation', detail: 'End date must be after start date.' });
            return;
        }
        if (!(deadlineD.getTime() >= startD.getTime() && deadlineD.getTime() <= endD.getTime())) {
            this.formError.set('Registration deadline must be inside term: start ≤ deadline ≤ end.');
            this.msg.add({ severity: 'error', summary: 'Validation', detail: 'Registration deadline must be inside term (start ≤ deadline ≤ end).' });
            return;
        }
        if (!(examStartD.getTime() >= startD.getTime())) {
            this.formError.set('Exam start must be ≥ term start (examStart ≥ start). Exam period may extend beyond term end.');
            this.msg.add({ severity: 'error', summary: 'Validation', detail: 'Exam start must be ≥ term start.' });
            return;
        }
        if (!(examEndD.getTime() >= examStartD.getTime())) {
            this.formError.set('Exam end must be ≥ exam start.');
            this.msg.add({ severity: 'error', summary: 'Validation', detail: 'Exam end must be ≥ exam start.' });
            return;
        }

        const startISO = this.toISODate(startD);
        const endISO = this.toISODate(endD);
        const deadlineISO = this.toISODate(deadlineD);
        const examStartISO = this.toISODate(examStartD);
        const examEndISO = this.toISODate(examEndD);

        // No overlapping terms for same academic year: if two semesters share academicYear, date ranges must not overlap
        const editing = this.editingSemester();
        const overlap = this.semesters().some((s) => {
            if (editing && s.id === editing.id) return false;
            if (s.academicYear !== academicYear) return false;
            const aStart = this.toDate(s.startDate);
            const aEnd = this.toDate(s.endDate);
            if (!aStart || !aEnd) return false;
            const bStart = startD;
            const bEnd = endD;
            // overlap if aStart <= bEnd && bStart <= aEnd (inclusive)
            return aStart.getTime() <= bEnd.getTime() && bStart.getTime() <= aEnd.getTime();
        });
        if (overlap) {
            this.formError.set(`Date range overlaps another semester in the same academic year (${academicYear}). Semesters sharing an academic year must not overlap.`);
            this.msg.add({ severity: 'error', summary: 'Overlap', detail: `Another semester in ${academicYear} overlaps this date range.` });
            return;
        }

        // One active semester at a time: activating via status change is handled below; but prevent direct save that would create second ACTIVE without confirmation?
        // If status is ACTIVE and another ACTIVE exists, we confirm-style handle: set previous ACTIVE to CLOSED on save.
        const willBeActive = status === 'ACTIVE';
        const existingActive = this.semesters().find((s) => s.status === 'ACTIVE' && s.id !== editing?.id);

        const now = new Date().toISOString();
        if (editing) {
            const updated: Semester = {
                ...editing,
                name,
                academicYear,
                startDate: startISO,
                endDate: endISO,
                registrationDeadline: deadlineISO,
                examStartDate: examStartISO,
                examEndDate: examEndISO,
                status,
                updatedAt: now
            };
            this.core.update<Semester & { id: string }>('semesters', updated);
            if (willBeActive && existingActive) {
                this.core.update<Semester & { id: string }>('semesters', { ...existingActive, status: 'CLOSED' as const, updatedAt: now });
                this.msg.add({ severity: 'info', summary: 'Activated', detail: `Previous active semester "${existingActive.name}" was closed.` });
            }
            this.msg.add({ severity: 'success', summary: 'Updated', detail: `Semester "${name}" updated.` });
            if (this.detailSemester()?.id === editing.id) this.detailSemester.set(updated);
        } else {
            const id = this.core.generateId('sem');
            const created: Semester = {
                id,
                name,
                academicYear,
                startDate: startISO,
                endDate: endISO,
                registrationDeadline: deadlineISO,
                examStartDate: examStartISO,
                examEndDate: examEndISO,
                status,
                createdAt: now,
                updatedAt: now
            };
            this.core.create<Semester & { id: string }>('semesters', created as Semester & { id: string });
            if (willBeActive && existingActive) {
                this.core.update<Semester & { id: string }>('semesters', { ...existingActive, status: 'CLOSED' as const, updatedAt: now });
                this.msg.add({ severity: 'info', summary: 'Activated', detail: `Previous active semester "${existingActive.name}" was closed.` });
            }
            this.msg.add({ severity: 'success', summary: 'Created', detail: `Semester "${name}" created.` });
        }
        this.closeFormDialog();
    }

    confirmActivate(row: Semester): void {
        if (row.status === 'ACTIVE') {
            this.msg.add({ severity: 'info', summary: 'Already active', detail: `"${row.name}" is already the active semester.` });
            return;
        }
        const active = this.semesters().find((s) => s.status === 'ACTIVE');
        const msg = active
            ? `Activate "${row.name}" (${row.academicYear})? This will set it to ACTIVE and close the current active semester "${active.name}" (${active.academicYear}).`
            : `Activate "${row.name}" (${row.academicYear})? It will become the active semester.`;
        this.confirm.confirm({
            message: msg,
            header: 'Activate Semester',
            icon: 'pi pi-bolt',
            acceptLabel: 'Activate',
            rejectLabel: 'Cancel',
            accept: () => {
                const now = new Date().toISOString();
                if (active) {
                    this.core.update<Semester & { id: string }>('semesters', { ...active, status: 'CLOSED' as const, updatedAt: now });
                }
                this.core.update<Semester & { id: string }>('semesters', { ...row, status: 'ACTIVE' as const, updatedAt: now });
                this.msg.add({ severity: 'success', summary: 'Activated', detail: `"${row.name}" is now ACTIVE${active ? ` (closed "${active.name}")` : ''}.` });
                if (this.detailSemester()?.id === row.id) this.detailSemester.set({ ...row, status: 'ACTIVE' as const, updatedAt: now });
                if (active && this.detailSemester()?.id === active.id) this.detailSemester.set({ ...active, status: 'CLOSED' as const, updatedAt: now });
            }
        });
    }

    confirmClose(row: Semester): void {
        if (row.status === 'CLOSED') {
            this.msg.add({ severity: 'info', summary: 'Already closed', detail: `"${row.name}" is already CLOSED.` });
            return;
        }
        this.confirm.confirm({
            message: `Close semester "${row.name}" (${row.academicYear})? Its status will become CLOSED.`,
            header: 'Close Semester',
            icon: 'pi pi-lock',
            acceptLabel: 'Close',
            rejectLabel: 'Cancel',
            accept: () => {
                const now = new Date().toISOString();
                this.core.update<Semester & { id: string }>('semesters', { ...row, status: 'CLOSED' as const, updatedAt: now });
                this.msg.add({ severity: 'success', summary: 'Closed', detail: `"${row.name}" is now CLOSED.` });
                if (this.detailSemester()?.id === row.id) this.detailSemester.set({ ...row, status: 'CLOSED' as const, updatedAt: now });
            }
        });
    }

    confirmDelete(row: Semester): void {
        const exams = this.examinations().filter((e) => e.semesterId === row.id);
        const students = this.students().filter((s) => s.currentSemesterId === row.id);
        const feeCount = this.feeAccounts().filter((fa) => fa.semesterId === row.id).length;
        if (exams.length > 0 || students.length > 0) {
            this.confirm.confirm({
                message: `Cannot delete semester "${row.name}" (${row.academicYear}): it has ${students.length} enrolled student(s), ${exams.length} examination(s)${feeCount ? ` and ${feeCount} fee account(s)` : ''}. Reassign or remove those records before deleting.`,
                header: 'Delete Blocked',
                icon: 'pi pi-ban',
                acceptLabel: 'OK',
                rejectVisible: false,
                accept: () => {}
            });
            return;
        }
        this.confirm.confirm({
            message: `Delete semester "${row.name}" (${row.academicYear})? This cannot be undone.${feeCount ? ` It has ${feeCount} fee account(s) that will also need cleanup.` : ''}`,
            header: 'Delete Semester',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Delete',
            rejectLabel: 'Cancel',
            accept: () => {
                this.core.remove('semesters', row.id);
                this.msg.add({ severity: 'success', summary: 'Deleted', detail: `Semester "${row.name}" removed.` });
                if (this.detailSemester()?.id === row.id) this.closeDetail();
            }
        });
    }
}
