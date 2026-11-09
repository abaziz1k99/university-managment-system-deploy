import { Injectable, inject } from '@angular/core';
import { CoreDataService } from '@/app/core/services/core-data.service';
import { AttendanceRecord } from '@/app/core/models/index';

/** Per-date aggregate for a course. */
export interface CourseDailySummary {
    date: string;
    present: number;
    absent: number;
    late: number;
    excused: number;
    total: number;
    attended: number;
    percent: number;
}

/** Per-student aggregate for a course. */
export interface CourseStudentSummary {
    studentId: string;
    attended: number;
    total: number;
    percent: number;
}

/** Combined course attendance summary (history views). */
export interface CourseAttendanceSummary {
    daily: CourseDailySummary[];
    students: CourseStudentSummary[];
}

@Injectable({
    providedIn: 'root'
})
export class AttendanceService {
    protected readonly core = inject(CoreDataService);

    list(): AttendanceRecord[] {
        return this.core.attendanceRecords();
    }

    getByCourseAndDate(courseId: string, date: string): AttendanceRecord[] {
        return this.core.attendanceRecords().filter((a: AttendanceRecord) => a.courseId === courseId && a.date === date);
    }

    upsert(records: AttendanceRecord[]): void {
        records.forEach((r) => {
            const existing = this.core.attendanceRecords().find(
                (a: AttendanceRecord) => a.studentId === r.studentId && a.courseId === r.courseId && a.date === r.date
            );
            if (existing) {
                this.core.update<AttendanceRecord & { id: string }>('attendanceRecords', { ...r, id: existing.id });
            } else {
                this.core.create<AttendanceRecord & { id: string }>('attendanceRecords', { ...r, id: this.core.generateId('att') });
            }
        });
    }

    bulkMark(courseId: string, date: string, studentIds: string[], status: AttendanceRecord['status']): void {
        const semesterId =
            this.core.classSessions().find((cs) => cs.courseId === courseId)?.semesterId ??
            this.core.semesters()[0]?.id ??
            'sem-fall-2025';
        studentIds.forEach((sid) => {
            this.upsert([
                {
                    id: this.core.generateId('att'),
                    studentId: sid,
                    courseId,
                    semesterId,
                    date,
                    status,
                    markedBy: 'system',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                } as AttendanceRecord
            ]);
        });
    }

    getCourseAttendancePercent(courseId: string, studentId: string): number {
        const records = this.core.getStudentAttendance(studentId, courseId);
        const present = records.filter((r: AttendanceRecord) => r.status === 'PRESENT' || r.status === 'LATE').length;
        return records.length ? (present / records.length) * 100 : 0;
    }

    /** Remove saved marks for the given students on a course + date. Returns the number removed. */
    removeMarks(courseId: string, date: string, studentIds: string[]): number {
        const targets = this.core
            .attendanceRecords()
            .filter((a: AttendanceRecord) => a.courseId === courseId && a.date === date && studentIds.includes(a.studentId));
        targets.forEach((a: AttendanceRecord) => this.core.remove('attendanceRecords', a.id));
        return targets.length;
    }

    /** Per-date and per-student aggregates for a course (used by the history views). */
    getCourseSummary(courseId: string): CourseAttendanceSummary {
        const records = this.core.attendanceRecords().filter((r: AttendanceRecord) => r.courseId === courseId);

        const dates = Array.from(new Set(records.map((r: AttendanceRecord) => r.date))).sort((a: string, b: string) =>
            a.localeCompare(b)
        );
        const daily: CourseDailySummary[] = dates.map((date: string) => {
            const day = records.filter((r: AttendanceRecord) => r.date === date);
            const present = day.filter((r: AttendanceRecord) => r.status === 'PRESENT').length;
            const absent = day.filter((r: AttendanceRecord) => r.status === 'ABSENT').length;
            const late = day.filter((r: AttendanceRecord) => r.status === 'LATE').length;
            const excused = day.filter((r: AttendanceRecord) => r.status === 'EXCUSED').length;
            const attended = present + late;
            const total = day.length;
            return { date, present, absent, late, excused, total, attended, percent: total ? (attended / total) * 100 : 0 };
        });

        const studentIds = Array.from(new Set(records.map((r: AttendanceRecord) => r.studentId))).sort((a: string, b: string) =>
            a.localeCompare(b)
        );
        const students: CourseStudentSummary[] = studentIds.map((studentId: string) => {
            const recs = records.filter((r: AttendanceRecord) => r.studentId === studentId);
            const attended = recs.filter((r: AttendanceRecord) => r.status === 'PRESENT' || r.status === 'LATE').length;
            const total = recs.length;
            return { studentId, attended, total, percent: total ? (attended / total) * 100 : 0 };
        });

        return { daily, students };
    }
}
