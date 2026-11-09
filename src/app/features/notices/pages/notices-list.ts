import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { DatePickerModule } from 'primeng/datepicker';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { PageHeader } from '@/app/shared/components/page-header';
import { StatusTag } from '@/app/shared/components/status-tag';
import { EmptyState } from '@/app/shared/components/empty-state';
import { CoreDataService } from '@/app/core/services/core-data.service';
import { NoticeService, CalendarEvent, CalendarEventSource } from '@/app/core/services/notice.service';
import type { Notice } from '@/app/core/models/index';

type NoticeCategory = Notice['category'];
type NoticePriority = Notice['priority'];
type NoticeStatusCode = Notice['status'];
type TagSeverity = 'success' | 'info' | 'warn' | 'danger' | 'contrast';

interface SelectOption<T> {
    label: string;
    value: T;
}

interface CalendarDay {
    date: string;
    dayNumber: number;
    inMonth: boolean;
    isToday: boolean;
    isWeekend: boolean;
    events: CalendarEvent[];
}

@Component({
    selector: 'app-notices-list',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        CardModule,
        ButtonModule,
        InputTextModule,
        TextareaModule,
        SelectModule,
        MultiSelectModule,
        TableModule,
        DialogModule,
        DatePickerModule,
        ToggleSwitchModule,
        Tabs,
        TabList,
        Tab,
        TabPanels,
        TabPanel,
        TagModule,
        ToastModule,
        ConfirmDialogModule,
        TooltipModule,
        PageHeader,
        StatusTag,
        EmptyState
    ],
    providers: [ConfirmationService, MessageService],
    template: `
        <app-page-header title="Notices &amp; Events" subtitle="Publish announcements, track drafts and view exams, deadlines and holidays on the event calendar">
            <p-button label="New Notice" icon="pi pi-plus" (onClick)="openCreate()"></p-button>
        </app-page-header>

        <p-tabs [value]="activeTab()" (valueChange)="onTabChange($event)">
            <p-tablist>
                <p-tab value="notices">Notices</p-tab>
                <p-tab value="calendar">Calendar</p-tab>
            </p-tablist>

            <p-tabpanels>
                <!-- ── Notices ──────────────────────────────────────────────── -->
                <p-tabpanel value="notices">
                    <p-card>
                        <!-- Filters -->
                        <div class="flex flex-col xl:flex-row gap-3 mb-4">
                            <div class="flex-1">
                                <span class="relative block w-full">
                                    <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-muted-color"></i>
                                    <input pInputText type="text" placeholder="Search by title or body..." class="w-full pl-10" [ngModel]="search()" (ngModelChange)="search.set($event)" />
                                </span>
                            </div>
                            <div class="flex gap-2 flex-wrap items-center">
                                <p-select
                                    [ngModel]="categoryFilter()"
                                    (ngModelChange)="categoryFilter.set($event)"
                                    [options]="categoryFilterOptions"
                                    optionLabel="label"
                                    optionValue="value"
                                    placeholder="Category"
                                    styleClass="w-44"
                                    appendTo="body"
                                    [showClear]="true"
                                >
                                </p-select>
                                <p-select
                                    [ngModel]="priorityFilter()"
                                    (ngModelChange)="priorityFilter.set($event)"
                                    [options]="priorityFilterOptions"
                                    optionLabel="label"
                                    optionValue="value"
                                    placeholder="Priority"
                                    styleClass="w-40"
                                    appendTo="body"
                                    [showClear]="true"
                                >
                                </p-select>
                                <p-select
                                    [ngModel]="statusFilter()"
                                    (ngModelChange)="statusFilter.set($event)"
                                    [options]="statusFilterOptions"
                                    optionLabel="label"
                                    optionValue="value"
                                    placeholder="Status"
                                    styleClass="w-40"
                                    appendTo="body"
                                    [showClear]="true"
                                >
                                </p-select>
                            </div>
                        </div>

                        <div class="flex flex-wrap items-center gap-3 mb-3 text-xs text-muted-color">
                            <span>Showing {{ filteredNotices().length }} of {{ totalCount() }} notice(s)</span>
                            <span class="inline-flex items-center gap-1.5">
                                <span class="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                                {{ publishedCount() }} published
                            </span>
                            <span class="inline-flex items-center gap-1.5">
                                <span class="w-2 h-2 rounded-full bg-surface-400 inline-block"></span>
                                {{ draftCount() }} draft
                            </span>
                            @if (hasFilters()) {
                                <a class="text-primary cursor-pointer underline" (click)="clearFilters()">Clear filters</a>
                            }
                        </div>

                        @if (filteredNotices().length === 0) {
                            <app-empty-state
                                icon="pi pi-megaphone"
                                [title]="hasFilters() ? 'No matching notices' : 'No notices yet'"
                                [message]="hasFilters() ? 'Adjust or clear the filters to see more notices.' : 'Publish your first announcement to keep students and staff informed.'"
                                [actionLabel]="hasFilters() ? 'Clear filters' : 'Create Notice'"
                                (action)="onEmptyAction()"
                            ></app-empty-state>
                        } @else {
                            <div class="overflow-x-auto">
                                <p-table
                                    [value]="filteredNotices()"
                                    dataKey="id"
                                    [paginator]="true"
                                    [rows]="rows()"
                                    [rowsPerPageOptions]="rowsPerPageOptions"
                                    (onPage)="onPageChange($event)"
                                    sortMode="single"
                                    [tableStyle]="{ 'min-width': '72rem' }"
                                    styleClass="w-full"
                                    currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
                                    [showCurrentPageReport]="true"
                                >
                                    <ng-template pTemplate="header">
                                        <tr>
                                            <th pSortableColumn="title" style="min-width:260px">Title <p-sortIcon field="title"></p-sortIcon></th>
                                            <th pSortableColumn="category" style="width:130px">Category <p-sortIcon field="category"></p-sortIcon></th>
                                            <th pSortableColumn="priority" style="width:120px">Priority <p-sortIcon field="priority"></p-sortIcon></th>
                                            <th style="width:170px">Audience</th>
                                            <th pSortableColumn="publishDate" style="width:130px">Published <p-sortIcon field="publishDate"></p-sortIcon></th>
                                            <th style="width:130px">Expires</th>
                                            <th pSortableColumn="status" style="width:130px">Status <p-sortIcon field="status"></p-sortIcon></th>
                                            <th style="width:150px">Actions</th>
                                        </tr>
                                    </ng-template>
                                    <ng-template pTemplate="body" let-row>
                                        <tr>
                                            <td>
                                                <div class="font-medium">{{ row.title }}</div>
                                                <div class="text-xs text-muted-color line-clamp-1 max-w-[26rem]">{{ row.body }}</div>
                                                @if (row.isEvent) {
                                                    <span class="inline-flex items-center gap-1 text-xs text-primary mt-0.5">
                                                        <i class="pi pi-calendar text-[10px]"></i>
                                                        Event · {{ row.eventDate }}
                                                    </span>
                                                }
                                            </td>
                                            <td>
                                                <p-tag [value]="categoryLabel(row.category)" [severity]="categorySeverity(row.category)"></p-tag>
                                            </td>
                                            <td>
                                                <p-tag [value]="priorityLabel(row.priority)" [severity]="prioritySeverity(row.priority)"></p-tag>
                                            </td>
                                            <td>
                                                <div class="flex flex-wrap gap-1">
                                                    @for (aud of row.audience; track aud) {
                                                        <span class="text-[11px] px-1.5 py-0.5 rounded bg-surface-100 dark:bg-surface-800 text-muted-color">{{ aud }}</span>
                                                    }
                                                </div>
                                            </td>
                                            <td class="text-sm">{{ row.publishDate ?? '—' }}</td>
                                            <td class="text-sm">{{ row.expiryDate ?? '—' }}</td>
                                            <td>
                                                <app-status-tag [status]="row.status"></app-status-tag>
                                            </td>
                                            <td>
                                                <div class="flex items-center gap-1">
                                                    <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" severity="info" size="small" pTooltip="Edit notice" tooltipPosition="top" (onClick)="openEdit(row)"></p-button>
                                                    @if (row.status === 'PUBLISHED') {
                                                        <p-button
                                                            icon="pi pi-times-circle"
                                                            [rounded]="true"
                                                            [text]="true"
                                                            severity="warn"
                                                            size="small"
                                                            pTooltip="Unpublish (revert to draft)"
                                                            tooltipPosition="top"
                                                            (onClick)="confirmUnpublish(row)"
                                                        ></p-button>
                                                    } @else {
                                                        <p-button icon="pi pi-send" [rounded]="true" [text]="true" severity="success" size="small" pTooltip="Publish notice" tooltipPosition="top" (onClick)="confirmPublish(row)"></p-button>
                                                    }
                                                    <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger" size="small" pTooltip="Delete notice" tooltipPosition="top" (onClick)="confirmDelete(row)"></p-button>
                                                </div>
                                            </td>
                                        </tr>
                                    </ng-template>
                                    <ng-template pTemplate="emptymessage">
                                        <tr>
                                            <td colspan="8" class="text-center py-10 text-muted-color">No notices match the current filters.</td>
                                        </tr>
                                    </ng-template>
                                </p-table>
                            </div>

                            <div class="flex justify-end items-center gap-2 mt-3">
                                <span class="text-xs text-muted-color">Rows per page</span>
                                <p-select [ngModel]="rows()" (ngModelChange)="rows.set($event)" [options]="pageSizeOptions" optionLabel="label" optionValue="value" styleClass="w-24"> </p-select>
                            </div>
                        }
                    </p-card>
                </p-tabpanel>

                <!-- ── Calendar ─────────────────────────────────────────────── -->
                <p-tabpanel value="calendar">
                    <p-card>
                        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                            <div>
                                <h2 class="text-lg font-semibold">{{ calendarLabel() }}</h2>
                                <p class="text-xs text-muted-color mt-0.5">{{ monthEventCount() }} event(s) this month · exams, semester milestones and notices marked as events</p>
                            </div>
                            <div class="flex items-center gap-2">
                                <p-button icon="pi pi-chevron-left" [rounded]="true" [text]="true" severity="secondary" pTooltip="Previous month" tooltipPosition="top" (onClick)="prevMonth()"></p-button>
                                <p-button label="Today" size="small" [outlined]="true" (onClick)="goToToday()"></p-button>
                                <p-button icon="pi pi-chevron-right" [rounded]="true" [text]="true" severity="secondary" pTooltip="Next month" tooltipPosition="top" (onClick)="nextMonth()"></p-button>
                            </div>
                        </div>

                        <div class="flex flex-wrap items-center gap-4 mb-3 text-xs text-muted-color">
                            <span class="inline-flex items-center gap-1.5"> <span class="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block"></span> Exam </span>
                            <span class="inline-flex items-center gap-1.5"> <span class="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block"></span> Semester </span>
                            <span class="inline-flex items-center gap-1.5"> <span class="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block"></span> Notice </span>
                        </div>

                        <div class="overflow-x-auto -mx-1 px-1">
                            <div class="min-w-[46rem]">
                                <!-- Weekday header -->
                                <div class="grid grid-cols-7 gap-1 mb-1">
                                    @for (day of weekDays; track day) {
                                        <div class="text-center text-xs font-medium text-muted-color py-1">{{ day }}</div>
                                    }
                                </div>

                                <!-- Week rows -->
                                @for (week of calendarWeeks(); track $index) {
                                    <div class="grid grid-cols-7 gap-1 mb-1">
                                        @for (cell of week; track cell.date) {
                                            <div class="rounded-md border min-h-[6.5rem] p-1.5 flex flex-col gap-1" [class]="cellClass(cell)">
                                                <div class="flex items-center justify-between">
                                                    <span class="text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full" [class]="cellDateClass(cell)">{{ cell.dayNumber }}</span>
                                                    @if (cell.events.length > 0) {
                                                        <span class="text-[10px] text-muted-color">{{ cell.events.length }}</span>
                                                    }
                                                </div>
                                                <div class="flex flex-col gap-0.5 overflow-hidden">
                                                    @for (ev of cell.events; track ev.id) {
                                                        <button
                                                            type="button"
                                                            class="text-left text-[10px] leading-tight px-1.5 py-0.5 rounded truncate cursor-pointer border-0"
                                                            [class]="chipClass(ev.source)"
                                                            [pTooltip]="ev.title"
                                                            tooltipPosition="top"
                                                            (click)="openEventDetail(ev)"
                                                        >
                                                            <i class="pi pi-circle-fill text-[5px] mr-1 align-middle"></i>{{ ev.title }}
                                                        </button>
                                                    }
                                                </div>
                                            </div>
                                        }
                                    </div>
                                }
                            </div>
                        </div>
                    </p-card>
                </p-tabpanel>
            </p-tabpanels>
        </p-tabs>

        <!-- ── Create / Edit dialog ─────────────────────────────────────── -->
        <p-dialog
            [header]="editingNotice() ? 'Edit Notice' : 'New Notice'"
            [visible]="formDialogVisible()"
            (visibleChange)="formDialogVisible.set($event)"
            [modal]="true"
            [closable]="true"
            [dismissableMask]="true"
            [style]="{ width: '760px', 'max-width': '95vw' }"
            (onHide)="closeFormDialog()"
        >
            <form [formGroup]="form" (ngSubmit)="save()" class="flex flex-col gap-4">
                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-medium">Title *</label>
                    <input pInputText formControlName="title" placeholder="e.g. Fall 2025 Registration Deadline Extended" />
                    @if (form.get('title')?.touched && form.get('title')?.hasError('required')) {
                        <small class="text-red-500">Title is required.</small>
                    }
                </div>

                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-medium">Body *</label>
                    <textarea pTextarea formControlName="body" rows="4" [autoResize]="false" placeholder="Write the notice content..."></textarea>
                    @if (form.get('body')?.touched && form.get('body')?.hasError('required')) {
                        <small class="text-red-500">Body is required.</small>
                    }
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Category *</label>
                        <p-select formControlName="category" [options]="categoryOptions" optionLabel="label" optionValue="value" appendTo="body"></p-select>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Priority *</label>
                        <p-select formControlName="priority" [options]="priorityOptions" optionLabel="label" optionValue="value" appendTo="body"></p-select>
                    </div>
                </div>

                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-medium">Audience</label>
                    <p-multiselect formControlName="audience" [options]="audienceOptions" optionLabel="label" optionValue="value" display="chip" placeholder="Select audience" appendTo="body"> </p-multiselect>
                    <small class="text-muted-color">Who should see this notice (defaults to Student).</small>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Publish Date</label>
                        <p-datepicker formControlName="publishDate" dateFormat="yy-mm-dd" [showIcon]="true" [showClear]="true" placeholder="YYYY-MM-DD (optional)" appendTo="body" styleClass="w-full"></p-datepicker>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Expiry Date</label>
                        <p-datepicker formControlName="expiryDate" dateFormat="yy-mm-dd" [showIcon]="true" [showClear]="true" placeholder="YYYY-MM-DD (optional)" appendTo="body" styleClass="w-full"></p-datepicker>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Status</label>
                        <p-select formControlName="status" [options]="formStatusOptions" optionLabel="label" optionValue="value" appendTo="body"></p-select>
                        <small class="text-muted-color">Draft notices are hidden until published.</small>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Mark as event</label>
                        <div class="flex items-center gap-3 pt-1">
                            <p-toggleswitch formControlName="isEvent" inputId="isEvent"></p-toggleswitch>
                            <label for="isEvent" class="text-sm text-muted-color cursor-pointer">Show this notice on the event calendar</label>
                        </div>
                    </div>
                </div>

                @if (form.get('isEvent')?.value) {
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Event Date *</label>
                        <p-datepicker formControlName="eventDate" dateFormat="yy-mm-dd" [showIcon]="true" [showClear]="true" placeholder="YYYY-MM-DD" appendTo="body" styleClass="w-full sm:w-64"></p-datepicker>
                        @if (hasEventDateError()) {
                            <small class="text-red-500">Event date is required when marked as an event.</small>
                        }
                    </div>
                }

                @if (validationErrors().length > 0) {
                    <div class="rounded border border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                        <div class="font-medium flex items-center gap-2 mb-1">
                            <i class="pi pi-exclamation-triangle"></i>
                            Please resolve the following before saving
                        </div>
                        <ul class="list-disc pl-5 space-y-0.5">
                            @for (error of validationErrors(); track error) {
                                <li>{{ error }}</li>
                            }
                        </ul>
                    </div>
                }

                <div class="flex justify-end gap-2 pt-2">
                    <p-button label="Cancel" severity="secondary" [text]="true" (onClick)="closeFormDialog()"></p-button>
                    <p-button [label]="editingNotice() ? 'Update' : 'Create'" icon="pi pi-save" type="submit"></p-button>
                </div>
            </form>
        </p-dialog>

        <!-- ── Event detail dialog ──────────────────────────────────────── -->
        <p-dialog header="Event detail" [visible]="eventDialogVisible()" (visibleChange)="eventDialogVisible.set($event)" [modal]="true" [dismissableMask]="true" [style]="{ width: '460px', 'max-width': '95vw' }">
            @if (selectedEvent(); as event) {
                <div class="flex flex-col gap-3">
                    <div class="flex items-center gap-2">
                        <p-tag [value]="sourceLabel(event.source)" [severity]="sourceSeverity(event.source)"></p-tag>
                        <span class="text-sm text-muted-color">{{ event.date }}</span>
                    </div>
                    <h3 class="text-base font-semibold">{{ event.title }}</h3>
                    <p class="text-sm text-muted-color">{{ event.detail }}</p>
                </div>
            }
        </p-dialog>

        <p-toast></p-toast>
        <p-confirmDialog></p-confirmDialog>
    `
})
export class NoticesList {
    private readonly core = inject(CoreDataService);
    private readonly notices = inject(NoticeService);
    private readonly fb = inject(FormBuilder);
    private readonly confirm = inject(ConfirmationService);
    private readonly msg = inject(MessageService);

