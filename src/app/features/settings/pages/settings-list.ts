import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { TextareaModule } from 'primeng/textarea';
import { TableModule } from 'primeng/table';
import { TabsModule } from 'primeng/tabs';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { PageHeader } from '@/app/shared/components/page-header';
import { CoreDataService, type Store } from '@/app/core/services/core-data.service';
import { SettingsService } from '@/app/core/services/settings.service';
import type { GradeScaleEntry, SystemSettings } from '@/app/core/models/index';

interface SelectOption<T> {
    label: string;
    value: T;
}

type GradeLetter = GradeScaleEntry['grade'];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const GRADE_LETTERS: GradeLetter[] = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'];

const WEEK_DAYS: string[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DEFAULT_GRADING_SCALE: GradeScaleEntry[] = [
    { grade: 'A+', minPercent: 80, gradePoint: 4.0 },
    { grade: 'A', minPercent: 75, gradePoint: 3.75 },
    { grade: 'A-', minPercent: 70, gradePoint: 3.5 },
    { grade: 'B+', minPercent: 65, gradePoint: 3.25 },
    { grade: 'B', minPercent: 60, gradePoint: 3.0 },
    { grade: 'B-', minPercent: 55, gradePoint: 2.75 },
    { grade: 'C+', minPercent: 50, gradePoint: 2.5 },
    { grade: 'C', minPercent: 45, gradePoint: 2.25 },
    { grade: 'C-', minPercent: 40, gradePoint: 2.0 },
    { grade: 'D', minPercent: 33, gradePoint: 1.0 },
    { grade: 'F', minPercent: 0, gradePoint: 0.0 }
];

interface GradePreviewRow extends GradeScaleEntry {
    rangeLabel: string;
}

@Component({
    selector: 'app-settings-list',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        CardModule,
        ButtonModule,
        InputTextModule,
        InputNumberModule,
        SelectModule,
        MultiSelectModule,
        TextareaModule,
        TableModule,
        TabsModule,
        MessageModule,
        ToastModule,
        ConfirmDialogModule,
        TooltipModule,
        PageHeader
    ],
    providers: [ConfirmationService, MessageService],
    template: `
        <app-page-header title="Settings" subtitle="Configure the institution profile, academic term, grading scale and system preferences">
            <p-button label="Reload" icon="pi pi-refresh" severity="secondary" [outlined]="true" pTooltip="Reload the stored settings" tooltipPosition="bottom" (onClick)="reload()"></p-button>
        </app-page-header>

        <!-- Current settings summary -->
        <p-card styleClass="mb-4">
            <div class="flex flex-col lg:flex-row lg:items-center gap-4">
                <div class="flex items-center gap-3 min-w-0">
                    @if (showLogo()) {
                        <img
                            [src]="form().logoUrl"
                            alt="University logo"
                            class="w-16 h-16 rounded-lg object-contain bg-surface-0 border border-surface-200 dark:border-surface-700 p-1"
                            (error)="logoError.set(true)" />
                    } @else {
                        <div class="w-16 h-16 rounded-lg flex items-center justify-center text-xl font-bold bg-primary-50 text-primary dark:bg-primary-950 shrink-0">
                            {{ schoolInitials() }}
                        </div>
                    }
                    <div class="min-w-0">
                        <div class="text-lg font-semibold truncate">{{ form().universityName || 'Untitled university' }}</div>
                        <div class="text-xs text-muted-color truncate">
                            {{ form().universityShortName || '—' }}
                            @if (form().contactEmail) {
                                <span> · {{ form().contactEmail }}</span>
                            }
                        </div>
                        <div class="text-[11px] text-muted-color mt-0.5">
                            <i class="pi pi-clock text-[10px]"></i>
                            Last updated {{ lastUpdatedLabel() }}
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto lg:ml-auto">
                    <div class="rounded border border-surface-200 dark:border-surface-700 p-2.5">
                        <div class="text-[11px] text-muted-color uppercase tracking-wide">Academic Year</div>
                        <div class="text-sm font-semibold mt-0.5 truncate">{{ form().currentAcademicYear || '—' }}</div>
                    </div>
                    <div class="rounded border border-surface-200 dark:border-surface-700 p-2.5">
                        <div class="text-[11px] text-muted-color uppercase tracking-wide">Current Semester</div>
                        <div class="text-sm font-semibold mt-0.5 truncate">{{ currentSemesterName() }}</div>
                    </div>
                    <div class="rounded border border-surface-200 dark:border-surface-700 p-2.5">
                        <div class="text-[11px] text-muted-color uppercase tracking-wide">Currency</div>
                        <div class="text-sm font-semibold mt-0.5">{{ form().currency || '—' }}</div>
                    </div>
                    <div class="rounded border border-surface-200 dark:border-surface-700 p-2.5">
                        <div class="text-[11px] text-muted-color uppercase tracking-wide">Attendance ≥</div>
                        <div class="text-sm font-semibold mt-0.5">{{ form().attendanceThreshold }}%</div>
                    </div>
                </div>
            </div>
        </p-card>

        <p-tabs [value]="activeTab()" (valueChange)="activeTab.set($event)" [scrollable]="true">
            <p-tablist>
                <p-tab value="profile"><i class="pi pi-building mr-2"></i>University Profile</p-tab>
                <p-tab value="academic"><i class="pi pi-calendar mr-2"></i>Academic</p-tab>
                <p-tab value="grading"><i class="pi pi-list-check mr-2"></i>Grading Scale</p-tab>
                <p-tab value="preferences"><i class="pi pi-sliders-h mr-2"></i>Preferences</p-tab>
                <p-tab value="data"><i class="pi pi-database mr-2"></i>Data</p-tab>
            </p-tablist>

            <p-tabpanels>
                <!-- ── University Profile ─────────────────────────────────── -->
                <p-tabpanel value="profile">
                    <div class="pt-4 max-w-4xl">
                        <h2 class="text-lg font-semibold mb-1">University Profile</h2>
                        <p class="text-sm text-muted-color mb-5">Public identity and contact details shown across the portal.</p>

                        <div class="flex flex-col sm:flex-row gap-5">
                            <div class="flex flex-col items-center gap-2 shrink-0">
                                @if (showLogo()) {
                                    <img
                                        [src]="form().logoUrl"
                                        alt="University logo preview"
                                        class="w-24 h-24 rounded-lg object-contain bg-surface-0 border border-surface-200 dark:border-surface-700 p-2"
                                        (error)="logoError.set(true)" />
                                } @else {
                                    <div class="w-24 h-24 rounded-lg flex items-center justify-center text-3xl font-bold bg-primary-50 text-primary dark:bg-primary-950">
                                        {{ schoolInitials() }}
                                    </div>
                                }
                                <span class="text-[11px] text-muted-color">Logo preview</span>
                            </div>

                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm font-medium" for="universityName">University Name *</label>
                                    <input id="universityName" pInputText type="text" placeholder="e.g. UniManage University" [ngModel]="form().universityName" (ngModelChange)="patch({ universityName: $event })" />
                                    @if (profileNameError()) {
                                        <small class="text-red-500">{{ profileNameError() }}</small>
                                    }
                                </div>
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm font-medium" for="universityShortName">Short Name / Abbreviation</label>
                                    <input id="universityShortName" pInputText type="text" placeholder="e.g. UMU" [ngModel]="form().universityShortName" (ngModelChange)="patch({ universityShortName: $event })" />
                                    <small class="text-muted-color">Used in the logo placeholder and compact headers.</small>
                                </div>
                                <div class="flex flex-col gap-1.5 sm:col-span-2">
                                    <label class="text-sm font-medium" for="logoUrl">Logo URL</label>
                                    <input id="logoUrl" pInputText type="text" placeholder="https://example.com/logo.png" [ngModel]="form().logoUrl" (ngModelChange)="onLogoUrlChange($event)" />
                                    <small class="text-muted-color">Paste a hosted image URL. Leave empty to show the initials placeholder.</small>
                                </div>
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm font-medium" for="contactEmail">Contact Email</label>
                                    <input id="contactEmail" pInputText type="email" placeholder="info@university.edu" [ngModel]="form().contactEmail" (ngModelChange)="patch({ contactEmail: $event })" />
                                    @if (profileEmailError()) {
                                        <small class="text-red-500">{{ profileEmailError() }}</small>
                                    }
                                </div>
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm font-medium" for="contactPhone">Contact Phone</label>
                                    <input id="contactPhone" pInputText type="tel" placeholder="+880 9612 000000" [ngModel]="form().contactPhone" (ngModelChange)="patch({ contactPhone: $event })" />
                                </div>
                                <div class="flex flex-col gap-1.5 sm:col-span-2">
                                    <label class="text-sm font-medium" for="address">Address</label>
                                    <textarea id="address" pTextarea rows="3" placeholder="Street, city, postal code, country" [ngModel]="form().address" (ngModelChange)="patch({ address: $event })" class="w-full"></textarea>
                                </div>
                            </div>
                        </div>

                        <div class="flex justify-end gap-2 mt-6">
                            <p-button label="Discard Changes" severity="secondary" [text]="true" (onClick)="reload()"></p-button>
                            <p-button label="Save Profile" icon="pi pi-save" (onClick)="saveProfile()"></p-button>
                        </div>
                    </div>
                </p-tabpanel>

                <!-- ── Academic ──────────────────────────────────────────── -->
                <p-tabpanel value="academic">
                    <div class="pt-4 max-w-3xl">
                        <h2 class="text-lg font-semibold mb-1">Academic Term</h2>
                        <p class="text-sm text-muted-color mb-5">Select the current academic year and the active semester used for enrollment defaults.</p>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div class="flex flex-col gap-1.5">
                                <label class="text-sm font-medium">Current Academic Year *</label>
                                <p-select
                                    [ngModel]="form().currentAcademicYear"
                                    (ngModelChange)="patch({ currentAcademicYear: $event })"
                                    [options]="academicYearOptions()"
                                    optionLabel="label"
                                    optionValue="value"
                                    placeholder="Select or type a year"
                                    [editable]="true"
                                    [filter]="true"
                                    filterBy="label"
                                    appendTo="body"
                                    styleClass="w-full">
                                </p-select>
                                <small class="text-muted-color">Format YYYY-YY (e.g. 2025-26).</small>
                            </div>

                            <div class="flex flex-col gap-1.5">
                                <label class="text-sm font-medium">Current Semester</label>
                                <p-select
                                    [ngModel]="form().currentSemesterId"
                                    (ngModelChange)="patch({ currentSemesterId: $event })"
                                    [options]="semesterOptions()"
                                    optionLabel="label"
                                    optionValue="value"
                                    placeholder="Select the active semester"
                                    [showClear]="true"
                                    [filter]="true"
                                    filterBy="label"
                                    appendTo="body"
                                    styleClass="w-full">
                                </p-select>
                                <small class="text-muted-color">Semesters are managed under the Semesters module.</small>
                            </div>
                        </div>

                        <p-message severity="info" icon="pi pi-info-circle" styleClass="w-full mt-5">
                            The current semester is used as the default when registering students and creating fee accounts.
                        </p-message>

                        <div class="flex justify-end gap-2 mt-6">
                            <p-button label="Discard Changes" severity="secondary" [text]="true" (onClick)="reload()"></p-button>
                            <p-button label="Save Academic" icon="pi pi-save" (onClick)="saveAcademic()"></p-button>
                        </div>
                    </div>
                </p-tabpanel>

                <!-- ── Grading Scale ─────────────────────────────────────── -->
                <p-tabpanel value="grading">
                    <div class="pt-4">
                        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1">
                            <h2 class="text-lg font-semibold">Grading Scale</h2>
                            <p-button label="Reset to Default" icon="pi pi-undo" severity="secondary" [outlined]="true" size="small" pTooltip="Load the standard grading scale" tooltipPosition="bottom" (onClick)="resetGradingDefault()"></p-button>
                        </div>
                        <p class="text-sm text-muted-color mb-5">Each grade maps a minimum percentage to a grade point. Minimum percentages must be unique and strictly decreasing; grade points range from 0 to 4.</p>

                        @if (gradingErrors().length > 0) {
                            <div class="rounded border border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800 px-3 py-2 mb-4">
                                @for (err of gradingErrors(); track $index) {
                                    <div class="text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
                                        <i class="pi pi-exclamation-circle text-xs mt-1"></i>
                                        <span>{{ err }}</span>
                                    </div>
                                }
                            </div>
                        }

                        <div class="grid grid-cols-1 xl:grid-cols-3 gap-5">
                            <!-- Editor table -->
                            <div class="xl:col-span-2">
                                <div class="overflow-x-auto">
                                    <p-table [value]="gradingRows()" dataKey="grade" [tableStyle]="{ 'min-width': '32rem' }" styleClass="w-full">
                                        <ng-template pTemplate="header">
                                            <tr>
                                                <th style="width:9rem">Grade</th>
                                                <th style="width:11rem">Min %</th>
                                                <th style="width:11rem">Grade Point</th>
                                                <th style="width:5rem"></th>
                                            </tr>
                                        </ng-template>
                                        <ng-template pTemplate="body" let-row let-i="rowIndex">
                                            <tr>
                                                <td>
                                                    <p-select
                                                        [ngModel]="row.grade"
                                                        (ngModelChange)="updateGrade(i, { grade: $event })"
                                                        [options]="gradeOptions"
                                                        optionLabel="label"
                                                        optionValue="value"
                                                        appendTo="body"
                                                        styleClass="w-full">
                                                    </p-select>
                                                </td>
                                                <td>
                                                    <p-inputnumber
                                                        [ngModel]="row.minPercent"
                                                        (ngModelChange)="updateGrade(i, { minPercent: $event })"
                                                        [min]="0"
                                                        [max]="100"
                                                        [showButtons]="true"
                                                        suffix="%"
                                                        styleClass="w-full"
                                                        inputStyleClass="w-full">
                                                    </p-inputnumber>
                                                </td>
                                                <td>
                                                    <p-inputnumber
                                                        [ngModel]="row.gradePoint"
                                                        (ngModelChange)="updateGrade(i, { gradePoint: $event })"
                                                        [min]="0"
                                                        [max]="4"
                                                        [step]="0.05"
                                                        [minFractionDigits]="2"
                                                        [maxFractionDigits]="2"
                                                        [showButtons]="true"
                                                        styleClass="w-full"
                                                        inputStyleClass="w-full">
                                                    </p-inputnumber>
                                                </td>
                                                <td class="text-center">
                                                    <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger" size="small" pTooltip="Remove row" tooltipPosition="left" (onClick)="removeGradeRow(i)"></p-button>
                                                </td>
                                            </tr>
                                        </ng-template>
                                        <ng-template pTemplate="emptymessage">
                                            <tr>
                                                <td colspan="4" class="text-center py-6 text-muted-color">No grade rows yet. Add a row to begin.</td>
                                            </tr>
                                        </ng-template>
                                    </p-table>
                                </div>

                                <div class="mt-3">
                                    <p-button label="Add Grade Row" icon="pi pi-plus" severity="secondary" [outlined]="true" size="small" (onClick)="addGradeRow()"></p-button>
                                </div>
                            </div>

                            <!-- Live preview -->
                            <div>
                                <div class="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden">
                                    <div class="px-3 py-2 bg-surface-50 dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700 flex items-center gap-2">
                                        <i class="pi pi-eye text-primary text-xs"></i>
                                        <span class="text-sm font-semibold">Live Preview</span>
                                    </div>
                                    @if (gradingPreview().length === 0) {
                                        <div class="p-3 text-sm text-muted-color">Add grade rows to see the mapping.</div>
                                    } @else {
                                        @for (preview of gradingPreview(); track $index) {
                                            <div class="flex items-center justify-between px-3 py-2 border-b last:border-b-0 border-surface-100 dark:border-surface-800">
                                                <span class="text-sm font-mono">{{ preview.rangeLabel }}</span>
                                                <span class="inline-flex items-center gap-2">
                                                    <span class="font-semibold">{{ preview.grade }}</span>
                                                    <span class="text-xs text-muted-color">{{ preview.gradePoint.toFixed(2) }}</span>
                                                </span>
                                            </div>
                                        }
                                    }
                                </div>
                                <p class="text-xs text-muted-color mt-2">Applied when deriving letter grades and GPA from marks in the Results module.</p>
                            </div>
                        </div>

                        <div class="flex justify-end gap-2 mt-6">
                            <p-button label="Discard Changes" severity="secondary" [text]="true" (onClick)="reload()"></p-button>
                            <p-button label="Save Grading Scale" icon="pi pi-save" (onClick)="saveGrading()"></p-button>
                        </div>
                    </div>
                </p-tabpanel>

                <!-- ── Preferences ───────────────────────────────────────── -->
                <p-tabpanel value="preferences">
                    <div class="pt-4 max-w-4xl">
                        <h2 class="text-lg font-semibold mb-1">General Preferences</h2>
                        <p class="text-sm text-muted-color mb-5">Defaults used across attendance, the class routine and currency formatting.</p>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div class="flex flex-col gap-1.5">
                                <label class="text-sm font-medium">Attendance Threshold (%)</label>
                                <p-inputnumber
                                    [ngModel]="form().attendanceThreshold"
                                    (ngModelChange)="patch({ attendanceThreshold: $event ?? 0 })"
                                    [min]="0"
                                    [max]="100"
                                    [showButtons]="true"
                                    suffix="%"
                                    styleClass="w-full"
                                    inputStyleClass="w-full">
                                </p-inputnumber>
                                <small class="text-muted-color">Students below this attendance percentage are flagged. Default 75.</small>
                            </div>

                            <div class="flex flex-col gap-1.5">
                                <label class="text-sm font-medium">Currency</label>
                                <p-select
                                    [ngModel]="form().currency"
                                    (ngModelChange)="patch({ currency: $event })"
                                    [options]="currencyOptions"
                                    optionLabel="label"
                                    optionValue="value"
                                    appendTo="body"
                                    styleClass="w-full">
                                </p-select>
                            </div>

                            <div class="flex flex-col gap-1.5">
                                <label class="text-sm font-medium">Date Format</label>
                                <p-select
                                    [ngModel]="form().dateFormat"
                                    (ngModelChange)="patch({ dateFormat: $event })"
                                    [options]="dateFormatOptions"
                                    optionLabel="label"
                                    optionValue="value"
                                    appendTo="body"
                                    styleClass="w-full">
                                </p-select>
                            </div>

                            <div class="flex flex-col gap-1.5">
                                <label class="text-sm font-medium">Visible Days</label>
                                <p-multiselect
                                    [ngModel]="form().visibleWeekendDays"
                                    (ngModelChange)="patch({ visibleWeekendDays: $event })"
                                    [options]="dayOptions"
                                    optionLabel="label"
                                    optionValue="value"
                                    placeholder="Select days shown in the routine"
                                    [showToggleAll]="true"
                                    display="chip"
                                    appendTo="body"
                                    styleClass="w-full">
                                </p-multiselect>
                                <small class="text-muted-color">Days displayed in the weekly routine grid.</small>
                            </div>

                            <div class="flex flex-col gap-1.5 sm:col-span-2">
                                <label class="text-sm font-medium">Weekend Days</label>
                                <p-multiselect
                                    [ngModel]="form().weekendDays"
                                    (ngModelChange)="patch({ weekendDays: $event })"
                                    [options]="dayOptions"
                                    optionLabel="label"
                                    optionValue="value"
                                    placeholder="Select weekend days"
                                    [showToggleAll]="true"
                                    display="chip"
                                    appendTo="body"
                                    styleClass="w-full">
                                </p-multiselect>
                                <small class="text-muted-color">Days treated as non-working (no scheduled classes).</small>
                            </div>
                        </div>

                        <div class="flex justify-end gap-2 mt-6">
                            <p-button label="Discard Changes" severity="secondary" [text]="true" (onClick)="reload()"></p-button>
                            <p-button label="Save Preferences" icon="pi pi-save" (onClick)="savePreferences()"></p-button>
                        </div>
                    </div>
                </p-tabpanel>

                <!-- ── Data ──────────────────────────────────────────────── -->
                <p-tabpanel value="data">
                    <div class="pt-4 max-w-3xl">
                        <h2 class="text-lg font-semibold mb-1">Data Backup &amp; Reset</h2>
                        <p class="text-sm text-muted-color mb-5">Your changes are saved in this browser. Export a JSON backup to keep a portable copy, or import one to restore the records.</p>

                        <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-4 mb-5">
                            <h3 class="text-base font-semibold">Data file</h3>
                            <p class="text-sm text-muted-color mt-1">Download all university records and settings as JSON. You can also import a previously exported .json or .txt file.</p>
                            <div class="flex flex-wrap gap-2 mt-3">
                                <p-button label="Download JSON Backup" icon="pi pi-download" (onClick)="exportData()"></p-button>
                                <p-button label="Import Data File" icon="pi pi-upload" severity="secondary" [outlined]="true" (onClick)="dataFile.click()"></p-button>
                                <input #dataFile type="file" accept=".json,.txt,application/json,text/plain" class="hidden" (change)="importData($event)" />
                            </div>
                        </div>

                        <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-4 mb-5">
                            <div class="flex flex-wrap items-start justify-between gap-2 mb-3">
                                <div>
                                    <h3 class="text-base font-semibold">Audit Log</h3>
                                    <p class="text-sm text-muted-color mt-1">Recent record changes made in this prototype, with action, record and timestamp.</p>
                                </div>
                                <span class="text-xs text-muted-color">{{ auditLog().length }} recent entries</span>
                            </div>
                            @if (auditLog().length) {
                                <div class="overflow-x-auto">
                                    <p-table [value]="auditLog()" dataKey="id" [paginator]="true" [rows]="10" [rowsPerPageOptions]="[10, 25, 50]" [tableStyle]="{ 'min-width': '44rem' }" styleClass="w-full">
                                        <ng-template pTemplate="header">
                                            <tr><th>Time</th><th>Action</th><th>Record</th><th>Details</th><th>User</th></tr>
                                        </ng-template>
                                        <ng-template pTemplate="body" let-entry>
                                            <tr>
                                                <td class="whitespace-nowrap">{{ formatDateTime(entry.createdAt) }}</td>
                                                <td><span class="font-medium">{{ entry.action }}</span></td>
                                                <td>{{ entry.entity }} <span class="text-muted-color text-xs">{{ entry.entityId }}</span></td>
                                                <td>{{ entry.detail }}</td>
                                                <td>{{ auditUserName(entry.userId) }}</td>
                                            </tr>
                                        </ng-template>
                                    </p-table>
                                </div>
                            } @else {
                                <p class="text-sm text-muted-color py-4">No activity has been recorded yet.</p>
                            }
                        </div>

                        <div class="rounded-lg border border-red-300 dark:border-red-800 bg-red-50/60 dark:bg-red-950/40 p-4">
                            <div class="flex items-start gap-3">
                                <div class="w-9 h-9 rounded-lg flex items-center justify-center bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 shrink-0">
                                    <i class="pi pi-exclamation-triangle"></i>
                                </div>
                                <div class="min-w-0">
                                    <h3 class="text-base font-semibold text-red-700 dark:text-red-300">Reset Demo Data</h3>
                                    <p class="text-sm text-red-700/90 dark:text-red-300/90 mt-1">
                                        This permanently wipes <strong>all</strong> data and restores the original demo seed. Every change you have made — students, courses,
                                        results, attendance, fees, notices, users and settings — will be lost. This action cannot be undone.
                                    </p>
                                    <div class="mt-3">
                                        <p-button label="Reset Demo Data" icon="pi pi-trash" severity="danger" (onClick)="confirmResetDemo()"></p-button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </p-tabpanel>
            </p-tabpanels>
        </p-tabs>

        <p-toast></p-toast>
        <p-confirmDialog></p-confirmDialog>
    `
})
export class SettingsList {
    private readonly settingsService = inject(SettingsService);
    private readonly core = inject(CoreDataService);
    private readonly msg = inject(MessageService);
    private readonly confirm = inject(ConfirmationService);

