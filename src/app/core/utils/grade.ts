import { GradeScaleEntry } from '@/app/core/models/index';

export function calcGradeForPercent(scale: GradeScaleEntry[], percent: number): { grade: GradeScaleEntry['grade']; gradePoint: number } {
    const entry = [...scale].sort((a, b) => b.minPercent - a.minPercent).find((g) => percent >= g.minPercent);
    if (!entry) {
        return { grade: 'F', gradePoint: 0 };
    }
    return { grade: entry.grade, gradePoint: entry.gradePoint };
}

export function calcGPA(results: { credits: number; gradePoint: number }[]): number {
    const totalCredits = results.reduce((sum: number, r: { credits: number; gradePoint: number }) => sum + r.credits, 0);
    if (totalCredits === 0) {
        return 0;
    }
    const points = results.reduce((sum: number, r: { credits: number; gradePoint: number }) => sum + r.credits * r.gradePoint, 0);
    return points / totalCredits;
}

export function calcCgpa(semesterGpas: { credits: number; gradePoint: number }[][]): number {
    const all: { credits: number; gradePoint: number }[] = [];
    semesterGpas.forEach((sem) => all.push(...sem));
    return calcGPA(all);
}

export function calcAttendancePercent(present: number, total: number): number {
    if (total === 0) {
        return 0;
    }
    return (present / total) * 100;
}