    // ── Static option lists ────────────────────────────────────────────────────
    readonly rowsPerPageOptions: number[] = [10, 25, 50, 100];
    readonly pageSizeOptions: SelectOption<number>[] = [
        { label: '10', value: 10 },
        { label: '25', value: 25 },
        { label: '50', value: 50 },
        { label: '100', value: 100 }
    ];
    readonly weekDays: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    readonly categoryOptions: SelectOption<NoticeCategory>[] = [
        { label: 'Academic', value: 'ACADEMIC' },
        { label: 'Exam', value: 'EXAM' },
        { label: 'Holiday', value: 'HOLIDAY' },
        { label: 'Event', value: 'EVENT' },
        { label: 'General', value: 'GENERAL' }
    ];

    readonly categoryFilterOptions: SelectOption<NoticeCategory | null>[] = [
        { label: 'All Categories', value: null },
        { label: 'Academic', value: 'ACADEMIC' },
        { label: 'Exam', value: 'EXAM' },
        { label: 'Holiday', value: 'HOLIDAY' },
        { label: 'Event', value: 'EVENT' },
        { label: 'General', value: 'GENERAL' }
    ];

    readonly priorityOptions: SelectOption<NoticePriority>[] = [
        { label: 'Low', value: 'LOW' },
        { label: 'Medium', value: 'MEDIUM' },
        { label: 'High', value: 'HIGH' },
        { label: 'Urgent', value: 'URGENT' }
    ];

