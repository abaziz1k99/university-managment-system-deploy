import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { PageHeader } from '@/app/shared/components/page-header';
import { ChartCard } from '@/app/shared/components/chart-card';
import { StatCard } from '@/app/shared/components/stat-card';
import { StatusTag } from '@/app/shared/components/status-tag';
import { EmptyState } from '@/app/shared/components/empty-state';
import { ReportService, ReportFilter } from '@/app/core/services/report.service';
import { CoreDataService } from '@/app/core/services/core-data.service';
import { Department, Program, Semester } from '@/app/core/models/index';
import type { ChartData, ChartOptions } from 'chart.js';

interface Option {
    label: string;
    value: string;
}

@Component({
    selector: 'app-reports-list',
    standalone: true,
    imports: [
        FormsModule,
        CardModule,
        ButtonModule,
        SelectModule,
        DatePickerModule,
        TableModule,
        ToastModule,
        TooltipModule,
        TagModule,
        PageHeader,
        ChartCard,
        StatCard,
        StatusTag,
        EmptyState
    ],
    providers: [MessageService],
    styles: [
        `
            /* Print header is hidden on screen and revealed only on paper. */
            .print-only {
                display: none;
            }

            @media print {
                .no-print {
                    display: none !important;
                }

                .print-only {
                    display: block !important;
                }

                .report-section {
                    break-inside: avoid;
                    page-break-inside: avoid;
                }

                /* Keep charts + tables legible and coloured on paper. */
                * {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }

                :host ::ng-deep .p-card {
                    box-shadow: none !important;
                    border: 1px solid #d1d5db !important;
                    break-inside: avoid;
                    page-break-inside: avoid;
                }

                :host ::ng-deep .p-card-body {
                    padding: 0.75rem !important;
                }

                :host ::ng-deep .p-datatable .p-datatable-tbody > tr > td,
                :host ::ng-deep .p-datatable .p-datatable-thead > tr > th {
                    padding: 0.25rem 0.5rem !important;
                    font-size: 10.5pt !important;
                }

                @page {
                    margin: 12mm;
                }
            }
        `
    ],
    template: `
        <app-page-header class="no-print" title="Reports & Analytics" subtitle="Academic, admissions, attendance, examination and finance reporting">
            <p-button label="Clear filters" icon="pi pi-filter-slash" severity="secondary" [outlined]="true" (onClick)="clearFilters()" pTooltip="Reset all filters" tooltipPosition="bottom" />
            <p-button label="Print" icon="pi pi-print" severity="secondary" [outlined]="true" (onClick)="printReport()" pTooltip="Print the full report" tooltipPosition="bottom" />
        </app-page-header>

        <!-- ── Print-only heading ─────────────────────────────────────────── -->
        <div class="print-only mb-4">
            <h1 class="text-xl font-bold">{{ universityName() }} — Reports &amp; Analytics</h1>
            <p class="text-sm">Generated {{ todayLabel() }} · {{ activeFilterSummary() }}</p>
        </div>

        <!-- ── Filters ────────────────────────────────────────────────────── -->
        <p-card styleClass="no-print mb-6">
            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-medium text-surface-900 dark:text-surface-0">From</label>
                    <p-datepicker [ngModel]="fromDate()" (ngModelChange)="fromDate.set($event)" dateFormat="yy-mm-dd" [showIcon]="true" [showClear]="true" placeholder="Start date" styleClass="w-full" appendTo="body" />
                </div>
                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-medium text-surface-900 dark:text-surface-0">To</label>
                    <p-datepicker [ngModel]="toDate()" (ngModelChange)="toDate.set($event)" dateFormat="yy-mm-dd" [showIcon]="true" [showClear]="true" placeholder="End date" styleClass="w-full" appendTo="body" />
                </div>
                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-medium text-surface-900 dark:text-surface-0">Department</label>
                    <p-select [ngModel]="departmentId()" (ngModelChange)="onDepartmentChange($event)" [options]="departmentOptions()" optionLabel="label" optionValue="value" placeholder="All departments" [showClear]="true" styleClass="w-full" appendTo="body" />
                </div>
                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-medium text-surface-900 dark:text-surface-0">Program</label>
                    <p-select [ngModel]="programId()" (ngModelChange)="programId.set($event)" [options]="programOptions()" optionLabel="label" optionValue="value" placeholder="All programs" [showClear]="true" styleClass="w-full" appendTo="body" />
                </div>
                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-medium text-surface-900 dark:text-surface-0">Semester</label>
                    <p-select [ngModel]="semesterId()" (ngModelChange)="semesterId.set($event)" [options]="semesterOptions()" optionLabel="label" optionValue="value" placeholder="All semesters" [showClear]="true" styleClass="w-full" appendTo="body" />
                </div>
            </div>
            <p class="text-muted-color text-sm mt-3">Showing: {{ activeFilterSummary() }}</p>
        </p-card>

        <!-- ── KPI overview ───────────────────────────────────────────────── -->
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
            <app-stat-card label="Students in scope" [value]="kpis().totalStudents" context="matching filters" icon="pi pi-users" iconBg="primary" />
            <app-stat-card label="Admission conversion" [value]="formatPercent(kpis().conversionRate)" context="enrolled / applications" icon="pi pi-percentage" iconBg="green" />
            <app-stat-card label="Fees collected" [value]="formatCurrency(kpis().collected)" context="payments in range" icon="pi pi-wallet" iconBg="green" />
            <app-stat-card label="Fees outstanding" [value]="formatCurrency(kpis().outstanding)" context="account balances" icon="pi pi-exclamation-circle" iconBg="orange" />
        </div>

        <!-- ── 1. Enrollment by department ────────────────────────────────── -->
        <section class="report-section mb-8">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <div>
                    <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-0">1 · Enrollment by Department</h2>
                    <p class="text-muted-color text-sm">Students per department with the active filters applied.</p>
                </div>
                <p-button class="no-print" label="Export CSV" icon="pi pi-download" severity="secondary" [outlined]="true" size="small" [disabled]="enrollmentRows().length === 0" (onClick)="exportEnrollment()" pTooltip="Download this table as CSV" tooltipPosition="top" />
            </div>
            @if (enrollmentRows().length === 0) {
                <p-card><app-empty-state icon="pi pi-building" title="No department data" message="No departments match the current filters." /></p-card>
            } @else {
                <div class="grid gap-4 lg:grid-cols-2">
                    <app-chart-card title="Students per Department" [subtitle]="enrollmentRows().length + ' departments'" type="bar" [data]="enrollmentChartData()" [options]="barOptions" />
                    <p-card>
                        <div class="overflow-x-auto">
                            <p-table [value]="enrollmentRows()" dataKey="code" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '22rem' }">
                                <ng-template pTemplate="header">
                                    <tr>
                                        <th>Department</th>
                                        <th>Code</th>
                                        <th class="text-right">Students</th>
                                    </tr>
                                </ng-template>
                                <ng-template pTemplate="body" let-row>
                                    <tr>
                                        <td>{{ row.department }}</td>
                                        <td class="font-mono text-xs">{{ row.code }}</td>
                                        <td class="text-right font-medium">{{ row.count }}</td>
                                    </tr>
                                </ng-template>
                                <ng-template pTemplate="footer">
                                    <tr>
                                        <td class="font-medium">Total</td>
                                        <td></td>
                                        <td class="text-right font-bold">{{ kpis().totalStudents }}</td>
                                    </tr>
                                </ng-template>
                            </p-table>
                        </div>
                    </p-card>
                </div>
            }
        </section>

        <!-- ── 2. Admissions ──────────────────────────────────────────────── -->
        <section class="report-section mb-8">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <div>
                    <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-0">2 · Admissions</h2>
                    <p class="text-muted-color text-sm">Applications by status and enrolment conversion.</p>
                </div>
                <p-button class="no-print" label="Export CSV" icon="pi pi-download" severity="secondary" [outlined]="true" size="small" [disabled]="admissionRows().length === 0" (onClick)="exportAdmissions()" pTooltip="Download this table as CSV" tooltipPosition="top" />
            </div>
            @if (admissionsSummary().total === 0) {
                <p-card><app-empty-state icon="pi pi-file-edit" title="No applications in range" message="Adjust the date range or filters to include admission applications." /></p-card>
            } @else {
                <div class="grid gap-4 lg:grid-cols-2">
                    <app-chart-card title="Applications by Status" [subtitle]="'Conversion rate ' + formatPercent(admissionsSummary().conversionRate)" type="bar" [data]="admissionsChartData()" [options]="barOptions" />
                    <p-card>
                        <div class="overflow-x-auto">
                            <p-table [value]="admissionRows()" dataKey="status" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '22rem' }">
                                <ng-template pTemplate="header">
                                    <tr>
                                        <th>Status</th>
                                        <th class="text-right">Applications</th>
                                    </tr>
                                </ng-template>
                                <ng-template pTemplate="body" let-row>
                                    <tr>
                                        <td><app-status-tag [status]="row.status" [displayValue]="row.label" /></td>
                                        <td class="text-right font-medium">{{ row.count }}</td>
                                    </tr>
                                </ng-template>
                                <ng-template pTemplate="footer">
                                    <tr>
                                        <td class="font-medium">Total</td>
                                        <td class="text-right font-bold">{{ admissionsSummary().total }}</td>
                                    </tr>
                                    <tr>
                                        <td class="font-medium">Conversion rate</td>
                                        <td class="text-right font-bold">{{ formatPercent(admissionsSummary().conversionRate) }}</td>
                                    </tr>
                                </ng-template>
                            </p-table>
                        </div>
                    </p-card>
                </div>
            }
        </section>

        <!-- ── 3. Faculty distribution ────────────────────────────────────── -->
        <section class="report-section mb-8">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <div>
                    <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-0">3 · Faculty Distribution</h2>
                    <p class="text-muted-color text-sm">Active faculty members per department.</p>
                </div>
                <p-button class="no-print" label="Export CSV" icon="pi pi-download" severity="secondary" [outlined]="true" size="small" [disabled]="facultyRows().length === 0" (onClick)="exportFaculty()" pTooltip="Download this table as CSV" tooltipPosition="top" />
            </div>
            @if (facultyRows().length === 0) {
                <p-card><app-empty-state icon="pi pi-id-card" title="No faculty data" message="No departments match the current filters." /></p-card>
            } @else {
                <div class="grid gap-4 lg:grid-cols-2">
                    <app-chart-card title="Faculty per Department" [subtitle]="activeFacultyCount() + ' active members'" type="bar" [data]="facultyChartData()" [options]="barOptions" />
                    <p-card>
                        <div class="overflow-x-auto">
                            <p-table [value]="facultyRows()" dataKey="code" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '22rem' }">
                                <ng-template pTemplate="header">
                                    <tr>
                                        <th>Department</th>
                                        <th>Code</th>
                                        <th class="text-right">Faculty</th>
                                    </tr>
                                </ng-template>
                                <ng-template pTemplate="body" let-row>
                                    <tr>
                                        <td>{{ row.department }}</td>
                                        <td class="font-mono text-xs">{{ row.code }}</td>
                                        <td class="text-right font-medium">{{ row.count }}</td>
                                    </tr>
                                </ng-template>
                            </p-table>
                        </div>
                    </p-card>
                </div>
            }
        </section>

        <!-- ── 4. Program summary ─────────────────────────────────────────── -->
        <section class="report-section mb-8">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <div>
                    <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-0">4 · Program Summary</h2>
                    <p class="text-muted-color text-sm">Programs with enrolment counts and durations.</p>
                </div>
                <p-button class="no-print" label="Export CSV" icon="pi pi-download" severity="secondary" [outlined]="true" size="small" [disabled]="programRows().length === 0" (onClick)="exportPrograms()" pTooltip="Download this table as CSV" tooltipPosition="top" />
            </div>
            @if (programRows().length === 0) {
                <p-card><app-empty-state icon="pi pi-graduation-cap" title="No programs" message="No programs match the current filters." /></p-card>
            } @else {
                <div class="grid gap-4 lg:grid-cols-2">
                    <app-chart-card title="Enrolled per Program" [subtitle]="programRows().length + ' programs'" type="bar" [data]="programChartData()" [options]="barOptions" />
                    <p-card>
                        <div class="overflow-x-auto">
                            <p-table [value]="programRows()" dataKey="code" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '34rem' }">
                                <ng-template pTemplate="header">
                                    <tr>
                                        <th>Program</th>
                                        <th>Code</th>
                                        <th>Degree</th>
                                        <th>Department</th>
                                        <th class="text-right">Enrolled</th>
                                        <th class="text-right">Duration</th>
                                    </tr>
                                </ng-template>
                                <ng-template pTemplate="body" let-row>
                                    <tr>
                                        <td>{{ row.program }}</td>
                                        <td class="font-mono text-xs">{{ row.code }}</td>
                                        <td><p-tag [value]="row.degreeType" severity="secondary" [rounded]="true" /></td>
                                        <td>{{ row.department }}</td>
                                        <td class="text-right font-medium">{{ row.enrolled }}</td>
                                        <td class="text-right">{{ row.duration }} yr</td>
                                    </tr>
                                </ng-template>
                            </p-table>
                        </div>
                    </p-card>
                </div>
            }
        </section>

        <!-- ── 5. Course summary ──────────────────────────────────────────── -->
        <section class="report-section mb-8">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <div>
                    <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-0">5 · Course Summary</h2>
                    <p class="text-muted-color text-sm">Courses with credits and enrolled students.</p>
                </div>
                <p-button class="no-print" label="Export CSV" icon="pi pi-download" severity="secondary" [outlined]="true" size="small" [disabled]="courseRows().length === 0" (onClick)="exportCourses()" pTooltip="Download this table as CSV" tooltipPosition="top" />
            </div>
            @if (courseRows().length === 0) {
                <p-card><app-empty-state icon="pi pi-book" title="No courses" message="No courses match the current filters." /></p-card>
            } @else {
                <div class="grid gap-4 lg:grid-cols-2">
                    <app-chart-card title="Enrolled per Course" [subtitle]="courseRows().length + ' courses'" type="bar" [data]="courseChartData()" [options]="barOptions" />
                    <p-card>
                        <div class="overflow-x-auto">
                            <p-table [value]="courseRows()" dataKey="code" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '36rem' }">
                                <ng-template pTemplate="header">
                                    <tr>
                                        <th>Code</th>
                                        <th>Title</th>
                                        <th>Department</th>
                                        <th>Type</th>
                                        <th class="text-right">Credits</th>
                                        <th class="text-right">Enrolled</th>
                                    </tr>
                                </ng-template>
                                <ng-template pTemplate="body" let-row>
                                    <tr>
                                        <td class="font-mono text-xs">{{ row.code }}</td>
                                        <td>{{ row.title }}</td>
                                        <td>{{ row.department }}</td>
                                        <td><p-tag [value]="row.type" severity="secondary" [rounded]="true" /></td>
                                        <td class="text-right">{{ row.credits }}</td>
                                        <td class="text-right font-medium">{{ row.enrolled }}</td>
                                    </tr>
                                </ng-template>
                            </p-table>
                        </div>
                    </p-card>
                </div>
            }
        </section>

        <!-- ── 6. Attendance ──────────────────────────────────────────────── -->
        <section class="report-section mb-8">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <div>
                    <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-0">6 · Attendance</h2>
                    <p class="text-muted-color text-sm">Attendance percentage per course (present + late).</p>
                </div>
                <p-button class="no-print" label="Export CSV" icon="pi pi-download" severity="secondary" [outlined]="true" size="small" [disabled]="attendanceRows().length === 0" (onClick)="exportAttendance()" pTooltip="Download this table as CSV" tooltipPosition="top" />
            </div>
            @if (attendanceRows().length === 0) {
                <p-card><app-empty-state icon="pi pi-calendar" title="No attendance data" message="No courses with attendance match the current filters." /></p-card>
            } @else {
                <div class="grid gap-4 lg:grid-cols-2">
                    <app-chart-card title="Attendance %" [subtitle]="attendanceRows().length + ' courses'" type="bar" [data]="attendanceChartData()" [options]="percentOptions" />
                    <p-card>
                        <div class="overflow-x-auto">
                            <p-table [value]="attendanceRows()" dataKey="code" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '26rem' }">
                                <ng-template pTemplate="header">
                                    <tr>
                                        <th>Course</th>
                                        <th>Code</th>
                                        <th class="text-right">Attendance</th>
                                        <th class="text-right">Sessions</th>
                                    </tr>
                                </ng-template>
                                <ng-template pTemplate="body" let-row>
                                    <tr>
                                        <td>{{ row.course }}</td>
                                        <td class="font-mono text-xs">{{ row.code }}</td>
                                        <td class="text-right font-medium">{{ formatPercent(row.percent) }}</td>
                                        <td class="text-right">{{ row.sessions }}</td>
                                    </tr>
                                </ng-template>
                            </p-table>
                        </div>
                    </p-card>
                </div>
            }
        </section>

        <!-- ── 7. Exam performance ────────────────────────────────────────── -->
        <section class="report-section mb-8">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <div>
                    <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-0">7 · Exam Performance</h2>
                    <p class="text-muted-color text-sm">Average marks and pass rate per examination.</p>
                </div>
                <p-button class="no-print" label="Export CSV" icon="pi pi-download" severity="secondary" [outlined]="true" size="small" [disabled]="examRows().length === 0" (onClick)="exportExamPerformance()" pTooltip="Download this table as CSV" tooltipPosition="top" />
            </div>
            @if (examRows().length === 0) {
                <p-card><app-empty-state icon="pi pi-chart-bar" title="No examinations in range" message="Adjust the date range or filters to include examinations." /></p-card>
            } @else {
                <div class="grid gap-4 lg:grid-cols-2">
                    <app-chart-card title="Average Marks vs Pass Rate" [subtitle]="examRows().length + ' examinations'" type="bar" [data]="examChartData()" [options]="barOptions" />
                    <p-card>
                        <div class="overflow-x-auto">
                            <p-table [value]="examRows()" dataKey="exam" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '30rem' }">
                                <ng-template pTemplate="header">
                                    <tr>
                                        <th>Exam</th>
                                        <th>Course</th>
                                        <th class="text-right">Avg marks</th>
                                        <th class="text-right">Pass rate</th>
                                    </tr>
                                </ng-template>
                                <ng-template pTemplate="body" let-row>
                                    <tr>
                                        <td>{{ row.exam }}</td>
                                        <td>{{ row.course }}</td>
                                        <td class="text-right font-medium">{{ row.avgMarks.toFixed(1) }}</td>
                                        <td class="text-right">{{ formatPercent(row.passRate) }}</td>
                                    </tr>
                                </ng-template>
                            </p-table>
                        </div>
                    </p-card>
                </div>
            }
        </section>

        <!-- ── 8. Fee collection ──────────────────────────────────────────── -->
        <section class="report-section mb-8">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <div>
                    <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-0">8 · Fee Collection</h2>
                    <p class="text-muted-color text-sm">Collected vs outstanding and collection by payment method.</p>
                </div>
                <p-button class="no-print" label="Export CSV" icon="pi pi-download" severity="secondary" [outlined]="true" size="small" [disabled]="feeSummary().count === 0 && feeSummary().outstanding === 0" (onClick)="exportFees()" pTooltip="Download this table as CSV" tooltipPosition="top" />
            </div>
            @if (feeSummary().count === 0 && feeSummary().billed === 0) {
                <p-card><app-empty-state icon="pi pi-wallet" title="No fee activity" message="No payments or fee accounts match the current filters." /></p-card>
            } @else {
            <div class="grid gap-4 xl:grid-cols-3">
                <app-chart-card title="Collected vs Outstanding" [subtitle]="formatCurrency(feeSummary().billed) + ' billed'" type="bar" [data]="feeChartData()" [options]="feeOptions" />
                <app-chart-card title="Collection by Method" [subtitle]="feeSummary().count + ' payments'" type="bar" [data]="feeMethodChartData()" [options]="barOptions" />
                <p-card>
                    <div class="overflow-x-auto">
                        <p-table [value]="feeSummary().byMethod" dataKey="method" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '22rem' }">
                            <ng-template pTemplate="header">
                                <tr>
                                    <th>Method</th>
                                    <th class="text-right">Payments</th>
                                    <th class="text-right">Amount</th>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="body" let-row>
                                <tr>
                                    <td>{{ row.label }}</td>
                                    <td class="text-right">{{ row.count }}</td>
                                    <td class="text-right font-medium whitespace-nowrap">{{ formatCurrency(row.amount) }}</td>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="footer">
                                <tr>
                                    <td class="font-medium">Collected</td>
                                    <td class="text-right">{{ feeSummary().count }}</td>
                                    <td class="text-right font-bold whitespace-nowrap">{{ formatCurrency(feeSummary().collected) }}</td>
                                </tr>
                                <tr>
                                    <td class="font-medium">Outstanding</td>
                                    <td></td>
                                    <td class="text-right font-bold whitespace-nowrap">{{ formatCurrency(feeSummary().outstanding) }}</td>
                                </tr>
                            </ng-template>
                        </p-table>
                    </div>
                </p-card>
            </div>
            }
        </section>

        <!-- ── 9. Semester-wise counts ────────────────────────────────────── -->
        <section class="report-section mb-8">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <div>
                    <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-0">9 · Semester-wise Counts</h2>
                    <p class="text-muted-color text-sm">Enrolled students per semester and academic year.</p>
                </div>
                <p-button class="no-print" label="Export CSV" icon="pi pi-download" severity="secondary" [outlined]="true" size="small" [disabled]="semesterRows().length === 0" (onClick)="exportSemesters()" pTooltip="Download this table as CSV" tooltipPosition="top" />
            </div>
            @if (semesterRows().length === 0) {
                <p-card><app-empty-state icon="pi pi-calendar-plus" title="No semesters" message="No semesters match the current filters." /></p-card>
            } @else {
                <div class="grid gap-4 lg:grid-cols-2">
                    <app-chart-card title="Enrolled per Semester" [subtitle]="semesterRows().length + ' semesters'" type="bar" [data]="semesterChartData()" [options]="barOptions" />
                    <p-card>
                        <div class="overflow-x-auto">
                            <p-table [value]="semesterRows()" dataKey="semester" styleClass="p-datatable-sm" [tableStyle]="{ 'min-width': '28rem' }">
                                <ng-template pTemplate="header">
                                    <tr>
                                        <th>Semester</th>
                                        <th>Academic year</th>
                                        <th class="text-right">Enrolled</th>
                                        <th>Status</th>
                                    </tr>
                                </ng-template>
                                <ng-template pTemplate="body" let-row>
                                    <tr>
                                        <td>{{ row.semester }}</td>
                                        <td>{{ row.academicYear }}</td>
                                        <td class="text-right font-medium">{{ row.enrolled }}</td>
                                        <td><app-status-tag [status]="row.status" /></td>
                                    </tr>
                                </ng-template>
                            </p-table>
                        </div>
                    </p-card>
                </div>
            }
        </section>

        <p-toast />
    `
})
export class ReportsList {
    private readonly core = inject(CoreDataService);
    private readonly reports = inject(ReportService);
    private readonly msg = inject(MessageService);

