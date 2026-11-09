import { Component, Input, ContentChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FluidModule } from 'primeng/fluid';

@Component({
    selector: 'app-form-field',
    standalone: true,
    imports: [CommonModule, FluidModule],
    template: `
        <div class="w-full" [class.p-fluid]="fluid">
            <label *ngIf="label" class="block text-sm font-medium text-surface-900 dark:text-surface-0 mb-1.5" [for]="forId">{{ label }}</label>
            <ng-content></ng-content>
            @if (error) {
                <p class="text-red-500 text-sm mt-1" role="alert">{{ error }}</p>
            }
            @if (hint) {
                <p class="text-muted-color text-sm mt-1">{{ hint }}</p>
            }
        </div>
    `
})
export class FormField {
    @Input() label = '';
    @Input() forId = '';
    @Input() error?: string;
    @Input() hint?: string;
    @Input() fluid = true;
}