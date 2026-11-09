import { Component } from '@angular/core';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';

@Component({
    selector: 'app-dashboard-list',
    standalone: true,
    imports: [CardModule, ButtonModule],
    template: `
        <div class="p-4">
            <div class="mb-4">
                <h1 class="text-2xl font-semibold text-surface-900 dark:text-surface-0">Dashboard</h1>
                <p class="text-muted-color mt-1">Manage dashboard - coming soon</p>
            </div>
            <p-card header="Placeholder" styleClass="w-full">
                <p>This page is under construction.</p>
            </p-card>
        </div>
    `
})
export class DashboardList {}
