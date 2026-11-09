import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

@Component({
    selector: 'app-empty-state',
    standalone: true,
    imports: [CommonModule, ButtonModule],
    template: `
        <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
            @if (icon) {
                <i class="pi text-5xl text-muted-color mb-4" [class]="icon"></i>
            }
            <h3 class="text-lg font-medium text-surface-900 dark:text-surface-0 mb-2">{{ title }}</h3>
            <p class="text-muted-color mb-4">{{ message }}</p>
            @if (actionLabel && action) {
                <p-button [label]="actionLabel" (onClick)="action.emit()" styleClass="w-auto"></p-button>
            }
        </div>
    `
})
export class EmptyState {
    @Input() title = 'No data found';
    @Input() message = 'Get started by adding your first record.';
    @Input() icon = 'pi pi-inbox';
    @Input() actionLabel = '';
    @Output() action = new EventEmitter<void>();
}