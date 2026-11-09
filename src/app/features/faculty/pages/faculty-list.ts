import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DataTable, Column, Action } from '@/app/shared/components/data-table';
import { PageHeader } from '@/app/shared/components/page-header';
import { FacultyService } from '@/app/core/services/faculty.service';
import { FacultyMember, Department } from '@/app/core/models/index';
import { formatDate } from '@/app/core/utils/util';
import { FacultyForm } from './faculty-form';
import { FacultyDetail } from './faculty-detail';

@Component({
    selector: 'app-faculty-list',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        CardModule,
        InputTextModule,
        SelectModule,
        ButtonModule,
        TagModule,
        ToastModule,
        ConfirmDialogModule,
        DataTable,
        PageHeader,
        FacultyForm,
        FacultyDetail
    ],
    providers: [ConfirmationService, MessageService],
    template: `
        <!-- Embedded Detail View -->
        @if (viewMode() === 'detail' && detailId()) {
            <div class="mb-4">
                <p-button label="Back to Directory" icon="pi pi-arrow-left" severity="secondary" (onClick)="backToList()" />
            </div>
            <app-faculty-detail [facultyIdInput]="detailId()!" (close)="backToList()" />
        } @else if (viewMode() === 'form') {
            <div class="mb-4">
                <p-button label="Back to Directory" icon="pi pi-arrow-left" severity="secondary" (onClick)="backToList()" />
            </div>
            <app-faculty-form [facultyIdInput]="editingId()" (close)="onFormClose($event)" />
        } @else {
            <app-page-header title="Faculty & Staff" subtitle="Directory of faculty and administrative staff">
                <p-button label="Add Faculty" icon="pi pi-plus" (onClick)="openAdd()" />
            </app-page-header>

            <!-- Department-wise Faculty Count Panel -->
            <div class="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-6">
                @for (entry of departmentCounts(); track entry.deptId) {
                    <p-card styleClass="h-full">
                        <div class="text-center">
                            <p class="text-xs font-medium text-muted-color uppercase tracking-wide truncate" [title]="entry.deptName">{{ entry.deptName }}</p>
                            <p class="text-3xl font-bold text-primary mt-1">{{ entry.count }}</p>
                            <p class="text-xs text-muted-color">members</p>
                        </div>
                    </p-card>
                }
            </div>

            <p-card>
                <div class="flex flex-col lg:flex-row gap-3 mb-4">
                    <div class="relative flex-1">
                        <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-muted-color pointer-events-none"></i>
                        <input pInputText type="text" placeholder="Search by name, email, phone, employee ID..." class="w-full pl-10" [(ngModel)]="search" (ngModelChange)="onSearchChange($event)" />
                    </div>
                    <div class="flex gap-2 flex-wrap items-center">
                        <p-select
                            [(ngModel)]="departmentFilter"
                            [options]="departmentOptions()"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Department"
                            styleClass="w-48"
                            (onChange)="applyFilters()"
                            [showClear]="true" />
                        <p-select
                            [(ngModel)]="designationFilter"
                            [options]="designationOptions"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Designation"
                            styleClass="w-52"
                            (onChange)="applyFilters()"
                            [showClear]="true" />
                        <p-select
                            [(ngModel)]="pageSize"
                            [options]="pageSizeOptions"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Rows"
                            styleClass="w-28" />
                    </div>
                </div>

                <p class="text-xs text-muted-color mb-3">
                    Showing {{ filteredFaculty().length }} of {{ allFaculty().length }} records
                    @if (search || departmentFilter || designationFilter) {
                        <span>· <a class="text-primary cursor-pointer underline" (click)="clearFilters()">Clear filters</a></span>
                    }
                </p>

                <app-data-table
                    [data]="filteredFaculty()"
                    [columns]="columns"
                    [actions]="actions"
                    [loading]="loading"
                    [paginator]="true"
                    [rows]="pageSize"
                    [globalSearch]="false">
                </app-data-table>
            </p-card>
        }
        <p-toast />
        <p-confirmDialog />
    `
})
export class FacultyStaffList {
    private readonly svc = inject(FacultyService);
    private readonly confirm = inject(ConfirmationService);
    private readonly msg = inject(MessageService);
    private readonly router = inject(Router);

    search = '';
    departmentFilter: string | null = null;
    designationFilter: string | null = null;
    pageSize = 10;
    loading = false;

    viewMode = signal<'list' | 'detail' | 'form'>('list');
    detailId = signal<string | null>(null);
    editingId = signal<string | null>(null);

    pageSizeOptions = [
        { label: '10 / page', value: 10 },
        { label: '25 / page', value: 25 },
        { label: '50 / page', value: 50 },
        { label: '100 / page', value: 100 }
    ];

    designationOptions = [
        { label: 'All Designations', value: null },
        { label: 'Professor', value: 'Professor' },
        { label: 'Associate Professor', value: 'Associate Professor' },
        { label: 'Assistant Professor', value: 'Assistant Professor' },
        { label: 'Lecturer', value: 'Lecturer' },
        { label: 'Senior Lecturer', value: 'Senior Lecturer' },
        { label: 'Registrar', value: 'Registrar' },
        { label: 'Accounts Officer', value: 'Accounts Officer' },
        { label: 'Administrative Officer', value: 'Administrative Officer' },
        { label: 'Lab Assistant', value: 'Lab Assistant' }
    ];

    allFaculty = this.svc.core.facultyMembers;
    departmentsSig = this.svc.core.departments;

