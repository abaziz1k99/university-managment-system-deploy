import { Injectable, inject } from '@angular/core';
import { CoreDataService } from '@/app/core/services/core-data.service';
import { Student, StudentStatus } from '@/app/core/models/index';

@Injectable({
    providedIn: 'root'
})
export class StudentService {
    readonly core = inject(CoreDataService);

    list(): Student[] {
        return this.core.students();
    }

    get(id: string): Student | undefined {
        return this.core.get<Student>('students', id);
    }

    validateDepartmentProgram(departmentId: string, programId: string): boolean {
        if (!departmentId || !programId) return false;
        const program = this.core.get<import('@/app/core/models/index').Program>('programs', programId);
        return !!program && program.departmentId === departmentId;
    }

    previewDeleteCounts(id: string): { feeAccounts: number; payments: number; results: number; attendance: number; total: number } {
        const feeAccounts = this.core.feeAccounts().filter((f) => f.studentId === id);
        const feeAccountIds = new Set(feeAccounts.map((f) => f.id));
        const payments = this.core.payments().filter((p) => p.studentId === id || feeAccountIds.has(p.feeAccountId));
        const results = this.core.studentResults().filter((r) => r.studentId === id);
        const attendance = this.core.attendanceRecords().filter((a) => a.studentId === id);
        return {
            feeAccounts: feeAccounts.length,
            payments: payments.length,
            results: results.length,
            attendance: attendance.length,
            total: feeAccounts.length + payments.length + results.length + attendance.length
        };
    }

    create(data: Partial<Student>): Student {
        const year = data.admissionDate ? new Date(data.admissionDate).getFullYear() : new Date().getFullYear();
        const prefix = `UM-${year}-`;
        const existingForYear = this.core
            .students()
            .filter((s: Student) => s.admissionNo.startsWith(prefix))
            .map((s: Student) => {
                const seqPart = s.admissionNo.slice(prefix.length);
                const n = parseInt(seqPart, 10);
                return isNaN(n) ? 0 : n;
            });
        const maxSeq = existingForYear.length ? Math.max(...existingForYear) : 0;
        let nextSeq = maxSeq + 1;
        const existingIds = new Set(this.core.students().map((s: Student) => s.admissionNo));
        let admissionNo: string;
        do {
            admissionNo = `${prefix}${String(nextSeq).padStart(4, '0')}`;
            nextSeq++;
            if (nextSeq > 9999) break;
        } while (existingIds.has(admissionNo));

        const now = new Date().toISOString();
        return this.core.create<Student & { id: string }>('students', {
            ...data,
            id: data.id ?? this.core.generateId('stu'),
            admissionNo,
            createdAt: data.createdAt ?? now,
            updatedAt: now
        } as Student & { id: string });
    }

    update(entity: Student): Student {
        return this.core.update<Student & { id: string }>('students', entity);
    }

    remove(id: string): void {
        const counts = this.previewDeleteCounts(id);
        if (counts.total > 0) {
            throw new Error(
                `Cannot delete student: ${counts.feeAccounts} fee account(s) (${counts.payments} payment(s)), ${counts.results} result(s), ${counts.attendance} attendance record(s) exist. Use cascade delete to remove dependents.`
            );
        }
        this.core.remove('students', id);
    }

    removeCascade(id: string): void {
        const counts = this.previewDeleteCounts(id);
        const feeAccounts = this.core.feeAccounts().filter((f) => f.studentId === id);
        const feeAccountIds = new Set(feeAccounts.map((f) => f.id));

        // Delete payments linked to this student's fee accounts or studentId
        const paymentsToDelete = this.core.payments().filter((p) => p.studentId === id || feeAccountIds.has(p.feeAccountId));
        paymentsToDelete.forEach((p) => this.core.remove('payments', p.id));

        // Delete fee accounts
        feeAccounts.forEach((fa) => this.core.remove('feeAccounts', fa.id));

        // Delete results
        this.core.studentResults().filter((r) => r.studentId === id).forEach((r) => this.core.remove('studentResults', r.id));

        // Delete attendance
        this.core.attendanceRecords().filter((a) => a.studentId === id).forEach((a) => this.core.remove('attendanceRecords', a.id));

        // Finally delete student
        this.core.remove('students', id);
    }

    findByDepartment(departmentId: string): Student[] {
        return this.core.students().filter((s: Student) => s.departmentId === departmentId);
    }

    findByProgram(programId: string): Student[] {
        return this.core.students().filter((s: Student) => s.programId === programId);
    }

    updateStatus(id: string, status: StudentStatus): void {
        const student = this.get(id);
        if (!student) {
            throw new Error('Student not found');
        }
        this.update({ ...student, status });
    }
}
