import { inject, Injectable } from '@angular/core';
import { CoreDataService } from '@/app/core/services/core-data.service';
import type { Examination, FeeAccount, Notice } from '@/app/core/models';

@Injectable({
    providedIn: 'root'
})
export class DashboardService {
    protected readonly core = inject(CoreDataService);

    getSummary() {
        const students = this.core.students();
        const faculty = this.core.facultyMembers();
        const departments = this.core.departments();
        const programs = this.core.programs();
        const courses = this.core.courses();
        const admissions = this.core.admissionApplications();
        const feeAccounts = this.core.feeAccounts();

        const activeStudents = students.filter((s) => s.status === 'ACTIVE').length;
        const activeFaculty = faculty.filter((f) => f.employmentStatus === 'ACTIVE').length;
        const activePrograms = programs.filter((p) => p.status === 'ACTIVE').length;
        const pendingAdmissions = admissions.filter((a) => a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW').length;
        const outstandingFees = feeAccounts.reduce((s: number, a: FeeAccount) => s + a.balance, 0);
        const collectedFees = feeAccounts.reduce((s: number, a: FeeAccount) => s + a.totalPaid, 0);

        return {
            totalStudents: students.length,
            activeStudents,
            faculty: activeFaculty,
            departments: departments.length,
            activePrograms,
            courses: courses.length,
            pendingAdmissions,
            outstandingFees,
            collectedFees
        };
    }

    getEnrollmentTrend() {
        const months = ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'];
        const students = this.core.students();
        const counts = months.map((m) => {
            const monthIdx = months.indexOf(m);
            return students.filter((s) => {
                const d = new Date(s.admissionDate);
                return d.getMonth() === monthIdx;
            }).length;
        });
        return { labels: months, values: counts };
    }

    getDepartmentDistribution() {
        const students = this.core.students();
        const departments = this.core.departments();
        return departments.map((d) => ({
            label: d.name,
            code: d.code,
            value: students.filter((s) => s.departmentId === d.id).length
        }));
    }

    getStudentStatusDistribution() {
        const students = this.core.students();
        const statuses = ['ACTIVE', 'INACTIVE', 'GRADUATED', 'SUSPENDED', 'WITHDRAWN'];
        return statuses.map((s) => ({
            label: s.charAt(0) + s.slice(1).toLowerCase(),
            value: students.filter((st) => st.status === s).length
        }));
    }

    getFeeChart() {
        const feeAccounts = this.core.feeAccounts();
        const collected = feeAccounts.reduce((s: number, a: FeeAccount) => s + a.totalPaid, 0);
        const outstanding = feeAccounts.reduce((s: number, a: FeeAccount) => s + a.balance, 0);
        return { labels: ['Collected', 'Outstanding'], values: [collected, outstanding] };
    }

    getRecentAdmissions(limit = 5) {
        return [...this.core.admissionApplications()]
            .sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''))
            .slice(0, limit);
    }

    getUpcomingEvents(limit = 5) {
        const now = new Date().toISOString().slice(0, 10);
        const exams = this.core.examinations()
            .filter((e: Examination) => e.date >= now)
            .sort((a: Examination, b: Examination) => a.date.localeCompare(b.date))
            .slice(0, limit)
            .map((e: Examination) => ({
                id: e.id,
                title: this.core.get<import('@/app/core/models/index').Course>('courses', e.courseId)?.title ?? 'Examination',
                date: e.date,
                type: 'Exam' as const,
                detail: e.room
            }));
        const events = this.core.notices()
            .filter((n: Notice) => n.isEvent && n.eventDate !== null && n.eventDate >= now)
            .sort((a: Notice, b: Notice) => (a.eventDate ?? '').localeCompare(b.eventDate ?? ''))
            .slice(0, limit)
            .map((n: Notice) => ({
                id: n.id,
                title: n.title,
                date: n.eventDate!,
                type: 'Event' as const,
                detail: n.category
            }));
        return [...exams, ...events].sort((a, b) => a.date.localeCompare(b.date)).slice(0, limit);
    }

    getRecentActivity(limit = 8) {
        return this.core.activityLog().slice(0, limit);
    }

    getPublishedNotices(limit = 5) {
        const now = new Date().toISOString();
        return this.core.notices()
            .filter((n: Notice) => n.status === 'PUBLISHED' && (!n.expiryDate || n.expiryDate >= now))
            .sort((a: Notice, b: Notice) => {
                const order: Record<Notice['priority'], number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
                const p = order[a.priority] - order[b.priority];
                if (p !== 0) return p;
                return (b.publishDate ?? '').localeCompare(a.publishDate ?? '');
            })
            .slice(0, limit);
    }
}