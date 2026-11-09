import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoreDataService } from '@/app/core/services/core-data.service';
import { ExamService } from '@/app/core/services/exam.service';
import { TeacherWorkspaceService, type TeacherGradeSubmission } from '@/app/core/services/teacher-workspace.service';

@Component({
    selector: 'app-grade-approvals',
    standalone: true,
    imports: [CommonModule],
    template: `
        <header class="mb-6"><p class="text-sm text-primary font-semibold">ACADEMIC ADMINISTRATION</p><h1 class="text-2xl font-semibold mt-1">Grade Approvals</h1><p class="text-muted-color mt-1">Review teacher grade submissions before publishing them to academic records.</p></header>
        @if (notice()) { <div class="mb-4 p-3 rounded-lg bg-primary-50 dark:bg-primary-950 text-primary-800 dark:text-primary-200">{{ notice() }}</div> }
        @for (submission of pending(); track submission.id) {
            <article class="rounded-xl border border-surface-200 dark:border-surface-700 p-4 mb-4">
                <div class="flex flex-wrap justify-between gap-3 mb-3">
                    <div><h2 class="text-lg font-semibold">{{ courseLabel(submission.courseId) }} · {{ assessmentLabel(submission.assessmentId) }}</h2><p class="text-sm text-muted-color">Submitted {{ submission.submittedAt | date:'medium' }} · {{ submission.marks.length }} grade(s)</p></div>
                    <div class="flex gap-2 items-start"><button class="btn-secondary" (click)="review(submission, 'RETURNED')">Return to teacher</button><button class="btn-primary" (click)="review(submission, 'APPROVED')">Approve grades</button></div>
                </div>
                <div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr><th class="text-left p-2">Student ID</th><th class="text-left p-2">Student</th><th class="text-left p-2">Marks</th><th class="text-left p-2">Percentage</th></tr></thead><tbody>
                    @for (item of submission.marks; track item.studentId) { @if (student(item.studentId); as person) { <tr class="border-t border-surface-200 dark:border-surface-700"><td class="p-2">{{ person.admissionNo }}</td><td class="p-2">{{ person.firstName }} {{ person.lastName }}</td><td class="p-2">{{ item.marks }} / {{ maxMarks(submission.assessmentId) }}</td><td class="p-2">{{ percentage(item.marks, submission.assessmentId) }}%</td></tr> } }
                </tbody></table></div>
            </article>
        } @empty {
            <div class="rounded-xl border border-surface-200 dark:border-surface-700 p-8 text-center"><i class="pi pi-check-circle text-3xl text-primary"></i><h2 class="font-semibold text-lg mt-3">No grades awaiting review</h2><p class="text-muted-color mt-1">Teacher submissions will appear here for approval.</p></div>
        }
    `,
    styles: [`
        .btn-primary,.btn-secondary { border-radius:.5rem; padding:.55rem .8rem; font-size:.875rem; font-weight:600; cursor:pointer; }
        .btn-primary { background:var(--primary-color); color:var(--primary-contrast-color); }
        .btn-secondary { border:1px solid var(--surface-border); background:var(--surface-card); color:var(--text-color); }
        th { padding:.5rem; color:var(--text-muted-color); font-weight:600; border-bottom:1px solid var(--surface-border); }
    `]
})
export class GradeApprovals {
    private readonly core = inject(CoreDataService);
    private readonly workspace = inject(TeacherWorkspaceService);
    private readonly exams = inject(ExamService);
    readonly notice = signal('');
    readonly pending = computed(() => this.workspace.data().gradeSubmissions.filter((item) => item.status === 'PENDING_ADMIN').slice().reverse());

    courseLabel(id: string): string { const course = this.core.courses().find((item) => item.id === id); return course ? `${course.code} — ${course.title}` : id; }
    assessmentLabel(id: string): string { return this.workspace.data().assessments.find((item) => item.id === id)?.title ?? id; }
    maxMarks(id: string): number { return this.workspace.data().assessments.find((item) => item.id === id)?.maxMarks ?? 100; }
    percentage(marks: number, id: string): number { return Math.round((marks / this.maxMarks(id)) * 100); }
    student(id: string) { return this.core.students().find((item) => item.id === id); }

    review(submission: TeacherGradeSubmission, status: 'APPROVED' | 'RETURNED'): void {
        if (status === 'APPROVED') {
            const assessment = this.workspace.data().assessments.find((item) => item.id === submission.assessmentId);
            if (!assessment) { this.notice.set('The assessment record is missing, so the grades could not be approved.'); return; }
            const semesterId = this.core.getSettings().currentSemesterId ?? this.core.semesters().find((item) => item.status === 'ACTIVE')?.id ?? this.core.semesters()[0]?.id;
            if (!semesterId) { this.notice.set('Set up an academic semester before approving grades.'); return; }
            for (const item of submission.marks) this.exams.upsertResult(item.studentId, submission.courseId, semesterId, item.marks, assessment.maxMarks, this.core.getSettings().gradingScale);
        }
        this.workspace.update({ gradeSubmissions: this.workspace.data().gradeSubmissions.map((item) => item.id === submission.id ? { ...item, status } : item) });
        this.notice.set(status === 'APPROVED' ? 'Grades approved and added to student academic records.' : 'Grades returned to the teacher for revision.');
    }
}
