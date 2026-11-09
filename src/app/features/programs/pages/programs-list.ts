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
import { TextareaModule } from 'primeng/textarea';
import { ConfirmationService, MessageService } from 'primeng/api';
import { PageHeader } from '@/app/shared/components/page-header';
import { StatusTag } from '@/app/shared/components/status-tag';
import { CoreDataService } from '@/app/core/services/core-data.service';
import { Program, Department, Course, Student } from '@/app/core/models/index';

type DegreeType = Program['degreeType'];
type ProgramStatus = Program['status'];

@Component({
    selector: 'app-programs-list',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        CardModule,
        ButtonModule,
        InputTextModule,
        TextareaModule,
        SelectModule,
        TagModule,
        TableModule,
        DialogModule,
        ToastModule,
        ConfirmDialogModule,
        PageHeader,
        StatusTag
    ],
    template: `
        <app-page-header
            title="Programs"
            subtitle="Manage academic programs — searchable, filterable and linked to departments, courses and students">
            <p-button label="Add Program" icon="pi pi-plus" (onClick)="openCreate()"></p-button>
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
                            placeholder="Search by name or code..."
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
                        styleClass="w-56"
                        [showClear]="true">
                    </p-select>
                    <p-select
                        [ngModel]="degreeTypeFilter()"
                        (ngModelChange)="degreeTypeFilter.set($event)"
                        [options]="degreeTypeFilterOptions"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Degree Type"
                        styleClass="w-40"
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
                Showing {{ filteredPrograms().length }} of {{ programs().length }} programs
                @if (search() || departmentFilter() || degreeTypeFilter() || statusFilter()) {
                    <span> · <a class="text-primary cursor-pointer underline" (click)="clearFilters()">Clear filters</a></span>
                }
            </p>

            <p-table
                [value]="filteredPrograms()"
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
                        <th pSortableColumn="name" style="min-width: 220px">Name <p-sortIcon field="name"></p-sortIcon></th>
                        <th pSortableColumn="code" style="width:130px">Code <p-sortIcon field="code"></p-sortIcon></th>
                        <th pSortableColumn="degreeType" style="width:120px">Degree <p-sortIcon field="degreeType"></p-sortIcon></th>
                        <th pSortableColumn="departmentId" style="width:200px">Department <p-sortIcon field="departmentId"></p-sortIcon></th>
                        <th pSortableColumn="durationYears" style="width:110px">Duration <p-sortIcon field="durationYears"></p-sortIcon></th>
                        <th pSortableColumn="creditsPerSemester" style="width:110px">Credits/sem <p-sortIcon field="creditsPerSemester"></p-sortIcon></th>
                        <th pSortableColumn="totalSemesters" style="width:110px">Semesters <p-sortIcon field="totalSemesters"></p-sortIcon></th>
                        <th style="width:100px">Total Credits</th>
                        <th pSortableColumn="status" style="width:110px">Status <p-sortIcon field="status"></p-sortIcon></th>
                        <th style="width:160px">Actions</th>
                    </tr>
                </ng-template>
                <ng-template pTemplate="body" let-row>
                    <tr (click)="openDetail(row)" class="cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800">
                        <td class="font-medium">
                            <span class="hover:underline">{{ row.name }}</span>
                        </td>
                        <td><p-tag [value]="row.code" severity="secondary"></p-tag></td>
                        <td><p-tag [value]="row.degreeType" severity="info"></p-tag></td>
                        <td class="text-sm">{{ departmentName(row.departmentId) }}</td>
                        <td class="text-center">{{ row.durationYears }} yr{{ row.durationYears === 1 ? '' : 's' }}</td>
                        <td class="text-center">{{ row.creditsPerSemester }}</td>
                        <td class="text-center">{{ row.totalSemesters }}</td>
                        <td class="text-center font-medium">{{ row.totalSemesters * row.creditsPerSemester }}</td>
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
                            No programs match your criteria.
                            @if (search() || departmentFilter() || degreeTypeFilter() || statusFilter()) {
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

        <!-- Inline Detail Section (below table) — Card with counts for courses & students -->
        @if (detailProgram(); as progInline) {
            <div id="program-detail-inline"></div>
            <p-card styleClass="mt-4">
                <div class="flex items-start justify-between gap-3 mb-4">
                    <div>
                        <h2 class="text-lg font-semibold">{{ progInline.name }} — Detail</h2>
                        <p class="text-xs text-muted-color mt-1">
                            <p-tag [value]="progInline.code" severity="secondary" class="mr-2"></p-tag>
                            <p-tag [value]="progInline.degreeType" severity="info" class="mr-2"></p-tag>
                            {{ departmentName(progInline.departmentId) }} · {{ progInline.durationYears }} yr{{ progInline.durationYears === 1 ? '' : 's' }}, {{ progInline.totalSemesters }} semesters · {{ progInline.creditsPerSemester }} cr/sem
                        </p>
                    </div>
                    <p-button icon="pi pi-times" [rounded]="true" [text]="true" severity="secondary" (onClick)="closeDetail()"></p-button>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                    <p-card styleClass="shadow-none border border-surface-200 dark:border-surface-700">
                        <div class="flex items-center justify-between">
                            <div>
                                <div class="text-xs text-muted-color uppercase tracking-wide">Courses</div>
                                <div class="text-2xl font-bold mt-1">{{ detailCourses().length }}</div>
                                <div class="text-xs text-muted-color">linked via programIds</div>
                            </div>
                            <i class="pi pi-book text-2xl text-primary opacity-60"></i>
                        </div>
                    </p-card>
                    <p-card styleClass="shadow-none border border-surface-200 dark:border-surface-700">
                        <div class="flex items-center justify-between">
                            <div>
                                <div class="text-xs text-muted-color uppercase tracking-wide">Enrolled Students</div>
                                <div class="text-2xl font-bold mt-1">{{ detailStudents().length }}</div>
                                <div class="text-xs text-muted-color">programId == program.id</div>
                            </div>
                            <i class="pi pi-users text-2xl text-primary opacity-60"></i>
                        </div>
                    </p-card>
                </div>

                <!-- Inline Courses -->
                <h3 class="text-sm font-semibold mb-2">Courses <span class="ml-2 text-xs font-normal text-muted-color">({{ detailCourses().length }})</span></h3>
                @if (detailCourses().length === 0) {
                    <p class="text-sm text-muted-color bg-surface-50 dark:bg-surface-800 rounded p-3 mb-4">No courses linked to this program.</p>
                } @else {
                    <div class="border border-surface-200 dark:border-surface-700 rounded overflow-hidden mb-4">
                        <p-table [value]="detailCourses()" dataKey="id" [tableStyle]="{ 'min-width': '36rem' }">
                            <ng-template pTemplate="header">
                                <tr>
                                    <th style="width:110px">Code</th>
                                    <th>Title</th>
                                    <th style="width:90px">Credits</th>
                                    <th style="width:100px">Type</th>
                                    <th style="width:80px">Sem</th>
                                    <th style="width:110px">Status</th>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="body" let-c>
                                <tr>
                                    <td><p-tag [value]="c.code" severity="secondary"></p-tag></td>
                                    <td class="text-sm">{{ c.title }}</td>
                                    <td class="text-center">{{ c.credits }}</td>
                                    <td><p-tag [value]="c.type" [severity]="c.type === 'CORE' ? 'success' : c.type === 'LAB' ? 'warn' : 'info'"></p-tag></td>
                                    <td class="text-center">{{ c.semester }}</td>
                                    <td><app-status-tag [status]="c.status"></app-status-tag></td>
                                </tr>
                            </ng-template>
                        </p-table>
                    </div>
                }

                <!-- Inline Students -->
                <h3 class="text-sm font-semibold mb-2">Enrolled Students <span class="ml-2 text-xs font-normal text-muted-color">({{ detailStudents().length }})</span></h3>
                @if (detailStudents().length === 0) {
                    <p class="text-sm text-muted-color bg-surface-50 dark:bg-surface-800 rounded p-3">No students enrolled in this program.</p>
                } @else {
                    <div class="border border-surface-200 dark:border-surface-700 rounded overflow-hidden">
                        <p-table [value]="detailStudents().slice(0, detailStudentLimit())" dataKey="id" [tableStyle]="{ 'min-width': '36rem' }">
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

                <div class="flex justify-end gap-2 mt-4">
                    <p-button label="Edit Program" icon="pi pi-pencil" (onClick)="openEdit(progInline)"></p-button>
                    <p-button label="Close Detail" severity="secondary" [text]="true" (onClick)="closeDetail()"></p-button>
                </div>
            </p-card>
        }

        <!-- Create / Edit Dialog -->
        <p-dialog
            [header]="editingProgram() ? 'Edit Program' : 'Add Program'"
            [visible]="formDialogVisible()"
            (visibleChange)="formDialogVisible.set($event)"
            [modal]="true"
            [closable]="true"
            [dismissableMask]="true"
            [style]="{ width: '640px', 'max-width': '95vw' }"
            (onHide)="closeFormDialog()">
            <form [formGroup]="form" (ngSubmit)="save()" class="flex flex-col gap-4">
                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-medium">Program Name *</label>
                    <input pInputText formControlName="name" placeholder="e.g. BSc in Computer Science & Engineering" />
                    @if (form.get('name')?.touched && form.get('name')?.hasError('required')) {
                        <small class="text-red-500">Name is required.</small>
                    }
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Code *</label>
                        <input pInputText formControlName="code" placeholder="e.g. BSC-CSE" class="uppercase" />
                        <small class="text-muted-color text-xs">Unique across programs, case-insensitive. Stored upper-cased.</small>
                        @if (form.get('code')?.touched && form.get('code')?.hasError('required')) {
                            <small class="text-red-500">Code is required.</small>
                        }
                        @if (form.get('code')?.hasError('duplicate')) {
                            <small class="text-red-500">This code is already used by another program.</small>
                        }
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Degree Type *</label>
                        <p-select formControlName="degreeType" [options]="degreeTypeOptions" optionLabel="label" optionValue="value" placeholder="Select degree" appendTo="body"></p-select>
                        @if (form.get('degreeType')?.touched && form.get('degreeType')?.hasError('required')) {
                            <small class="text-red-500">Degree type is required.</small>
                        }
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Department *</label>
                        <p-select formControlName="departmentId" [options]="departmentOptions()" optionLabel="label" optionValue="value" placeholder="Select department" appendTo="body"></p-select>
                        @if (form.get('departmentId')?.touched && form.get('departmentId')?.hasError('required')) {
                            <small class="text-red-500">Department is required.</small>
                        }
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Status *</label>
                        <p-select formControlName="status" [options]="statusOptionsForForm" optionLabel="label" optionValue="value" appendTo="body"></p-select>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Duration (years) *</label>
                        <input pInputText formControlName="durationYears" type="number" min="0.5" step="0.5" placeholder="e.g. 4" />
                        @if (form.get('durationYears')?.touched && form.get('durationYears')?.hasError('required')) {
                            <small class="text-red-500">Duration is required.</small>
                        }
                        @if (form.get('durationYears')?.hasError('min')) {
                            <small class="text-red-500">Duration must be greater than 0.</small>
                        }
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Total Semesters *</label>
                        <input pInputText formControlName="totalSemesters" type="number" min="2" max="12" step="1" placeholder="e.g. 8" />
                        @if (form.get('totalSemesters')?.touched && form.get('totalSemesters')?.hasError('required')) {
                            <small class="text-red-500">Semesters is required.</small>
                        }
                        @if (form.get('totalSemesters')?.hasError('min') || form.get('totalSemesters')?.hasError('max')) {
                            <small class="text-red-500">Must be between 2 and 12.</small>
                        }
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Credits / Semester *</label>
                        <input pInputText formControlName="creditsPerSemester" type="number" min="1" step="1" placeholder="e.g. 18" />
                        @if (form.get('creditsPerSemester')?.touched && form.get('creditsPerSemester')?.hasError('required')) {
                            <small class="text-red-500">Credits is required.</small>
                        }
                        @if (form.get('creditsPerSemester')?.hasError('min')) {
                            <small class="text-red-500">Credits must be greater than 0.</small>
                        }
                    </div>
                </div>

                @if (totalCreditsPreview() !== null) {
                    <p class="text-xs text-muted-color bg-surface-50 dark:bg-surface-800 rounded px-3 py-2">
                        Total program credits: <span class="font-semibold">{{ totalCreditsPreview() }}</span>
                        ({{ form.get('totalSemesters')?.value }} semesters × {{ form.get('creditsPerSemester')?.value }} credits)
                    </p>
                }

                <div class="flex justify-end gap-2 pt-2">
                    <p-button label="Cancel" severity="secondary" [text]="true" (onClick)="closeFormDialog()"></p-button>
                    <p-button [label]="editingProgram() ? 'Update' : 'Create'" icon="pi pi-save" type="submit"></p-button>
                </div>
            </form>
        </p-dialog>

        <!-- Detail Dialog -->
        <p-dialog
            [header]="detailProgram() ? detailProgram()!.name : 'Program Detail'"
            [visible]="detailVisible()"
            (visibleChange)="detailVisible.set($event)"
            [modal]="true"
            [closable]="true"
            [dismissableMask]="true"
            [style]="{ width: '780px', 'max-width': '95vw' }"
            (onHide)="closeDetail()">
            @if (detailProgram(); as prog) {
                <div class="flex flex-col gap-5">
                    <!-- Summary -->
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div class="rounded border border-surface-200 dark:border-surface-700 p-3">
                            <div class="text-xs text-muted-color">Code</div>
                            <div class="font-semibold mt-1"><p-tag [value]="prog.code" severity="secondary"></p-tag></div>
                        </div>
                        <div class="rounded border border-surface-200 dark:border-surface-700 p-3">
                            <div class="text-xs text-muted-color">Degree</div>
                            <div class="font-semibold mt-1"><p-tag [value]="prog.degreeType" severity="info"></p-tag></div>
                        </div>
                        <div class="rounded border border-surface-200 dark:border-surface-700 p-3">
                            <div class="text-xs text-muted-color">Department</div>
                            <div class="text-sm font-medium mt-1">{{ departmentName(prog.departmentId) }}</div>
                        </div>
                        <div class="rounded border border-surface-200 dark:border-surface-700 p-3">
                            <div class="text-xs text-muted-color">Status</div>
                            <div class="mt-1"><app-status-tag [status]="prog.status"></app-status-tag></div>
                        </div>
                        <div class="rounded border border-surface-200 dark:border-surface-700 p-3">
                            <div class="text-xs text-muted-color">Duration</div>
                            <div class="font-semibold mt-1">{{ prog.durationYears }} year{{ prog.durationYears === 1 ? '' : 's' }}</div>
                        </div>
                        <div class="rounded border border-surface-200 dark:border-surface-700 p-3">
                            <div class="text-xs text-muted-color">Semesters</div>
                            <div class="font-semibold mt-1">{{ prog.totalSemesters }}</div>
                        </div>
                        <div class="rounded border border-surface-200 dark:border-surface-700 p-3">
                            <div class="text-xs text-muted-color">Credits / Sem</div>
                            <div class="font-semibold mt-1">{{ prog.creditsPerSemester }}</div>
                        </div>
                        <div class="rounded border border-surface-200 dark:border-surface-700 p-3 bg-primary-50 dark:bg-primary-950">
                            <div class="text-xs text-muted-color">Total Credits</div>
                            <div class="font-bold mt-1 text-lg">{{ prog.totalSemesters * prog.creditsPerSemester }}</div>
                        </div>
                    </div>

                    <!-- Courses -->
                    <div>
                        <h3 class="text-sm font-semibold mb-2">
                            Courses
                            <span class="ml-2 text-xs font-normal text-muted-color">({{ detailCourses().length }} attached to this program)</span>
                        </h3>
                        @if (detailCourses().length === 0) {
                            <p class="text-sm text-muted-color bg-surface-50 dark:bg-surface-800 rounded p-3">No courses are currently linked to this program. Assign courses via the Courses catalog (programIds).</p>
                        } @else {
                            <div class="border border-surface-200 dark:border-surface-700 rounded overflow-hidden">
                                <p-table [value]="detailCourses()" dataKey="id" [tableStyle]="{ 'min-width': '36rem' }">
                                    <ng-template pTemplate="header">
                                        <tr>
                                            <th style="width:110px">Code</th>
                                            <th>Title</th>
                                            <th style="width:90px">Credits</th>
                                            <th style="width:100px">Type</th>
                                            <th style="width:80px">Sem</th>
                                            <th style="width:110px">Status</th>
                                        </tr>
                                    </ng-template>
                                    <ng-template pTemplate="body" let-c>
                                        <tr>
                                            <td><p-tag [value]="c.code" severity="secondary"></p-tag></td>
                                            <td class="text-sm">{{ c.title }}</td>
                                            <td class="text-center">{{ c.credits }}</td>
                                            <td><p-tag [value]="c.type" [severity]="c.type === 'CORE' ? 'success' : c.type === 'LAB' ? 'warn' : 'info'"></p-tag></td>
                                            <td class="text-center">{{ c.semester }}</td>
                                            <td><app-status-tag [status]="c.status"></app-status-tag></td>
                                        </tr>
                                    </ng-template>
                                </p-table>
                            </div>
                        }
                    </div>

                    <!-- Students -->
                    <div>
                        <h3 class="text-sm font-semibold mb-2">
                            Enrolled Students
                            <span class="ml-2 text-xs font-normal text-muted-color">({{ detailStudents().length }} enrolled)</span>
                        </h3>
                        @if (detailStudents().length === 0) {
                            <p class="text-sm text-muted-color bg-surface-50 dark:bg-surface-800 rounded p-3">No students are currently enrolled in this program.</p>
                        } @else {
                            <div class="border border-surface-200 dark:border-surface-700 rounded overflow-hidden">
                                <p-table [value]="detailStudents().slice(0, detailStudentLimit())" dataKey="id" [tableStyle]="{ 'min-width': '36rem' }">
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
                    </div>

                    <div class="flex justify-end gap-2">
                        <p-button label="Edit Program" icon="pi pi-pencil" (onClick)="openEditFromDetail()"></p-button>
                        <p-button label="Close" severity="secondary" [text]="true" (onClick)="closeDetail()"></p-button>
                    </div>
                </div>
            }
        </p-dialog>

        <p-toast></p-toast>
        <p-confirmDialog></p-confirmDialog>
    `
})
export class ProgramsList {
    private readonly core = inject(CoreDataService);
    private readonly confirm = inject(ConfirmationService);
    private readonly msg = inject(MessageService);
    private readonly fb = inject(FormBuilder);