    // ── Static option lists ────────────────────────────────────────────────────
    readonly gradeOptions: SelectOption<GradeLetter>[] = GRADE_LETTERS.map((g) => ({ label: g, value: g }));

    readonly dayOptions: SelectOption<string>[] = WEEK_DAYS.map((d) => ({ label: d, value: d }));

    readonly currencyOptions: SelectOption<string>[] = [
        { label: 'BDT — Bangladeshi Taka', value: 'BDT' },
        { label: 'USD — US Dollar', value: 'USD' },
        { label: 'EUR — Euro', value: 'EUR' },
        { label: 'GBP — Pound Sterling', value: 'GBP' },
        { label: 'INR — Indian Rupee', value: 'INR' },
        { label: 'JPY — Japanese Yen', value: 'JPY' }
    ];

    readonly dateFormatOptions: SelectOption<string>[] = [
        { label: 'YYYY-MM-DD (ISO)', value: 'YYYY-MM-DD' },
        { label: 'DD/MM/YYYY', value: 'DD/MM/YYYY' },
        { label: 'MM/DD/YYYY', value: 'MM/DD/YYYY' },
        { label: 'default (locale)', value: 'default' }
    ];

    // ── Local editable copy (initialised from the service) ─────────────────────
    readonly form = signal<SystemSettings>(this.clone(this.settingsService.get()));
    readonly gradingRows = signal<GradeScaleEntry[]>(this.form().gradingScale.map((g) => ({ ...g })));