    readonly priorityFilterOptions: SelectOption<NoticePriority | null>[] = [
        { label: 'All Priorities', value: null },
        { label: 'Low', value: 'LOW' },
        { label: 'Medium', value: 'MEDIUM' },
        { label: 'High', value: 'HIGH' },
        { label: 'Urgent', value: 'URGENT' }
    ];

    readonly formStatusOptions: SelectOption<'DRAFT' | 'PUBLISHED'>[] = [
        { label: 'Draft', value: 'DRAFT' },
        { label: 'Published', value: 'PUBLISHED' }
    ];

    readonly statusFilterOptions: SelectOption<NoticeStatusCode | null>[] = [
        { label: 'All Statuses', value: null },
        { label: 'Draft', value: 'DRAFT' },
        { label: 'Published', value: 'PUBLISHED' },
        { label: 'Expired', value: 'EXPIRED' }
    ];

    readonly audienceOptions: SelectOption<string>[] = [
        { label: 'Student', value: 'STUDENT' },
        { label: 'Faculty', value: 'FACULTY' },
        { label: 'Staff', value: 'STAFF' },
        { label: 'All', value: 'ALL' }
    ];

    // ── Tabs / filters / paging ────────────────────────────────────────────────
    readonly activeTab = signal<string | number>('notices');

