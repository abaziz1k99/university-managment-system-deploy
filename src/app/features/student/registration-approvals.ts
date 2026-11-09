import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { CoreDataService } from '@/app/core/services/core-data.service';
import { StudentWorkspaceService, StudentCourseRegistration } from '@/app/core/services/student-workspace.service';

@Component({
    selector: 'app-registration-approvals', standalone: true, imports: [CommonModule, DatePipe],
    template: `
        <header class="mb-6"><p class="text-sm text-primary font-semibold">INFINITY UNIVERSITY</p><h1 class="text-2xl font-semibold mt-1">Course Registration Requests</h1><p class="text-muted-color mt-1">Review and approve student semester registration requests.</p></header>
        @if (message) { <div class="mb-4 p-3 rounded-lg bg-primary-50 dark:bg-primary-950 text-primary-800 dark:text-primary-200">{{ message }}</div> }
        <section class="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 p-4">
            <div class="flex flex-wrap gap-2 mb-4"><button class="filter" [class.active]="filter === 'PENDING'" (click)="filter='PENDING'">Pending ({{ count('PENDING') }})</button><button class="filter" [class.active]="filter === 'APPROVED'" (click)="filter='APPROVED'">Approved ({{ count('APPROVED') }})</button><button class="filter" [class.active]="filter === 'REJECTED'" (click)="filter='REJECTED'">Rejected ({{ count('REJECTED') }})</button><button class="filter" [class.active]="filter === 'ALL'" (click)="filter='ALL'">All</button></div>
            <div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="text-left border-b border-surface-200 dark:border-surface-700"><th class="p-3">Student</th><th class="p-3">Course</th><th class="p-3">Semester</th><th class="p-3">Requested</th><th class="p-3">Status</th><th class="p-3">Actions</th></tr></thead><tbody>
                @for (request of visible(); track request.id) { <tr class="border-b border-surface-200 dark:border-surface-700"><td class="p-3"><b>{{ studentName(request.studentId) }}</b><small class="block text-muted-color">{{ admissionNo(request.studentId) }}</small></td><td class="p-3"><b>{{ courseCode(request.courseId) }}</b><small class="block text-muted-color">{{ courseTitle(request.courseId) }}</small></td><td class="p-3">{{ semesterName(request.semesterId) }}</td><td class="p-3">{{ request.submittedAt | date:'medium' }}</td><td class="p-3"><span class="rounded-full px-2 py-1 text-xs" [class.text-green-600]="request.status === 'APPROVED'" [class.text-red-600]="request.status === 'REJECTED'" [class.text-primary]="request.status === 'PENDING'">{{ request.status }}</span></td><td class="p-3"><div class="flex gap-2">@if (request.status === 'PENDING') { <button class="action approve" (click)="setStatus(request,'APPROVED')">Approve</button><button class="action reject" (click)="setStatus(request,'REJECTED')">Reject</button> } @else { <button class="action" (click)="setStatus(request,'PENDING')">Reopen</button> }</div></td></tr> }
                @empty { <tr><td colspan="6" class="p-8 text-center text-muted-color">No registration requests in this view.</td></tr> }
            </tbody></table></div>
        </section>
    `,
    styles: [`:host{display:block}.filter{border:1px solid var(--surface-border);border-radius:999px;padding:.45rem .8rem;background:transparent;color:var(--text-color);font-size:.82rem;cursor:pointer}.filter.active{background:var(--primary-color);border-color:var(--primary-color);color:var(--primary-contrast-color,#fff)}.action{border:1px solid var(--surface-border);border-radius:7px;padding:.35rem .55rem;font-size:.75rem;background:transparent;color:var(--text-color);cursor:pointer}.approve{color:#16a34a}.reject{color:#dc2626}th{font-weight:600;color:var(--text-color-secondary)}small{font-size:.75rem}`]
})
export class RegistrationApprovals {
    private readonly workspace = inject(StudentWorkspaceService);
    private readonly core = inject(CoreDataService);
    filter: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL' = 'PENDING';
    message = '';
    visible(): StudentCourseRegistration[] { return this.workspace.registrations().filter((item) => this.filter === 'ALL' || item.status === this.filter).slice().sort((a,b) => b.submittedAt.localeCompare(a.submittedAt)); }
    count(status: StudentCourseRegistration['status']): number { return this.workspace.registrations().filter((item) => item.status === status).length; }
    studentName(id: string): string { const student=this.core.students().find((item) => item.id === id); return student ? `${student.firstName} ${student.lastName}` : id; }
    admissionNo(id: string): string { return this.core.students().find((item) => item.id === id)?.admissionNo ?? ''; }
    courseCode(id: string): string { return this.core.courses().find((item) => item.id === id)?.code ?? id; }
    courseTitle(id: string): string { return this.core.courses().find((item) => item.id === id)?.title ?? ''; }
    semesterName(id: string): string { const semester=this.core.semesters().find((item) => item.id === id); return semester ? `${semester.name} · ${semester.academicYear}` : id; }
    setStatus(request: StudentCourseRegistration, status: StudentCourseRegistration['status']): void { this.workspace.setStatus(request.id,status); this.message=`${this.courseCode(request.courseId)} request ${status.toLowerCase()}.`; setTimeout(() => this.message='',3000); }
}