    readonly activeTab = signal<string | number | undefined>('profile');
    readonly logoError = signal(false);

    // ── Derived data ───────────────────────────────────────────────────────────
    readonly semesters = this.core.semesters;
    readonly auditLog = this.core.activityLog;

    readonly semesterOptions = computed<SelectOption<string>[]>(() =>
        this.semesters().map((s) => ({ label: `${s.name} · ${s.academicYear} — ${s.status}`, value: s.id }))
    );

    auditUserName(userId: string): string {
        return this.core.users().find((user) => user.id === userId)?.name ?? (userId === 'system' ? 'System' : userId);
    }

    readonly academicYearOptions = computed<SelectOption<string>[]>(() => {
        const fromSemesters = this.semesters().map((s) => s.academicYear);
        const generated = ['2023-24', '2024-25', '2025-26', '2026-27', '2027-28', '2028-29'];
        return [...new Set([...fromSemesters, ...generated])].sort().map((y) => ({ label: y, value: y }));
    });

    readonly schoolInitials = computed(() => {
        const s = this.form();
        const source = (s.universityShortName || s.universityName || '').trim();
        if (!source) {
            return 'U';
        }
        return source
            .split(/\s+/)
            .map((word) => word.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2);
    });

    readonly showLogo = computed(() => !!this.form().logoUrl.trim() && !this.logoError());

