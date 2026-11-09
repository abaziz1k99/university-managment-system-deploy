import { Injectable, inject } from '@angular/core';
import { CoreDataService } from '@/app/core/services/core-data.service';
import { FacultyMember, EmploymentStatus, Department, Program, Course } from '@/app/core/models/index';

@Injectable({
    providedIn: 'root'
})
export class FacultyService {
    readonly core = inject(CoreDataService);

    list(): FacultyMember[] {
        return this.core.facultyMembers();
    }

    get(id: string): FacultyMember | undefined {
        return this.core.get<FacultyMember>('facultyMembers', id);
    }

    generateEmployeeId(year: number): string {
        const prefix = `EMP-${year}-`;
        const existingForYear = this.core
            .facultyMembers()
            .filter((f) => f.employeeId.startsWith(prefix))
            .map((f) => {
                const seqPart = f.employeeId.slice(prefix.length);
                const n = parseInt(seqPart, 10);
                return isNaN(n) ? 0 : n;
            });
        const maxSeq = existingForYear.length ? Math.max(...existingForYear) : 0;
        let nextSeq = maxSeq + 1;
        const existingIds = new Set(this.core.facultyMembers().map((f) => f.employeeId));
        let employeeId: string;
        do {
            employeeId = `${prefix}${String(nextSeq).padStart(4, '0')}`;
            nextSeq++;
            if (nextSeq > 9999) break;
        } while (existingIds.has(employeeId));
        return employeeId;
    }

    create(data: Partial<FacultyMember>): FacultyMember {
        const year = data.joiningDate ? new Date(data.joiningDate).getFullYear() : new Date().getFullYear();
        const safeYear = isNaN(year) ? new Date().getFullYear() : year;
        const employeeId = data.employeeId ?? this.generateEmployeeId(safeYear);
        const now = new Date().toISOString();
        return this.core.create<FacultyMember & { id: string }>('facultyMembers', {
            ...data,
            id: data.id ?? this.core.generateId('fm'),
            employeeId,
            courseIds: data.courseIds ?? [],
            createdAt: data.createdAt ?? now,
            updatedAt: now
        } as FacultyMember & { id: string });
    }

    update(entity: FacultyMember): FacultyMember {
        return this.core.update<FacultyMember & { id: string }>('facultyMembers', entity);
    }

    remove(id: string): void {
        const fm = this.get(id);
        if (fm) {
            const isHead = this.core.departments().some((d) => d.headId === id);
            if (isHead) {
                throw new Error('Cannot delete faculty: this member is a department head. Reassign the department head first.');
            }
            const courseIds = fm.courseIds ?? [];
            const courseRefs = this.core.courses().filter((c) => c.facultyId === id);
            if (courseIds.length > 0 || courseRefs.length > 0) {
                throw new Error('Cannot delete faculty: assigned courses exist. Reassign courses first.');
            }
        }
        this.core.remove('facultyMembers', id);
    }

    findByDepartment(departmentId: string): FacultyMember[] {
        return this.core.facultyMembers().filter((f) => f.departmentId === departmentId);
    }

    updateStatus(id: string, status: EmploymentStatus): void {
        const fm = this.get(id);
        if (!fm) {
            throw new Error('Faculty member not found');
        }
        this.update({ ...fm, employmentStatus: status });
    }

    /**
     * Assign a course to a faculty member.
     * Rule: soft-allow cross-department assignments with warning.
     * If course.departmentId differs from faculty.departmentId, assignment proceeds
     * but a warning is logged and UI should surface a toast/message.
     * Safely handles course.programIds[0] being null/undefined.
     */
    assignCourse(facultyId: string, courseId: string): void {
        const fm = this.get(facultyId);
        if (!fm) {
            throw new Error('Faculty member not found');
        }
        const course = this.core.get<Course>('courses', courseId);
        if (!course) {
            throw new Error('Course not found');
        }

        // Safely extract primary program id; may be undefined/null if course has no programs.
        const primaryProgramId: string | null | undefined = course.programIds?.[0] ?? null;
        let programDepartmentId: string | null = null;
        if (primaryProgramId) {
            const prog = this.core.get<Program>('programs', primaryProgramId);
            programDepartmentId = prog?.departmentId ?? null;
        }

        // Correct department comparison: faculty.departmentId vs course.departmentId
        const isSameDepartment = fm.departmentId === course.departmentId;
        const isSameAsProgramDept = programDepartmentId ? fm.departmentId === programDepartmentId : true;

        if (!isSameDepartment || !isSameAsProgramDept) {
            // Soft-allow: log warning, do not throw. UI layer shows warning toast.
            // Documented rule: cross-department assignment is permitted with warning.
            console.warn(
                `[FacultyService] Cross-department assignment (soft-allow): faculty ${fm.employeeId} (${fm.departmentId}) -> course ${course.code} (${course.departmentId}${programDepartmentId ? ', programDept ' + programDepartmentId : ''}). Proceeding with warning.`
            );
        }

        const currentIds = fm.courseIds ?? [];
        if (!currentIds.includes(courseId)) {
            this.update({ ...fm, courseIds: [...currentIds, courseId] });
        }
        if (course.facultyId !== facultyId) {
            this.core.update<Course & { id: string }>('courses', { ...course, facultyId });
        }
    }

    unassignCourse(facultyId: string, courseId: string): void {
        const fm = this.get(facultyId);
        if (!fm) {
            throw new Error('Faculty member not found');
        }
        const course = this.core.get<Course>('courses', courseId);
        if (!course) {
            throw new Error('Course not found');
        }
        const currentIds = fm.courseIds ?? [];
        if (currentIds.includes(courseId)) {
            this.update({ ...fm, courseIds: currentIds.filter((id) => id !== courseId) });
        }
        if (course.facultyId === facultyId) {
            this.core.update<Course & { id: string }>('courses', { ...course, facultyId: null });
        }
    }

    getDepartmentCounts(): { deptId: string; deptName: string; count: number }[] {
        const departments = this.core.departments();
        const facultyMembers = this.core.facultyMembers();
        return departments.map((d) => ({
            deptId: d.id,
            deptName: d.name,
            count: facultyMembers.filter((f) => f.departmentId === d.id).length
        }));
    }

    /**
     * Global search across name/email/phone/employeeId.
     */
    search(query: string): FacultyMember[] {
        const q = query.trim().toLowerCase();
        if (!q) return this.list();
        return this.list().filter((f) => {
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

    searchFiltered(query: string, departmentId: string | null, designation: string | null): FacultyMember[] {
        let result = this.search(query);
        if (departmentId) {
            result = result.filter((f) => f.departmentId === departmentId);
        }
        if (designation) {
            result = result.filter((f) => f.designation === designation);
        }
        return result;
    }
}