    // ── Filter state ─────────────────────────────────────────────────────────
    readonly fromDate = signal<Date | null>(null);
    readonly toDate = signal<Date | null>(null);
    readonly departmentId = signal<string | null>(null);
    readonly programId = signal<string | null>(null);
    readonly semesterId = signal<string | null>(null);

    private readonly isoFrom = computed(() => this.toIso(this.fromDate()));
    private readonly isoTo = computed(() => this.toIso(this.toDate()));

    readonly filter = computed<ReportFilter>(() => ({
        from: this.isoFrom(),
        to: this.isoTo(),
        departmentId: this.departmentId(),
        programId: this.programId(),
        semesterId: this.semesterId()
    }));

    // ── Filter option sources ────────────────────────────────────────────────
    private readonly departmentMap = computed(() => new Map<string, Department>(this.core.departments().map((d) => [d.id, d])));
    private readonly programMap = computed(() => new Map<string, Program>(this.core.programs().map((p) => [p.id, p])));
    private readonly semesterMap = computed(() => new Map<string, Semester>(this.core.semesters().map((s) => [s.id, s])));

    readonly departmentOptions = computed<Option[]>(() => this.core.departments().map((d) => ({ label: d.name, value: d.id })));
    readonly semesterOptions = computed<Option[]>(() => this.core.semesters().map((s) => ({ label: s.name, value: s.id })));
    readonly programOptions = computed<Option[]>(() => {
        const department = this.departmentId();
        const programs = department ? this.core.programs().filter((p) => p.departmentId === department) : this.core.programs();
        return programs.map((p) => ({ label: p.name, value: p.id }));
    });

