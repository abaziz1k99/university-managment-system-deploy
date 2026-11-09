import { inject, Injectable } from '@angular/core';
import { CoreDataService } from '@/app/core/services/core-data.service';
import { Faculty, Department, Program } from '@/app/core/models/index';
import { generateId } from '@/app/core/utils/util';

@Injectable({
    providedIn: 'root'
})
export class AcademicService {
    protected readonly core = inject(CoreDataService);

    getFaculties() {
        return this.core.faculties();
    }

    getFaculty(id: string) {
        return this.core.get<Faculty>('faculties', id);
    }

    createFaculty(data: Partial<Faculty>): Faculty {
        return this.core.create<Faculty & { id: string }>('faculties', {
            ...data,
            id: this.core.generateId('fac'),
            code: data.code ?? generateId('code'),
            status: data.status ?? 'ACTIVE',
            createdAt: data.createdAt ?? new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
    }

    updateFaculty(entity: Faculty): Faculty {
        return this.core.update<Faculty & { id: string }>('faculties', entity);
    }

    removeFaculty(id: string): void {
        const deps = this.core.findDepartment(id);
        if (deps.length > 0) {
            throw new Error(`Cannot delete faculty: ${deps.length} department(s) depend on it.`);
        }
        this.core.remove('faculties', id);
    }

    getDepartments() {
        return this.core.departments();
    }

    getDepartment(id: string) {
        return this.core.get<Department>('departments', id);
    }

    createDepartment(data: Partial<Department>): Department {
        const existing = this.core.departments().some((d) => d.code.toLowerCase() === (data.code ?? '').toLowerCase());
        if (existing) {
            throw new Error('A department with this code already exists.');
        }
        return this.core.create<Department & { id: string }>('departments', {
            ...data,
            id: this.core.generateId('dept'),
            status: data.status ?? 'ACTIVE',
            createdAt: data.createdAt ?? new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
    }

    updateDepartment(entity: Department): Department {
        return this.core.update<Department & { id: string }>('departments', entity);
    }

    async removeDepartment(id: string): Promise<void> {
        const { allowed, reason } = await this.core.deleteDepartmentGuard(id);
        if (!allowed) {
            throw new Error(reason);
        }
        this.core.remove('departments', id);
    }

    getPrograms() {
        return this.core.programs();
    }

    getProgram(id: string) {
        return this.core.get<Program>('programs', id);
    }

    createProgram(data: Partial<Program>): Program {
        const existing = this.core.programs().some((p) => p.code.toLowerCase() === (data.code ?? '').toLowerCase());
        if (existing) {
            throw new Error('A program with this code already exists.');
        }
        return this.core.create<Program & { id: string }>('programs', {
            ...data,
            id: this.core.generateId('prog'),
            status: data.status ?? 'ACTIVE',
            createdAt: data.createdAt ?? new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
    }

    updateProgram(entity: Program): Program {
        return this.core.update<Program & { id: string }>('programs', entity);
    }

    removeProgram(id: string): void {
        const students = this.core.students().filter((s) => s.programId === id);
        if (students.length > 0) {
            throw new Error(`Cannot delete program: ${students.length} student(s) are enrolled.`);
        }
        this.core.remove('programs', id);
    }

    getDepartmentsByFaculty(facultyId: string): Department[] {
        return this.core.departments().filter((d) => d.facultyId === facultyId);
    }

    getProgramsByDepartment(departmentId: string): Program[] {
        return this.core.programs().filter((p) => p.departmentId === departmentId);
    }
}
