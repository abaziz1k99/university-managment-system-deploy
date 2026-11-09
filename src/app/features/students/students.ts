import { Component, inject, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DataTable, Column, Action } from '@/app/shared/components/data-table';
import { PageHeader } from '@/app/shared/components/page-header';
import { StudentService } from '@/app/core/services/student.service';
import { Student } from '@/app/core/models/index';
import { formatDate } from '@/app/core/utils/util';

@Component({
    selector: 'app-students',
    standalone: true,
    imports: [FormsModule, RouterModule, CardModule, InputTextModule, SelectModule, ButtonModule, ConfirmDialogModule, DataTable, PageHeader],
    providers: [ConfirmationService],
    template: `
        <app-page-header title="Students" subtitle="Manage student directory">
            <p-button label="Register Student" icon="pi pi-user-plus" routerLink="/students/new" />
        </app-page-header>

        <p-card>
            <div class="flex flex-col sm:flex-row gap-3 mb-4">
                <div class="flex-1">
                    <input pInputText type="text" placeholder="Search by ID, name, email, phone..." class="w-full" [ngModel]="search()" (ngModelChange)="search.set($event)" />
                </div>
                <div class="flex gap-2 flex-wrap items-center">
                    <p-select [ngModel]="departmentFilter()" (ngModelChange)="departmentFilter.set($event)" [options]="departmentOptions()" optionLabel="label" optionValue="value" placeholder="Department" styleClass="w-48" [showClear]="true" />
                    <p-select [ngModel]="programFilter()" (ngModelChange)="programFilter.set($event)" [options]="programOptions()" optionLabel="label" optionValue="value" placeholder="Program" styleClass="w-48" [showClear]="true" />
                    <p-select [ngModel]="semesterFilter()" (ngModelChange)="semesterFilter.set($event)" [options]="semesterOptions()" optionLabel="label" optionValue="value" placeholder="Semester" styleClass="w-48" [showClear]="true" />
                    <p-select [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event)" [options]="statusOptions" placeholder="Status" styleClass="w-40" [showClear]="true" />
                    <p-select [ngModel]="sessionFilter()" (ngModelChange)="sessionFilter.set($event)" [options]="sessionOptions" placeholder="Session" styleClass="w-40" [showClear]="true" />
                </div>
            </div>

            <app-data-table
                [data]="filteredStudents()"
                [columns]="columns"
                [actions]="actions"
                [loading]="loading"
                [paginator]="true"
                [rows]="10"
                [globalSearch]="false"
                (rowClick)="onRowClick($event)">
            </app-data-table>
        </p-card>
    `
})
export class StudentsList {
    private readonly svc = inject(StudentService);
    private readonly confirm = inject(ConfirmationService);
    private readonly msg = inject(MessageService);
    private readonly router = inject(Router);

    search = signal('');
    departmentFilter = signal('');
    programFilter = signal('');
    semesterFilter = signal('');
    statusFilter = signal('');
    sessionFilter = signal('');
    loading = false;

    students = this.svc.core.students;
    departmentsSig = this.svc.core.departments;
    programsSig = this.svc.core.programs;
    semestersSig = this.svc.core.semesters;

    departmentOptions = computed(() => [{ label: 'All Departments', value: '' }, ...this.departmentsSig().map((d) => ({ label: d.name, value: d.id }))]);
    programOptions = computed(() => [{ label: 'All Programs', value: '' }, ...this.programsSig().map((p) => ({ label: p.name, value: p.id }))]);
    semesterOptions = computed(() => [{ label: 'All Semesters', value: '' }, ...this.semestersSig().map((s) => ({ label: s.name, value: s.id }))]);

    statusOptions = [
        { label: 'All', value: '' },
        { label: 'Active', value: 'ACTIVE' },
        { label: 'Inactive', value: 'INACTIVE' },
        { label: 'Graduated', value: 'GRADUATED' },
        { label: 'Suspended', value: 'SUSPENDED' },
        { label: 'Withdrawn', value: 'WITHDRAWN' }
    ];

    sessionOptions = [
        { label: 'All Sessions', value: '' },
        { label: '2021-22', value: '2021-22' },
        { label: '2022-23', value: '2022-23' },
        { label: '2023-24', value: '2023-24' },
        { label: '2024-25', value: '2024-25' },
        { label: '2025-26', value: '2025-26' }
    ];