    readonly activeFilterSummary = computed(() => {
        const parts: string[] = [];
        if (this.isoFrom() || this.isoTo()) {
            parts.push(`Dates ${this.isoFrom() ?? '…'} → ${this.isoTo() ?? '…'}`);
        }
        const department = this.departmentId();
        if (department) {
            parts.push(`Department: ${this.departmentMap().get(department)?.name ?? department}`);
        }
        const program = this.programId();
        if (program) {
            parts.push(`Program: ${this.programMap().get(program)?.name ?? program}`);
        }
        const semester = this.semesterId();
        if (semester) {
            parts.push(`Semester: ${this.semesterMap().get(semester)?.name ?? semester}`);
        }
        return parts.length ? parts.join(' · ') : 'All records';
    });

    // ── Section data (all derived in the service, reactively) ─────────────────
    readonly enrollmentRows = computed(() => this.reports.getEnrollmentByDepartmentFiltered(this.filter()));
    readonly admissionsSummary = computed(() => this.reports.getAdmissionsSummary(this.filter()));
    readonly admissionRows = computed(() => this.reports.getAdmissionsByStatus(this.filter()));
    readonly facultyRows = computed(() => this.reports.getFacultyDistributionFiltered(this.filter()));
    readonly programRows = computed(() => this.reports.getProgramSummaryFiltered(this.filter()));
    readonly courseRows = computed(() => this.reports.getCourseSummaryFiltered(this.filter()));
    readonly attendanceRows = computed(() => this.reports.getAttendanceFiltered(this.filter()));
    readonly examRows = computed(() => this.reports.getExamPerformanceFiltered(this.filter()));
    readonly feeSummary = computed(() => this.reports.getFeeCollectionSummary(this.filter()));
    readonly semesterRows = computed(() => this.reports.getSemesterCountsFiltered(this.filter()));

