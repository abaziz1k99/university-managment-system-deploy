import { inject, Injectable } from '@angular/core';
import { CoreDataService } from '@/app/core/services/core-data.service';
import { Semester } from '@/app/core/models/index';

@Injectable({
    providedIn: 'root'
})
export class SemesterService {
    protected readonly core = inject(CoreDataService);

    list() {
        return this.core.semesters();
    }

    get(id: string) {
        return this.core.get<Semester>('semesters', id);
    }

    create(data: Partial<Semester>): Semester {
        const start = new Date(data.startDate ?? '');
        const end = new Date(data.endDate ?? '');
        if (end <= start) {
            throw new Error('End date must be after start date.');
        }
        return this.core.create<Semester & { id: string }>('semesters', {
            ...data,
            id: this.core.generateId('sem'),
            status: data.status ?? 'UPCOMING',
            createdAt: data.createdAt ?? new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
    }

    update(entity: Semester): Semester {
        const start = new Date(entity.startDate);
        const end = new Date(entity.endDate);
        if (end <= start) {
            throw new Error('End date must be after start date.');
        }
        return this.core.update<Semester & { id: string }>('semesters', entity);
    }

    remove(id: string): void {
        const exams = this.core.examinations().filter((e) => e.semesterId === id);
        if (exams.length > 0) {
            throw new Error(`Cannot delete semester: ${exams.length} examination(s) depend on it.`);
        }
        this.core.remove('semesters', id);
    }

    getActiveSemester(): Semester | undefined {
        return this.core.semesters().find((s) => s.status === 'ACTIVE');
    }

    activate(id: string): void {
        const s = this.get(id);
        if (!s) {
            throw new Error('Semester not found');
        }
        this.core.semesters().forEach((sem) => {
            if (sem.id !== id && sem.status === 'ACTIVE') {
                this.core.update<Semester & { id: string }>('semesters', { ...sem, status: 'CLOSED' as const });
            }
        });
        this.core.update<Semester & { id: string }>('semesters', { ...s, status: 'ACTIVE' });
    }

    close(id: string): void {
        const s = this.get(id);
        if (!s) {
            throw new Error('Semester not found');
        }
        this.core.update<Semester & { id: string }>('semesters', { ...s, status: 'CLOSED' });
    }

    isTermOverlap(a: Semester, b: Semester): boolean {
        if (a.id === b.id) return false;
        const aStart = new Date(a.startDate);
        const aEnd = new Date(a.endDate);
        const bStart = new Date(b.startDate);
        const bEnd = new Date(b.endDate);
        return aStart <= bEnd && bStart <= aEnd;
    }
}