    readonly search = signal('');
    readonly categoryFilter = signal<NoticeCategory | null>(null);
    readonly priorityFilter = signal<NoticePriority | null>(null);
    readonly statusFilter = signal<NoticeStatusCode | null>(null);
    readonly rows = signal(10);

    readonly notices$ = computed<Notice[]>(() => this.notices.list());
    readonly totalCount = computed(() => this.notices$().length);
    readonly publishedCount = computed(() => this.notices$().filter((n) => n.status === 'PUBLISHED').length);
    readonly draftCount = computed(() => this.notices$().filter((n) => n.status === 'DRAFT').length);

    readonly filteredNotices = computed<Notice[]>(() => {
        const q = this.search().trim().toLowerCase();
        const category = this.categoryFilter();
        const priority = this.priorityFilter();
        const status = this.statusFilter();
        let list = this.notices$();

        if (category) {
            list = list.filter((n) => n.category === category);
        }
        if (priority) {
            list = list.filter((n) => n.priority === priority);
        }
        if (status) {
            list = list.filter((n) => n.status === status);
        }
        if (q) {
            list = list.filter((n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q));
        }

        // Default ordering: most recently published first (nulls last).
        return [...list].sort((a, b) => (b.publishDate ?? '').localeCompare(a.publishDate ?? ''));
    });