    readonly currentSemesterName = computed(() => this.semesterLabel(this.form().currentSemesterId));

    readonly lastUpdatedLabel = computed(() => this.formatDateTime(this.form().updatedAt));

    // ── Profile validation ─────────────────────────────────────────────────────
    readonly profileNameError = computed(() => (this.form().universityName.trim() ? null : 'University name is required.'));

    readonly profileEmailError = computed(() => {
        const email = this.form().contactEmail.trim();
        if (!email) {
            return null;
        }
        return EMAIL_PATTERN.test(email) ? null : 'Enter a valid email address (e.g. info@university.edu).';
    });

    // ── Grading validation + preview ───────────────────────────────────────────
    readonly gradingErrors = computed<string[]>(() => {
        const rows = this.gradingRows();
        const errors: string[] = [];

        if (rows.length === 0) {
            errors.push('At least one grade row is required.');
        }

        const seen = new Set<GradeLetter>();
        const reportedDuplicates = new Set<GradeLetter>();
        for (const row of rows) {
            if (row.minPercent < 0 || row.minPercent > 100) {
                errors.push(`"${row.grade}" min % must be between 0 and 100.`);
            }
            if (row.gradePoint < 0 || row.gradePoint > 4) {
                errors.push(`"${row.grade}" grade point must be between 0 and 4.`);
            }
            if (seen.has(row.grade) && !reportedDuplicates.has(row.grade)) {
                errors.push(`Grade "${row.grade}" is used more than once.`);
                reportedDuplicates.add(row.grade);
            }
            seen.add(row.grade);
        }

        const sorted = [...rows].sort((a, b) => b.minPercent - a.minPercent);
        for (let i = 0; i < sorted.length - 1; i++) {
            if (sorted[i].minPercent <= sorted[i + 1].minPercent) {
                errors.push('Minimum percentages must be strictly decreasing (no duplicate thresholds).');
                break;
            }
        }

        return errors;
    });

