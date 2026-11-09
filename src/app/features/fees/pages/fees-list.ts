import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { PageHeader } from '@/app/shared/components/page-header';
import { StatCard } from '@/app/shared/components/stat-card';
import { StatusTag } from '@/app/shared/components/status-tag';
import { FormField } from '@/app/shared/components/form-field';
import { EmptyState } from '@/app/shared/components/empty-state';
import { FeeService } from '@/app/core/services/fee.service';
import { CoreDataService } from '@/app/core/services/core-data.service';
import { FeeAccount, FeeCharge, Payment, Program, Semester, Student } from '@/app/core/models/index';
import { downloadCsv, formatDate as formatDateUtil } from '@/app/core/utils/util';

interface Option {
    label: string;
    value: string;
}

/** A fee account joined with its student + semester for table display. */
interface AccountRow {
    id: string;
    account: FeeAccount;
    student: Student | null;
    name: string;
    admissionNo: string;
    email: string;
    semesterName: string;
}

/** Charges of one {@link FeeCharge.type}, grouped for the detail breakdown. */
interface ChargeGroup {
    type: FeeCharge['type'];
    label: string;
    charges: FeeCharge[];
    subtotal: number;
}

@Component({
    selector: 'app-fees-list',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        CardModule,
        ButtonModule,
        InputTextModule,
        InputNumberModule,
        SelectModule,
        TextareaModule,
        DatePickerModule,
        TableModule,
        DialogModule,
        ToastModule,
        ConfirmDialogModule,
        TooltipModule,
        MessageModule,
        TagModule,
        Tabs,
        TabList,
        Tab,
        TabPanels,
        TabPanel,
        PageHeader,
        StatCard,
        StatusTag,
        FormField,
        EmptyState
    ],
    providers: [ConfirmationService, MessageService],
    styles: [
        `
            /* ---- Screen previews ------------------------------------------ */
            .print-area {
                border: 1px solid var(--p-surface-200);
                border-radius: 0.75rem;
            }

            /* ---- Print: only the receipt / invoice block prints ----------- */
            @media print {
                .no-print {
                    display: none !important;
                }

                /* Neutralise the dialog overlay so the preview flows on paper. */
                :host ::ng-deep .p-dialog-mask {
                    position: static !important;
                    display: block !important;
                    inset: auto !important;
                    background: transparent !important;
                    padding: 0 !important;
                }

                :host ::ng-deep .p-dialog {
                    position: static !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    margin: 0 !important;
                    border: 0 !important;
                    border-radius: 0 !important;
                    box-shadow: none !important;
                }

                :host ::ng-deep .p-dialog-header,
                :host ::ng-deep .p-dialog-footer {
                    display: none !important;
                }

                :host ::ng-deep .p-dialog-content {
                    padding: 0 !important;
                    overflow: visible !important;
                }

                .print-area {
                    border: 0 !important;
                    border-radius: 0 !important;
                    box-shadow: none !important;
                    padding: 0 !important;
                    margin: 0 !important;
                }

                .print-area table {
                    width: 100% !important;
                    border-collapse: collapse !important;
                }

                .print-area th,
                .print-area td {
                    border: 1px solid #9ca3af !important;
                    padding: 3px 6px !important;
                    font-size: 10.5pt !important;
                }

                .print-area thead {
                    display: table-header-group;
                }

                .print-area tr {
                    page-break-inside: avoid;
                }
            }
        `
    ],
    template: `
        <app-page-header class="no-print" title="Fees & Payments" subtitle="Track student fee accounts, record payments and generate collection reports">
            <p-button label="Print" icon="pi pi-print" severity="secondary" [outlined]="true" (onClick)="printPage()" pTooltip="Print the current view" tooltipPosition="bottom" />
        </app-page-header>

        <!-- Explicit simulated-transaction notice -->
        <p-message severity="warn" styleClass="no-print w-full mb-6">
            <span class="font-medium">Simulated transactions — no real money is processed.</span>
        </p-message>

        <div [class.no-print]="dialogOpen()">
            <!-- ── Overview ─────────────────────────────────────────────── -->
            <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
                <app-stat-card label="Total collected" [value]="formatCurrency(overview().totalCollected)" [context]="collectedContext()" icon="pi pi-wallet" iconBg="green" />
                <app-stat-card label="Total outstanding" [value]="formatCurrency(overview().totalOutstanding)" [context]="outstandingContext()" icon="pi pi-exclamation-circle" iconBg="orange" />
                <app-stat-card label="Collection rate" [value]="collectionRateLabel()" context="collected / billed" icon="pi pi-percentage" iconBg="primary" />
                <app-stat-card label="Fee accounts" [value]="rows().length" [context]="accountsContext()" icon="pi pi-users" iconBg="primary" />
            </div>

            <p-card styleClass="mb-6">
                <div class="flex items-center justify-between gap-2 mb-3">
                    <div>
                        <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-0">Recent payments</h2>
                        <p class="text-muted-color text-sm">Latest {{ recentPayments().length }} payment(s) recorded across all accounts.</p>
                    </div>
                </div>
                @if (recentPayments().length === 0) {
                    <app-empty-state icon="pi pi-receipt" title="No payments recorded" message="Record a payment from the Accounts tab to see it appear here." />
                } @else {
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead>
                                <tr class="border-b border-surface-200 dark:border-surface-700 text-left">
                                    <th class="py-2 pr-3 font-medium text-muted-color">Date</th>
                                    <th class="py-2 pr-3 font-medium text-muted-color">Student</th>
                                    <th class="py-2 pr-3 font-medium text-muted-color">Receipt</th>
                                    <th class="py-2 pr-3 font-medium text-muted-color">Method</th>
                                    <th class="py-2 pr-3 text-right font-medium text-muted-color">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                @for (payment of recentPayments(); track payment.id) {
                                    <tr class="border-b border-surface-100 dark:border-surface-800">
                                        <td class="py-2 pr-3 whitespace-nowrap">{{ formatDate(payment.date) }}</td>
                                        <td class="py-2 pr-3">{{ studentName(payment.studentId) }}</td>
                                        <td class="py-2 pr-3 whitespace-nowrap font-mono text-xs">{{ payment.receiptNo }}</td>
                                        <td class="py-2 pr-3"><p-tag [value]="methodLabel(payment.method)" severity="secondary" [rounded]="true" /></td>
                                        <td class="py-2 pr-3 text-right font-medium whitespace-nowrap">{{ formatCurrency(payment.amount) }}</td>
                                    </tr>
                                }
                            </tbody>
                        </table>
                    </div>
                }
            </p-card>

            <!-- ── Tabs ─────────────────────────────────────────────────── -->
            <p-tabs [value]="activeTab()" (valueChange)="onTabChange($event)">
                <p-tablist class="no-print">
                    <p-tab value="accounts">Accounts</p-tab>
                    <p-tab value="report">Collection Report</p-tab>
                </p-tablist>

                <p-tabpanels>
                    <!-- Accounts -->
                    <p-tabpanel value="accounts">
                        <p-card>
                            <div class="no-print flex flex-col lg:flex-row gap-3 mb-4">
                                <div class="flex-1">
                                    <input
                                        pInputText
                                        type="text"
                                        placeholder="Search by admission no, name, or email"
                                        class="w-full"
                                        [ngModel]="search()"
                                        (ngModelChange)="search.set($event)" />
                                </div>
                                <div class="flex flex-wrap gap-2 items-center">
                                    <p-select
                                        [ngModel]="semesterFilter()"
                                        (ngModelChange)="semesterFilter.set($event)"
                                        [options]="semesterOptions()"
                                        optionLabel="label"
                                        optionValue="value"
                                        placeholder="Semester"
                                        styleClass="w-52"
                                        [showClear]="true"
                                        appendTo="body" />
                                    <p-select
                                        [ngModel]="statusFilter()"
                                        (ngModelChange)="statusFilter.set($event)"
                                        [options]="statusOptions"
                                        optionLabel="label"
                                        optionValue="value"
                                        placeholder="Status"
                                        styleClass="w-44"
                                        [showClear]="true"
                                        appendTo="body" />
                                    <p-button label="Clear" icon="pi pi-filter-slash" severity="secondary" [outlined]="true" (onClick)="clearFilters()" />
                                </div>
                            </div>

                            <p-table
                                [value]="filtered()"
                                dataKey="id"
                                [paginator]="true"
                                [rows]="10"
                                [rowsPerPageOptions]="rowsPerPageOptions"
                                [showCurrentPageReport]="true"
                                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} accounts"
                                [sortField]="'name'"
                                [sortOrder]="1"
                                styleClass="p-datatable-sm"
                                [tableStyle]="{ 'min-width': '68rem' }">
                                <ng-template pTemplate="header">
                                    <tr>
                                        <th pSortableColumn="name">Student <p-sortIcon field="name" /></th>
                                        <th pSortableColumn="semesterName">Semester <p-sortIcon field="semesterName" /></th>
                                        <th class="text-right" pSortableColumn="account.totalBilled">Total billed <p-sortIcon field="account.totalBilled" /></th>
                                        <th class="text-right" pSortableColumn="account.totalPaid">Total paid <p-sortIcon field="account.totalPaid" /></th>
                                        <th class="text-right" pSortableColumn="account.balance">Balance <p-sortIcon field="account.balance" /></th>
                                        <th pSortableColumn="account.status">Status <p-sortIcon field="account.status" /></th>
                                        <th style="width: 9rem" class="no-print">Actions</th>
                                    </tr>
                                </ng-template>
                                <ng-template pTemplate="body" let-row>
                                    <tr>
                                        <td>
                                            <div class="flex flex-col">
                                                <span class="font-medium">{{ row.name }}</span>
                                                <span class="text-muted-color text-xs">{{ row.admissionNo }}<span class="hidden sm:inline"> · {{ row.email }}</span></span>
                                            </div>
                                        </td>
                                        <td>{{ row.semesterName }}</td>
                                        <td class="text-right whitespace-nowrap">{{ formatCurrency(row.account.totalBilled) }}</td>
                                        <td class="text-right whitespace-nowrap">{{ formatCurrency(row.account.totalPaid) }}</td>
                                        <td class="text-right whitespace-nowrap font-medium">{{ formatCurrency(row.account.balance) }}</td>
                                        <td><app-status-tag [status]="row.account.status" /></td>
                                        <td class="no-print">
                                            <div class="flex items-center gap-1">
                                                <p-button icon="pi pi-eye" severity="info" [rounded]="true" [text]="true" size="small" (onClick)="openDetail(row)" pTooltip="View account" tooltipPosition="top" />
                                                <p-button
                                                    icon="pi pi-plus"
                                                    severity="success"
                                                    [rounded]="true"
                                                    [text]="true"
                                                    size="small"
                                                    [disabled]="row.account.balance <= 0"
                                                    (onClick)="startPayment(row.account.id)"
                                                    pTooltip="Record payment"
                                                    tooltipPosition="top" />
                                            </div>
                                        </td>
                                    </tr>
                                </ng-template>
                                <ng-template pTemplate="emptymessage">
                                    <tr>
                                        <td colspan="7">
                                            @if (rows().length === 0) {
                                                <app-empty-state
                                                    icon="pi pi-inbox"
                                                    title="No fee accounts yet"
                                                    message="Fee accounts appear here once student semester charges have been billed." />
                                            } @else {
                                                <app-empty-state
                                                    icon="pi pi-filter"
                                                    title="No accounts match"
                                                    message="Adjust the search or filters to see more fee accounts."
                                                    actionLabel="Clear filters"
                                                    (action)="clearFilters()" />
                                            }
                                        </td>
                                    </tr>
                                </ng-template>
                            </p-table>
                        </p-card>
                    </p-tabpanel>

                    <!-- Collection Report -->
                    <p-tabpanel value="report">
                        <p-card>
                            <div class="no-print flex flex-col lg:flex-row lg:items-end gap-3 mb-4">
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm font-medium text-surface-900 dark:text-surface-0">From</label>
                                    <p-datepicker
                                        [ngModel]="reportFrom()"
                                        (ngModelChange)="reportFrom.set($event)"
                                        dateFormat="yy-mm-dd"
                                        [showIcon]="true"
                                        [showClear]="true"
                                        placeholder="Start date"
                                        styleClass="w-48"
                                        appendTo="body" />
                                </div>
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm font-medium text-surface-900 dark:text-surface-0">To</label>
                                    <p-datepicker
                                        [ngModel]="reportTo()"
                                        (ngModelChange)="reportTo.set($event)"
                                        dateFormat="yy-mm-dd"
                                        [showIcon]="true"
                                        [showClear]="true"
                                        placeholder="End date"
                                        styleClass="w-48"
                                        appendTo="body" />
                                </div>
                                <div class="flex flex-wrap items-center gap-2 lg:ml-auto">
                                    <p-button label="Clear" icon="pi pi-filter-slash" severity="secondary" [outlined]="true" (onClick)="clearReportFilters()" />
                                    <p-button label="Print" icon="pi pi-print" severity="secondary" [outlined]="true" (onClick)="printPage()" />
                                    <p-button label="Export CSV" icon="pi pi-download" [disabled]="reportPayments().length === 0" (onClick)="exportReport()" />
                                </div>
                            </div>

                            <div class="overflow-x-auto">
                                <p-table
                                    [value]="reportPayments()"
                                    dataKey="id"
                                    [paginator]="reportPayments().length > 10"
                                    [rows]="10"
                                    [rowsPerPageOptions]="rowsPerPageOptions"
                                    [showCurrentPageReport]="true"
                                    currentPageReportTemplate="Showing {first} to {last} of {totalRecords} payments"
                                    styleClass="p-datatable-sm"
                                    [tableStyle]="{ 'min-width': '56rem' }">
                                    <ng-template pTemplate="header">
                                        <tr>
                                            <th>Date</th>
                                            <th>Student</th>
                                            <th>Receipt no</th>
                                            <th>Method</th>
                                            <th class="text-right">Amount</th>
                                        </tr>
                                    </ng-template>
                                    <ng-template pTemplate="body" let-payment>
                                        <tr>
                                            <td class="whitespace-nowrap">{{ formatDate(payment.date) }}</td>
                                            <td>
                                                <div class="flex flex-col">
                                                    <span class="font-medium">{{ studentName(payment.studentId) }}</span>
                                                    <span class="text-muted-color text-xs">{{ studentAdmissionNo(payment.studentId) }}</span>
                                                </div>
                                            </td>
                                            <td class="font-mono text-xs whitespace-nowrap">{{ payment.receiptNo }}</td>
                                            <td><p-tag [value]="methodLabel(payment.method)" severity="secondary" [rounded]="true" /></td>
                                            <td class="text-right whitespace-nowrap font-medium">{{ formatCurrency(payment.amount) }}</td>
                                        </tr>
                                    </ng-template>
                                    <ng-template pTemplate="footer">
                                        <tr>
                                            <td colspan="4" class="text-right font-medium">{{ reportTotals().count }} payment(s)</td>
                                            <td class="text-right font-bold whitespace-nowrap">{{ formatCurrency(reportTotals().total) }}</td>
                                        </tr>
                                    </ng-template>
                                    <ng-template pTemplate="emptymessage">
                                        <tr>
                                            <td colspan="5">
                                                <app-empty-state
                                                    icon="pi pi-chart-line"
                                                    title="No payments in range"
                                                    message="Adjust the date range to include recorded payments."
                                                    actionLabel="Clear dates"
                                                    (action)="clearReportFilters()" />
                                            </td>
                                        </tr>
                                    </ng-template>
                                </p-table>
                            </div>
                        </p-card>
                    </p-tabpanel>
                </p-tabpanels>
            </p-tabs>
        </div>

        <!-- ── Account detail dialog ─────────────────────────────────── -->
        <p-dialog
            [visible]="detailVisible()"
            (visibleChange)="detailVisible.set($event)"
            [modal]="true"
            [draggable]="false"
            [resizable]="false"
            [dismissableMask]="true"
            [style]="{ width: '60rem', maxWidth: '95vw' }"
            header="Fee account">
            @if (selectedRow(); as row) {
                <div class="space-y-5">
                    <!-- Interactive detail (hidden when printing) -->
                    <div class="no-print space-y-5">
                        <div class="flex items-start justify-between gap-4">
                            <div>
                                <div class="flex items-center gap-2">
                                    <h3 class="text-lg font-semibold text-surface-900 dark:text-surface-0">{{ row.name }}</h3>
                                    <app-status-tag [status]="row.account.status" />
                                </div>
                                <p class="text-muted-color text-sm mt-1">{{ row.admissionNo }} · {{ row.email }}</p>
                            </div>
                            <div class="text-right text-sm">
                                <p class="text-muted-color">Semester</p>
                                <p class="font-medium">{{ row.semesterName }}</p>
                            </div>
                        </div>

                        <div class="grid gap-4 sm:grid-cols-3">
                            <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                                <p class="text-xs text-muted-color">Total billed</p>
                                <p class="text-xl font-bold">{{ formatCurrency(row.account.totalBilled) }}</p>
                            </div>
                            <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                                <p class="text-xs text-muted-color">Total paid</p>
                                <p class="text-xl font-bold text-green-600 dark:text-green-400">{{ formatCurrency(row.account.totalPaid) }}</p>
                            </div>
                            <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                                <p class="text-xs text-muted-color">Outstanding balance</p>
                                <p class="text-xl font-bold text-orange-600 dark:text-orange-400">{{ formatCurrency(row.account.balance) }}</p>
                            </div>
                        </div>

                        <div>
                            <h4 class="text-sm font-semibold text-surface-900 dark:text-surface-0 mb-2">Charge breakdown</h4>
                            @for (group of chargeGroups(); track group.type) {
                                <div class="mb-3 last:mb-0 rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden">
                                    <div class="flex items-center justify-between gap-2 px-3 py-2 bg-surface-100 dark:bg-surface-800">
                                        <span class="text-sm font-medium">{{ group.label }}</span>
                                        <span class="text-sm font-semibold">{{ formatCurrency(group.subtotal) }}</span>
                                    </div>
                                    <table class="w-full text-sm">
                                        <tbody>
                                            @for (charge of group.charges; track charge.id) {
                                                <tr class="border-t border-surface-100 dark:border-surface-800">
                                                    <td class="px-3 py-1.5">{{ charge.title }}</td>
                                                    <td class="px-3 py-1.5 text-muted-color whitespace-nowrap">Due {{ formatDate(charge.dueDate) }}</td>
                                                    <td class="px-3 py-1.5 text-right whitespace-nowrap">{{ formatCurrency(charge.amount) }}</td>
                                                </tr>
                                            }
                                        </tbody>
                                    </table>
                                </div>
                            }
                        </div>

                        <div>
                            <h4 class="text-sm font-semibold text-surface-900 dark:text-surface-0 mb-2">Payment history</h4>
                            @if (selectedPayments().length === 0) {
                                <p class="text-muted-color text-sm">No payments have been recorded for this account yet.</p>
                            } @else {
                                <div class="overflow-x-auto">
                                    <p-table [value]="selectedPayments()" dataKey="id" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '34rem' }">
                                        <ng-template pTemplate="header">
                                            <tr>
                                                <th>Date</th>
                                                <th class="text-right">Amount</th>
                                                <th>Method</th>
                                                <th>Receipt no</th>
                                                <th>Note</th>
                                            </tr>
                                        </ng-template>
                                        <ng-template pTemplate="body" let-payment>
                                            <tr>
                                                <td class="whitespace-nowrap">{{ formatDate(payment.date) }}</td>
                                                <td class="text-right whitespace-nowrap">{{ formatCurrency(payment.amount) }}</td>
                                                <td><p-tag [value]="methodLabel(payment.method)" severity="secondary" [rounded]="true" /></td>
                                                <td class="font-mono text-xs whitespace-nowrap">{{ payment.receiptNo }}</td>
                                                <td class="text-muted-color">{{ payment.note || '—' }}</td>
                                            </tr>
                                        </ng-template>
                                    </p-table>
                                </div>
                            }
                        </div>
                    </div>

                    <!-- Invoice preview (the printable block) -->
                    <div class="print-area p-4 sm:p-5" [class.no-print]="receiptVisible()">
                        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4">
                            <div>
                                <h2 class="text-lg font-bold text-surface-900 dark:text-surface-0">{{ universityName() }}</h2>
                                <p class="text-muted-color text-xs">{{ universityAddress() }}</p>
                                <p class="text-muted-color text-xs">{{ universityContact() }}</p>
                            </div>
                            <div class="sm:text-right">
                                <p class="font-semibold">Fee Invoice</p>
                                <p class="text-xs text-muted-color">Invoice {{ invoiceNo(row.account) }}</p>
                                <p class="text-xs text-muted-color">Issued {{ formatDate(todayIso()) }}</p>
                            </div>
                        </div>

                        <div class="grid gap-x-6 gap-y-1 sm:grid-cols-2 text-sm mb-4">
                            <div class="flex justify-between gap-2"><span class="text-muted-color">Student</span><span class="font-medium text-right">{{ row.name }}</span></div>
                            <div class="flex justify-between gap-2"><span class="text-muted-color">Admission no</span><span class="font-medium">{{ row.admissionNo }}</span></div>
                            <div class="flex justify-between gap-2"><span class="text-muted-color">Program</span><span class="font-medium text-right">{{ programName(row.student) }}</span></div>
                            <div class="flex justify-between gap-2"><span class="text-muted-color">Semester</span><span class="font-medium text-right">{{ row.semesterName }}</span></div>
                        </div>

                        <table class="w-full text-sm mb-3">
                            <thead>
                                <tr class="border-b border-surface-200 dark:border-surface-700 text-left">
                                    <th class="py-1.5 pr-3 font-medium text-muted-color">Charge</th>
                                    <th class="py-1.5 pr-3 font-medium text-muted-color">Type</th>
                                    <th class="py-1.5 pr-3 font-medium text-muted-color">Due date</th>
                                    <th class="py-1.5 text-right font-medium text-muted-color">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                @for (charge of row.account.charges; track charge.id) {
                                    <tr class="border-b border-surface-100 dark:border-surface-800">
                                        <td class="py-1.5 pr-3">{{ charge.title }}</td>
                                        <td class="py-1.5 pr-3">{{ chargeTypeLabel(charge.type) }}</td>
                                        <td class="py-1.5 pr-3 whitespace-nowrap">{{ formatDate(charge.dueDate) }}</td>
                                        <td class="py-1.5 text-right whitespace-nowrap">{{ formatCurrency(charge.amount) }}</td>
                                    </tr>
                                }
                            </tbody>
                        </table>

                        <div class="flex flex-col items-end gap-1 text-sm">
                            <div class="flex justify-between gap-8 w-full sm:w-72"><span class="text-muted-color">Total billed</span><span class="font-medium">{{ formatCurrency(row.account.totalBilled) }}</span></div>
                            <div class="flex justify-between gap-8 w-full sm:w-72"><span class="text-muted-color">Total paid</span><span class="font-medium">{{ formatCurrency(row.account.totalPaid) }}</span></div>
                            <div class="flex justify-between gap-8 w-full sm:w-72 border-t border-surface-200 dark:border-surface-700 pt-1"><span class="font-semibold">Balance due</span><span class="font-bold">{{ formatCurrency(row.account.balance) }}</span></div>
                            <p class="text-xs text-muted-color mt-1">Status: {{ row.account.status }}</p>
                        </div>

                        <p class="text-xs text-muted-color mt-4">Simulated invoice — no real money is processed. Generated by {{ universityName() }}.</p>
                    </div>
                </div>
            }
            <ng-template pTemplate="footer">
                <div class="flex flex-wrap justify-end gap-2">
                    <p-button label="Close" severity="secondary" [outlined]="true" (onClick)="detailVisible.set(false)" />
                    @if (selectedRow(); as row) {
                        <p-button label="Print invoice" icon="pi pi-print" severity="secondary" [outlined]="true" (onClick)="printPage()" />
                        <p-button label="Record payment" icon="pi pi-plus" [disabled]="row.account.balance <= 0" (onClick)="startPayment(row.account.id)" />
                    }
                </div>
            </ng-template>
        </p-dialog>

        <!-- ── Record payment dialog ─────────────────────────────────── -->
        <p-dialog
            [visible]="paymentVisible()"
            (visibleChange)="paymentVisible.set($event)"
            [modal]="true"
            [draggable]="false"
            [resizable]="false"
            [dismissableMask]="true"
            [style]="{ width: '34rem', maxWidth: '95vw' }"
            header="Record payment">
            @if (selectedRow(); as row) {
                <p-message severity="warn" styleClass="w-full mb-4">
                    <span class="font-medium">Simulated transaction — no real money is processed.</span>
                </p-message>

                <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3 mb-4 text-sm">
                    <div class="flex justify-between gap-2"><span class="text-muted-color">Student</span><span class="font-medium">{{ row.name }} ({{ row.admissionNo }})</span></div>
                    <div class="flex justify-between gap-2"><span class="text-muted-color">Semester</span><span class="font-medium">{{ row.semesterName }}</span></div>
                    <div class="flex justify-between gap-2"><span class="text-muted-color">Outstanding balance</span><span class="font-semibold">{{ formatCurrency(row.account.balance) }}</span></div>
                </div>

                <form [formGroup]="paymentForm" class="grid gap-4">
                    <app-form-field label="Amount *" [error]="amountError()">
                        <p-inputnumber
                            formControlName="amount"
                            mode="decimal"
                            [min]="1"
                            [max]="row.account.balance"
                            [minFractionDigits]="0"
                            [maxFractionDigits]="0"
                            placeholder="0"
                            styleClass="w-full"
                            inputStyleClass="w-full" />
                    </app-form-field>

                    @if (amountOverBalance()) {
                        <p-message severity="error" styleClass="w-full">
                            <span>Amount cannot exceed the outstanding balance of {{ formatCurrency(row.account.balance) }}.</span>
                        </p-message>
                    } @else if (row.account.balance <= 0) {
                        <p-message severity="info" styleClass="w-full">
                            <span>This account is fully paid — there is no outstanding balance to record.</span>
                        </p-message>
                    }

                    <app-form-field label="Payment date *" [error]="dateError()">
                        <p-datepicker formControlName="date" dateFormat="yy-mm-dd" [maxDate]="maxPaymentDate" [showIcon]="true" inputId="feesPayDate" styleClass="w-full" appendTo="body" />
                    </app-form-field>

                    <app-form-field label="Method *">
                        <p-select formControlName="method" [options]="methodOptions" optionLabel="label" optionValue="value" appendTo="body" />
                    </app-form-field>

                    <app-form-field label="Reference / note" hint="Optional — cheque no, transaction ref, etc.">
                        <textarea pTextarea formControlName="note" rows="2" class="w-full" placeholder="e.g. Cheque 004521"></textarea>
                    </app-form-field>
                </form>
            }
            <ng-template pTemplate="footer">
                <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="paymentVisible.set(false)" />
                <p-button label="Record payment" icon="pi pi-check" [disabled]="!canSubmitPayment()" (onClick)="submitPayment()" />
            </ng-template>
        </p-dialog>

        <!-- ── Receipt dialog (print preview) ────────────────────────── -->
        <p-dialog
            [visible]="receiptVisible()"
            (visibleChange)="receiptVisible.set($event)"
            [modal]="true"
            [draggable]="false"
            [resizable]="false"
            [dismissableMask]="true"
            [style]="{ width: '34rem', maxWidth: '95vw' }"
            header="Payment receipt">
            @if (receipt(); as pay) {
                <div class="print-area p-4 sm:p-5">
                    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4">
                        <div>
                            <h2 class="text-lg font-bold text-surface-900 dark:text-surface-0">{{ universityName() }}</h2>
                            <p class="text-muted-color text-xs">{{ universityAddress() }}</p>
                        </div>
                        <div class="sm:text-right">
                            <p class="font-semibold">Payment Receipt</p>
                            <p class="text-xs text-muted-color font-mono">{{ pay.receiptNo }}</p>
                        </div>
                    </div>

                    <div class="grid gap-x-6 gap-y-1 text-sm mb-4">
                        <div class="flex justify-between gap-2"><span class="text-muted-color">Date</span><span class="font-medium">{{ formatDate(pay.date) }}</span></div>
                        <div class="flex justify-between gap-2"><span class="text-muted-color">Student</span><span class="font-medium">{{ studentName(pay.studentId) }} ({{ studentAdmissionNo(pay.studentId) }})</span></div>
                        <div class="flex justify-between gap-2"><span class="text-muted-color">Amount paid</span><span class="font-semibold">{{ formatCurrency(pay.amount) }}</span></div>
                        <div class="flex justify-between gap-2"><span class="text-muted-color">Method</span><span class="font-medium">{{ methodLabel(pay.method) }}</span></div>
                        <div class="flex justify-between gap-2"><span class="text-muted-color">Remaining balance</span><span class="font-semibold">{{ formatCurrency(receiptBalance()) }}</span></div>
                        @if (pay.note) {
                            <div class="flex justify-between gap-2"><span class="text-muted-color">Note</span><span class="font-medium text-right">{{ pay.note }}</span></div>
                        }
                    </div>

                    <p class="text-xs text-muted-color">Simulated receipt — no real money is processed.</p>
                </div>
            }
            <ng-template pTemplate="footer">
                <div class="flex flex-wrap justify-end gap-2">
                    <p-button label="Done" severity="secondary" [outlined]="true" (onClick)="receiptVisible.set(false)" />
                    <p-button label="Print receipt" icon="pi pi-print" (onClick)="printPage()" />
                </div>
            </ng-template>
        </p-dialog>

        <p-toast />
        <p-confirmDialog />
    `
})
export class FeesPaymentsList {
    private readonly core = inject(CoreDataService);
    private readonly fees = inject(FeeService);
    private readonly fb = inject(FormBuilder);
    private readonly msg = inject(MessageService);
    private readonly confirm = inject(ConfirmationService);