    programs = this.core.programs;
    departments = this.core.departments;
    courses = this.core.courses;
    students = this.core.students;

    // Filters
    search = signal('');
    departmentFilter = signal<string | null>(null);
    degreeTypeFilter = signal<string | null>(null);
    statusFilter = signal<string | null>(null);

    rows = signal(10);
    rowsPerPageOptions: number[] = [10, 25, 50, 100];
    pageSizeOptions = [
        { label: '10', value: 10 },
        { label: '25', value: 25 },
        { label: '50', value: 50 },
        { label: '100', value: 100 }
    ];

    degreeTypeFilterOptions = [
        { label: 'All Degrees', value: null },
        { label: 'BSc', value: 'BSc' as DegreeType },
        { label: 'BA', value: 'BA' as DegreeType },
        { label: 'BBA', value: 'BBA' as DegreeType },
        { label: 'MSc', value: 'MSc' as DegreeType },
        { label: 'MBA', value: 'MBA' as DegreeType }
    ];

    degreeTypeOptions = [
        { label: 'BSc', value: 'BSc' as DegreeType },
        { label: 'BA', value: 'BA' as DegreeType },
        { label: 'BBA', value: 'BBA' as DegreeType },
        { label: 'MSc', value: 'MSc' as DegreeType },
        { label: 'MBA', value: 'MBA' as DegreeType }
    ];

