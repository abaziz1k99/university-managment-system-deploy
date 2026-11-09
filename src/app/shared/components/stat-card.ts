import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { ChipModule } from 'primeng/chip';

type Severity = 'success' | 'info' | 'warning' | 'danger' | 'contrast';

@Component({
    selector: 'app-stat-card',
    standalone: true,
    imports: [CommonModule, TagModule, ChipModule],
    template: `
        <div class="h-full flex flex-col bg-surface-0 dark:bg-surface-900 p-4 rounded-xl border border-surface-200 dark:border-surface-700 min-h-[132px]">
            <div class="flex items-start justify-between gap-3 h-full">
                <div class="flex flex-col flex-1 min-w-0">
                    <p class="text-sm font-medium text-muted-color leading-none">{{ label }}</p>
                    <p class="text-2xl font-bold text-surface-900 dark:text-surface-0 mt-2 leading-none">{{ value }}</p>
                    <p class="text-sm mt-2 leading-none min-h-[1.25rem]" [class.invisible]="delta === undefined" [ngClass]="delta !== undefined && delta >= 0 ? 'text-green-600' : 'text-red-600'">
                        @if (delta !== undefined) {
                            <i class="pi" [ngClass]="delta >= 0 ? 'pi-arrow-up' : 'pi-arrow-down'"></i>
                            {{ delta >= 0 ? '+' : '' }}{{ delta }}%
                        } @else {
                            &nbsp;
                        }
                    </p>
                    <p class="text-sm text-muted-color mt-1 leading-tight min-h-[1rem] line-clamp-1">{{ context ?? '\u00A0' }}</p>
                </div>
                @if (icon) {
                    <div class="w-12 h-12 rounded-lg flex items-center justify-center shrink-0" [ngClass]="iconBgClass">
                        <i class="pi pi-fw text-xl" [ngClass]="iconTextClass" [class]="icon"></i>
                    </div>
                }
            </div>
        </div>
    `
})
export class StatCard {
    @Input() label = '';
    @Input() value: unknown = '';
    @Input() delta?: number;
    @Input() context?: string;
    @Input() icon?: string;
    @Input() iconBg: 'primary' | 'green' | 'orange' | 'red' = 'primary';

    get iconBgClass(): string {
        const classes: Record<string, string> = {
            primary: 'bg-primary-100 dark:bg-primary-900',
            green: 'bg-green-100 dark:bg-green-900',
            orange: 'bg-orange-100 dark:bg-orange-900',
            red: 'bg-red-100 dark:bg-red-900'
        };
        return classes[this.iconBg] ?? classes['primary'];
    }

    get iconTextClass(): string {
        const classes: Record<string, string> = {
            primary: 'text-primary-500',
            green: 'text-green-500',
            orange: 'text-orange-500',
            red: 'text-red-500'
        };
        return classes[this.iconBg] ?? classes['primary'];
    }
}