    readonly hasFilters = computed(() => !!this.search().trim() || !!this.categoryFilter() || !!this.priorityFilter() || !!this.statusFilter());

    // ── Form ───────────────────────────────────────────────────────────────────
    readonly formDialogVisible = signal(false);
    readonly editingNotice = signal<Notice | null>(null);

    /** Bumped on every form change so the validation computed re-evaluates. */
    private readonly formTick = signal(0);

    readonly form = this.fb.group({
        title: ['', Validators.required],
        body: ['', Validators.required],
        category: ['GENERAL' as NoticeCategory, Validators.required],
        priority: ['MEDIUM' as NoticePriority, Validators.required],
        audience: [['STUDENT'] as string[], Validators.required],
        publishDate: [null as Date | null],
        expiryDate: [null as Date | null],
        status: ['DRAFT' as 'DRAFT' | 'PUBLISHED', Validators.required],
        isEvent: [false],
        eventDate: [null as Date | null]
    });

    readonly validationErrors = computed<string[]>(() => {
        this.formTick();
        const raw = this.form.getRawValue();
        const errors: string[] = [];
        const publishDate = raw.publishDate ? this.toIso(raw.publishDate) : null;
        const expiryDate = raw.expiryDate ? this.toIso(raw.expiryDate) : null;

        if (publishDate && expiryDate && expiryDate <= publishDate) {
            errors.push('Expiry date must be after the publish date.');
        }
        if (raw.isEvent && !raw.eventDate) {
            errors.push('Event date is required when the notice is marked as an event.');
        }
        return errors;
    });

