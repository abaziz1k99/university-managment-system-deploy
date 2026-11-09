import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, ChartData, ChartOptions, ChartType, registerables } from 'chart.js';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

Chart.register(...registerables);

@Component({
    selector: 'app-chart-card',
    standalone: true,
    imports: [CommonModule, ProgressSpinnerModule],
    template: `
        <div class="bg-surface-0 dark:bg-surface-900 p-4 rounded-xl border border-surface-200 dark:border-surface-700 h-full">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold text-surface-900 dark:text-surface-0">{{ title }}</h3>
                @if (subtitle) {
                    <p class="text-sm text-muted-color">{{ subtitle }}</p>
                }
            </div>
            @if (!loading) {
                <div class="relative h-64">
                    <canvas #chartCanvas></canvas>
                </div>
            } @else {
                <div class="relative h-64 flex items-center justify-center">
                    <p-progressSpinner></p-progressSpinner>
                </div>
            }
        </div>
    `
})
export class ChartCard implements AfterViewInit, OnChanges, OnDestroy {
    @ViewChild('chartCanvas') canvasRef?: ElementRef<HTMLCanvasElement>;

    @Input() title = '';
    @Input() subtitle = '';
    @Input() type: ChartType = 'line';
    @Input() data: ChartData = { labels: [], datasets: [] };
    @Input() options: ChartOptions = {};
    @Input() loading = false;

    private chart?: Chart;
    private viewReady = false;

    ngAfterViewInit(): void {
        this.viewReady = true;
        if (!this.loading) this.createChart();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (!this.viewReady) return;
        if (changes['loading']) {
            if (this.loading) {
                this.chart?.destroy();
                this.chart = undefined;
            } else {
                setTimeout(() => this.createChart());
            }
            return;
        }
        if (this.chart && (changes['data'] || changes['options'] || changes['type'])) {
            this.chart.data = this.data;
            this.chart.options = this.getOptions();
            (this.chart.config as { type: ChartType }).type = this.type;
            this.chart.update();
        }
    }

    ngOnDestroy(): void {
        this.chart?.destroy();
    }

    private createChart(): void {
        if (this.chart) this.chart.destroy();
        const canvas = this.canvasRef?.nativeElement;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        this.chart = new Chart(ctx, {
            type: this.type,
            data: this.data,
            options: this.getOptions()
        } as ChartConfiguration);
    }

    private getOptions(): ChartOptions {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { usePointStyle: true, padding: 20, font: { size: 12 } }
                },
                tooltip: {
                    backgroundColor: 'var(--surface-900)',
                    titleFont: { size: 13 },
                    bodyFont: { size: 12 },
                    padding: 12,
                    cornerRadius: 8
                }
            },
            ...this.options
        };
    }
}
