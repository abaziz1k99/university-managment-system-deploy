import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { PageHeader } from '@/app/shared/components/page-header';
import { StatCard } from '@/app/shared/components/stat-card';
import { StatusTag } from '@/app/shared/components/status-tag';
import { FormField } from '@/app/shared/components/form-field';
import { EmptyState } from '@/app/shared/components/empty-state';
import { AdmissionsService } from '@/app/core/services/admissions.service';
import { AdmissionApplication, Department, Program } from '@/app/core/models/index';
import { formatDate as formatDateUtil } from '@/app/core/utils/util';

type TimelineState = 'done' | 'current' | 'pending' | 'rejected';

interface TimelineStep {
    label: string;
    date: string | null;
    state: TimelineState;
}

interface Option {
    label: string;
    value: string;
}

function bdPhoneValidator(control: AbstractControl): ValidationErrors | null {
    const value = (control.value ?? '').toString().trim();
    if (!value) return null;
    const normalized = value.replace(/[\s\-()]/g, '');
    const re = /^(?:\+880|\+88)?0?1[3-9]\d{8}$/;
    return re.test(normalized) ? null : { phonePattern: true };
}

@Component({
    selector: 'app-admissions-list',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        CardModule,
        ButtonModule,
        InputTextModule,
        SelectModule,
        TextareaModule,
        DatePickerModule,
        ToggleSwitchModule,
        TableModule,
        DialogModule,
        ToastModule,
        ConfirmDialogModule,
        TooltipModule,
        PageHeader,
        StatCard,
        StatusTag,
        FormField,
        EmptyState
    ],
    providers: [ConfirmationService, MessageService],
    template: `
        <app-page-header title="Admissions" subtitle="Review applications and enroll approved applicants">
            <p-button label="New application" icon="pi pi-plus" (onClick)="openNewApplication()" />
        </app-page-header>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 mb-6">
            <app-stat-card label="Total" [value]="stats().total" context="applications" icon="pi pi-file" />
            <app-stat-card label="Submitted" [value]="stats().submitted" context="awaiting review" icon="pi pi-inbox" />
            <app-stat-card label="Under review" [value]="stats().underReview" context="in progress" icon="pi pi-search" />
            <app-stat-card label="Approved" [value]="stats().approved" context="ready to enroll" icon="pi pi-check-circle" />
            <app-stat-card label="Rejected" [value]="stats().rejected" context="not admitted" icon="pi pi-times-circle" />
            <app-stat-card label="Enrolled" [value]="stats().enrolled" context="students created" icon="pi pi-user-plus" />
            <app-stat-card label="Conversion" [value]="conversionLabel()" context="enrolled / total" icon="pi pi-percentage" />
        </div>

        <p-card>
            <div class="flex flex-col lg:flex-row gap-3 mb-4">
                <div class="flex-1">
                    <input
                        pInputText
                        type="text"
                        placeholder="Search by name, email, phone, or application ID"
                        class="w-full"
                        [ngModel]="search()"
                        (ngModelChange)="search.set($event)" />
                </div>
                <div class="flex flex-wrap gap-2 items-center">
                    <p-select
                        [ngModel]="statusFilter()"
                        (ngModelChange)="statusFilter.set($event)"
                        [options]="statusOptions"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Status"
                        styleClass="w-44"
                        [showClear]="true" />
                    <p-select
                        [ngModel]="programFilter()"
                        (ngModelChange)="programFilter.set($event)"
                        [options]="programOptions()"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Program"
                        styleClass="w-48"
                        [showClear]="true" />
                    <p-select
                        [ngModel]="departmentFilter()"
                        (ngModelChange)="departmentFilter.set($event)"
                        [options]="departmentOptions()"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Department"
                        styleClass="w-48"
                        [showClear]="true" />
                    <p-datepicker
                        [ngModel]="dateFrom()"
                        (ngModelChange)="dateFrom.set($event)"
                        placeholder="From date"
                        dateFormat="yy-mm-dd"
                        [showIcon]="true"
                        [showClear]="true"
                        styleClass="w-44" />
                    <p-datepicker
                        [ngModel]="dateTo()"
                        (ngModelChange)="dateTo.set($event)"
                        placeholder="To date"
                        dateFormat="yy-mm-dd"
                        [showIcon]="true"
                        [showClear]="true"
                        styleClass="w-44" />
                </div>
            </div>

            <p-table
                [value]="filtered()"
                dataKey="id"
                [paginator]="true"
                [rows]="10"
                [rowsPerPageOptions]="[10, 25, 50, 100]"
                [showCurrentPageReport]="true"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} applications"
                [sortField]="'submittedAt'"
                [sortOrder]="-1"
                [tableStyle]="{ 'min-width': '72rem' }"
                styleClass="p-datatable-sm">
                <ng-template pTemplate="header">
                    <tr>
                        <th pSortableColumn="id">ID <p-sortIcon field="id" /></th>
                        <th pSortableColumn="applicantName">Applicant <p-sortIcon field="applicantName" /></th>
                        <th pSortableColumn="programId">Program <p-sortIcon field="programId" /></th>
                        <th pSortableColumn="departmentId">Department <p-sortIcon field="departmentId" /></th>
                        <th pSortableColumn="applicationFeePaid">Fee <p-sortIcon field="applicationFeePaid" /></th>
                        <th pSortableColumn="status">Status <p-sortIcon field="status" /></th>
                        <th pSortableColumn="submittedAt">Submitted <p-sortIcon field="submittedAt" /></th>
                        <th style="width: 11rem">Actions</th>
                    </tr>
                </ng-template>
                <ng-template pTemplate="body" let-app>
                    <tr>
                        <td class="font-medium whitespace-nowrap">{{ app.id }}</td>
                        <td>
                            <div class="flex flex-col">
                                <span class="font-medium">{{ app.applicantName }}</span>
                                <span class="text-muted-color text-sm">{{ app.email }}</span>
                            </div>
                        </td>
                        <td>{{ programName(app.programId) }}</td>
                        <td>{{ departmentName(app.departmentId) }}</td>
                        <td>
                            <app-status-tag
                                [status]="app.applicationFeePaid ? 'PAID' : 'UNPAID'"
                                [displayValue]="app.applicationFeePaid ? 'Paid' : 'Unpaid'" />
                        </td>
                        <td><app-status-tag [status]="app.status" /></td>
                        <td class="whitespace-nowrap">{{ formatDate(app.submittedAt) }}</td>
                        <td>
                            <div class="flex items-center gap-1">
                                <p-button
                                    icon="pi pi-eye"
                                    severity="info"
                                    [rounded]="true"
                                    [text]="true"
                                    size="small"
                                    (onClick)="openDetail(app)"
                                    pTooltip="View details"
                                    tooltipPosition="top" />
                                @if (canMarkUnderReview(app)) {
                                    <p-button
                                        icon="pi pi-search"
                                        severity="warn"
                                        [rounded]="true"
                                        [text]="true"
                                        size="small"
                                        (onClick)="markUnderReview(app)"
                                        pTooltip="Mark under review"
                                        tooltipPosition="top" />
                                }
                                @if (canReview(app)) {
                                    <p-button
                                        icon="pi pi-check"
                                        severity="success"
                                        [rounded]="true"
                                        [text]="true"
                                        size="small"
                                        (onClick)="approve(app)"
                                        pTooltip="Approve"
                                        tooltipPosition="top" />
                                    <p-button
                                        icon="pi pi-times"
                                        severity="danger"
                                        [rounded]="true"
                                        [text]="true"
                                        size="small"
                                        (onClick)="openReject(app)"
                                        pTooltip="Reject"
                                        tooltipPosition="top" />
                                }
                                @if (canEnroll(app)) {
                                    <p-button
                                        icon="pi pi-user-plus"
                                        severity="success"
                                        [rounded]="true"
                                        [text]="true"
                                        size="small"
                                        (onClick)="openEnroll(app)"
                                        pTooltip="Enroll applicant"
                                        tooltipPosition="top" />
                                }
                            </div>
                        </td>
                    </tr>
                </ng-template>
                <ng-template pTemplate="emptymessage">
                    <tr>
                        <td colspan="8">
                            @if (apps().length === 0) {
                                <app-empty-state
                                    title="No applications yet"
                                    message="Create the first admission application to start reviewing candidates."
                                    icon="pi pi-inbox"
                                    actionLabel="New application"
                                    (action)="openNewApplication()" />
                            } @else {
                                <app-empty-state
                                    title="No applications match"
                                    message="Adjust the search or filters to see more applications."
                                    icon="pi pi-filter"
                                    actionLabel="Clear filters"
                                    (action)="clearFilters()" />
                            }
                        </td>
                    </tr>
                </ng-template>
            </p-table>
        </p-card>

        <!-- Detail dialog -->
        <p-dialog
            [visible]="detailVisible()"
            (visibleChange)="detailVisible.set($event)"
            [modal]="true"
            [draggable]="false"
            [resizable]="false"
            [dismissableMask]="true"
            [style]="{ width: '52rem', maxWidth: '95vw' }"
            header="Application details">
            @if (selected(); as app) {
                <div class="space-y-5">
                    <div class="flex items-start justify-between gap-4">
                        <div>
                            <div class="flex items-center gap-2">
                                <h3 class="text-lg font-semibold text-surface-900 dark:text-surface-0">{{ app.applicantName }}</h3>
                                <app-status-tag [status]="app.status" />
                            </div>
                            <p class="text-muted-color text-sm mt-1">Application {{ app.id }}</p>
                        </div>
                        <div class="text-right text-sm">
                            <p class="text-muted-color">Submitted</p>
                            <p class="font-medium">{{ formatDate(app.submittedAt) }}</p>
                        </div>
                    </div>

                    <div class="grid gap-4 md:grid-cols-2">
                        <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-4 space-y-2 text-sm">
                            <p class="font-medium text-surface-900 dark:text-surface-0">Applicant</p>
                            <div class="flex justify-between gap-4"><span class="text-muted-color">Email</span><span class="font-medium break-all text-right">{{ app.email }}</span></div>
                            <div class="flex justify-between gap-4"><span class="text-muted-color">Phone</span><span class="font-medium">{{ app.phone }}</span></div>
                            <div class="flex justify-between gap-4"><span class="text-muted-color">Date of birth</span><span class="font-medium">{{ formatDate(app.dob) }}</span></div>
                            <div class="flex justify-between gap-4"><span class="text-muted-color">Gender</span><span class="font-medium">{{ genderLabel(app.gender) }}</span></div>
                        </div>
                        <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-4 space-y-2 text-sm">
                            <p class="font-medium text-surface-900 dark:text-surface-0">Academic</p>
                            <div class="flex justify-between gap-4"><span class="text-muted-color">Program</span><span class="font-medium text-right">{{ programName(app.programId) }}</span></div>
                            <div class="flex justify-between gap-4"><span class="text-muted-color">Department</span><span class="font-medium text-right">{{ departmentName(app.departmentId) }}</span></div>
                            <div class="flex justify-between gap-4"><span class="text-muted-color">Reviewed</span><span class="font-medium">{{ app.reviewedAt ? formatDate(app.reviewedAt) : '—' }}</span></div>
                        </div>
                    </div>

                    <div>
                        <p class="text-sm font-medium text-surface-900 dark:text-surface-0 mb-1">Qualifications</p>
                        <p class="text-sm text-muted-color whitespace-pre-line">{{ app.qualifications || '—' }}</p>
                    </div>

                    <div class="flex items-center justify-between gap-4 rounded-lg border border-surface-200 dark:border-surface-700 p-4">
                        <div>
                            <p class="text-sm font-medium text-surface-900 dark:text-surface-0">Application fee</p>
                            <p class="text-muted-color text-sm">Record whether the application fee has been received.</p>
                        </div>
                        <div class="flex items-center gap-3">
                            <p-toggleswitch inputId="feePaid" [ngModel]="feePaidDraft()" (ngModelChange)="feePaidDraft.set($event)" />
                            <label for="feePaid" class="text-sm">{{ feePaidDraft() ? 'Paid' : 'Unpaid' }}</label>
                            <p-button label="Save" icon="pi pi-save" size="small" [disabled]="feePaidDraft() === app.applicationFeePaid" (onClick)="saveFee(app)" />
                        </div>
                    </div>

                    <div>
                        <p class="text-sm font-medium text-surface-900 dark:text-surface-0 mb-2">Progress</p>
                        <ol>
                            @for (step of timeline(app); track step.label; let last = $last) {
                                <li class="flex gap-3">
                                    <div class="flex flex-col items-center">
                                        <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0" [ngClass]="stepStateClass(step.state)">
                                            <i class="pi" [ngClass]="stepIcon(step.state)"></i>
                                        </span>
                                        @if (!last) {
                                            <span class="w-px flex-1 bg-surface-200 dark:bg-surface-700"></span>
                                        }
                                    </div>
                                    <div class="pb-4">
                                        <p class="text-sm font-medium" [ngClass]="step.state === 'pending' ? 'text-muted-color' : 'text-surface-900 dark:text-surface-0'">{{ step.label }}</p>
                                        @if (step.date) {
                                            <p class="text-muted-color text-xs">{{ formatDateTime(step.date) }}</p>
                                        }
                                    </div>
                                </li>
                            }
                        </ol>
                    </div>

                    @if (app.reviewNotes) {
                        <div>
                            <p class="text-sm font-medium text-surface-900 dark:text-surface-0 mb-1">Review notes</p>
                            <p class="text-sm text-muted-color whitespace-pre-line">{{ app.reviewNotes }}</p>
                        </div>
                    }

                    @if (app.studentId) {
                        <div class="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4 text-sm">
                            <p class="font-medium text-green-700 dark:text-green-300">Enrolled as student {{ app.studentId }}</p>
                        </div>
                    }
                </div>

                <ng-template pTemplate="footer">
                    <div class="flex flex-wrap justify-end gap-2">
                        <p-button label="Close" severity="secondary" [outlined]="true" (onClick)="detailVisible.set(false)" />
                        @if (canMarkUnderReview(app)) {
                            <p-button label="Mark under review" icon="pi pi-search" severity="warn" (onClick)="markUnderReview(app)" />
                        }
                        @if (canReview(app)) {
                            <p-button label="Reject" icon="pi pi-times" severity="danger" [outlined]="true" (onClick)="openReject(app)" />
                            <p-button label="Approve" icon="pi pi-check" severity="success" (onClick)="approve(app)" />
                        }
                        @if (canEnroll(app)) {
                            <p-button label="Enroll" icon="pi pi-user-plus" severity="success" (onClick)="openEnroll(app)" />
                        }
                    </div>
                </ng-template>
            }
        </p-dialog>

        <!-- Reject dialog -->
        <p-dialog
            [visible]="rejectVisible()"
            (visibleChange)="rejectVisible.set($event)"
            [modal]="true"
            [dismissableMask]="true"
            [style]="{ width: '30rem', maxWidth: '95vw' }"
            header="Reject application">
            @if (rejectTarget(); as app) {
                <p class="text-sm text-muted-color mb-4">Rejecting {{ app.applicantName }} ({{ app.id }}). The reason is stored on the application record.</p>
                <form [formGroup]="rejectForm">
                    <app-form-field label="Reason *" [error]="fieldError(rejectForm, 'reason')">
                        <textarea pTextarea formControlName="reason" rows="3" class="w-full" placeholder="Explain why this application is rejected"></textarea>
                    </app-form-field>
                </form>
            }
            <ng-template pTemplate="footer">
                <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="rejectVisible.set(false)" />
                <p-button label="Reject application" icon="pi pi-times" severity="danger" (onClick)="confirmReject()" />
            </ng-template>
        </p-dialog>

        <!-- New application dialog -->
        <p-dialog
            [visible]="newVisible()"
            (visibleChange)="newVisible.set($event)"
            [modal]="true"
            [dismissableMask]="true"
            [style]="{ width: '48rem', maxWidth: '95vw' }"
            header="New application">
            <form [formGroup]="newForm" class="grid gap-4 md:grid-cols-2">
                <app-form-field label="Applicant name *" [error]="fieldError(newForm, 'applicantName')">
                    <input pInputText formControlName="applicantName" placeholder="Full name" />
                </app-form-field>
                <app-form-field label="Email *" [error]="fieldError(newForm, 'email')">
                    <input pInputText formControlName="email" type="email" placeholder="name@example.com" />
                </app-form-field>
                <app-form-field label="Phone *" [error]="fieldError(newForm, 'phone')">
                    <input pInputText formControlName="phone" placeholder="01711 000001" />
                </app-form-field>
                <app-form-field label="Date of birth *" [error]="fieldError(newForm, 'dob')">
                    <p-datepicker formControlName="dob" dateFormat="yy-mm-dd" [maxDate]="maxDob" [showIcon]="true" inputId="newDob" styleClass="w-full" />
                </app-form-field>
                <app-form-field label="Gender *" [error]="fieldError(newForm, 'gender')">
                    <p-select formControlName="gender" [options]="genderOptions" optionLabel="label" optionValue="value" placeholder="Select gender" />
                </app-form-field>
                <app-form-field label="Program *" [error]="fieldError(newForm, 'programId')">
                    <p-select formControlName="programId" [options]="programs()" optionLabel="name" optionValue="id" placeholder="Select program" (onChange)="onNewProgramChange()" />
                </app-form-field>
                <app-form-field label="Department *" hint="Set automatically from the chosen program" [error]="fieldError(newForm, 'departmentId')">
                    <p-select formControlName="departmentId" [options]="departments()" optionLabel="name" optionValue="id" placeholder="Choose a program first" [disabled]="true" />
                </app-form-field>
                <app-form-field label="Application fee paid">
                    <div class="flex items-center gap-2 mt-1">
                        <p-toggleswitch formControlName="applicationFeePaid" inputId="newFee" />
                        <label for="newFee" class="text-sm">{{ newForm.controls.applicationFeePaid.value ? 'Paid' : 'Not paid' }}</label>
                    </div>
                </app-form-field>
                <div class="md:col-span-2">
                    <app-form-field label="Qualifications" [error]="fieldError(newForm, 'qualifications')">
                        <textarea pTextarea formControlName="qualifications" rows="2" class="w-full" placeholder="HSC GPA, SSC GPA, prior degrees"></textarea>
                    </app-form-field>
                </div>
            </form>
            <ng-template pTemplate="footer">
                <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="newVisible.set(false)" />
                <p-button label="Create application" icon="pi pi-plus" (onClick)="createApplication()" />
            </ng-template>
        </p-dialog>

        <!-- Enroll dialog -->
        <p-dialog
            [visible]="enrollVisible()"
            (visibleChange)="enrollVisible.set($event)"
            [modal]="true"
            [dismissableMask]="true"
            [style]="{ width: '48rem', maxWidth: '95vw' }"
            header="Enroll applicant">
            @if (enrollTarget(); as app) {
                <p class="text-sm text-muted-color mb-4">Confirming enrollment creates a student record for {{ app.applicantName }} ({{ app.email }}).</p>
                <form [formGroup]="enrollForm" class="grid gap-4 md:grid-cols-2">
                    <app-form-field label="Program *" [error]="fieldError(enrollForm, 'programId')">
                        <p-select formControlName="programId" [options]="programs()" optionLabel="name" optionValue="id" placeholder="Select program" (onChange)="onEnrollProgramChange()" />
                    </app-form-field>
                    <app-form-field label="Department *" [error]="fieldError(enrollForm, 'departmentId')">
                        <p-select formControlName="departmentId" [options]="departments()" optionLabel="name" optionValue="id" placeholder="Select department" [disabled]="true" />
                    </app-form-field>
                    <app-form-field label="Current semester *" [error]="fieldError(enrollForm, 'currentSemesterId')">
                        <p-select formControlName="currentSemesterId" [options]="semesters()" optionLabel="name" optionValue="id" placeholder="Select semester" />
                    </app-form-field>
                    <app-form-field label="Session *" [error]="fieldError(enrollForm, 'session')">
                        <p-select formControlName="session" [options]="sessionOptions" placeholder="Select session" />
                    </app-form-field>
                    <app-form-field label="Date of birth *" [error]="fieldError(enrollForm, 'dob')">
                        <p-datepicker formControlName="dob" dateFormat="yy-mm-dd" [maxDate]="maxDob" [showIcon]="true" inputId="enrollDob" styleClass="w-full" />
                    </app-form-field>
                    <app-form-field label="Guardian name *" [error]="fieldError(enrollForm, 'guardianName')">
                        <input pInputText formControlName="guardianName" placeholder="Guardian full name" />
                    </app-form-field>
                    <app-form-field label="Guardian phone *" [error]="fieldError(enrollForm, 'guardianPhone')">
                        <input pInputText formControlName="guardianPhone" placeholder="01712 000001" />
                    </app-form-field>
                    <app-form-field label="Guardian relation *" [error]="fieldError(enrollForm, 'guardianRelation')">
                        <p-select formControlName="guardianRelation" [options]="relationOptions" placeholder="Select relation" />
                    </app-form-field>
                    <div class="md:col-span-2">
                        <app-form-field label="Address *" [error]="fieldError(enrollForm, 'address')">
                            <textarea pTextarea formControlName="address" rows="2" class="w-full" placeholder="Street, city, postal code"></textarea>
                        </app-form-field>
                    </div>
                </form>
            }
            <ng-template pTemplate="footer">
                <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="enrollVisible.set(false)" />
                <p-button label="Enroll applicant" icon="pi pi-user-plus" severity="success" (onClick)="confirmEnroll()" />
            </ng-template>
        </p-dialog>

        <p-toast />
        <p-confirmDialog />
    `
})
export class AdmissionsList {
    private readonly admissions = inject(AdmissionsService);
    private readonly fb = inject(FormBuilder);
    private readonly msg = inject(MessageService);
    private readonly confirm = inject(ConfirmationService);

