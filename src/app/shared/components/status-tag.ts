import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule } from 'primeng/tag';

type Severity = 'success' | 'info' | 'warn' | 'danger' | 'contrast';

const statusSeverity: Record<string, Severity> = {
    ACTIVE: 'success',
    INACTIVE: 'contrast',
    GRADUATED: 'info',
    SUSPENDED: 'warn',
    WITHDRAWN: 'danger',
    SUBMITTED: 'info',
    UNDER_REVIEW: 'warn',
    APPROVED: 'success',
    REJECTED: 'danger',
    ENROLLED: 'success',
    PUBLISHED: 'success',
    DRAFT: 'contrast',
    EXPIRED: 'danger',
    PAID: 'success',
    PARTIAL: 'warn',
    UNPAID: 'danger',
    OVERDUE: 'danger',
    PASSED: 'success',
    FAILED: 'danger',
    PRESENT: 'success',
    ABSENT: 'danger',
    LATE: 'warn',
    EXCUSED: 'info',
    UPCOMING: 'info',
    CLOSED: 'contrast'
};

@Component({
    selector: 'app-status-tag',
    standalone: true,
    imports: [CommonModule, TagModule],
    template: `
        <p-tag [value]="displayValueResolved" [severity]="severity" [rounded]="true"></p-tag>
    `
})
export class StatusTag {
    @Input() status = '';
    @Input() customSeverity?: Severity;
    @Input() displayValue?: string;

    get severity(): Severity {
        return this.customSeverity ?? statusSeverity[this.status] ?? 'contrast';
    }

    get displayValueResolved(): string {
        return this.displayValue ?? this.status.charAt(0) + this.status.slice(1).toLowerCase().replace(/_/g, ' ');
    }
}