import { Component, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SelectModule } from 'primeng/select';
import { ConfirmationService, MessageService } from 'primeng/api';
import { PageHeader } from '@/app/shared/components/page-header';
import { StatusTag } from '@/app/shared/components/status-tag';
import { Avatar } from '@/app/shared/components/avatar';
import { StudentService } from '@/app/core/services/student.service';
import { FeeService } from '@/app/core/services/fee.service';
import { ExamService } from '@/app/core/services/exam.service';
import { AttendanceService } from '@/app/core/services/attendance.service';
import { Student, StudentStatus, Course, FeeAccount, Department, Program, Semester } from '@/app/core/models/index';
import { formatDate as formatDateUtil } from '@/app/core/utils/util';

@Component({
    selector: 'app-student-detail',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, CardModule, ButtonModule, TagModule, ToastModule, ConfirmDialogModule, SelectModule, PageHeader, StatusTag, Avatar],
    providers: [ConfirmationService, MessageService],
    template: `
        @if (student) {
            <app-page-header [title]="student.admissionNo + ' - ' + student.firstName + ' ' + student.lastName" [subtitle]="student.email">
                <div class="flex items-center gap-2 flex-wrap">
                    <p-select [options]="statusOptions" [(ngModel)]="selectedStatus" optionLabel="label" optionValue="value" placeholder="Change status" styleClass="w-44" (onChange)="onStatusChange($event.value)" />
                    <p-button label="Edit" icon="pi pi-pencil" [routerLink]="['/students', student.id, 'edit']" />
                    <p-button label="Delete" icon="pi pi-trash" severity="danger" (onClick)="confirmDelete()" />
                </div>
            </app-page-header>

            <div class="grid gap-6 lg:grid-cols-3">
                <div class="lg:col-span-1 space-y-6">
                    <p-card header="Identity" styleClass="h-full">
                        <div class="flex flex-col items-center text-center mb-4">
                            <app-avatar [name]="student.firstName + ' ' + student.lastName" size="xl" />
                            <div class="mt-3">
                                <h3 class="text-xl font-semibold">{{ student.firstName }} {{ student.lastName }}</h3>
                                <app-status-tag [status]="student.status" />
                            </div>
                        </div>
                        <dl class="space-y-3 text-sm">
                            <div class="flex justify-between"><dt class="text-muted-color">Admission No</dt><dd class="font-medium">{{ student.admissionNo }}</dd></div>
                            <div class="flex justify-between"><dt class="text-muted-color">Email</dt><dd class="font-medium break-all">{{ student.email }}</dd></div>
                            <div class="flex justify-between"><dt class="text-muted-color">Phone</dt><dd class="font-medium">{{ student.phone }}</dd></div>
                            <div class="flex justify-between"><dt class="text-muted-color">DOB</dt><dd class="font-medium">{{ formatDate(student.dob) }}</dd></div>
                            <div class="flex justify-between"><dt class="text-muted-color">Gender</dt><dd class="font-medium">{{ student.gender }}</dd></div>
                            <div class="flex justify-between"><dt class="text-muted-color">Session</dt><dd class="font-medium">{{ student.session }}</dd></div>
                            <div class="flex justify-between"><dt class="text-muted-color">Admission Date</dt><dd class="font-medium">{{ formatDate(student.admissionDate) }}</dd></div>
                            <div class="flex justify-between"><dt class="text-muted-color">Status</dt><dd class="font-medium"><app-status-tag [status]="student.status" /></dd></div>
                        </dl>
                    </p-card>

                    <p-card header="Guardian Info">
                        <dl class="space-y-3 text-sm">
                            <div class="flex justify-between"><dt class="text-muted-color">Name</dt><dd class="font-medium">{{ student.guardianName }}</dd></div>
                            <div class="flex justify-between"><dt class="text-muted-color">Phone</dt><dd class="font-medium">{{ student.guardianPhone }}</dd></div>
                            <div class="flex justify-between"><dt class="text-muted-color">Relation</dt><dd class="font-medium">{{ student.guardianRelation }}</dd></div>
                            <div class="flex justify-between gap-4"><dt class="text-muted-color shrink-0">Address</dt><dd class="font-medium text-right">{{ student.address }}</dd></div>
                        </dl>
                    </p-card>

                    <p-card header="Academic Summary">
                        <dl class="space-y-3 text-sm">
                            <div class="flex justify-between"><dt class="text-muted-color">Department</dt><dd class="font-medium">{{ dept()?.name ?? '—' }}</dd></div>
                            <div class="flex justify-between"><dt class="text-muted-color">Program</dt><dd class="font-medium">{{ prog()?.name ?? '—' }}</dd></div>
                            <div class="flex justify-between"><dt class="text-muted-color">Current Semester</dt><dd class="font-medium">{{ sem()?.name ?? '—' }}</dd></div>
                            <div class="flex justify-between"><dt class="text-muted-color">Courses Enrolled</dt><dd class="font-medium">{{ enrolledCourses().length }}</dd></div>
                            <div class="flex justify-between"><dt class="text-muted-color">GPA (Current)</dt><dd class="font-medium">{{ currentGpa().toFixed(2) }}</dd></div>
                            <div class="flex justify-between"><dt class="text-muted-color">CGPA</dt><dd class="font-medium">{{ cgpa().toFixed(2) }}</dd></div>
                        </dl>
                    </p-card>
                </div>

                <div class="lg:col-span-2 space-y-6">
                    <p-card header="Fee Summary">
                        <div class="grid gap-4 md:grid-cols-3 mb-4">
                            <div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                <p class="text-sm text-muted-color">Total Billed</p>
                                <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">{{ formatCurrency(feeSummary().totalBilled) }}</p>
                            </div>
                            <div class="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                <p class="text-sm text-muted-color">Total Paid</p>
                                <p class="text-2xl font-bold text-green-600 dark:text-green-400">{{ formatCurrency(feeSummary().totalPaid) }}</p>
                            </div>
                            <div class="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                                <p class="text-sm text-muted-color">Outstanding</p>
                                <p class="text-2xl font-bold text-orange-600 dark:text-orange-400">{{ formatCurrency(feeSummary().balance) }}</p>
                            </div>
                        </div>
                        <p-button label="Record Payment" icon="pi pi-plus" routerLink="/fees" />
                    </p-card>

                    <p-card header="Attendance % (Current Semester)">
                        <div class="grid gap-4 md:grid-cols-2">
                            @for (c of enrolledCourses(); track c.id) {
                                <div class="p-3 rounded-lg border border-surface-200 dark:border-surface-700">
                                    <p class="font-medium">{{ c.title }} ({{ c.code }})</p>
                                    <p class="text-2xl font-bold text-primary-600">{{ attendancePct(c.id).toFixed(1) }}%</p>
                                </div>
                            }
                            @empty {
                                <p class="text-muted-color text-center py-4">No courses enrolled</p>
                            }
                        </div>
                    </p-card>

                    <p-card header="Recent Results">
                        <div class="overflow-x-auto">
                            <table class="w-full text-sm">
                                <thead>
                                    <tr class="border-b border-surface-200 dark:border-surface-700">
                                        <th class="text-left py-2">Course</th>
                                        <th class="text-left py-2">Semester</th>
                                        <th class="text-left py-2">Marks</th>
                                        <th class="text-left py-2">Grade</th>
                                        <th class="text-left py-2">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    @for (r of recentResults(); track r.id) {
                                        <tr class="border-b border-surface-100 dark:border-surface-800">
                                            <td class="py-2">{{ courseName(r.courseId) }}</td>
                                            <td class="py-2">{{ semName(r.semesterId) }}</td>
                                            <td class="py-2">{{ r.marks }}/{{ r.maxMarks }}</td>
                                            <td class="py-2"><app-status-tag [status]="r.grade" /></td>
                                            <td class="py-2"><app-status-tag [status]="r.status" /></td>
                                        </tr>
                                    }
                                    @empty {
                                        <tr><td colspan="5" class="text-center py-4 text-muted-color">No results yet</td></tr>
                                    }
                                </tbody>
                            </table>
                        </div>
                    </p-card>
                </div>
            </div>
        } @else {
            <p-card>
                <p class="text-center py-8 text-muted-color">Loading...</p>
            </p-card>
        }
        <p-toast />
        <p-confirmDialog />
    `
})
export class StudentDetail implements OnInit {
    private readonly svc = inject(StudentService);
    private readonly feeSvc = inject(FeeService);
    private readonly examSvc = inject(ExamService);
    private readonly attSvc = inject(AttendanceService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly confirm = inject(ConfirmationService);
    private readonly msg = inject(MessageService);

    student: Student | null = null;
    selectedStatus = '';

    statusOptions = [
        { label: 'Active', value: 'ACTIVE' },
        { label: 'Inactive', value: 'INACTIVE' },
        { label: 'Graduated', value: 'GRADUATED' },
        { label: 'Suspended', value: 'SUSPENDED' },
        { label: 'Withdrawn', value: 'WITHDRAWN' }
    ];

    dept = computed(() => (this.student ? this.svc.core.get<Department>('departments', this.student!.departmentId) : null));
    prog = computed(() => (this.student ? this.svc.core.get<Program>('programs', this.student!.programId) : null));
    sem = computed(() => (this.student ? this.svc.core.get<Semester>('semesters', this.student!.currentSemesterId) : null));

    enrolledCourses = computed(() => {
        if (!this.student) return [] as Course[];
        return this.svc.core.courses().filter((c: Course) => (c.programIds ?? []).includes(this.student!.programId) && c.semester <= (this.prog()?.totalSemesters ?? 8));
    });

    feeSummary = computed(() => {
        if (!this.student) return { totalBilled: 0, totalPaid: 0, balance: 0 };
        const accounts = this.feeSvc.getByStudent(this.student.id);
        return {
            totalBilled: accounts.reduce((s: number, a: FeeAccount) => s + a.totalBilled, 0),
            totalPaid: accounts.reduce((s: number, a: FeeAccount) => s + a.totalPaid, 0),
            balance: accounts.reduce((s: number, a: FeeAccount) => s + a.balance, 0)
        };
    });

    currentGpa = computed(() => {
        if (!this.student) return 0;
        return this.examSvc.calcGPA(this.student.id, this.student.currentSemesterId);
    });

    cgpa = computed(() => {
        if (!this.student) return 0;
        return this.examSvc.calcCGPA(this.student.id);
    });

    recentResults = computed(() => {
        if (!this.student) return [];
        return this.examSvc.getStudentResults(this.student.id).slice(0, 10);
    });

    courseName = (courseId: string): string => this.svc.core.get<Course>('courses', courseId)?.title ?? courseId;
    semName = (semesterId: string): string => this.svc.core.get<Semester>('semesters', semesterId)?.name ?? semesterId;

    attendancePct = (courseId: string): number => this.attSvc.getCourseAttendancePercent(courseId, this.student?.id ?? '');

    formatDate(date: string): string {
        return formatDateUtil(date, 'DD/MM/YYYY');
    }

    formatCurrency(amount: number): string {
        return amount.toLocaleString('en-BD', { style: 'currency', currency: 'BDT' });
    }

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id') ?? '';
        if (id) {
            this.student = this.svc.get(id) ?? null;
            if (this.student) {
                this.selectedStatus = this.student.status;
            }
        }
    }