    statusFilterOptions = [
        { label: 'All Statuses', value: null },
        { label: 'Active', value: 'ACTIVE' as ProgramStatus },
        { label: 'Inactive', value: 'INACTIVE' as ProgramStatus }
    ];

    statusOptionsForForm = [
        { label: 'Active', value: 'ACTIVE' as ProgramStatus },
        { label: 'Inactive', value: 'INACTIVE' as ProgramStatus }
    ];

    departmentFilterOptions = computed(() => [
        { label: 'All Departments', value: null },
        ...this.departments().map((d) => ({ label: `${d.name} (${d.code})`, value: d.id }))
    ]);

    departmentOptions = computed(() => this.departments().map((d) => ({ label: `${d.name} (${d.code})`, value: d.id })));

    filteredPrograms = computed(() => {
        let list = this.programs();
        const q = this.search().trim().toLowerCase();
        const dept = this.departmentFilter();
        const degree = this.degreeTypeFilter();
        const status = this.statusFilter();

        if (dept) list = list.filter((p) => p.departmentId === dept);
        if (degree) list = list.filter((p) => p.degreeType === degree);
        if (status) list = list.filter((p) => p.status === status);
        if (q) {
            list = list.filter((p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
        }
        return [...list].sort((a, b) => a.name.localeCompare(b.name));
    });

    departmentName(id: string): string {
        return this.departments().find((d) => d.id === id)?.name ?? id;
    }

    clearFilters(): void {
        this.search.set('');
        this.departmentFilter.set(null);
        this.degreeTypeFilter.set(null);
        this.statusFilter.set(null);
    }

    onPageChange(event: { rows: number }): void {
        if (event.rows !== this.rows()) {
            this.rows.set(event.rows);
        }
    }

    // Form
    formDialogVisible = signal(false);
    editingProgram = signal<Program | null>(null);

    form = this.fb.nonNullable.group({
        name: ['', Validators.required],
        code: ['', Validators.required],
        degreeType: [null as DegreeType | null, Validators.required],
        departmentId: ['', Validators.required],
        durationYears: [null as number | null, [Validators.required, Validators.min(0.01)]],
        totalSemesters: [null as number | null, [Validators.required, Validators.min(2), Validators.max(12)]],
        creditsPerSemester: [null as number | null, [Validators.required, Validators.min(0.01)]],
        status: ['ACTIVE' as ProgramStatus, Validators.required]
    });

    totalCreditsPreview = computed(() => {
        const sem = this.form.get('totalSemesters')?.value as number | null;
        const cps = this.form.get('creditsPerSemester')?.value as number | null;
        if (sem != null && cps != null && sem > 0 && cps > 0) return sem * cps;
        return null;
    });

    openCreate(): void {
        this.editingProgram.set(null);
        this.form.reset({
            name: '',
            code: '',
            degreeType: null,
            departmentId: this.departments()[0]?.id ?? '',
            durationYears: 4,
            totalSemesters: 8,
            creditsPerSemester: 18,
            status: 'ACTIVE' as ProgramStatus
        });
        this.form.get('code')?.setErrors(null);
        this.formDialogVisible.set(true);
    }

    openEdit(row: Program): void {
        this.editingProgram.set(row);
        this.form.reset({
            name: row.name,
            code: row.code,
            degreeType: row.degreeType,
            departmentId: row.departmentId,
            durationYears: row.durationYears,
            totalSemesters: row.totalSemesters,
            creditsPerSemester: row.creditsPerSemester,
            status: row.status
        });
        this.form.get('code')?.setErrors(null);
        this.formDialogVisible.set(true);
        // if detail is open, keep it but will refresh on save
    }

    openEditFromDetail(): void {
        const prog = this.detailProgram();
        if (!prog) return;
        this.detailVisible.set(false);
        this.openEdit(prog);
    }

    closeFormDialog(): void {
        this.formDialogVisible.set(false);
        this.editingProgram.set(null);
    }

    save(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.msg.add({ severity: 'warn', summary: 'Validation', detail: 'Please fix the highlighted errors.' });
            return;
        }
        const raw = this.form.getRawValue();
        const name = raw.name.trim();
        const code = raw.code.trim().toUpperCase();
        const degreeType = raw.degreeType as DegreeType;
        const departmentId = raw.departmentId;
        const durationYears = Number(raw.durationYears);
        const totalSemesters = Number(raw.totalSemesters);
        const creditsPerSemester = Number(raw.creditsPerSemester);
        const status = raw.status as ProgramStatus;

        if (!name) {
            this.msg.add({ severity: 'warn', summary: 'Validation', detail: 'Program name is required.' });
            return;
        }
        if (!code) {
            this.msg.add({ severity: 'warn', summary: 'Validation', detail: 'Program code is required.' });
            return;
        }
        if (!degreeType || !departmentId) {
            this.msg.add({ severity: 'warn', summary: 'Validation', detail: 'Degree type and department are required.' });
            return;
        }
        if (!(durationYears > 0)) {
            this.form.get('durationYears')?.setErrors({ min: true });
            this.msg.add({ severity: 'warn', summary: 'Validation', detail: 'Duration must be greater than 0.' });
            return;
        }
        if (!(totalSemesters >= 2 && totalSemesters <= 12)) {
            this.form.get('totalSemesters')?.setErrors({ min: true });
            this.msg.add({ severity: 'warn', summary: 'Validation', detail: 'Total semesters must be between 2 and 12.' });
            return;
        }
        if (!(creditsPerSemester > 0)) {
            this.form.get('creditsPerSemester')?.setErrors({ min: true });
            this.msg.add({ severity: 'warn', summary: 'Validation', detail: 'Credits per semester must be greater than 0.' });
            return;
        }

        const editing = this.editingProgram();
        const normalizedCode = code.trim().toLowerCase();
        const duplicate = this.programs().some((p) => p.code.trim().toLowerCase() === normalizedCode && p.id !== editing?.id);
        if (duplicate) {
            this.form.get('code')?.setErrors({ duplicate: true });
            this.msg.add({ severity: 'error', summary: 'Duplicate code', detail: `Program code "${code}" is already in use (case-insensitive).` });
            return;
        }

        const deptExists = this.departments().some((d) => d.id === departmentId);
        if (!deptExists) {
            this.msg.add({ severity: 'error', summary: 'Invalid department', detail: 'Selected department does not exist.' });
            return;
        }

        const now = new Date().toISOString();
        if (editing) {
            const updated: Program = {
                ...editing,
                name,
                code,
                degreeType,
                departmentId,
                durationYears,
                totalSemesters,
                creditsPerSemester,
                status,
                updatedAt: now
            };
            this.core.update<Program & { id: string }>('programs', updated);
            this.msg.add({ severity: 'success', summary: 'Updated', detail: `Program "${name}" updated.` });
            // refresh detail if open
            if (this.detailProgram()?.id === editing.id) {
                this.detailProgram.set(updated);
            }
        } else {
            const created = this.core.create<Program & { id: string }>('programs', {
                id: this.core.generateId('prog'),
                name,
                code,
                degreeType,
                departmentId,
                durationYears,
                totalSemesters,
                creditsPerSemester,
                status,
                createdAt: now,
                updatedAt: now
            } as Program & { id: string });
            void created;
            this.msg.add({ severity: 'success', summary: 'Created', detail: `Program "${name}" created.` });
        }
        this.closeFormDialog();
    }

    // Detail
    detailVisible = signal(false);
    detailProgram = signal<Program | null>(null);
    detailStudentLimit = signal(10);

    detailCourses = computed(() => {
        const prog = this.detailProgram();
        if (!prog) return [] as Course[];
        return this.courses().filter((c) => c.programIds.includes(prog.id));
    });

    detailStudents = computed(() => {
        const prog = this.detailProgram();
        if (!prog) return [] as Student[];
        return this.students().filter((s) => s.programId === prog.id);
    });

    openDetail(row: Program): void {
        this.detailProgram.set(row);
        this.detailStudentLimit.set(10);
        // Inline detail below table is primary per spec (Card with counts); keep dialog closed to avoid duplicate
        this.detailVisible.set(false);
        queueMicrotask(() => document.getElementById('program-detail-inline')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }

    closeDetail(): void {
        this.detailVisible.set(false);
        // Clear selection so inline section collapses; dialog also closes
        this.detailProgram.set(null);
    }

    confirmDelete(row: Program): void {
        const enrolled = this.students().filter((s) => s.programId === row.id);
        const attachedCourses = this.courses().filter((c) => c.programIds.includes(row.id));

        if (enrolled.length > 0) {
            const names = enrolled.slice(0, 3).map((s) => `${s.firstName} ${s.lastName} (${s.admissionNo})`).join(', ');
            const more = enrolled.length > 3 ? ` and ${enrolled.length - 3} more` : '';
            const courseNote = attachedCourses.length > 0 ? ` It also has ${attachedCourses.length} course(s) linked.` : '';
            this.confirm.confirm({
                message: `Cannot delete program "${row.name}" (${row.code}): ${enrolled.length} student(s) are still enrolled (${names}${more}).${courseNote} Reassign or remove those students (and unlink courses) before deleting.`,
                header: 'Delete Blocked',
                icon: 'pi pi-ban',
                acceptLabel: 'OK',
                rejectVisible: false,
                accept: () => {}
            });
            return;
        }

        if (attachedCourses.length > 0) {
            const courseList = attachedCourses.slice(0, 4).map((c) => c.code).join(', ');
            const more = attachedCourses.length > 4 ? ` and ${attachedCourses.length - 4} more` : '';
            this.confirm.confirm({
                message: `Cannot delete program "${row.name}" (${row.code}): ${attachedCourses.length} course(s) are still linked (${courseList}${more}). Unlink or reassign those courses before deleting. If you want to force delete, unlink them first in the Courses catalog.`,
                header: 'Delete Blocked',
                icon: 'pi pi-ban',
                acceptLabel: 'OK',
                rejectVisible: false,
                accept: () => {}
            });
            return;
        }

        this.confirm.confirm({
            message: `Delete program "${row.name}" (${row.code})? This cannot be undone.`,
            header: 'Delete Program',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Delete',
            rejectLabel: 'Cancel',
            accept: () => {
                this.core.remove('programs', row.id);
                this.msg.add({ severity: 'success', summary: 'Deleted', detail: `Program "${row.name}" removed.` });
                if (this.detailProgram()?.id === row.id) this.closeDetail();
            }
        });
    }
}