    readonly apps = this.admissions.core.admissionApplications;
    readonly departments = this.admissions.core.departments;
    readonly programs = this.admissions.core.programs;
    readonly semesters = this.admissions.core.semesters;

    readonly stats = computed(() => this.admissions.stats());
    readonly conversionLabel = computed(() => `${this.stats().conversionRate.toFixed(1)}%`);

    // Filters
    readonly search = signal('');
    readonly statusFilter = signal('');
    readonly programFilter = signal('');
    readonly departmentFilter = signal('');
    readonly dateFrom = signal<Date | null>(null);
    readonly dateTo = signal<Date | null>(null);

    readonly maxDob = new Date(new Date().setFullYear(new Date().getFullYear() - 16));

    readonly statusOptions: Option[] = [
        { label: 'Submitted', value: 'SUBMITTED' },
        { label: 'Under review', value: 'UNDER_REVIEW' },
        { label: 'Approved', value: 'APPROVED' },
        { label: 'Rejected', value: 'REJECTED' },
        { label: 'Enrolled', value: 'ENROLLED' }
    ];

    readonly genderOptions: Option[] = [
        { label: 'Male', value: 'MALE' },
        { label: 'Female', value: 'FEMALE' },
        { label: 'Other', value: 'OTHER' }
    ];