    readonly activeFacultyCount = computed(() => this.facultyRows().reduce((sum, r) => sum + r.count, 0));

    readonly kpis = computed(() => ({
        totalStudents: this.enrollmentRows().reduce((sum, r) => sum + r.count, 0),
        conversionRate: this.admissionsSummary().conversionRate,
        collected: this.feeSummary().collected,
        outstanding: this.feeSummary().outstanding
    }));

    // ── Chart data ───────────────────────────────────────────────────────────
    private readonly palette = ['#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#ef4444', '#14b8a6', '#a855f7', '#f97316'];

    readonly barOptions = { scales: { y: { beginAtZero: true } } } as unknown as ChartOptions;
    readonly percentOptions = { scales: { y: { beginAtZero: true, max: 100 } } } as unknown as ChartOptions;
    readonly feeOptions = {
        scales: { y: { beginAtZero: true } },
        plugins: { legend: { display: false } }
    } as unknown as ChartOptions;

    readonly enrollmentChartData = computed<ChartData>(() => {
        const rows = this.enrollmentRows();
        return {
            labels: rows.map((r) => r.code),
            datasets: [{ label: 'Students', data: rows.map((r) => r.count), backgroundColor: 'rgba(59,130,246,0.75)', borderColor: '#3b82f6', borderWidth: 1 }]
        } as unknown as ChartData;
    });