    onStatusChange(newStatus: string): void {
        if (!this.student || newStatus === this.student.status) return;
        const prev = this.student.status;
        this.confirm.confirm({
            message: `Change status from ${prev} to ${newStatus}?`,
            header: 'Change Status',
            icon: 'pi pi-question-circle',
            acceptLabel: 'Change',
            rejectLabel: 'Cancel',
            accept: () => {
                try {
                    this.svc.updateStatus(this.student!.id, newStatus as StudentStatus);
                    this.student = this.svc.get(this.student!.id) ?? this.student;
                    if (this.student) this.selectedStatus = this.student.status;
                    this.msg.add({ severity: 'success', summary: 'Status Updated', detail: `Status changed to ${newStatus}` });
                } catch (e: unknown) {
                    const m = e instanceof Error ? e.message : String(e);
                    this.msg.add({ severity: 'error', summary: 'Error', detail: m });
                    if (this.student) this.selectedStatus = this.student.status;
                }
            },
            reject: () => {
                if (this.student) this.selectedStatus = this.student.status;
            }
        });
    }

    confirmDelete(): void {
        if (!this.student) return;
        const s = this.student;
        const counts = this.svc.previewDeleteCounts(s.id);
        if (counts.total > 0) {
            const detail = `${counts.feeAccounts} fee account(s) (${counts.payments} payment(s)), ${counts.results} result(s), ${counts.attendance} attendance record(s)`;
            this.confirm.confirm({
                message: `Student ${s.admissionNo} — ${s.firstName} ${s.lastName} has dependents: ${detail}. Delete is blocked unless you cascade-delete all dependents. Proceed with cascade delete?`,
                header: 'Cascade Delete Required',
                icon: 'pi pi-exclamation-triangle',
                acceptLabel: 'Cascade Delete',
                rejectLabel: 'Cancel',
                accept: () => {
                    this.confirm.confirm({
                        message: `Confirm CASCADE DELETE for ${s.admissionNo}? This will permanently delete ${detail} and the student. Cannot be undone.`,
                        header: 'Confirm Cascade Delete',
                        icon: 'pi pi-exclamation-triangle',
                        acceptLabel: 'Yes, delete all',
                        rejectLabel: 'Cancel',
                        accept: () => {
                            try {
                                this.svc.removeCascade(s.id);
                                this.msg.add({ severity: 'success', summary: 'Deleted', detail: `Student ${s.admissionNo} and ${counts.total} dependent(s) removed` });
                                this.router.navigate(['/students']);
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
            message: `Delete student ${s.admissionNo}? This will remove the student record.`,
            header: 'Delete Student',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                try {
                    this.svc.remove(s.id);
                    this.msg.add({ severity: 'success', summary: 'Deleted', detail: 'Student removed' });
                    this.router.navigate(['/students']);
                } catch (e: unknown) {
                    const m = e instanceof Error ? e.message : String(e);
                    this.msg.add({ severity: 'error', summary: 'Error', detail: m });
                }
            }
        });
    }
}