    // ── Reference data ────────────────────────────────────────────────────────
    private readonly payments = this.core.payments;
    private readonly studentMap = computed(() => new Map<string, Student>(this.core.students().map((s) => [s.id, s])));
    private readonly semesterMap = computed(() => new Map<string, Semester>(this.core.semesters().map((s) => [s.id, s])));

    // ── Settings / formatting ─────────────────────────────────────────────────
    readonly universityName = computed(() => this.core.getSettings().universityName);
    readonly universityAddress = computed(() => this.core.getSettings().address);
    readonly universityContact = computed(() => `${this.core.getSettings().contactEmail} · ${this.core.getSettings().contactPhone}`);

    private readonly currencyCode = computed(() => this.core.getSettings().currency);
    private readonly currencyFormatter = computed<Intl.NumberFormat | null>(() => {
        try {
            return new Intl.NumberFormat('en-BD', { style: 'currency', currency: this.currencyCode(), maximumFractionDigits: 0 });
        } catch {
            return null;
        }
    });

    // ── Overview ──────────────────────────────────────────────────────────────
    readonly rowsPerPageOptions: number[] = [10, 25, 50, 100];

    readonly overview = computed(() => this.fees.overview());
    readonly statusCounts = computed(() => this.fees.getStatusCounts());
    readonly collectionRateLabel = computed(() => `${this.overview().collectionRate.toFixed(1)}%`);
    readonly collectedContext = computed(() => `across ${this.rows().length} account(s)`);
    readonly outstandingContext = computed(() => `${this.statusCounts().PAID} account(s) fully paid`);
    readonly accountsContext = computed(() => `${this.statusCounts().PARTIAL} partial · ${this.statusCounts().UNPAID} unpaid · ${this.statusCounts().OVERDUE} overdue`);