    readonly relationOptions: Option[] = [
        { label: 'Father', value: 'Father' },
        { label: 'Mother', value: 'Mother' },
        { label: 'Guardian', value: 'Guardian' },
        { label: 'Other', value: 'Other' }
    ];

    readonly sessionOptions: Option[] = [
        { label: '2021-22', value: '2021-22' },
        { label: '2022-23', value: '2022-23' },
        { label: '2023-24', value: '2023-24' },
        { label: '2024-25', value: '2024-25' },
        { label: '2025-26', value: '2025-26' }
    ];

    readonly programOptions = computed<Option[]>(() => [{ label: 'All programs', value: '' }, ...this.programs().map((p) => ({ label: p.name, value: p.id }))]);

    readonly departmentOptions = computed<Option[]>(() => [{ label: 'All departments', value: '' }, ...this.departments().map((d) => ({ label: d.name, value: d.id }))]);

    readonly filtered = computed<AdmissionApplication[]>(() => {
        const term = this.search().trim().toLowerCase();
        const status = this.statusFilter();
        const program = this.programFilter();
        const department = this.departmentFilter();
        const from = this.dateFrom();
        const to = this.dateTo();

        let result = this.apps();
        if (term) {
            result = result.filter((a) => a.id.toLowerCase().includes(term) || a.applicantName.toLowerCase().includes(term) || a.email.toLowerCase().includes(term) || a.phone.toLowerCase().includes(term));
        }
        if (status) {
            result = result.filter((a) => a.status === status);
        }
        if (program) {
            result = result.filter((a) => a.programId === program);
        }
        if (department) {
            result = result.filter((a) => a.departmentId === department);
        }
        if (from) {
            const fromTs = new Date(from).setHours(0, 0, 0, 0);
            result = result.filter((a) => new Date(a.submittedAt).getTime() >= fromTs);
        }
        if (to) {
            const toTs = new Date(to).setHours(23, 59, 59, 999);
            result = result.filter((a) => new Date(a.submittedAt).getTime() <= toTs);
        }
        return result;
    });

