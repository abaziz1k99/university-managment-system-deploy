import { Injectable, inject, signal } from '@angular/core';
import { StorageService } from '@/app/core/services/storage.service';

export interface StudentCourseRegistration {
    id: string;
    studentId: string;
    courseId: string;
    semesterId: string;
    submittedAt: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

const KEY = 'unimanage.student-workspace.v1';

@Injectable({ providedIn: 'root' })
export class StudentWorkspaceService {
    private readonly storage = inject(StorageService);
    private readonly _registrations = signal<StudentCourseRegistration[]>(this.storage.get<StudentCourseRegistration[]>(KEY) ?? []);
    readonly registrations = this._registrations.asReadonly();

    register(studentId: string, courseId: string, semesterId: string): StudentCourseRegistration {
        const existing = this._registrations().find((item) => item.studentId === studentId && item.courseId === courseId && item.semesterId === semesterId);
        if (existing) return existing;
        const registration: StudentCourseRegistration = { id: `reg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, studentId, courseId, semesterId, submittedAt: new Date().toISOString(), status: 'PENDING' };
        this._registrations.update((items) => [...items, registration]);
        this.storage.set(KEY, this._registrations());
        return registration;
    }

    setStatus(id: string, status: StudentCourseRegistration['status']): void {
        this._registrations.update((items) => items.map((item) => item.id === id ? { ...item, status } : item));
        this.storage.set(KEY, this._registrations());
    }
}