    readonly admissionsChartData = computed<ChartData>(() => {
        const rows = this.admissionRows();
        return {
            labels: rows.map((r) => r.label),
            datasets: [{ label: 'Applications', data: rows.map((r) => r.count), backgroundColor: this.palette.slice(0, rows.length) }]
        } as unknown as ChartData;
    });

    readonly facultyChartData = computed<ChartData>(() => {
        const rows = this.facultyRows();
        return {
            labels: rows.map((r) => r.code),
            datasets: [{ label: 'Faculty', data: rows.map((r) => r.count), backgroundColor: 'rgba(16,185,129,0.75)', borderColor: '#10b981', borderWidth: 1 }]
        } as unknown as ChartData;
    });

    readonly programChartData = computed<ChartData>(() => {
        const rows = this.programRows();
        return {
            labels: rows.map((r) => r.code),
            datasets: [{ label: 'Enrolled', data: rows.map((r) => r.enrolled), backgroundColor: 'rgba(99,102,241,0.75)', borderColor: '#6366f1', borderWidth: 1 }]
        } as unknown as ChartData;
    });

    readonly courseChartData = computed<ChartData>(() => {
        const rows = this.courseRows();
        return {
            labels: rows.map((r) => r.code),
            datasets: [{ label: 'Enrolled', data: rows.map((r) => r.enrolled), backgroundColor: 'rgba(20,184,166,0.75)', borderColor: '#14b8a6', borderWidth: 1 }]
        } as unknown as ChartData;
    });