    // Detail
    readonly selected = signal<AdmissionApplication | null>(null);
    readonly detailVisible = signal(false);
    readonly feePaidDraft = signal(false);

    // Reject
    readonly rejectVisible = signal(false);
    readonly rejectTarget = signal<AdmissionApplication | null>(null);

    // Enroll
    readonly enrollVisible = signal(false);
    readonly enrollTarget = signal<AdmissionApplication | null>(null);

    // New application
    readonly newVisible = signal(false);

    readonly rejectForm = this.fb.group({
        reason: ['', Validators.required]
    });

    readonly newForm = this.fb.group({
        applicantName: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        phone: ['', [Validators.required, bdPhoneValidator]],
        dob: this.fb.control<Date | string | null>(null, Validators.required),
        gender: ['MALE', Validators.required],
        programId: ['', Validators.required],
        departmentId: [{ value: '', disabled: true }, Validators.required],
        qualifications: [''],
        applicationFeePaid: [false]
    });

    readonly enrollForm = this.fb.group({
        programId: ['', Validators.required],
        departmentId: [{ value: '', disabled: true }, Validators.required],
        currentSemesterId: ['', Validators.required],
        session: ['', Validators.required],
        dob: this.fb.control<Date | string | null>(null, Validators.required),
        guardianName: ['', Validators.required],
        guardianPhone: ['', [Validators.required, bdPhoneValidator]],
        guardianRelation: ['Father', Validators.required],
        address: ['', Validators.required]
    });