    readonly recentPayments = computed<Payment[]>(() =>
        [...this.payments()]
            .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
            .slice(0, 5)
    );

    // ── Accounts ──────────────────────────────────────────────────────────────
    readonly rows = computed<AccountRow[]>(() => {
        const students = this.studentMap();
        const semesters = this.semesterMap();
        return this.fees.list().map((account) => {
            const student = students.get(account.studentId) ?? null;
            return {
                id: account.id,
                account,
                student,
                name: student ? `${student.firstName} ${student.lastName}` : 'Unknown student',
                admissionNo: student?.admissionNo ?? '—',
                email: student?.email ?? '',
                semesterName: semesters.get(account.semesterId)?.name ?? account.semesterId
            };
        });
    });

    // Filters
    readonly search = signal('');
    readonly semesterFilter = signal<string | null>(null);
    readonly statusFilter = signal<string | null>(null);

    readonly semesterOptions = computed<Option[]>(() => this.core.semesters().map((s) => ({ label: s.name, value: s.id })));

    readonly statusOptions: Option[] = [
        { label: 'Paid', value: 'PAID' },
        { label: 'Partial', value: 'PARTIAL' },
        { label: 'Unpaid', value: 'UNPAID' },
        { label: 'Overdue', value: 'OVERDUE' }
    ];