    readonly gradingPreview = computed<GradePreviewRow[]>(() =>
        [...this.gradingRows()]
            .sort((a, b) => b.minPercent - a.minPercent)
            .map((row) => ({ ...row, rangeLabel: `>= ${row.minPercent}%` }))
    );

    // ── Field helpers ──────────────────────────────────────────────────────────
    patch(patchValue: Partial<SystemSettings>): void {
        this.form.update((current) => ({ ...current, ...patchValue }));
    }

    onLogoUrlChange(url: string): void {
        this.logoError.set(false);
        this.patch({ logoUrl: url });
    }

    // ── Save / reload actions ──────────────────────────────────────────────────
    reload(): void {
        this.refreshFromService();
        this.msg.add({ severity: 'info', summary: 'Reloaded', detail: 'The form reflects the stored settings again.' });
    }

    saveProfile(): void {
        if (this.profileNameError() || this.profileEmailError()) {
            this.msg.add({ severity: 'warn', summary: 'Validation', detail: 'Fix the highlighted errors before saving.' });
            return;
        }
        const s = this.form();
        try {
            this.settingsService.update({
                universityName: s.universityName.trim(),
                universityShortName: s.universityShortName.trim(),
                logoUrl: s.logoUrl.trim(),
                address: s.address.trim(),
                contactEmail: s.contactEmail.trim(),
                contactPhone: s.contactPhone.trim()
            });
            this.refreshFromService();
            this.msg.add({ severity: 'success', summary: 'Profile saved', detail: 'University profile updated.' });
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Save failed', detail: this.errorText(error) });
        }
    }