    filteredStudents = computed(() => {
        let result: Student[] = this.students();
        const search = this.search().trim().toLowerCase();
        if (search) {
            result = result.filter(
                (st: Student) =>
                    st.admissionNo.toLowerCase().includes(search) ||
                    `${st.firstName} ${st.lastName}`.toLowerCase().includes(search) ||
                    st.email.toLowerCase().includes(search) ||
                    st.phone.includes(search)
            );
        }
        const departmentFilter = this.departmentFilter();
        if (departmentFilter) {
            result = result.filter((st: Student) => st.departmentId === departmentFilter);
        }
        const programFilter = this.programFilter();
        if (programFilter) {
            result = result.filter((st: Student) => st.programId === programFilter);
        }
        const semesterFilter = this.semesterFilter();
        if (semesterFilter) {
            result = result.filter((st: Student) => st.currentSemesterId === semesterFilter);
        }
        const statusFilter = this.statusFilter();
        if (statusFilter) {
            result = result.filter((st: Student) => st.status === statusFilter);
        }
        const sessionFilter = this.sessionFilter();
        if (sessionFilter) {
            result = result.filter((st: Student) => st.session === sessionFilter);
        }
        return result;
    });

    columns: Column<Student>[] = [
        { field: 'admissionNo', header: 'ID', sortable: true, width: '120px' },
        { field: 'firstName', header: 'Name', sortable: true, body: (r: Student) => `${r.firstName} ${r.lastName}`, width: '180px' },
        { field: 'email', header: 'Email', sortable: true },
        { field: 'phone', header: 'Phone', sortable: true, width: '140px' },
        {
            field: 'departmentId',
            header: 'Department',
            sortable: true,
            body: (r: Student) => this.svc.core.get<import('@/app/core/models/index').Department>('departments', r.departmentId)?.name ?? r.departmentId
        },
        {
            field: 'programId',
            header: 'Program',
            sortable: true,
            body: (r: Student) => this.svc.core.get<import('@/app/core/models/index').Program>('programs', r.programId)?.name ?? r.programId
        },
        {
            field: 'currentSemesterId',
            header: 'Semester',
            sortable: true,
            body: (r: Student) => this.svc.core.get<import('@/app/core/models/index').Semester>('semesters', r.currentSemesterId)?.name ?? r.currentSemesterId
        },
        { field: 'status', header: 'Status', sortable: true, body: (r: Student) => r.status, width: '110px' },
        { field: 'admissionDate', header: 'Admission', sortable: true, body: (r: Student) => formatDate(r.admissionDate, 'DD/MM/YYYY'), width: '120px' }
    ];

    actions: Action<Student>[] = [
        {
            label: 'View',
            icon: 'pi pi-eye',
            severity: 'info',
            handler: (s: Student) => this.router.navigate(['/students', s.id])
        },
        {
            label: 'Edit',
            icon: 'pi pi-pencil',
            severity: 'secondary',
            handler: (s: Student) => this.router.navigate(['/students', s.id, 'edit'])
        },
        {
            label: 'Delete',
            icon: 'pi pi-trash',
            severity: 'danger',
            handler: (s: Student) => this.confirmDelete(s),
            tooltip: 'Delete student'
        }
    ];

    onRowClick(student: Student): void {
        this.router.navigate(['/students', student.id]);
    }

    confirmDelete(student: Student): void {
        const counts = this.svc.previewDeleteCounts(student.id);
        if (counts.total > 0) {
            const detail = `${counts.feeAccounts} fee account(s) (${counts.payments} payment(s)), ${counts.results} result(s), ${counts.attendance} attendance record(s)`;
            this.confirm.confirm({
                message: `Student ${student.admissionNo} — ${student.firstName} ${student.lastName} has dependent records: ${detail}. Delete is blocked unless cascade is used. Do you want to cascade-delete all dependents and then remove the student?`,
                header: 'Cascade Delete Required',
                icon: 'pi pi-exclamation-triangle',
                acceptLabel: 'Cascade Delete',
                rejectLabel: 'Cancel',
                accept: () => {
                    this.confirm.confirm({
                        message: `Confirm CASCADE DELETE for ${student.admissionNo}? This will permanently delete ${detail} and the student record. This cannot be undone.`,
                        header: 'Confirm Cascade Delete',
                        icon: 'pi pi-exclamation-triangle',
                        acceptLabel: 'Yes, delete all',
                        rejectLabel: 'Cancel',
                        accept: () => {
                            try {
                                this.svc.removeCascade(student.id);
                                this.msg.add({ severity: 'success', summary: 'Deleted', detail: `Student ${student.admissionNo} and ${counts.total} dependent record(s) removed` });
                            } catch (e: unknown) {
                                const m = e instanceof Error ? e.message : String(e);
                                this.msg.add({ severity: 'error', summary: 'Error', detail: m });
                            }
                        }
                    });
                }
            });
            return;
        }
        this.confirm.confirm({
            message: `Delete student ${student.admissionNo} - ${student.firstName} ${student.lastName}? This cannot be undone.`,
            header: 'Delete Student',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                try {
                    this.svc.remove(student.id);
                    this.msg.add({ severity: 'success', summary: 'Deleted', detail: 'Student removed' });
                } catch (e: unknown) {
                    const m = e instanceof Error ? e.message : String(e);
                    this.msg.add({ severity: 'error', summary: 'Error', detail: m });
                }
            }
        });
    }
}