    readonly filtered = computed<AccountRow[]>(() => {
        const term = this.search().trim().toLowerCase();
        const semester = this.semesterFilter();
        const status = this.statusFilter();
        let result = this.rows();
        if (term) {
            result = result.filter(
                (r) =>
                    r.admissionNo.toLowerCase().includes(term) ||
                    r.name.toLowerCase().includes(term) ||
                    r.email.toLowerCase().includes(term)
            );
        }
        if (semester) {
            result = result.filter((r) => r.account.semesterId === semester);
        }
        if (status) {
            result = result.filter((r) => r.account.status === status);
        }
        return result;
    });

    // ── Tabs ──────────────────────────────────────────────────────────────────
    readonly activeTab = signal<'accounts' | 'report'>('accounts');

    onTabChange(value: string | number | undefined): void {
        const next = String(value ?? 'accounts');
        if (next === 'accounts' || next === 'report') {
            this.activeTab.set(next);
        }
    }

    // ── Detail / selection ────────────────────────────────────────────────────
    readonly selectedAccountId = signal<string | null>(null);
    readonly detailVisible = signal(false);
    readonly paymentVisible = signal(false);
    readonly receiptVisible = signal(false);
    readonly receipt = signal<Payment | null>(null);

    readonly dialogOpen = computed(() => this.detailVisible() || this.paymentVisible() || this.receiptVisible());