    saveAcademic(): void {
        const s = this.form();
        if (!s.currentAcademicYear.trim()) {
            this.msg.add({ severity: 'warn', summary: 'Validation', detail: 'Academic year is required (e.g. 2025-26).' });
            return;
        }
        try {
            this.settingsService.update({
                currentAcademicYear: s.currentAcademicYear.trim(),
                currentSemesterId: s.currentSemesterId
            });
            this.refreshFromService();
            this.msg.add({ severity: 'success', summary: 'Academic settings saved', detail: 'Current academic year and semester updated.' });
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Save failed', detail: this.errorText(error) });
        }
    }

    savePreferences(): void {
        const s = this.form();
        if (s.attendanceThreshold < 0 || s.attendanceThreshold > 100) {
            this.msg.add({ severity: 'warn', summary: 'Validation', detail: 'Attendance threshold must be between 0 and 100.' });
            return;
        }
        try {
            this.settingsService.update({
                attendanceThreshold: s.attendanceThreshold,
                visibleWeekendDays: [...s.visibleWeekendDays],
                weekendDays: [...s.weekendDays],
                currency: s.currency,
                dateFormat: s.dateFormat
            });
            this.refreshFromService();
            this.msg.add({ severity: 'success', summary: 'Preferences saved', detail: 'General preferences updated.' });
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Save failed', detail: this.errorText(error) });
        }
    }

