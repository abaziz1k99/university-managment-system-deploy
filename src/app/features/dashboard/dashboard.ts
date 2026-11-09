import { Component, inject, OnInit } from '@angular/core';
import { CardModule } from 'primeng/card';
import { StatCard } from '@/app/shared/components/stat-card';
import { PageHeader } from '@/app/shared/components/page-header';
import { ChartCard } from '@/app/shared/components/chart-card';
import { DashboardService } from '@/app/core/services/dashboard.service';
import { formatDate } from '@/app/core/utils/util';
import type { ChartData, ChartOptions, ChartType } from 'chart.js';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CardModule, StatCard, PageHeader, ChartCard],
    template: `
        <app-page-header title="Infinity University Management" subtitle="University Administration Dashboard" />

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-fr">
            @for (metric of metrics; track metric.id) {
                <app-stat-card [label]="metric.label" [value]="metric.value" [delta]="metric.delta" [context]="metric.context" [icon]="metric.icon"></app-stat-card>
            }
        </div>

        <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-fr">
            @for (chart of charts; track chart.id) {
                <app-chart-card [title]="chart.title" [subtitle]="chart.subtitle ?? ''" [type]="chart.type" [data]="chart.data" [options]="chart.options"></app-chart-card>
            }
        </div>
    `
})
export class Dashboard implements OnInit {
    private readonly ds = inject(DashboardService);

    metrics: { id: string; label: string; value: unknown; context?: string; delta?: number; icon?: string }[] = [];

    charts: { id: string; title: string; subtitle?: string; type: ChartType; data: ChartData; options: ChartOptions }[] = [
        { id: 'enrollment-trend', title: 'Enrollment Trend', subtitle: 'by month', type: 'line' as ChartType, data: { labels: [], datasets: [{ label: 'Students', data: [], fill: false, borderColor: 'var(--primary-color)', backgroundColor: 'rgba(33, 150, 243, 0.2)', tension: 0.1 }] } as unknown as ChartData, options: { scales: { y: { beginAtZero: true } } } as unknown as ChartOptions },
        { id: 'department-distribution', title: 'Department Distribution', type: 'doughnut' as ChartType, data: { labels: [], datasets: [{ data: [], backgroundColor: ['#10b981', '#f59e0b', '#6366f1', '#a855f7'] }] } as unknown as ChartData, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' as const } } } as unknown as ChartOptions },
        { id: 'fee-chart', title: 'Fee Collection', subtitle: 'collected vs outstanding', type: 'bar' as ChartType, data: { labels: ['Collected', 'Outstanding'], datasets: [{ label: 'BDT', data: [0, 0], backgroundColor: ['rgba(33, 150, 243, 0.8)', '#f59e0b'] }] } as unknown as ChartData, options: { scales: { y: { beginAtZero: true } } } as unknown as ChartOptions },
        { id: 'student-status', title: 'Student Status', subtitle: 'status breakdown', type: 'doughnut' as ChartType, data: { labels: ['active', 'inactive', 'graduated', 'suspended', 'withdrawn'], datasets: [{ data: [], backgroundColor: ['#10b981', '#f59e0b', '#6366f1', '#f97316', '#ef4444'] }] } as unknown as ChartData, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' as const } } } as unknown as ChartOptions }
    ];

    ngOnInit(): void {
        this.loadMetrics();
        this.loadCharts();
    }

    private loadMetrics(): void {
        const summary = this.ds.getSummary();
        this.metrics = [
            { id: 'total-students', label: 'Total Students', value: summary.totalStudents, context: 'across all departments' },
            { id: 'active-students', label: 'Active', value: summary.activeStudents, context: 'ACTIVE / INACTIVE' },
            { id: 'faculty', label: 'Faculty & Staff', value: summary.faculty, context: 'active' },
            { id: 'departments', label: 'Departments', value: summary.departments, context: '' },
            { id: 'programs', label: 'Programs', value: summary.activePrograms, context: 'active programs' },
            { id: 'courses', label: 'Courses', value: summary.courses, context: '' },
            { id: 'pending-admissions', label: 'Pending Admissions', value: summary.pendingAdmissions, context: 'submitted + under review' },
            { id: 'outstanding-fees', label: 'Outstanding Fees', value: this.formatCurrency(summary.outstandingFees), context: 'currency' }
        ];
    }

    private loadCharts(): void {
        const summary = this.ds.getSummary();
        // Enrollment trend - last 6 months from seed data
        const trend = this.ds.getEnrollmentTrend();
        this.charts[0].data = { labels: trend.labels, datasets: [{ label: 'Students', data: trend.values, fill: false, borderColor: 'var(--primary-color)', backgroundColor: 'rgba(33, 150, 243, 0.2)', tension: 0.1 }] } as unknown as ChartData;

        // Department distribution
        const dist = this.ds.getDepartmentDistribution();
        this.charts[1].data = { labels: dist.map((d: { label: string; value: number }) => d.label), datasets: [{ data: dist.map((d: { label: string; value: number }) => d.value), backgroundColor: ['#10b981', '#f59e0b', '#6366f1', '#a855f7'] }] } as unknown as ChartData;

        // Fee chart
        this.charts[2].data = { labels: ['Collected', 'Outstanding'], datasets: [{ label: 'BDT', data: [summary.collectedFees, summary.outstandingFees], backgroundColor: ['rgba(33, 150, 243, 0.8)', '#f59e0b'] }] } as unknown as ChartData;

        // Student status distribution
        const statusDist = this.ds.getStudentStatusDistribution();
        this.charts[3].data = { labels: statusDist.map((s: { label: string; value: number }) => s.label), datasets: [{ data: statusDist.map((s: { label: string; value: number }) => s.value), backgroundColor: ['#10b981', '#f59e0b', '#6366f1', '#f97316', '#ef4444'] }] } as unknown as ChartData;
    }

    private formatCurrency(amount: number): string {
        return amount.toLocaleString('en-BD', { style: 'currency', currency: 'BDT' });
    }
}