    readonly selectedRow = computed<AccountRow | null>(() => {
        const id = this.selectedAccountId();
        return id ? this.rows().find((r) => r.account.id === id) ?? null : null;
    });

    readonly chargeGroups = computed<ChargeGroup[]>(() => {
        const row = this.selectedRow();
        if (!row) {
            return [];
        }
        const order: FeeCharge['type'][] = ['TUITION', 'SEMESTER', 'LAB', 'OTHER'];
        return order
            .map((type) => {
                const charges = row.account.charges.filter((c) => c.type === type);
                return { type, label: this.chargeTypeLabel(type), charges, subtotal: charges.reduce((sum, c) => sum + c.amount, 0) };
            })
            .filter((group) => group.charges.length > 0);
    });

    readonly selectedPayments = computed<Payment[]>(() => {
        const row = this.selectedRow();
        if (!row) {
            return [];
        }
        return [...this.fees.getPayments(row.account.id)].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    });

    readonly receiptBalance = computed(() => {
        const pay = this.receipt();
        return pay ? this.fees.get(pay.feeAccountId)?.balance ?? 0 : 0;
    });

    // ── Payment form ──────────────────────────────────────────────────────────
    readonly paymentForm = this.fb.group({
        amount: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
        date: this.fb.control<Date | null>(new Date(), Validators.required),
        method: this.fb.control<Payment['method']>('CASH', Validators.required),
        note: this.fb.control<string>('')
    });

