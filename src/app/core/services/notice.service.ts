import { inject, Injectable } from '@angular/core';
import { CoreDataService } from '@/app/core/services/core-data.service';
import { Notice, NoticeStatus } from '@/app/core/models/index';

export type CalendarEventSource = 'EXAM' | 'SEMESTER' | 'NOTICE';

/** A single day-level entry rendered on the notices event calendar. */
export interface CalendarEvent {
    id: string;
    source: CalendarEventSource;
    title: string;
    /** Local ISO day, `YYYY-MM-DD`. */
    date: string;
    detail: string;
}

@Injectable({
    providedIn: 'root'
})
export class NoticeService {
    protected readonly core = inject(CoreDataService);

    list() {
        return this.core.notices();
    }

    get(id: string) {
        return this.core.get<Notice>('notices', id);
    }

    create(data: Partial<Notice>): Notice {
        if (data.expiryDate && data.publishDate && new Date(data.expiryDate) <= new Date(data.publishDate)) {
            throw new Error('Expiry date must be after publish date.');
        }
        const entity: Notice = {
            id: this.core.generateId('ntc'),
            title: data.title ?? '',
            body: data.body ?? '',
            category: data.category ?? 'GENERAL',
            priority: data.priority ?? 'MEDIUM',
            publishDate: data.publishDate ?? null,
            expiryDate: data.expiryDate ?? null,
            status: data.status ?? 'DRAFT',
            audience: data.audience ?? ['all'],
            isEvent: data.isEvent ?? false,
            eventDate: data.eventDate ?? null,
            createdAt: data.createdAt ?? new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        return this.core.create<Notice & { id: string }>('notices', entity);
    }

    update(entity: Notice): Notice {
        if (entity.expiryDate && entity.publishDate && new Date(entity.expiryDate) <= new Date(entity.publishDate)) {
            throw new Error('Expiry date must be after publish date.');
        }
        return this.core.update<Notice & { id: string }>('notices', entity);
    }

    remove(id: string): void {
        this.core.remove('notices', id);
    }

    publish(id: string): Notice {
        const notice = this.get(id);
        if (!notice) throw new Error('Notice not found');
        return this.update({ ...notice, status: 'PUBLISHED', publishDate: notice.publishDate ?? new Date().toISOString() });
    }

    unpublish(id: string): Notice {
        const notice = this.get(id);
        if (!notice) throw new Error('Notice not found');
        return this.update({ ...notice, status: 'DRAFT' });
    }

    getPublished(): Notice[] {
        const now = new Date().toISOString();
        return this.core
            .notices()
            .filter((n) => n.status === 'PUBLISHED' && (!n.expiryDate || n.expiryDate >= now))
            .sort((a, b) => {
                const priorityOrder = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
                const p = priorityOrder[a.priority] - priorityOrder[b.priority];
                if (p !== 0) return p;
                return (b.publishDate ?? '').localeCompare(a.publishDate ?? '');
            });
    }

    getTopPublished(limit = 5): Notice[] {
        return this.getPublished().slice(0, limit);
    }

    getEvents(): Notice[] {
        return this.core.notices().filter((n) => n.isEvent && n.eventDate);
    }

    /**
     * Day-level calendar entries derived from three sources: examination dates
     * (course title, room, semester), semester milestones (start/end, registration
     * deadline, exam window), and notices explicitly marked as events.
     *
     * Dates stay as plain `YYYY-MM-DD` strings so the month grid can bucket them
     * without any timezone shifting.
     */
    getCalendarEvents(): CalendarEvent[] {
        const events: CalendarEvent[] = [];

        for (const exam of this.core.examinations()) {
            const course = this.core.courses().find((c) => c.id === exam.courseId);
            const semester = this.core.semesters().find((s) => s.id === exam.semesterId);
            const detail = [this.titleCase(exam.type), `${exam.startTime}–${exam.endTime}`, exam.room ? `Room ${exam.room}` : '', semester?.name ?? ''].filter((part) => part.length > 0).join(' · ');
            events.push({
                id: `exam-${exam.id}`,
                source: 'EXAM',
                title: `${course?.code ?? 'Course'} — ${exam.title}`,
                date: exam.date,
                detail
            });
        }

        for (const semester of this.core.semesters()) {
            const milestones: { key: string; label: string; date: string }[] = [
                { key: 'start', label: `${semester.name} begins`, date: semester.startDate },
                { key: 'reg', label: `${semester.name} registration deadline`, date: semester.registrationDeadline },
                { key: 'end', label: `${semester.name} ends`, date: semester.endDate },
                { key: 'exam-start', label: `${semester.name} exams begin`, date: semester.examStartDate },
                { key: 'exam-end', label: `${semester.name} exams end`, date: semester.examEndDate }
            ];
            for (const milestone of milestones) {
                if (!milestone.date) continue;
                events.push({
                    id: `sem-${semester.id}-${milestone.key}`,
                    source: 'SEMESTER',
                    title: milestone.label,
                    date: milestone.date,
                    detail: `${semester.name} · ${semester.academicYear} · ${this.titleCase(semester.status)}`
                });
            }
        }

        for (const notice of this.getEvents()) {
            if (!notice.eventDate) continue;
            events.push({
                id: `notice-${notice.id}`,
                source: 'NOTICE',
                title: notice.title,
                date: notice.eventDate,
                detail: `${this.titleCase(notice.category)} · ${this.titleCase(notice.priority)} priority · Audience: ${notice.audience.join(', ')}`
            });
        }

        return events.sort((a, b) => a.date.localeCompare(b.date));
    }

    private titleCase(value: string): string {
        return value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, ' ');
    }
}