    readonly hasExpiryError = computed(() => this.validationErrors().some((e) => e.includes('Expiry')));
    readonly hasEventDateError = computed(() => this.validationErrors().some((e) => e.includes('Event date')));

    constructor() {
        this.form.valueChanges.subscribe(() => this.formTick.update((v) => v + 1));
    }

    // ── Calendar state ─────────────────────────────────────────────────────────
    private readonly todayIso = this.toIso(new Date());
    readonly calendarMonth = signal<Date>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    readonly eventDialogVisible = signal(false);
    readonly selectedEvent = signal<CalendarEvent | null>(null);

    private readonly eventsByDate = computed<Map<string, CalendarEvent[]>>(() => {
        const map = new Map<string, CalendarEvent[]>();
        for (const event of this.notices.getCalendarEvents()) {
            const bucket = map.get(event.date);
            if (bucket) {
                bucket.push(event);
            } else {
                map.set(event.date, [event]);
            }
        }
        return map;
    });

    readonly calendarLabel = computed(() => this.calendarMonth().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));

    readonly calendarWeeks = computed<CalendarDay[][]>(() => {
        const month = this.calendarMonth();
        const year = month.getFullYear();
        const monthIndex = month.getMonth();
        const firstOfMonth = new Date(year, monthIndex, 1);
        const gridStart = new Date(year, monthIndex, 1 - firstOfMonth.getDay());
        const byDate = this.eventsByDate();

        const weeks: CalendarDay[][] = [];
        for (let w = 0; w < 6; w++) {
            const week: CalendarDay[] = [];
            for (let d = 0; d < 7; d++) {
                const cellDate = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + w * 7 + d);
                const iso = this.toIso(cellDate);
                week.push({
                    date: iso,
                    dayNumber: cellDate.getDate(),
                    inMonth: cellDate.getMonth() === monthIndex,
                    isToday: iso === this.todayIso,
                    isWeekend: cellDate.getDay() === 0 || cellDate.getDay() === 6,
                    events: byDate.get(iso) ?? []
                });
            }
            weeks.push(week);
        }

        // Drop trailing weeks that have no in-month day.
        while (weeks.length > 1 && weeks[weeks.length - 1].every((cell) => !cell.inMonth)) {
            weeks.pop();
        }
        return weeks;
    });

    readonly monthEventCount = computed(() =>
        this.calendarWeeks()
            .flat()
            .filter((cell) => cell.inMonth)
            .reduce((count, cell) => count + cell.events.length, 0)
    );

    // ── Tab / filter handlers ──────────────────────────────────────────────────
    onTabChange(value: string | number | undefined): void {
        this.activeTab.set(value ?? 'notices');
    }

    onPageChange(event: { rows: number }): void {
        if (event.rows !== this.rows()) {
            this.rows.set(event.rows);
        }
    }

    clearFilters(): void {
        this.search.set('');
        this.categoryFilter.set(null);
        this.priorityFilter.set(null);
        this.statusFilter.set(null);
    }

    onEmptyAction(): void {
        if (this.hasFilters()) {
            this.clearFilters();
        } else {
            this.openCreate();
        }
    }

    // ── Display helpers ────────────────────────────────────────────────────────
    categoryLabel(category: NoticeCategory): string {
        return this.categoryOptions.find((o) => o.value === category)?.label ?? category;
    }

    categorySeverity(category: NoticeCategory): TagSeverity {
        switch (category) {
            case 'EXAM':
                return 'danger';
            case 'ACADEMIC':
                return 'info';
            case 'EVENT':
                return 'success';
            case 'HOLIDAY':
                return 'warn';
            default:
                return 'contrast';
        }
    }

    priorityLabel(priority: NoticePriority): string {
        return this.priorityOptions.find((o) => o.value === priority)?.label ?? priority;
    }

    prioritySeverity(priority: NoticePriority): TagSeverity {
        switch (priority) {
            case 'URGENT':
                return 'danger';
            case 'HIGH':
                return 'warn';
            case 'MEDIUM':
                return 'info';
            default:
                return 'contrast';
        }
    }

    sourceLabel(source: CalendarEventSource): string {
        switch (source) {
            case 'EXAM':
                return 'Exam';
            case 'SEMESTER':
                return 'Semester';
            default:
                return 'Notice';
        }
    }

    sourceSeverity(source: CalendarEventSource): TagSeverity {
        switch (source) {
            case 'EXAM':
                return 'info';
            case 'SEMESTER':
                return 'success';
            default:
                return 'warn';
        }
    }

    chipClass(source: CalendarEventSource): string {
        switch (source) {
            case 'EXAM':
                return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300';
            case 'SEMESTER':
                return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
            default:
                return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300';
        }
    }

    cellClass(cell: CalendarDay): string {
        const base = cell.inMonth ? 'bg-surface-0 dark:bg-surface-900 border-surface-200 dark:border-surface-700' : 'bg-surface-50 dark:bg-surface-950 border-surface-100 dark:border-surface-800 opacity-60';
        const today = cell.isToday ? ' ring-2 ring-primary' : '';
        return `${base}${today}`;
    }

    cellDateClass(cell: CalendarDay): string {
        if (cell.isToday) {
            return 'bg-primary text-primary-contrast';
        }
        if (!cell.inMonth) {
            return 'text-muted-color';
        }
        if (cell.isWeekend) {
            return 'text-amber-600 dark:text-amber-400';
        }
        return '';
    }

    // ── Calendar navigation ────────────────────────────────────────────────────
    prevMonth(): void {
        const month = this.calendarMonth();
        this.calendarMonth.set(new Date(month.getFullYear(), month.getMonth() - 1, 1));
    }

    nextMonth(): void {
        const month = this.calendarMonth();
        this.calendarMonth.set(new Date(month.getFullYear(), month.getMonth() + 1, 1));
    }

    goToToday(): void {
        const now = new Date();
        this.calendarMonth.set(new Date(now.getFullYear(), now.getMonth(), 1));
    }

    openEventDetail(event: CalendarEvent): void {
        this.selectedEvent.set(event);
        this.eventDialogVisible.set(true);
    }

    // ── Create / edit ──────────────────────────────────────────────────────────
    openCreate(): void {
        this.editingNotice.set(null);
        this.form.reset({
            title: '',
            body: '',
            category: 'GENERAL',
            priority: 'MEDIUM',
            audience: ['STUDENT'],
            publishDate: null,
            expiryDate: null,
            status: 'DRAFT',
            isEvent: false,
            eventDate: null
        });
        this.formTick.update((v) => v + 1);
        this.formDialogVisible.set(true);
    }

    openEdit(row: Notice): void {
        this.editingNotice.set(row);
        this.form.reset({
            title: row.title,
            body: row.body,
            category: row.category,
            priority: row.priority,
            audience: row.audience.length > 0 ? [...row.audience] : ['STUDENT'],
            publishDate: this.toDate(row.publishDate),
            expiryDate: this.toDate(row.expiryDate),
            status: row.status === 'EXPIRED' ? 'PUBLISHED' : row.status,
            isEvent: row.isEvent,
            eventDate: this.toDate(row.eventDate)
        });
        this.formTick.update((v) => v + 1);
        this.formDialogVisible.set(true);
    }

    closeFormDialog(): void {
        this.formDialogVisible.set(false);
        this.editingNotice.set(null);
    }

    save(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.msg.add({ severity: 'warn', summary: 'Validation', detail: 'Please fix the highlighted errors.' });
            return;
        }

        const errors = this.validationErrors();
        if (errors.length > 0) {
            this.msg.add({ severity: 'error', summary: 'Cannot save notice', detail: errors[0] });
            return;
        }

        const raw = this.form.getRawValue();
        const payload = {
            title: (raw.title ?? '').trim(),
            body: (raw.body ?? '').trim(),
            category: raw.category ?? 'GENERAL',
            priority: raw.priority ?? 'MEDIUM',
            audience: raw.audience && raw.audience.length > 0 ? raw.audience : ['STUDENT'],
            publishDate: raw.publishDate ? this.toIso(raw.publishDate) : null,
            expiryDate: raw.expiryDate ? this.toIso(raw.expiryDate) : null,
            status: raw.status ?? 'DRAFT',
            isEvent: !!raw.isEvent,
            eventDate: raw.isEvent && raw.eventDate ? this.toIso(raw.eventDate) : null
        };

        try {
            const editing = this.editingNotice();
            if (editing) {
                this.notices.update({ ...editing, ...payload, updatedAt: new Date().toISOString() });
                this.msg.add({ severity: 'success', summary: 'Updated', detail: `Notice "${payload.title}" updated.` });
            } else {
                this.notices.create({ ...payload, createdAt: new Date().toISOString() });
                this.msg.add({ severity: 'success', summary: 'Created', detail: `Notice "${payload.title}" created.` });
            }
            this.closeFormDialog();
        } catch (error) {
            const detail = error instanceof Error ? error.message : 'Unable to save this notice.';
            this.msg.add({ severity: 'error', summary: 'Save failed', detail });
        }
    }

    // ── Publish / unpublish / delete ───────────────────────────────────────────
    confirmPublish(row: Notice): void {
        this.confirm.confirm({
            message: `Publish "${row.title}"? It becomes visible to ${row.audience.join(', ') || 'all'} audiences.`,
            header: 'Publish Notice',
            icon: 'pi pi-send',
            acceptLabel: 'Publish',
            rejectLabel: 'Cancel',
            acceptButtonStyleClass: 'p-button-success',
            accept: () => {
                try {
                    this.notices.publish(row.id);
                    this.msg.add({ severity: 'success', summary: 'Published', detail: `"${row.title}" is now published.` });
                } catch (error) {
                    const detail = error instanceof Error ? error.message : 'Unable to publish this notice.';
                    this.msg.add({ severity: 'error', summary: 'Publish failed', detail });
                }
            }
        });
    }

    confirmUnpublish(row: Notice): void {
        this.confirm.confirm({
            message: `Revert "${row.title}" to draft? It will no longer be visible to its audience.`,
            header: 'Unpublish Notice',
            icon: 'pi pi-times-circle',
            acceptLabel: 'Unpublish',
            rejectLabel: 'Cancel',
            acceptButtonStyleClass: 'p-button-warn',
            accept: () => {
                try {
                    this.notices.unpublish(row.id);
                    this.msg.add({ severity: 'success', summary: 'Unpublished', detail: `"${row.title}" reverted to draft.` });
                } catch (error) {
                    const detail = error instanceof Error ? error.message : 'Unable to unpublish this notice.';
                    this.msg.add({ severity: 'error', summary: 'Unpublish failed', detail });
                }
            }
        });
    }

    confirmDelete(row: Notice): void {
        this.confirm.confirm({
            message: `Delete notice "${row.title}"? This action cannot be undone.`,
            header: 'Delete Notice',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Delete',
            rejectLabel: 'Cancel',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                try {
                    this.notices.remove(row.id);
                    this.msg.add({ severity: 'success', summary: 'Deleted', detail: `Notice "${row.title}" removed.` });
                } catch (error) {
                    const detail = error instanceof Error ? error.message : 'Unable to delete this notice.';
                    this.msg.add({ severity: 'error', summary: 'Delete failed', detail });
                }
            }
        });
    }

    // ── Date helpers (local parts, never toISOString) ──────────────────────────
    private toIso(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    private toDate(iso: string | null): Date | null {
        if (!iso) {
            return null;
        }
        const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
        if (match) {
            return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
        }
        const parsed = new Date(iso);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
}