    // Derived helpers
    programName(id: string): string {
        return this.admissions.core.get<Program>('programs', id)?.name ?? id;
    }

    departmentName(id: string): string {
        return this.admissions.core.get<Department>('departments', id)?.name ?? id;
    }

    genderLabel(gender: AdmissionApplication['gender']): string {
        const map: Record<AdmissionApplication['gender'], string> = { MALE: 'Male', FEMALE: 'Female', OTHER: 'Other' };
        return map[gender];
    }

    formatDate(value: string): string {
        return formatDateUtil(value, 'DD/MM/YYYY');
    }

    formatDateTime(value: string): string {
        const d = new Date(value);
        if (isNaN(d.getTime())) return '—';
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${formatDateUtil(value, 'DD/MM/YYYY')} ${hh}:${mm}`;
    }

    stepStateClass(state: TimelineState): string {
        const map: Record<TimelineState, string> = {
            done: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
            current: 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300',
            rejected: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
            pending: 'bg-surface-100 text-surface-400 dark:bg-surface-800 dark:text-surface-500'
        };
        return map[state];
    }

    stepIcon(state: TimelineState): string {
        const map: Record<TimelineState, string> = { done: 'pi-check', current: 'pi-clock', rejected: 'pi-times', pending: 'pi-circle' };
        return map[state];
    }

    timeline(app: AdmissionApplication): TimelineStep[] {
        const decided = app.status === 'APPROVED' || app.status === 'REJECTED' || app.status === 'ENROLLED';
        const underReviewState: TimelineState = app.status === 'UNDER_REVIEW' ? 'current' : decided ? 'done' : 'pending';

        let decision: TimelineStep;
        if (app.status === 'REJECTED') {
            decision = { label: 'Rejected', date: app.reviewedAt, state: 'rejected' };
        } else if (app.status === 'APPROVED') {
            decision = { label: 'Approved', date: app.reviewedAt, state: 'current' };
        } else if (app.status === 'ENROLLED') {
            decision = { label: 'Approved', date: app.reviewedAt, state: 'done' };
        } else {
            decision = { label: 'Approved or rejected', date: null, state: 'pending' };
        }

        const enrolled: TimelineStep = app.status === 'ENROLLED' ? { label: 'Enrolled', date: null, state: 'done' } : { label: 'Enrolled', date: null, state: 'pending' };

        return [{ label: 'Submitted', date: app.submittedAt, state: 'done' }, { label: 'Under review', date: null, state: underReviewState }, decision, enrolled];
    }

    canMarkUnderReview(app: AdmissionApplication): boolean {
        return app.status === 'SUBMITTED';
    }

    canReview(app: AdmissionApplication): boolean {
        return app.status === 'SUBMITTED' || app.status === 'UNDER_REVIEW';
    }

    canEnroll(app: AdmissionApplication): boolean {
        return app.status === 'APPROVED' && !app.studentId;
    }

    // Filter actions
    clearFilters(): void {
        this.search.set('');
        this.statusFilter.set('');
        this.programFilter.set('');
        this.departmentFilter.set('');
        this.dateFrom.set(null);
        this.dateTo.set(null);
    }

    // Field validation message
    fieldError(form: FormGroup, field: string): string {
        const control = form.get(field);
        if (!control || !(control.touched || control.dirty) || !control.invalid) {
            return '';
        }
        if (control.hasError('required')) return 'This field is required.';
        if (control.hasError('email')) return 'Enter a valid email address.';
        if (control.hasError('phonePattern')) return 'Enter a valid BD phone (01XXXXXXXXX or +8801XXXXXXXXX).';
        return 'Enter a valid value.';
    }

    // Detail
    openDetail(app: AdmissionApplication): void {
        this.selected.set(app);
        this.feePaidDraft.set(app.applicationFeePaid);
        this.detailVisible.set(true);
    }

    private refreshSelected(): void {
        const current = this.selected();
        if (!current) return;
        const fresh = this.admissions.get(current.id);
        if (fresh) {
            this.selected.set(fresh);
            this.feePaidDraft.set(fresh.applicationFeePaid);
        }
    }

    saveFee(app: AdmissionApplication): void {
        try {
            this.admissions.setFeePaid(app.id, this.feePaidDraft());
            this.refreshSelected();
            this.msg.add({ severity: 'success', summary: 'Fee updated', detail: this.feePaidDraft() ? 'Application fee marked as paid.' : 'Application fee marked as unpaid.' });
        } catch (e: unknown) {
            this.reportError(e);
        }
    }

    // Review actions
    markUnderReview(app: AdmissionApplication): void {
        try {
            this.admissions.markUnderReview(app.id);
            this.refreshSelected();
            this.msg.add({ severity: 'info', summary: 'Under review', detail: `${app.applicantName} is now under review.` });
        } catch (e: unknown) {
            this.reportError(e);
        }
    }

    approve(app: AdmissionApplication): void {
        this.confirm.confirm({
            message: `Approve ${app.applicantName}'s application (${app.id})?`,
            header: 'Approve application',
            icon: 'pi pi-check-circle',
            acceptLabel: 'Approve',
            rejectLabel: 'Cancel',
            accept: () => {
                try {
                    this.admissions.approve(app.id);
                    this.refreshSelected();
                    this.msg.add({ severity: 'success', summary: 'Approved', detail: `${app.applicantName} can now be enrolled.` });
                } catch (e: unknown) {
                    this.reportError(e);
                }
            }
        });
    }

    openReject(app: AdmissionApplication): void {
        this.rejectTarget.set(app);
        this.rejectForm.reset({ reason: '' });
        this.rejectVisible.set(true);
    }

    confirmReject(): void {
        const app = this.rejectTarget();
        if (!app) return;
        if (this.rejectForm.invalid) {
            this.rejectForm.markAllAsTouched();
            return;
        }
        const reason = this.rejectForm.controls.reason.value ?? '';
        try {
            this.admissions.reject(app.id, reason);
            this.rejectVisible.set(false);
            this.refreshSelected();
            this.msg.add({ severity: 'warn', summary: 'Rejected', detail: `${app.applicantName}'s application was rejected.` });
        } catch (e: unknown) {
            this.reportError(e);
        }
    }

    // Enroll
    openEnroll(app: AdmissionApplication): void {
        this.enrollTarget.set(app);
        const settings = this.admissions.core.getSettings();
        const fallbackSemester = this.semesters().find((s) => s.status === 'ACTIVE')?.id ?? this.semesters()[0]?.id ?? '';
        const semesterId = settings.currentSemesterId ?? fallbackSemester;
        const session = this.sessionOptions.some((o) => o.value === settings.currentAcademicYear) ? settings.currentAcademicYear : (this.sessionOptions[0]?.value ?? '');
        this.enrollForm.reset({
            programId: app.programId,
            departmentId: app.departmentId,
            currentSemesterId: semesterId,
            session,
            dob: app.dob ? new Date(app.dob) : null,
            guardianName: '',
            guardianPhone: '',
            guardianRelation: 'Father',
            address: ''
        });
        this.enrollVisible.set(true);
    }

    onEnrollProgramChange(): void {
        const programId = this.enrollForm.controls.programId.value;
        const program = programId ? this.programs().find((p) => p.id === programId) : undefined;
        this.enrollForm.controls.departmentId.setValue(program ? program.departmentId : '');
    }

    confirmEnroll(): void {
        const app = this.enrollTarget();
        if (!app) return;
        if (this.enrollForm.invalid) {
            this.enrollForm.markAllAsTouched();
            this.msg.add({ severity: 'warn', summary: 'Check the form', detail: 'Fix the highlighted fields before enrolling.' });
            return;
        }
        const raw = this.enrollForm.getRawValue();
        try {
            const student = this.admissions.enroll(app.id, {
                programId: raw.programId ?? '',
                departmentId: raw.departmentId ?? '',
                currentSemesterId: raw.currentSemesterId ?? '',
                session: raw.session ?? '',
                dob: this.toIsoDate(raw.dob),
                guardianName: raw.guardianName ?? '',
                guardianPhone: raw.guardianPhone ?? '',
                guardianRelation: raw.guardianRelation ?? '',
                address: raw.address ?? ''
            });
            this.enrollVisible.set(false);
            this.refreshSelected();
            this.msg.add({ severity: 'success', summary: 'Enrolled', detail: `${app.applicantName} enrolled as ${student.admissionNo}.` });
        } catch (e: unknown) {
            this.reportError(e);
        }
    }

    // New application
    openNewApplication(): void {
        this.newForm.reset({
            applicantName: '',
            email: '',
            phone: '',
            dob: null,
            gender: 'MALE',
            programId: '',
            departmentId: '',
            qualifications: '',
            applicationFeePaid: false
        });
        this.newVisible.set(true);
    }

    onNewProgramChange(): void {
        const programId = this.newForm.controls.programId.value;
        const program = programId ? this.programs().find((p) => p.id === programId) : undefined;
        this.newForm.controls.departmentId.setValue(program ? program.departmentId : '');
    }

    createApplication(): void {
        if (this.newForm.invalid) {
            this.newForm.markAllAsTouched();
            this.msg.add({ severity: 'warn', summary: 'Check the form', detail: 'Fix the highlighted fields before creating the application.' });
            return;
        }
        const raw = this.newForm.getRawValue();
        try {
            const created = this.admissions.create({
                applicantName: raw.applicantName ?? '',
                email: raw.email ?? '',
                phone: raw.phone ?? '',
                dob: this.toIsoDate(raw.dob),
                gender: (raw.gender ?? 'OTHER') as AdmissionApplication['gender'],
                programId: raw.programId ?? '',
                departmentId: raw.departmentId ?? '',
                qualifications: raw.qualifications ?? '',
                applicationFeePaid: raw.applicationFeePaid ?? false
            });
            this.newVisible.set(false);
            this.msg.add({ severity: 'success', summary: 'Application created', detail: `${created.applicantName} (${created.id}) was added with status Submitted.` });
        } catch (e: unknown) {
            this.reportError(e);
        }
    }

    private toIsoDate(value: Date | string | null): string {
        if (!value) return new Date().toISOString();
        const d = value instanceof Date ? value : new Date(value);
        return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
    }

    private reportError(e: unknown): void {
        const message = e instanceof Error ? e.message : String(e);
        this.msg.add({ severity: 'error', summary: 'Something went wrong', detail: message });
    }
}
