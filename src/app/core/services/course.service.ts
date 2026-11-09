import { inject, Injectable } from '@angular/core';
import { CoreDataService } from '@/app/core/services/core-data.service';
import { Course } from '@/app/core/models/index';

@Injectable({
    providedIn: 'root'
})
export class CourseService {
    protected readonly core = inject(CoreDataService);

    list() {
        return this.core.courses();
    }

    get(id: string) {
        return this.core.get<Course>('courses', id);
    }

    create(data: Partial<Course>): Course {
        const code = (data.code ?? '').toUpperCase().trim();
        const existing = this.core.courses().some((c) => c.code.toLowerCase() === code.toLowerCase());
        if (existing) {
            throw new Error('A course with this code already exists.');
        }
        return this.core.create<Course & { id: string }>('courses', {
            ...data,
            code,
            id: this.core.generateId('crs'),
            programIds: data.programIds ?? [],
            credits: data.credits ?? 3,
            type: data.type ?? 'CORE',
            status: data.status ?? 'ACTIVE',
            prerequisite: data.prerequisite ?? null,
            createdAt: data.createdAt ?? new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
    }

    update(entity: Course): Course {
        const code = (entity.code ?? '').toUpperCase().trim();
        const existing = this.core.courses().filter((c) => c.id !== entity.id && c.code.toLowerCase() === code.toLowerCase());
        if (existing.length > 0) {
            throw new Error('A course with this code already exists.');
        }
        return this.core.update<Course & { id: string }>('courses', { ...entity, code });
    }

    remove(id: string): void {
        const results = this.core.studentResults().filter((r) => r.courseId === id);
        if (results.length > 0) {
            throw new Error(`Cannot delete course: ${results.length} result(s) depend on it.`);
        }
        this.core.remove('courses', id);
    }

    findByDepartment(departmentId: string) {
        return this.core.courses().filter((c) => c.departmentId === departmentId);
    }

    findByProgram(programId: string) {
        return this.core.courses().filter((c) => (c.programIds ?? []).includes(programId));
    }

    findByCode(code: string) {
        const lower = code.toLowerCase();
        return this.core.courses().filter((c) => c.code.toLowerCase() === lower);
    }
}