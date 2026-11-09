import { inject, Injectable } from '@angular/core';
import { CoreDataService } from '@/app/core/services/core-data.service';
import type { Examination, StudentResult, GradeScaleEntry, Course, Semester } from '@/app/core/models/index';
import { calcGradeForPercent } from '@/app/core/utils/grade';

@Injectable({
    providedIn: 'root'
})
export class ExamService {
    protected readonly core = inject(CoreDataService);

    list(): Examination[] {
        return this.core.examinations();
    }

    get(id: string): Examination | undefined {
        return this.core.get<Examination>('examinations', id);
    }

    create(data: Partial<Examination>): Examination {
        return this.core.create<Examination & { id: string }>('examinations', {
            ...data,
            id: this.core.generateId('exm'),
            maxMarks: data.maxMarks ?? 100,
            createdAt: data.createdAt ?? new Date().toISOString(),
            updatedAt: new Date().toISOString()
        } as Examination & { id: string });
    }

    update(entity: Examination): Examination {
        return this.core.update<Examination & { id: string }>('examinations', entity);
    }

    remove(id: string): void {
        const results = this.core.studentResults().filter((r: StudentResult) => r.courseId === this.core.get<Examination>('examinations', id)?.courseId);
        if (results.length > 0) {
            throw new Error('Cannot delete examination: results exist. Remove results first.');
        }
        this.core.remove('examinations', id);
    }

    findBySemester(semesterId: string): Examination[] {
        return this.core.examinations().filter((e: Examination) => e.semesterId === semesterId);
    }

    findByCourse(courseId: string): Examination[] {
        return this.core.examinations().filter((e: Examination) => e.courseId === courseId);
    }

    enterMarks(examId: string, marks: { studentId: string; marks: number }[], scale: GradeScaleEntry[]): void {
        const exam = this.get(examId);
        if (!exam) throw new Error('Exam not found');
        marks.forEach((m) => {
            const { grade, gradePoint } = calcGradeForPercent(scale, (m.marks / exam.maxMarks) * 100);
            const existing = this.core.studentResults().find(
                (r: StudentResult) => r.studentId === m.studentId && r.courseId === exam.courseId && r.semesterId === exam.semesterId
            );
            const record = {
                studentId: m.studentId,
                courseId: exam.courseId,
                semesterId: exam.semesterId,
                marks: m.marks,
                maxMarks: exam.maxMarks,
                grade,
                gradePoint,
                status: m.marks >= 35 ? 'PASSED' as const : 'FAILED' as const,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            if (existing) {
                this.core.update<StudentResult & { id: string }>('studentResults', { ...existing, ...record });
            } else {
                this.core.create<StudentResult & { id: string }>('studentResults', { ...record, id: this.core.generateId('res') });
            }
        });
    }

    /**
     * Create or update the single result that exists per (student, course, semester).
     * Marks are converted to a percentage against `maxMarks` and the letter grade /
     * grade point are derived from the supplied grading scale. A percentage of 40 or
     * above is recorded as PASSED, anything lower as FAILED.
     */
    upsertResult(studentId: string, courseId: string, semesterId: string, marks: number, maxMarks: number, scale: GradeScaleEntry[]): StudentResult {
        const percent = maxMarks === 0 ? 0 : (marks / maxMarks) * 100;
        const { grade, gradePoint } = calcGradeForPercent(scale, percent);
        const status: StudentResult['status'] = percent >= 40 ? 'PASSED' : 'FAILED';
        const existing = this.core.studentResults().find(
            (r: StudentResult) => r.studentId === studentId && r.courseId === courseId && r.semesterId === semesterId
        );
        const now = new Date().toISOString();
        if (existing) {
            return this.core.update<StudentResult & { id: string }>('studentResults', {
                ...existing,
                marks,
                maxMarks,
                grade,
                gradePoint,
                status,
                updatedAt: now
            });
        }
        return this.core.create<StudentResult & { id: string }>('studentResults', {
            id: this.core.generateId('res'),
            studentId,
            courseId,
            semesterId,
            marks,
            maxMarks,
            grade,
            gradePoint,
            status,
            createdAt: now,
            updatedAt: now
        });
    }

    removeResult(studentId: string, courseId: string, semesterId: string): void {
        const existing = this.core.studentResults().find(
            (r: StudentResult) => r.studentId === studentId && r.courseId === courseId && r.semesterId === semesterId
        );
        if (existing) {
            this.core.remove('studentResults', existing.id);
        }
    }

    getCourseResults(courseId: string, semesterId: string): StudentResult[] {
        return this.core.studentResults().filter((r: StudentResult) => r.courseId === courseId && r.semesterId === semesterId);
    }

    getStudentResults(studentId: string): StudentResult[] {
        return this.core.studentResults().filter((r: StudentResult) => r.studentId === studentId);
    }

    calcGPA(studentId: string, semesterId?: string): number {
        const results = semesterId
            ? this.core.studentResults().filter((r: StudentResult) => r.studentId === studentId && r.semesterId === semesterId)
            : this.core.studentResults().filter((r: StudentResult) => r.studentId === studentId);
        const courses = results.map((r: StudentResult) => {
            const course = this.core.get<Course>('courses', r.courseId);
            return { credits: course?.credits ?? 3, gradePoint: r.gradePoint };
        });
        return courses.length
            ? courses.reduce((s: number, c: { credits: number; gradePoint: number }) => s + c.credits * c.gradePoint, 0) /
                  courses.reduce((s: number, c: { credits: number; gradePoint: number }) => s + c.credits, 0)
            : 0;
    }

    calcCGPA(studentId: string): number {
        const semesters = this.core.semesters().filter((s: Semester) => s.status === 'CLOSED');
        let totalPoints = 0;
        let totalCredits = 0;
        semesters.forEach((sem: Semester) => {
            const results = this.core.studentResults().filter((r: StudentResult) => r.studentId === studentId && r.semesterId === sem.id);
            const courses = results.map((r: StudentResult) => {
                const course = this.core.get<Course>('courses', r.courseId);
                return { credits: course?.credits ?? 3, gradePoint: r.gradePoint };
            });
            totalPoints += courses.reduce((s: number, c: { credits: number; gradePoint: number }) => s + c.credits * c.gradePoint, 0);
            totalCredits += courses.reduce((s: number, c: { credits: number; gradePoint: number }) => s + c.credits, 0);
        });
        return totalCredits ? totalPoints / totalCredits : 0;
    }
}
