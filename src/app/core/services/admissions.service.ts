import { inject, Injectable } from '@angular/core';
import { CoreDataService } from '@/app/core/services/core-data.service';
import { AdmissionApplication, Student } from '@/app/core/models/index';
import { generateStudentId } from '@/app/core/utils/util';

@Injectable({
    providedIn: 'root'
})
export class AdmissionsService {
    readonly core = inject(CoreDataService);

    list(): AdmissionApplication[] {
        return this.core.admissionApplications();
    }

    get(id: string): AdmissionApplication | undefined {
        return this.core.get<AdmissionApplication>('admissionApplications', id);
    }

    create(data: Partial<AdmissionApplication>): AdmissionApplication {
        const now = new Date().toISOString();
        const entity: AdmissionApplication = {
            id: data.id ?? this.core.generateId('app'),
            applicantName: data.applicantName ?? '',
            email: data.email ?? '',
            phone: data.phone ?? '',
            dob: data.dob ?? '',
            gender: data.gender ?? 'OTHER',
            programId: data.programId ?? '',
            departmentId: data.departmentId ?? '',
            qualifications: data.qualifications ?? '',
            applicationFeePaid: data.applicationFeePaid ?? false,
            status: data.status ?? 'SUBMITTED',
            studentId: data.studentId ?? null,
            reviewNotes: data.reviewNotes ?? '',
            submittedAt: data.submittedAt ?? now,
            reviewedAt: data.reviewedAt ?? null,
            createdAt: data.createdAt ?? now,
            updatedAt: now
        };
        return this.core.create<AdmissionApplication & { id: string }>('admissionApplications', entity);
    }

    update(entity: AdmissionApplication): AdmissionApplication {
        return this.core.update<AdmissionApplication & { id: string }>('admissionApplications', entity);
    }

    remove(id: string): void {
        this.core.remove('admissionApplications', id);
    }

    approve(id: string): AdmissionApplication {
        const app = this.get(id);
        if (!app) {
            throw new Error('Application not found');
        }
        return this.update({ ...app, status: 'APPROVED', reviewedAt: new Date().toISOString() });
    }

    reject(id: string, reason: string): AdmissionApplication {
        const app = this.get(id);
        if (!app) {
            throw new Error('Application not found');
        }
        return this.update({ ...app, status: 'REJECTED', reviewNotes: reason, reviewedAt: new Date().toISOString() });
    }

    markUnderReview(id: string): AdmissionApplication {
        const app = this.get(id);
        if (!app) {
            throw new Error('Application not found');
        }
        return this.update({ ...app, status: 'UNDER_REVIEW' });
    }

    setFeePaid(id: string, paid: boolean): AdmissionApplication {
        const app = this.get(id);
        if (!app) {
            throw new Error('Application not found');
        }
        return this.update({ ...app, applicationFeePaid: paid });
    }

    enroll(id: string, studentData: Partial<Student>): Student {
        const app = this.get(id);
        if (!app) {
            throw new Error('Application not found');
        }
        if (app.status !== 'APPROVED') {
            throw new Error('Only approved applications can be enrolled.');
        }
        const existing = this.core.students().find((s) => s.email === app.email);
        if (existing) {
            throw new Error('A student with this email already exists.');
        }
        const now = new Date().toISOString();
        const nameParts = app.applicantName.trim().split(/\s+/);
        const student = this.core.create<Student & { id: string }>('students', {
            ...studentData,
            id: this.core.generateId('stu'),
            admissionNo: studentData.admissionNo ?? generateStudentId(new Date().getFullYear()),
            firstName: nameParts[0] ?? app.applicantName,
            lastName: nameParts.slice(1).join(' ') || '-',
            email: app.email,
            phone: app.phone,
            dob: studentData.dob ?? app.dob,
            gender: studentData.gender ?? app.gender,
            departmentId: studentData.departmentId ?? app.departmentId,
            programId: studentData.programId ?? app.programId,
            currentSemesterId: studentData.currentSemesterId ?? '',
            session: studentData.session ?? '',
            status: studentData.status ?? 'ACTIVE',
            admissionDate: now,
            guardianName: studentData.guardianName ?? '',
            guardianPhone: studentData.guardianPhone ?? '',
            guardianRelation: studentData.guardianRelation ?? '',
            address: studentData.address ?? '',
            createdAt: now,
            updatedAt: now
        });
        this.update({ ...app, status: 'ENROLLED', studentId: student.id });
        return student;
    }

    stats() {
        const list = this.core.admissionApplications();
        const total = list.length;
        const submitted = list.filter((a) => a.status === 'SUBMITTED').length;
        const underReview = list.filter((a) => a.status === 'UNDER_REVIEW').length;
        const approved = list.filter((a) => a.status === 'APPROVED' || a.status === 'ENROLLED').length;
        const rejected = list.filter((a) => a.status === 'REJECTED').length;
        const enrolled = list.filter((a) => a.status === 'ENROLLED').length;
        const conversionRate = total ? (enrolled / total) * 100 : 0;
        return { total, submitted, underReview, approved, rejected, enrolled, conversionRate };
    }
}