    private readonly amountValue = toSignal(this.paymentForm.controls.amount.valueChanges, { initialValue: null });
    private readonly paymentDateValue = toSignal(this.paymentForm.controls.date.valueChanges, { initialValue: null });

    readonly paymentSubmitted = signal(false);
    readonly maxPaymentDate = new Date();

    readonly methodOptions: Option[] = [
        { label: 'Cash', value: 'CASH' },
        { label: 'Card', value: 'CARD' },
        { label: 'Bank transfer', value: 'BANK' },
        { label: 'Online', value: 'ONLINE' }
    ];

    readonly amountOverBalance = computed(() => {
        const amount = this.amountValue();
        const balance = this.selectedRow()?.account.balance ?? 0;
        return amount !== null && amount > balance;
    });

    readonly amountError = computed(() => {
        const amount = this.amountValue();
        const balance = this.selectedRow()?.account.balance ?? 0;
        if (amount === null) {
            return this.paymentSubmitted() ? 'Amount is required.' : '';
        }
        if (Number.isNaN(amount) || amount <= 0) {
            return 'Amount must be greater than zero.';
        }
        if (amount > balance) {
            return `Amount cannot exceed the outstanding balance of ${this.formatCurrency(balance)}.`;
        }
        return '';
    });

    readonly dateError = computed(() => {
        const date = this.paymentDateValue();
        if (!date) {
            return this.paymentSubmitted() ? 'Payment date is required.' : '';
        }
        return this.isFutureDate(date) ? 'Payment date cannot be in the future.' : '';
    });

