import { inject, Injectable } from '@angular/core';
import { CoreDataService } from '@/app/core/services/core-data.service';
import { ClassSession, Course, FacultyMember } from '@/app/core/models/index';

@Injectable({
    providedIn: 'root'
})
export class RoutineService {
    protected readonly core = inject(CoreDataService);

    list() {
        return this.core.classSessions();
    }

    get(id: string) {
        return this.core.get<ClassSession>('classSessions', id);
    }

    create(data: Partial<ClassSession>): ClassSession {
        const conflict = this.checkConflict(data as ClassSession);
        if (conflict) {
            throw new Error(conflict);
        }
        return this.core.create<ClassSession & { id: string }>('classSessions', {
            ...data,
            id: this.core.generateId('ses'),
            createdAt: data.createdAt ?? new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
    }

    update(entity: ClassSession): ClassSession {
        const conflict = this.checkConflict(entity, entity.id);
        if (conflict) {
            throw new Error(conflict);
        }
        return this.core.update<ClassSession & { id: string }>('classSessions', entity);
    }

    remove(id: string): void {
        this.core.remove('classSessions', id);
    }

    findBySemester(semesterId: string) {
        return this.core.classSessions().filter((s) => s.semesterId === semesterId);
    }

    findByDepartment(departmentId: string) {
        const courses = this.core.courses().filter((c) => c.departmentId === departmentId).map((c) => c.id);
        return this.core.classSessions().filter((s) => courses.includes(s.courseId));
    }

    findByFaculty(facultyId: string) {
        return this.core.classSessions().filter((s) => s.facultyId === facultyId);
    }

    private checkConflict(session: Partial<ClassSession>, excludeId?: string): string | null {
        const sameRoom = this.core.classSessions().find(
            (s) => s.id !== excludeId && s.room === session.room && s.day === session.day &&
                this.timeOverlap(s.startTime, s.endTime, session.startTime!, session.endTime!)
        );
        if (sameRoom) {
            return `Room ${session.room} is occupied by course ${this.core.get('courses', sameRoom.courseId)?.code} at ${sameRoom.startTime}-${sameRoom.endTime}.`;
        }
        const sameFaculty = this.core.classSessions().find(
            (s) => s.id !== excludeId && s.facultyId === session.facultyId && s.day === session.day &&
                this.timeOverlap(s.startTime, s.endTime, session.startTime!, session.endTime!)
        );
        if (sameFaculty) {
            return `Faculty ${this.core.get('facultyMembers', session.facultyId!)?.firstName} is occupied by course ${this.core.get('courses', sameFaculty.courseId)?.code} at ${sameFaculty.startTime}-${sameFaculty.endTime}.`;
        }
        if (session.startTime && session.endTime && session.startTime >= session.endTime) {
            return 'Start time must be before end time.';
        }
        return null;
    }

    private timeOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
        return s1 < e2 && s2 < e1;
    }

    getGrid(semesterId: string, departmentId?: string) {
        let sessions = this.findBySemester(semesterId);
        if (departmentId) {
            sessions = sessions.filter((s) => {
                const c = this.core.get('courses', s.courseId);
                return c?.departmentId === departmentId;
            });
        }
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
        return days.map((day) => ({
            day,
            sessions: sessions.filter((s) => s.day === day).sort((a, b) => a.startTime.localeCompare(b.startTime))
        }));
    }
}