    saveGrading(): void {
        const errors = this.gradingErrors();
        if (errors.length > 0) {
            this.msg.add({ severity: 'warn', summary: 'Validation', detail: errors[0] });
            return;
        }
        try {
            this.settingsService.updateGradingScale(this.gradingRows());
            this.refreshFromService();
            this.msg.add({ severity: 'success', summary: 'Grading scale saved', detail: 'Letter grades and grade points updated.' });
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Invalid grading scale', detail: this.errorText(error) });
        }
    }

    // ── Grading editor actions ─────────────────────────────────────────────────
    updateGrade(index: number, patchValue: Partial<GradeScaleEntry>): void {
        this.gradingRows.update((rows) => rows.map((row, i) => (i === index ? { ...row, ...patchValue } : row)));
    }

    addGradeRow(): void {
        const used = new Set(this.gradingRows().map((row) => row.grade));
        const next = GRADE_LETTERS.find((grade) => !used.has(grade));
        if (!next) {
            this.msg.add({ severity: 'warn', summary: 'All grades used', detail: 'Every grade letter is already present in the scale.' });
            return;
        }
        this.gradingRows.update((rows) => [...rows, { grade: next, minPercent: 0, gradePoint: 0 }]);
    }

    removeGradeRow(index: number): void {
        if (this.gradingRows().length <= 1) {
            this.msg.add({ severity: 'warn', summary: 'At least one row', detail: 'The grading scale must keep at least one grade row.' });
            return;
        }
        this.gradingRows.update((rows) => rows.filter((_, i) => i !== index));
    }