    readonly canSubmitPayment = computed(() => {
        const amount = this.amountValue();
        const date = this.paymentDateValue();
        const balance = this.selectedRow()?.account.balance ?? 0;
        return balance > 0 && amount !== null && amount > 0 && amount <= balance && date !== null && !this.isFutureDate(date);
    });

    // ── Report ────────────────────────────────────────────────────────────────
    readonly reportFrom = signal<Date | null>(null);
    readonly reportTo = signal<Date | null>(null);

    readonly reportPayments = computed<Payment[]>(() => {
        const from = this.reportFrom();
        const to = this.reportTo();
        const start = from ? this.toLocalDateString(from) : '0000-01-01';
        const end = to ? this.toLocalDateString(to) : '9999-12-31';
        return [...this.fees.collectionReport(start, end)].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    });

    readonly reportTotals = computed(() => {
        const list = this.reportPayments();
        return { count: list.length, total: list.reduce((sum, p) => sum + p.amount, 0) };
    });

    // ── Public actions ────────────────────────────────────────────────────────
    openDetail(row: AccountRow): void {
        this.selectedAccountId.set(row.account.id);
        this.detailVisible.set(true);
    }

    startPayment(accountId: string): void {
        this.selectedAccountId.set(accountId);
        this.paymentSubmitted.set(false);
        this.paymentForm.reset({ amount: null, date: new Date(), method: 'CASH', note: '' });
        this.paymentVisible.set(true);
    }

