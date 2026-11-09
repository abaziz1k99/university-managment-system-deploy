import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { PaginatorModule } from 'primeng/paginator';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TooltipModule } from 'primeng/tooltip';
import { EmptyState } from './empty-state';

export interface Column<T> {
    field: string;
    header: string;
    sortable?: boolean;
    filter?: boolean;
    styleClass?: string;
    body?: (row: T) => string;
    width?: string;
}

export interface Action<T> {
    label: string;
    icon: string;
    severity?: 'success' | 'info' | 'warning' | 'danger' | 'contrast' | 'secondary';
    handler: (row: T) => void;
    visible?: (row: T) => boolean;
    tooltip?: string;
}

@Component({
    selector: 'app-data-table',
    standalone: true,
    imports: [CommonModule, TableModule, PaginatorModule, ButtonModule, InputTextModule, TagModule, ProgressSpinnerModule, TooltipModule, EmptyState],
    template: `
        <div class="card">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div class="flex items-center gap-2">
                    <ng-content select="[slot=header]"></ng-content>
                </div>
                <div class="flex items-center gap-2">
                    @if (globalSearch) {
                        <div class="relative">
                            <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-muted-color"></i>
                            <input pInputText type="text" placeholder="Search..." class="w-64 pl-10 pr-4 py-2 border border-surface-300 dark:border-surface-600 rounded-lg bg-surface-0 dark:bg-surface-900" (input)="onGlobalFilter($event)">
                        </div>
                    }
                </div>
            </div>

            <p-table
                [value]="data"
                [columns]="columns"
                [loading]="loading"
                [paginator]="paginator"
                [rows]="rows"
                [rowsPerPageOptions]="[10, 25, 50, 100]"
                [showCurrentPageReport]="true"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
                [sortMode]="'single'"
                dataKey="id"
                styleClass="w-full">
                <ng-template pTemplate="caption">
                    <div class="flex flex-col sm:flex-row gap-2 mb-4">
                        <ng-content select="[slot=caption]"></ng-content>
                    </div>
                </ng-template>
                <ng-template pTemplate="header" let-columns>
                    <tr>
                        @for (col of columns; track col.field) {
                            <th [pSortableColumn]="col.sortable ? col.field : null" [style.width]="col.width" [ngClass]="col.styleClass">
                                {{ col.header }}
                                @if (col.sortable) {
                                    <p-sortIcon [field]="col.field"></p-sortIcon>
                                }
                            </th>
                        }
                        @if (actions.length > 0) {
                            <th style="width: 120px">Actions</th>
                        }
                    </tr>
                </ng-template>
                <ng-template pTemplate="body" let-rowData let-columns="columns">
                    <tr>
                        @for (col of columns; track col.field) {
                            <td [ngClass]="col.styleClass">
                                @if (col.body) {
                                    {{ col.body(rowData) }}
                                } @else {
                                    {{ rowData[col.field] }}
                                }
                            </td>
                        }
                        @if (actions.length > 0) {
                            <td>
                                <div class="flex items-center gap-1">
                                    @for (action of actions; track action.label) {
                                        @if (!action.visible || action.visible(rowData)) {
                                            <p-button
                                                [icon]="action.icon"
                                                [severity]="$any(mapSeverity(action.severity) ?? 'secondary')"
                                                [rounded]="true"
                                                [text]="true"
                                                size="small"
                                                (click)="action.handler(rowData)"
                                                [pTooltip]="action.tooltip ?? action.label"
                                                tooltipPosition="top">
                                            </p-button>
                                        }
                                    }
                                </div>
                            </td>
                        }
                    </tr>
                </ng-template>
                <ng-template pTemplate="emptymessage">
                    <tr>
                        <td [attr.colspan]="columns.length + (actions.length > 0 ? 1 : 0)" class="text-center py-8">
                            <app-empty-state [title]="'No data'" [message]="'No records match your criteria'" [icon]="'pi pi-database'"></app-empty-state>
                        </td>
                    </tr>
                </ng-template>
                <ng-template pTemplate="loadingbody">
                    <tr>
                        <td [attr.colspan]="columns.length + (actions.length > 0 ? 1 : 0)" class="text-center py-8">
                            <p-progressSpinner></p-progressSpinner>
                        </td>
                    </tr>
                </ng-template>
            </p-table>
        </div>
    `
})
export class DataTable<T = any> {
    @Input() data: T[] = [];
    @Input() columns: Column<T>[] = [];
    @Input() actions: Action<T>[] = [];
    @Input() loading = false;
    @Input() paginator = true;
    @Input() rows = 10;
    @Input() globalSearch = true;
    @Output() rowClick = new EventEmitter<T>();

    mapSeverity(s: Action<T>['severity']): 'success' | 'info' | 'warning' | 'danger' | 'contrast' | 'secondary' | undefined {
        if (s === 'secondary') return 'info' as unknown as 'secondary';
        return s as unknown as 'success' | 'info' | 'warning' | 'danger' | 'contrast' | 'secondary' | undefined;
    }

    onGlobalFilter(event: Event): void {
        const input = event.target as HTMLInputElement;
        (event.target as unknown as { table?: { filterGlobal(v: string, m: string): void } }).table?.filterGlobal(input.value, 'contains');
    }
}
