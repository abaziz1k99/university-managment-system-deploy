import { Injectable, inject, signal } from '@angular/core';
import { StorageService } from '@/app/core/services/storage.service';

export interface TeacherResource {
    id: string;
    courseId: string;
    title: string;
    fileName: string;
    mimeType: string;
    dataUrl: string;
    uploadedAt: string;
}

export interface TeacherMessage {
    id: string;
    courseId: string | null;
    subject: string;
    body: string;
    direction: 'SENT' | 'RECEIVED';
    sender: string;
    recipient: string;
    createdAt: string;
    reply?: string;
    demo?: boolean;
}

export interface TeacherAssessment {
    id: string;
    courseId: string;
    title: string;
    type: 'ASSIGNMENT' | 'QUIZ' | 'EXAM';
    dueDate: string;
    maxMarks: number;
    createdAt: string;
}

export interface TeacherGradeSubmission {
    id: string;
    courseId: string;
    assessmentId: string;
    submittedAt: string;
    status: 'PENDING_ADMIN' | 'APPROVED' | 'RETURNED';
    marks: { studentId: string; marks: number }[];
}

export interface StudentAssignmentSubmission {
    id: string;
    assessmentId: string;
    studentId: string;
    response: string;
    fileName?: string;
    fileDataUrl?: string;
    submittedAt: string;
}

export interface TeacherWorkspaceData {
    resources: TeacherResource[];
    messages: TeacherMessage[];
    assessments: TeacherAssessment[];
    gradeSubmissions: TeacherGradeSubmission[];
    studentSubmissions: StudentAssignmentSubmission[];
    profile: Record<string, string>;
}

const KEY = 'unimanage.teacher-workspace.v1';
const emptyData: TeacherWorkspaceData = { resources: [], messages: [], assessments: [], gradeSubmissions: [], studentSubmissions: [], profile: {} };

@Injectable({ providedIn: 'root' })
export class TeacherWorkspaceService {
    private readonly storage = inject(StorageService);
    private readonly _data = signal<TeacherWorkspaceData>({ ...emptyData, ...(this.storage.get<Partial<TeacherWorkspaceData>>(KEY) ?? {}) });
    readonly data = this._data.asReadonly();

    update(patch: Partial<TeacherWorkspaceData>): void {
        this._data.update((data) => ({ ...data, ...patch }));
        this.storage.set(KEY, this._data());
    }
}