    resetGradingDefault(): void {
        this.gradingRows.set(DEFAULT_GRADING_SCALE.map((g) => ({ ...g })));
        this.msg.add({ severity: 'info', summary: 'Default restored', detail: 'Standard grading scale loaded. Click “Save Grading Scale” to apply.' });
    }

    // ── Danger zone ────────────────────────────────────────────────────────────
    confirmResetDemo(): void {
        this.confirm.confirm({
            message: 'Reset all demo data to its original seed values? Every change you have made — students, courses, results, attendance, fees, notices, users and settings — will be permanently lost. This cannot be undone.',
            header: 'Reset Demo Data',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Reset Everything',
            rejectLabel: 'Cancel',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                try {
                    this.settingsService.reset();
                    this.refreshFromService();
                    this.msg.add({ severity: 'success', summary: 'Demo data reset', detail: 'All data and settings were restored to the original seed.' });
                } catch (error) {
                    this.msg.add({ severity: 'error', summary: 'Reset failed', detail: this.errorText(error) });
                }
            }
        });
    }

    exportData(): void {
        const blob = new Blob([JSON.stringify(this.core.store(), null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'university-data.json';
        link.click();
        URL.revokeObjectURL(url);
        this.msg.add({ severity: 'success', summary: 'Backup downloaded', detail: 'University data was exported as a JSON file.' });
    }

    async importData(event: Event): Promise<void> {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;
        try {
            const parsed: unknown = JSON.parse(await file.text());
            if (!this.isStore(parsed)) throw new Error('The selected file is not a valid university data backup.');
            this.confirm.confirm({
                message: 'Importing this file will replace all current university records and settings. Continue?',
                header: 'Import Data Backup',
                icon: 'pi pi-exclamation-triangle',
                acceptLabel: 'Import Data',
                rejectLabel: 'Cancel',
                accept: () => {
                    this.core.replaceStore(parsed);
                    this.refreshFromService();
                    this.msg.add({ severity: 'success', summary: 'Data imported', detail: 'University records and settings were restored.' });
                }
            });
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Import failed', detail: this.errorText(error) });
        } finally {
            input.value = '';
        }
    }

    private isStore(value: unknown): value is Store {
        if (!value || typeof value !== 'object') return false;
        const data = value as Partial<Store>;
        const collections: (keyof Store)[] = ['faculties', 'departments', 'programs', 'courses', 'facultyMembers', 'semesters', 'students', 'admissionApplications', 'classSessions', 'attendanceRecords', 'examinations', 'studentResults', 'feeAccounts', 'payments', 'notices', 'users', 'activityLog'];
        return data.schemaVersion === 1 && collections.every((key) => Array.isArray(data[key])) && !!data.settings && typeof data.settings === 'object';
    }

    // ── Internal helpers ───────────────────────────────────────────────────────
    private refreshFromService(): void {
        const snapshot = this.clone(this.settingsService.get());
        this.form.set(snapshot);
        this.gradingRows.set(snapshot.gradingScale.map((g) => ({ ...g })));
        this.logoError.set(false);
    }

    private clone(settings: SystemSettings): SystemSettings {
        return {
            ...settings,
            gradingScale: settings.gradingScale.map((g) => ({ ...g })),
            visibleWeekendDays: [...settings.visibleWeekendDays],
            weekendDays: [...settings.weekendDays]
        };
    }

    private semesterLabel(id: string | null): string {
        if (!id) {
            return 'Not set';
        }
        const semester = this.semesters().find((s) => s.id === id);
        return semester ? `${semester.name} (${semester.academicYear})` : 'Unknown semester';
    }

    formatDateTime(value: string): string {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return '—';
        }
        return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
    }

    private errorText(error: unknown): string {
        return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
    }
}