    submitPayment(): void {
        const row = this.selectedRow();
        if (!row) {
            return;
        }
        this.paymentSubmitted.set(true);
        if (!this.canSubmitPayment()) {
            this.paymentForm.markAllAsTouched();
            this.msg.add({ severity: 'warn', summary: 'Check the form', detail: 'Enter a valid amount and a date that is not in the future.' });
            return;
        }
        const raw = this.paymentForm.getRawValue();
        const date = raw.date;
        if (date === null) {
            return;
        }
        const amount = raw.amount ?? 0;
        this.confirm.confirm({
            message: `Record a simulated payment of ${this.formatCurrency(amount)} for ${row.name} (${row.admissionNo})? No real money is processed.`,
            header: 'Confirm payment',
            icon: 'pi pi-exclamation-circle',
            acceptLabel: 'Record payment',
            rejectLabel: 'Cancel',
            accept: () => {
                try {
                    const payment = this.fees.recordPayment({
                        feeAccountId: row.account.id,
                        studentId: row.account.studentId,
                        amount,
                        date: this.toLocalDateString(date),
                        method: raw.method ?? 'CASH',
                        note: raw.note ?? ''
                    });
                    // The account is refreshed automatically: rows()/selectedRow()
                    // read the CoreDataService signals that recordPayment updates.
                    this.paymentVisible.set(false);
                    this.receipt.set(payment);
                    this.receiptVisible.set(true);
                    this.msg.add({ severity: 'success', summary: 'Payment recorded', detail: `Receipt ${payment.receiptNo} issued for ${this.formatCurrency(payment.amount)}.` });
                } catch (e: unknown) {
                    this.reportError(e);
                }
            }
        });
    }

    exportReport(): void {
        const list = this.reportPayments();
        if (list.length === 0) {
            this.msg.add({ severity: 'warn', summary: 'Nothing to export', detail: 'No payments fall within the selected date range.' });
            return;
        }
        const columns = ['Date', 'Receipt no', 'Admission no', 'Student', 'Amount', 'Method', 'Note'];
        const data: (string | number)[][] = list.map((p) => [
            p.date,
            p.receiptNo,
            this.studentAdmissionNo(p.studentId),
            this.studentName(p.studentId),
            p.amount,
            this.methodLabel(p.method),
            p.note
        ]);
        const from = this.reportFrom() ? this.toLocalDateString(this.reportFrom()!) : 'all';
        const to = this.reportTo() ? this.toLocalDateString(this.reportTo()!) : 'all';
        downloadCsv(`fee-collection_${from}_to_${to}.csv`, columns, data);
        this.msg.add({ severity: 'success', summary: 'CSV exported', detail: `${list.length} payment(s) exported.` });
    }

    clearFilters(): void {
        this.search.set('');
        this.semesterFilter.set(null);
        this.statusFilter.set(null);
    }

    clearReportFilters(): void {
        this.reportFrom.set(null);
        this.reportTo.set(null);
    }

    printPage(): void {
        window.print();
    }

    // ── Display helpers ───────────────────────────────────────────────────────
    formatCurrency(amount: number): string {
        const formatter = this.currencyFormatter();
        if (formatter) {
            return formatter.format(amount);
        }
        return `${this.currencyCode()} ${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    }

    formatDate(value: string): string {
        // Plain 'YYYY-MM-DD' strings are re-ordered from their local parts so the
        // displayed day never shifts because of a UTC parse.
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            const [year, month, day] = value.split('-');
            return `${day}/${month}/${year}`;
        }
        return formatDateUtil(value, 'DD/MM/YYYY');
    }

    todayIso(): string {
        return this.toLocalDateString(new Date());
    }

    invoiceNo(account: FeeAccount): string {
        return `INV-${account.id.toUpperCase()}`;
    }

    studentName(studentId: string): string {
        const student = this.studentMap().get(studentId);
        return student ? `${student.firstName} ${student.lastName}` : 'Unknown student';
    }

    studentAdmissionNo(studentId: string): string {
        return this.studentMap().get(studentId)?.admissionNo ?? '—';
    }

    programName(student: Student | null): string {
        if (!student) {
            return '—';
        }
        return this.core.get<Program>('programs', student.programId)?.name ?? student.programId;
    }

    methodLabel(method: Payment['method']): string {
        const map: Record<Payment['method'], string> = { CASH: 'Cash', CARD: 'Card', BANK: 'Bank transfer', ONLINE: 'Online' };
        return map[method];
    }

    chargeTypeLabel(type: FeeCharge['type']): string {
        const map: Record<FeeCharge['type'], string> = { TUITION: 'Tuition', SEMESTER: 'Semester', LAB: 'Lab & Library', OTHER: 'Other' };
        return map[type];
    }

    // ── Private helpers ───────────────────────────────────────────────────────
    private toLocalDateString(value: Date): string {
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, '0');
        const day = String(value.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    private isFutureDate(value: Date): boolean {
        return this.toLocalDateString(value) > this.toLocalDateString(new Date());
    }

    private reportError(e: unknown): void {
        const message = e instanceof Error ? e.message : String(e);
        this.msg.add({ severity: 'error', summary: 'Something went wrong', detail: message });
    }
}