    departmentOptions = computed(() => [
        { label: 'All Departments', value: null },
        ...this.departmentsSig().map((d) => ({ label: d.name, value: d.id }))
    ]);

    departmentCounts = computed(() => this.svc.getDepartmentCounts());

    filteredFaculty = computed(() => {
        let result: FacultyMember[] = this.allFaculty();
        const q = this.search.trim().toLowerCase();
        if (q) {
            result = result.filter((f) => {
                const fullName = `${f.firstName} ${f.lastName}`.toLowerCase();
                return (
                    fullName.includes(q) ||
                    f.email.toLowerCase().includes(q) ||
                    f.phone.toLowerCase().includes(q) ||
                    f.employeeId.toLowerCase().includes(q) ||
                    f.designation.toLowerCase().includes(q)
                );
            });
        }
        if (this.departmentFilter) {
            result = result.filter((f) => f.departmentId === this.departmentFilter);
        }
        if (this.designationFilter) {
            result = result.filter((f) => f.designation === this.designationFilter);
        }
        return result;
    });

    columns: Column<FacultyMember>[] = [
        { field: 'employeeId', header: 'Employee ID', sortable: true, width: '140px' },
        {
            field: 'firstName',
            header: 'Name',
            sortable: true,
            width: '180px',
            body: (r: FacultyMember) => `${r.firstName} ${r.lastName}`
        },
        {
            field: 'departmentId',
            header: 'Department',
            sortable: true,
            body: (r: FacultyMember) => this.svc.core.get<Department>('departments', r.departmentId)?.name ?? r.departmentId
        },
        { field: 'designation', header: 'Designation', sortable: true, width: '160px' },
        {
            field: 'employmentStatus',
            header: 'Status',
            sortable: true,
            width: '120px',
            body: (r: FacultyMember) => r.employmentStatus
        },
        {
            field: 'joiningDate',
            header: 'Joining Date',
            sortable: true,
            width: '130px',
            body: (r: FacultyMember) => formatDate(r.joiningDate, 'DD/MM/YYYY')
        }
    ];

    actions: Action<FacultyMember>[] = [
        {
            label: 'View',
            icon: 'pi pi-eye',
            severity: 'info',
            handler: (f: FacultyMember) => this.openDetail(f),
            tooltip: 'View details'
        },
        {
            label: 'Edit',
            icon: 'pi pi-pencil',
            severity: 'secondary',
            handler: (f: FacultyMember) => this.openEdit(f),
            tooltip: 'Edit faculty'
        },
        {
            label: 'Delete',
            icon: 'pi pi-trash',
            severity: 'danger',
            handler: (f: FacultyMember) => this.confirmDelete(f),
            tooltip: 'Delete faculty'
        }
    ];

    onSearchChange(_v: string): void {
        // computed reacts automatically
    }

    applyFilters(): void {
        // computed reacts automatically
    }

    clearFilters(): void {
        this.search = '';
        this.departmentFilter = null;
        this.designationFilter = null;
    }

    openDetail(f: FacultyMember): void {
        this.detailId.set(f.id);
        this.viewMode.set('detail');
    }

    openEdit(f: FacultyMember): void {
        this.editingId.set(f.id);
        this.viewMode.set('form');
    }

    openAdd(): void {
        this.editingId.set(null);
        this.viewMode.set('form');
    }

    backToList(): void {
        this.viewMode.set('list');
        this.detailId.set(null);
        this.editingId.set(null);
    }

    onFormClose(_saved: boolean): void {
        this.backToList();
        this.msg.add({ severity: 'success', summary: 'Success', detail: 'Directory updated' });
    }

    confirmDelete(fm: FacultyMember): void {
        const isHead = this.svc.core.departments().some((d) => d.headId === fm.id);
        const courseCount = (fm.courseIds ?? []).length + this.svc.core.courses().filter((c) => c.facultyId === fm.id).length;

        if (isHead) {
            this.confirm.confirm({
                message: `Cannot delete ${fm.employeeId} — ${fm.firstName} ${fm.lastName}: this member is a department head. Reassign the department head first.`,
                header: 'Delete Blocked',
                icon: 'pi pi-ban',
                acceptLabel: 'OK',
                rejectVisible: false,
                accept: () => {}
            });
            return;
        }

        if (courseCount > 0) {
            this.confirm.confirm({
                message: `Cannot delete ${fm.employeeId} — ${fm.firstName} ${fm.lastName}: assigned courses exist (${(fm.courseIds ?? []).length} in profile + ${this.svc.core.courses().filter((c) => c.facultyId === fm.id).length} via course.facultyId). Unassign all courses first (see detail view).`,
                header: 'Delete Blocked',
                icon: 'pi pi-ban',
                acceptLabel: 'OK',
                rejectVisible: false,
                accept: () => {}
            });
            return;
        }

        this.confirm.confirm({
            message: `Delete ${fm.employeeId} — ${fm.firstName} ${fm.lastName} (${fm.designation})? This cannot be undone.`,
            header: 'Delete Faculty',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Delete',
            rejectLabel: 'Cancel',
            accept: () => {
                try {
                    this.svc.remove(fm.id);
                    this.msg.add({ severity: 'success', summary: 'Deleted', detail: `Faculty ${fm.employeeId} removed` });
                } catch (e: unknown) {
                    const m = e instanceof Error ? e.message : String(e);
                    this.msg.add({ severity: 'error', summary: 'Error', detail: m });
                }
            }
        });
    }
}