    readonly attendanceChartData = computed<ChartData>(() => {
        const rows = this.attendanceRows();
        return {
            labels: rows.map((r) => r.code),
            datasets: [{ label: 'Attendance %', data: rows.map((r) => Number(r.percent.toFixed(1))), backgroundColor: 'rgba(245,158,11,0.75)', borderColor: '#f59e0b', borderWidth: 1 }]
        } as unknown as ChartData;
    });

    readonly examChartData = computed<ChartData>(() => {
        const rows = this.examRows();
        return {
            labels: rows.map((r) => r.exam),
            datasets: [
                { label: 'Avg marks', data: rows.map((r) => Number(r.avgMarks.toFixed(1))), backgroundColor: 'rgba(59,130,246,0.75)' },
                { label: 'Pass rate %', data: rows.map((r) => Number(r.passRate.toFixed(1))), backgroundColor: 'rgba(16,185,129,0.75)' }
            ]
        } as unknown as ChartData;
    });

    readonly feeChartData = computed<ChartData>(() => {
        const summary = this.feeSummary();
        return {
            labels: ['Collected', 'Outstanding'],
            datasets: [{ label: 'Amount', data: [summary.collected, summary.outstanding], backgroundColor: ['rgba(16,185,129,0.8)', 'rgba(245,158,11,0.8)'] }]
        } as unknown as ChartData;
    });

