import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ButtonModule } from 'primeng/button';

@Component({
    selector: 'app-page-header',
    standalone: true,
    imports: [ButtonModule],
    template: `
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
                <h1 class="text-2xl font-semibold text-surface-900 dark:text-surface-0">{{ title }}</h1>
                @if (subtitle) {
                    <p class="text-muted-color mt-1 text-sm">{{ subtitle }}</p>
                }
            </div>
            <div class="flex items-center gap-2">
                <ng-content></ng-content>
            </div>
        </div>
    `
})
export class PageHeader {
    @Input() title = '';
    @Input() subtitle = '';
    @Output() action = new EventEmitter<void>();
}