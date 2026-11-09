import { inject, Injectable } from '@angular/core';
import { CoreDataService } from '@/app/core/services/core-data.service';
import { SystemSettings, GradeScaleEntry } from '@/app/core/models/index';

@Injectable({
    providedIn: 'root'
})
export class SettingsService {
    protected readonly core = inject(CoreDataService);

    get() {
        return this.core.getSettings();
    }

    update(patch: Partial<SystemSettings>): SystemSettings {
        this.core.updateSettings(patch);
        return this.core.getSettings();
    }

    save(settings: SystemSettings): SystemSettings {
        this.core.updateSettings(settings);
        return this.core.getSettings();
    }

    updateGradingScale(scale: GradeScaleEntry[]): void {
        const sorted = [...scale].sort((a, b) => b.minPercent - a.minPercent);
        const overlap = sorted.some((g, i) => i < sorted.length - 1 && g.minPercent <= sorted[i + 1].minPercent);
        if (overlap) {
            throw new Error('Grading scale entries must have strictly decreasing minPercent values.');
        }
        this.core.updateSettings({ gradingScale: sorted });
    }

    reset(): void {
        this.core.resetDemoData();
    }
}