    readonly feeMethodChartData = computed<ChartData>(() => {
        const rows = this.feeSummary().byMethod;
        return {
            labels: rows.map((r) => r.label),
            datasets: [{ label: 'Amount', data: rows.map((r) => r.amount), backgroundColor: this.palette.slice(0, rows.length) }]
        } as unknown as ChartData;
    });

    readonly semesterChartData = computed<ChartData>(() => {
        const rows = this.semesterRows();
        return {
            labels: rows.map((r) => r.semester),
            datasets: [{ label: 'Enrolled', data: rows.map((r) => r.enrolled), backgroundColor: 'rgba(168,85,247,0.75)', borderColor: '#a855f7', borderWidth: 1 }]
        } as unknown as ChartData;
    });

    // ── Header helpers ───────────────────────────────────────────────────────
    readonly universityName = computed(() => this.core.getSettings().universityName);
    readonly todayLabel = computed(() => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }));

    // ── Actions ──────────────────────────────────────────────────────────────
    onDepartmentChange(value: string | null): void {
        this.departmentId.set(value ?? null);
        const program = this.programId();
        if (program && !this.programOptions().some((o) => o.value === program)) {
            this.programId.set(null);
        }
    }

    clearFilters(): void {
        this.fromDate.set(null);
        this.toDate.set(null);
        this.departmentId.set(null);
        this.programId.set(null);
        this.semesterId.set(null);
    }

    printReport(): void {
        window.print();
    }

    exportEnrollment(): void {
        this.reports.exportEnrollment(this.enrollmentRows());
        this.toastExported('Enrollment by department', this.enrollmentRows().length);
    }

    exportAdmissions(): void {
        this.reports.exportAdmissionRows(this.admissionsSummary(), this.admissionRows());
        this.toastExported('Admissions', this.admissionRows().length);
    }

    exportFaculty(): void {
        this.reports.exportFaculty(this.facultyRows());
        this.toastExported('Faculty distribution', this.facultyRows().length);
    }

    exportPrograms(): void {
        this.reports.exportPrograms(this.programRows());
        this.toastExported('Program summary', this.programRows().length);
    }

    exportCourses(): void {
        this.reports.exportCourses(this.courseRows());
        this.toastExported('Course summary', this.courseRows().length);
    }

    exportAttendance(): void {
        this.reports.exportAttendance(this.attendanceRows());
        this.toastExported('Attendance', this.attendanceRows().length);
    }

    exportExamPerformance(): void {
        this.reports.exportExamPerformance(this.examRows());
        this.toastExported('Exam performance', this.examRows().length);
    }

    exportFees(): void {
        this.reports.exportFees(this.feeSummary());
        this.toastExported('Fee collection', this.feeSummary().byMethod.length);
    }

    exportSemesters(): void {
        this.reports.exportSemesters(this.semesterRows());
        this.toastExported('Semester counts', this.semesterRows().length);
    }

    // ── Display helpers ──────────────────────────────────────────────────────
    formatCurrency(amount: number): string {
        const currency = this.core.getSettings().currency;
        try {
            return new Intl.NumberFormat('en-BD', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
        } catch {
            return `${currency} ${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
        }
    }

    formatPercent(value: number): string {
        return `${value.toFixed(1)}%`;
    }

    // ── Private helpers ──────────────────────────────────────────────────────
    private toIso(value: Date | null): string | null {
        if (!value) {
            return null;
        }
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, '0');
        const day = String(value.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    private toastExported(section: string, count: number): void {
        this.msg.add({ severity: 'success', summary: 'CSV exported', detail: `${section}: ${count} row(s) exported.` });
    }
}
