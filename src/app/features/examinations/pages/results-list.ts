import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { TableModule } from 'primeng/table';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { PageHeader } from '@/app/shared/components/page-header';
import { StatusTag } from '@/app/shared/components/status-tag';
import { EmptyState } from '@/app/shared/components/empty-state';
import { CoreDataService } from '@/app/core/services/core-data.service';
import { ExamService } from '@/app/core/services/exam.service';
import { calcGPA, calcGradeForPercent } from '@/app/core/utils/grade';
import type { Course, Department, Examination, GradeScaleEntry, Program, Semester, Student, StudentResult } from '@/app/core/models/index';

type TagSeverity = 'success' | 'info' | 'warn' | 'danger' | 'contrast';
type TabValue = 'enter' | 'course' | 'student';
type ResultStatus = StudentResult['status'];
type ResultGrade = StudentResult['grade'];

interface SelectOption<T> {
    label: string;
    value: T;
}

/** A single editable roster row on the "Enter Marks" tab, with live-derived grade data. */
interface MarkRow {
    student: Student;
    marks: number | null;
    percent: number;
    grade: ResultGrade;
    gradePoint: number;
    status: ResultStatus;
}

/** A roster row on the course result sheet, joined with its stored result (if any). */
interface CourseSheetRow {
    student: Student;
    result: StudentResult | null;
}

interface SheetSummary {
    count: number;
    average: number;
    highest: number;
    lowest: number;
    passed: number;
    failed: number;
    passRate: number;
}

interface TranscriptRow {
    result: StudentResult;
    course: Course | undefined;
    credits: number;
}

interface TranscriptSemester {
    semester: Semester;
    rows: TranscriptRow[];
    credits: number;
    gpa: number;
}

@Component({
    selector: 'app-results-list',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        CardModule,
        ButtonModule,
        SelectModule,
        InputNumberModule,
        TableModule,
        Tabs,
        TabList,
        Tab,
        TabPanels,
        TabPanel,
        TagModule,
        ToastModule,
        TooltipModule,
        PageHeader,
        StatusTag,
        EmptyState
    ],
    providers: [MessageService],
    styles: [
        `
            @media print {
                .no-print {
                    display: none !important;
                }
                :host {
                    color: #000 !important;
                    background: #fff !important;
                }
                .print-area {
                    border: 0 !important;
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
        <app-page-header
            class="no-print"
            title="Results"
            subtitle="Enter marks, review course result sheets and generate student transcripts">
            <p-button label="Print" icon="pi pi-print" [outlined]="true" (onClick)="printPage()" pTooltip="Print the current view" tooltipPosition="bottom"></p-button>
        </app-page-header>

        <p-tabs [value]="activeTab()" (valueChange)="onTabChange($event)">
            <p-tablist class="no-print">
                <p-tab value="enter">Enter Marks</p-tab>
                <p-tab value="course">Course Results</p-tab>
                <p-tab value="student">Student Results / Transcript</p-tab>
            </p-tablist>

            <p-tabpanels>
                <!-- ── Enter Marks ───────────────────────────────────────────── -->
                <p-tabpanel value="enter">
                    <p-card>
                        <div class="no-print flex flex-col xl:flex-row xl:items-end gap-3 mb-4">
                            <div class="flex flex-col gap-1.5">
                                <label class="text-sm font-medium">Semester</label>
                                <p-select
                                    [ngModel]="semesterId()"
                                    (ngModelChange)="onSemesterChange($event)"
                                    [options]="semesterOptions()"
                                    optionLabel="label"
                                    optionValue="value"
                                    placeholder="Select semester"
                                    styleClass="w-60"
                                    appendTo="body">
                                </p-select>
                            </div>
                            <div class="flex flex-col gap-1.5">
                                <label class="text-sm font-medium">Course</label>
                                <p-select
                                    [ngModel]="courseId()"
                                    (ngModelChange)="onCourseChange($event)"
                                    [options]="courseOptions()"
                                    optionLabel="label"
                                    optionValue="value"
                                    placeholder="Select course"
                                    [filter]="true"
                                    styleClass="w-72"
                                    appendTo="body">
                                </p-select>
                            </div>
                            <div class="flex flex-col gap-1.5">
                                <label class="text-sm font-medium">Exam (optional)</label>
                                <p-select
                                    [ngModel]="examId()"
                                    (ngModelChange)="onExamChange($event)"
                                    [options]="examOptions()"
                                    optionLabel="label"
                                    optionValue="value"
                                    placeholder="No specific exam"
                                    [showClear]="true"
                                    styleClass="w-72"
                                    appendTo="body">
                                </p-select>
                            </div>
                            <div class="flex items-center gap-2 xl:ml-auto">
                                <p-button
                                    label="Reload saved"
                                    icon="pi pi-refresh"
                                    severity="secondary"
                                    [outlined]="true"
                                    size="small"
                                    (onClick)="reloadDraft()"
                                    pTooltip="Discard edits and reload the saved marks"></p-button>
                                <p-button label="Save marks" icon="pi pi-save" size="small" (onClick)="saveMarks()"></p-button>
                            </div>
                        </div>

                        @if (selectedCourse(); as course) {
                            @if (roster().length === 0) {
                                <app-empty-state
                                    icon="pi pi-users"
                                    title="No eligible students"
                                    message="No active students are enrolled in the programs linked to this course."></app-empty-state>
                            } @else {
                                <div class="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3 text-sm">
                                    <span class="font-medium">{{ course.code }} — {{ course.title }}</span>
                                    <p-tag [value]="course.credits + ' credits'" severity="secondary"></p-tag>
                                    <span class="text-muted-color">Max marks: {{ maxMarks() }}</span>
                                    @if (enterSummary(); as sum) {
                                        <span class="text-muted-color">{{ sum.graded }} graded · avg {{ sum.average.toFixed(1) }}%</span>
                                        <app-status-tag status="PASSED" [displayValue]="sum.passed + ' passed'"></app-status-tag>
                                        <app-status-tag status="FAILED" [displayValue]="sum.failed + ' failed'"></app-status-tag>
                                    }
                                </div>

                                <div class="overflow-x-auto print-area">
                                    @if (enterSummary()) {
                                        <div class="hidden print:block mb-2">
                                            <span class="font-semibold">{{ universityName() }}</span> — {{ course.code }} result sheet
                                        </div>
                                    }
                                    <p-table
                                        [value]="roster()"
                                        [paginator]="roster().length > 15"
                                        [rows]="15"
                                        [rowsPerPageOptions]="rowsPerPageOptions"
                                        styleClass="p-datatable-sm w-full"
                                        [tableStyle]="{ 'min-width': '52rem' }">
                                        <ng-template pTemplate="header">
                                            <tr>
                                                <th style="width:3rem">#</th>
                                                <th style="min-width:14rem">Student</th>
                                                <th style="width:9rem">Marks</th>
                                                <th style="width:6rem">%</th>
                                                <th style="width:6rem">Grade</th>
                                                <th style="width:6rem">Points</th>
                                                <th style="width:8rem">Status</th>
                                            </tr>
                                        </ng-template>
                                        <ng-template pTemplate="body" let-row let-i="rowIndex">
                                            <tr>
                                                <td class="text-muted-color">{{ i + 1 }}</td>
                                                <td>
                                                    <div class="font-medium">{{ row.student.firstName }} {{ row.student.lastName }}</div>
                                                    <div class="text-xs text-muted-color">{{ row.student.admissionNo }}</div>
                                                </td>
                                                <td>
                                                    <p-inputnumber
                                                        [ngModel]="marksDraft()[row.student.id]"
                                                        (ngModelChange)="setMark(row.student.id, $event)"
                                                        [min]="0"
                                                        [max]="maxMarks()"
                                                        placeholder="—"
                                                        styleClass="w-28"
                                                        inputStyleClass="text-right"></p-inputnumber>
                                                </td>
                                                <td>{{ row.marks !== null ? row.percent.toFixed(1) + '%' : '—' }}</td>
                                                <td>
                                                    @if (row.marks !== null) {
                                                        <p-tag [value]="row.grade" [severity]="gradeSeverity(row.grade)"></p-tag>
                                                    } @else {
                                                        <span class="text-muted-color">—</span>
                                                    }
                                                </td>
                                                <td>{{ row.marks !== null ? row.gradePoint.toFixed(2) : '—' }}</td>
                                                <td>
                                                    @if (row.marks !== null) {
                                                        <app-status-tag [status]="row.status"></app-status-tag>
                                                    } @else {
                                                        <span class="text-muted-color text-xs">Not graded</span>
                                                    }
                                                </td>
                                            </tr>
                                        </ng-template>
                                        <ng-template pTemplate="emptymessage">
                                            <tr>
                                                <td colspan="7" class="text-center py-8 text-muted-color">No students to display.</td>
                                            </tr>
                                        </ng-template>
                                    </p-table>
                                </div>

                                <p class="text-xs text-muted-color mt-3">
                                    Grade and grade point update live as you type, using the configured grading scale. Marks ≥ 40% are recorded as Passed.
                                </p>
                            }
                        } @else {
                            <app-empty-state
                                icon="pi pi-filter"
                                title="Select a course"
                                message="Choose a semester and a course above to load the active student roster and begin entering marks."></app-empty-state>
                        }
                    </p-card>
                </p-tabpanel>

                <!-- ── Course Results ────────────────────────────────────────── -->
                <p-tabpanel value="course">
                    <p-card>
                        <div class="no-print flex flex-col xl:flex-row xl:items-end gap-3 mb-4">
                            <div class="flex flex-col gap-1.5">
                                <label class="text-sm font-medium">Semester</label>
                                <p-select
                                    [ngModel]="semesterId()"
                                    (ngModelChange)="onSemesterChange($event)"
                                    [options]="semesterOptions()"
                                    optionLabel="label"
                                    optionValue="value"
                                    placeholder="Select semester"
                                    styleClass="w-60"
                                    appendTo="body">
                                </p-select>
                            </div>
                            <div class="flex flex-col gap-1.5">
                                <label class="text-sm font-medium">Course</label>
                                <p-select
                                    [ngModel]="courseId()"
                                    (ngModelChange)="onCourseChange($event)"
                                    [options]="courseOptions()"
                                    optionLabel="label"
                                    optionValue="value"
                                    placeholder="Select course"
                                    [filter]="true"
                                    styleClass="w-72"
                                    appendTo="body">
                                </p-select>
                            </div>
                            <div class="flex flex-col gap-1.5">
                                <label class="text-sm font-medium">Rows</label>
                                <p-select
                                    [ngModel]="showUngraded()"
                                    (ngModelChange)="showUngraded.set($event)"
                                    [options]="scopeOptions"
                                    optionLabel="label"
                                    optionValue="value"
                                    styleClass="w-52"
                                    appendTo="body">
                                </p-select>
                            </div>
                            <div class="flex items-center gap-2 xl:ml-auto">
                                <p-button label="Print sheet" icon="pi pi-print" [outlined]="true" size="small" (onClick)="printPage()"></p-button>
                            </div>
                        </div>

                        @if (selectedCourse(); as course) {
                            <div class="print-area">
                                <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                                    <div>
                                        <h2 class="text-base font-semibold">{{ course.code }} — {{ course.title }}</h2>
                                        <p class="text-xs text-muted-color">
                                            {{ semesterName() }} · {{ course.credits }} credits · Result sheet
                                        </p>
                                    </div>
                                    <span class="text-xs text-muted-color hidden print:inline">{{ universityName() }}</span>
                                </div>

                                @if (courseSummary(); as sum) {
                                    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
                                        <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                                            <p class="text-xs text-muted-color">Average</p>
                                            <p class="text-xl font-bold">{{ sum.average.toFixed(1) }}</p>
                                        </div>
                                        <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                                            <p class="text-xs text-muted-color">Highest</p>
                                            <p class="text-xl font-bold">{{ sum.highest }}</p>
                                        </div>
                                        <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                                            <p class="text-xs text-muted-color">Lowest</p>
                                            <p class="text-xl font-bold">{{ sum.lowest }}</p>
                                        </div>
                                        <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                                            <p class="text-xs text-muted-color">Pass rate</p>
                                            <p class="text-xl font-bold">{{ sum.passRate.toFixed(1) }}%</p>
                                            <p class="text-xs text-muted-color">{{ sum.passed }} passed · {{ sum.failed }} failed · {{ sum.count }} graded</p>
                                        </div>
                                    </div>
                                }

                                @if (courseSheetRows().length === 0) {
                                    <app-empty-state
                                        icon="pi pi-clipboard"
                                        title="No results yet"
                                        message="No marks have been recorded for this course and semester. Use the Enter Marks tab to add them."></app-empty-state>
                                } @else {
                                    <div class="overflow-x-auto">
                                        <p-table
                                            [value]="courseSheetRows()"
                                            [paginator]="courseSheetRows().length > 15"
                                            [rows]="15"
                                            [rowsPerPageOptions]="rowsPerPageOptions"
                                            styleClass="p-datatable-sm w-full"
                                            [tableStyle]="{ 'min-width': '48rem' }">
                                            <ng-template pTemplate="header">
                                                <tr>
                                                    <th style="width:3rem">#</th>
                                                    <th style="min-width:13rem">Student</th>
                                                    <th style="width:8rem">Marks</th>
                                                    <th style="width:5rem">%</th>
                                                    <th style="width:5rem">Grade</th>
                                                    <th style="width:5rem">Points</th>
                                                    <th style="width:7rem">Status</th>
                                                </tr>
                                            </ng-template>
                                            <ng-template pTemplate="body" let-row let-i="rowIndex">
                                                <tr>
                                                    <td class="text-muted-color">{{ i + 1 }}</td>
                                                    <td>
                                                        <div class="font-medium">{{ row.student.firstName }} {{ row.student.lastName }}</div>
                                                        <div class="text-xs text-muted-color">{{ row.student.admissionNo }}</div>
                                                    </td>
                                                    <td>{{ row.result ? row.result.marks + ' / ' + row.result.maxMarks : '—' }}</td>
                                                    <td>{{ row.result ? percentOf(row.result).toFixed(1) + '%' : '—' }}</td>
                                                    <td>
                                                        @if (row.result) {
                                                            <p-tag [value]="row.result.grade" [severity]="gradeSeverity(row.result.grade)"></p-tag>
                                                        } @else {
                                                            <span class="text-muted-color">—</span>
                                                        }
                                                    </td>
                                                    <td>{{ row.result ? row.result.gradePoint.toFixed(2) : '—' }}</td>
                                                    <td>
                                                        @if (row.result) {
                                                            <app-status-tag [status]="row.result.status"></app-status-tag>
                                                        } @else {
                                                            <span class="text-muted-color text-xs">Not graded</span>
                                                        }
                                                    </td>
                                                </tr>
                                            </ng-template>
                                            <ng-template pTemplate="emptymessage">
                                                <tr>
                                                    <td colspan="7" class="text-center py-8 text-muted-color">No students to display.</td>
                                                </tr>
                                            </ng-template>
                                        </p-table>
                                    </div>
                                }
                            </div>
                        } @else {
                            <app-empty-state
                                icon="pi pi-filter"
                                title="Select a course"
                                message="Choose a semester and a course to review the result sheet with its class summary."></app-empty-state>
                        }
                    </p-card>
                </p-tabpanel>

                <!-- ── Student Results / Transcript ──────────────────────────── -->
                <p-tabpanel value="student">
                    <p-card>
                        <div class="no-print flex flex-col xl:flex-row xl:items-end gap-3 mb-4">
                            <div class="flex flex-col gap-1.5 flex-1 max-w-md">
                                <label class="text-sm font-medium">Student</label>
                                <p-select
                                    [ngModel]="studentId()"
                                    (ngModelChange)="studentId.set($event)"
                                    [options]="studentOptions()"
                                    optionLabel="label"
                                    optionValue="value"
                                    placeholder="Select student"
                                    [filter]="true"
                                    appendTo="body"
                                    styleClass="w-full">
                                </p-select>
                            </div>
                            <div class="flex items-center gap-2 xl:ml-auto">
                                <p-button label="Print transcript" icon="pi pi-print" [outlined]="true" size="small" (onClick)="printPage()"></p-button>
                            </div>
                        </div>

                        @if (selectedStudent(); as student) {
                            @if (studentSemesters().length === 0) {
                                <app-empty-state
                                    icon="pi pi-file"
                                    title="No results recorded"
                                    message="This student has no results yet. Enter marks from the Enter Marks tab to populate their transcript."></app-empty-state>
                            } @else {
                                <div class="print-area">
                                    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4">
                                        <div>
                                            <h2 class="text-lg font-bold">{{ universityName() }}</h2>
                                            <p class="text-xs text-muted-color">{{ universityAddress() }}</p>
                                        </div>
                                        <div class="sm:text-right">
                                            <p class="font-semibold">Academic Transcript</p>
                                            <p class="text-xs text-muted-color">Issued {{ issuedOn() }}</p>
                                        </div>
                                    </div>

                                    <div class="grid gap-x-6 gap-y-1 sm:grid-cols-2 text-sm mb-4">
                                        <div class="flex justify-between gap-2"><span class="text-muted-color">Name</span><span class="font-medium">{{ student.firstName }} {{ student.lastName }}</span></div>
                                        <div class="flex justify-between gap-2"><span class="text-muted-color">Admission No</span><span class="font-medium">{{ student.admissionNo }}</span></div>
                                        <div class="flex justify-between gap-2"><span class="text-muted-color">Program</span><span class="font-medium">{{ programName(student.programId) }}</span></div>
                                        <div class="flex justify-between gap-2"><span class="text-muted-color">Department</span><span class="font-medium">{{ departmentName(student.departmentId) }}</span></div>
                                        <div class="flex justify-between gap-2"><span class="text-muted-color">Session</span><span class="font-medium">{{ student.session }}</span></div>
                                        <div class="flex justify-between gap-2"><span class="text-muted-color">Status</span><span class="font-medium">{{ student.status }}</span></div>
                                    </div>

                                    @for (group of studentSemesters(); track group.semester.id) {
                                        <div class="mb-5">
                                            <div class="flex items-center justify-between gap-2 mb-1">
                                                <h3 class="text-sm font-semibold">{{ group.semester.name }} <span class="text-muted-color font-normal">({{ group.semester.academicYear }})</span></h3>
                                                <span class="text-xs">Semester GPA: <span class="font-semibold">{{ group.gpa.toFixed(2) }}</span></span>
                                            </div>
                                            <div class="overflow-x-auto">
                                                <table class="w-full text-sm border border-surface-200 dark:border-surface-700">
                                                    <thead>
                                                        <tr class="bg-surface-100 dark:bg-surface-800">
                                                            <th class="text-left px-2 py-1 border border-surface-200 dark:border-surface-700">Code</th>
                                                            <th class="text-left px-2 py-1 border border-surface-200 dark:border-surface-700">Course</th>
                                                            <th class="text-center px-2 py-1 border border-surface-200 dark:border-surface-700">Cr</th>
                                                            <th class="text-center px-2 py-1 border border-surface-200 dark:border-surface-700">Marks</th>
                                                            <th class="text-center px-2 py-1 border border-surface-200 dark:border-surface-700">Grade</th>
                                                            <th class="text-center px-2 py-1 border border-surface-200 dark:border-surface-700">Points</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        @for (r of group.rows; track r.result.id) {
                                                            <tr>
                                                                <td class="px-2 py-1 border border-surface-200 dark:border-surface-700">{{ r.course?.code ?? r.result.courseId }}</td>
                                                                <td class="px-2 py-1 border border-surface-200 dark:border-surface-700">{{ r.course?.title ?? '—' }}</td>
                                                                <td class="text-center px-2 py-1 border border-surface-200 dark:border-surface-700">{{ r.credits }}</td>
                                                                <td class="text-center px-2 py-1 border border-surface-200 dark:border-surface-700">{{ r.result.marks }}/{{ r.result.maxMarks }}</td>
                                                                <td class="text-center px-2 py-1 border border-surface-200 dark:border-surface-700">{{ r.result.grade }}</td>
                                                                <td class="text-center px-2 py-1 border border-surface-200 dark:border-surface-700">{{ r.result.gradePoint.toFixed(2) }}</td>
                                                            </tr>
                                                        }
                                                        <tr class="font-medium">
                                                            <td colspan="2" class="text-right px-2 py-1 border border-surface-200 dark:border-surface-700">Semester total</td>
                                                            <td class="text-center px-2 py-1 border border-surface-200 dark:border-surface-700">{{ group.credits }}</td>
                                                            <td colspan="2" class="text-right px-2 py-1 border border-surface-200 dark:border-surface-700">GPA</td>
                                                            <td class="text-center px-2 py-1 border border-surface-200 dark:border-surface-700">{{ group.gpa.toFixed(2) }}</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    }

                                    <div class="flex flex-wrap justify-end gap-6 text-sm font-semibold border-t border-surface-200 dark:border-surface-700 pt-2">
                                        <span>Total credits: {{ totalCredits() }}</span>
                                        <span>CGPA: {{ cgpa().toFixed(2) }}</span>
                                    </div>
                                    <p class="text-xs text-muted-color mt-2">
                                        GPA = Σ(credit × grade point) / Σ(credits) · CGPA = Σ(credit × grade point) / Σ(credits) across completed semesters.
                                    </p>
                                </div>
                            }
                        } @else {
                            <app-empty-state
                                icon="pi pi-user"
                                title="Select a student"
                                message="Pick a student to view their results grouped by semester, with per-semester GPA, CGPA and a printable transcript."></app-empty-state>
                        }
                    </p-card>
                </p-tabpanel>
            </p-tabpanels>
        </p-tabs>

        <p-toast></p-toast>
    `
})
export class ResultsList {
    private readonly core = inject(CoreDataService);
    private readonly exam = inject(ExamService);
    private readonly msg = inject(MessageService);

    private readonly students = this.core.students;
    private readonly courses = this.core.courses;
    private readonly semesters = this.core.semesters;
    private readonly examinations = this.core.examinations;

    // ── Settings / scale ──────────────────────────────────────────────────────
    readonly scale = computed<GradeScaleEntry[]>(() => this.core.getSettings().gradingScale);
    readonly universityName = computed(() => this.core.getSettings().universityName);
    readonly universityAddress = computed(() => this.core.getSettings().address);

    // ── Selection state (shared across tabs) ──────────────────────────────────
    readonly activeTab = signal<TabValue>('enter');
    readonly semesterId = signal<string | null>(null);
    readonly courseId = signal<string | null>(null);
    readonly examId = signal<string | null>(null);
    readonly studentId = signal<string | null>(null);
    readonly showUngraded = signal(true);
    readonly marksDraft = signal<Record<string, number | null>>({});

    readonly rowsPerPageOptions: number[] = [15, 25, 50, 100];
    readonly scopeOptions: SelectOption<boolean>[] = [
        { label: 'All eligible students', value: true },
        { label: 'Graded students only', value: false }
    ];

    // ── Option lists ──────────────────────────────────────────────────────────
    readonly semesterOptions = computed<SelectOption<string>[]>(() =>
        [...this.semesters()]
            .sort((a, b) => a.startDate.localeCompare(b.startDate))
            .map((s) => ({ label: `${s.name} (${s.academicYear})`, value: s.id }))
    );

    readonly courseOptions = computed<SelectOption<string>[]>(() =>
        [...this.courses()].sort((a, b) => a.code.localeCompare(b.code)).map((c) => ({ label: `${c.code} — ${c.title}`, value: c.id }))
    );

    readonly examOptions = computed<SelectOption<string | null>[]>(() => {
        const courseId = this.courseId();
        const semesterId = this.semesterId();
        const list: Examination[] = courseId && semesterId ? this.exam.findByCourse(courseId).filter((e) => e.semesterId === semesterId) : [];
        return [
            { label: 'No specific exam (record against 100)', value: null },
            ...list.map((e) => ({ label: `${e.title} — ${e.date} · max ${e.maxMarks}`, value: e.id }))
        ];
    });

    readonly studentOptions = computed<SelectOption<string>[]>(() =>
        [...this.students()].sort((a, b) => a.admissionNo.localeCompare(b.admissionNo)).map((s) => ({
            label: `${s.admissionNo} — ${s.firstName} ${s.lastName}`,
            value: s.id
        }))
    );

    // ── Current selections ────────────────────────────────────────────────────
    readonly selectedCourse = computed<Course | null>(() => {
        const id = this.courseId();
        return id ? this.courses().find((c) => c.id === id) ?? null : null;
    });

    readonly selectedExam = computed<Examination | null>(() => {
        const id = this.examId();
        return id ? this.examinations().find((e) => e.id === id) ?? null : null;
    });

    readonly selectedStudent = computed<Student | null>(() => {
        const id = this.studentId();
        return id ? this.students().find((s) => s.id === id) ?? null : null;
    });

    readonly maxMarks = computed(() => this.selectedExam()?.maxMarks ?? 100);

    readonly semesterName = computed(() => {
        const id = this.semesterId();
        return id ? this.semesters().find((s) => s.id === id)?.name ?? '—' : '—';
    });

    // ── Enter Marks tab ───────────────────────────────────────────────────────
    /** Active students enrolled in the programs linked to the selected course, with live-derived grades. */
    readonly roster = computed<MarkRow[]>(() => {
        const course = this.selectedCourse();
        const semesterId = this.semesterId();
        if (!course || !semesterId) {
            return [];
        }
        const draft = this.marksDraft();
        const scale = this.scale();
        const maxMarks = this.maxMarks();
        return this.students()
            .filter((s) => s.status === 'ACTIVE' && course.programIds.includes(s.programId))
            .sort((a, b) => a.admissionNo.localeCompare(b.admissionNo))
            .map((student) => {
                const raw = draft[student.id];
                const marks = raw === null || raw === undefined ? null : Number(raw);
                const percent = marks === null || maxMarks <= 0 ? 0 : (marks / maxMarks) * 100;
                const { grade, gradePoint } = calcGradeForPercent(scale, percent);
                const status: ResultStatus = marks !== null && percent >= 40 ? 'PASSED' : 'FAILED';
                return { student, marks, percent, grade, gradePoint, status };
            });
    });

    readonly enterSummary = computed(() => {
        const graded = this.roster().filter((r) => r.marks !== null);
        if (graded.length === 0) {
            return null;
        }
        const average = graded.reduce((s, r) => s + r.percent, 0) / graded.length;
        const passed = graded.filter((r) => r.status === 'PASSED').length;
        return { graded: graded.length, average, passed, failed: graded.length - passed };
    });

    // ── Course Results tab ────────────────────────────────────────────────────
    readonly courseSheetRows = computed<CourseSheetRow[]>(() => {
        const course = this.selectedCourse();
        const semesterId = this.semesterId();
        if (!course || !semesterId) {
            return [];
        }
        const results = this.exam.getCourseResults(course.id, semesterId);
        const byStudent = new Map<string, StudentResult>(results.map((r) => [r.studentId, r]));
        const showUngraded = this.showUngraded();
        return this.students()
            .filter((s) => s.status === 'ACTIVE' && course.programIds.includes(s.programId))
            .filter((s) => showUngraded || byStudent.has(s.id))
            .sort((a, b) => a.admissionNo.localeCompare(b.admissionNo))
            .map((student) => ({ student, result: byStudent.get(student.id) ?? null }));
    });

    readonly courseSummary = computed<SheetSummary | null>(() => {
        const course = this.selectedCourse();
        const semesterId = this.semesterId();
        if (!course || !semesterId) {
            return null;
        }
        const results = this.exam.getCourseResults(course.id, semesterId);
        if (results.length === 0) {
            return null;
        }
        const marks = results.map((r) => r.marks);
        const passed = results.filter((r) => r.status === 'PASSED').length;
        return {
            count: results.length,
            average: marks.reduce((s, m) => s + m, 0) / marks.length,
            highest: Math.max(...marks),
            lowest: Math.min(...marks),
            passed,
            failed: results.length - passed,
            passRate: (passed / results.length) * 100
        };
    });

    // ── Student Results / Transcript tab ──────────────────────────────────────
    readonly studentSemesters = computed<TranscriptSemester[]>(() => {
        const student = this.selectedStudent();
        if (!student) {
            return [];
        }
        const bySemester = new Map<string, StudentResult[]>();
        for (const result of this.exam.getStudentResults(student.id)) {
            const bucket = bySemester.get(result.semesterId);
            if (bucket) {
                bucket.push(result);
            } else {
                bySemester.set(result.semesterId, [result]);
            }
        }
        const groups: TranscriptSemester[] = [];
        for (const [semesterId, list] of bySemester) {
            const semester = this.semesters().find((s) => s.id === semesterId);
            if (!semester) {
                continue;
            }
            const rows: TranscriptRow[] = list
                .map((result) => {
                    const course = this.courses().find((c) => c.id === result.courseId);
                    return { result, course, credits: course?.credits ?? 3 };
                })
                .sort((a, b) => (a.course?.code ?? a.result.courseId).localeCompare(b.course?.code ?? b.result.courseId));
            const credits = rows.reduce((s, r) => s + r.credits, 0);
            const gpa = calcGPA(rows.map((r) => ({ credits: r.credits, gradePoint: r.result.gradePoint })));
            groups.push({ semester, rows, credits, gpa });
        }
        return groups.sort((a, b) => a.semester.startDate.localeCompare(b.semester.startDate));
    });

    readonly cgpa = computed(() =>
        calcGPA(this.studentSemesters().flatMap((g) => g.rows.map((r) => ({ credits: r.credits, gradePoint: r.result.gradePoint }))))
    );

    readonly totalCredits = computed(() => this.studentSemesters().reduce((s, g) => s + g.credits, 0));

    readonly issuedOn = computed(() => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }));

    // ── Handlers ──────────────────────────────────────────────────────────────
    onTabChange(value: string | number | undefined): void {
        const next = String(value ?? 'enter');
        if (next === 'enter' || next === 'course' || next === 'student') {
            this.activeTab.set(next);
        }
    }

    onSemesterChange(value: string | null): void {
        this.semesterId.set(value ?? null);
        this.courseId.set(null);
        this.examId.set(null);
        this.marksDraft.set({});
    }

    onCourseChange(value: string | null): void {
        this.courseId.set(value ?? null);
        const firstExam = this.examOptions().find((o) => o.value !== null);
        this.examId.set(firstExam?.value ?? null);
        this.loadDraft();
    }

    onExamChange(value: string | null): void {
        this.examId.set(value ?? null);
    }

    /** Clamp the entered mark into 0..maxMarks and store it against the student. */
    setMark(studentId: string, value: number | null): void {
        const maxMarks = this.maxMarks();
        const clamped = value === null || value === undefined || Number.isNaN(value) ? null : Math.max(0, Math.min(maxMarks, Number(value)));
        this.marksDraft.update((draft) => ({ ...draft, [studentId]: clamped }));
    }

    reloadDraft(): void {
        this.loadDraft();
        this.msg.add({ severity: 'info', summary: 'Reloaded', detail: 'Saved marks restored; unsaved edits discarded.' });
    }

    saveMarks(): void {
        const course = this.selectedCourse();
        const semesterId = this.semesterId();
        if (!course || !semesterId) {
            this.msg.add({ severity: 'warn', summary: 'No selection', detail: 'Choose a semester and course first.' });
            return;
        }
        const rosterIds = new Set(this.roster().map((r) => r.student.id));
        const toSave: { studentId: string; marks: number }[] = [];
        for (const [studentId, marks] of Object.entries(this.marksDraft())) {
            if (marks !== null && rosterIds.has(studentId)) {
                toSave.push({ studentId, marks });
            }
        }
        if (toSave.length === 0) {
            this.msg.add({ severity: 'warn', summary: 'Nothing to save', detail: 'Enter at least one mark before saving.' });
            return;
        }
        const scale = this.scale();
        const maxMarks = this.maxMarks();
        for (const entry of toSave) {
            this.exam.upsertResult(entry.studentId, course.id, semesterId, entry.marks, maxMarks, scale);
        }
        this.loadDraft();
        this.msg.add({ severity: 'success', summary: 'Results saved', detail: `${toSave.length} result(s) recorded for ${course.code}.` });
    }

    printPage(): void {
        window.print();
    }

    private loadDraft(): void {
        const courseId = this.courseId();
        const semesterId = this.semesterId();
        if (!courseId || !semesterId) {
            this.marksDraft.set({});
            return;
        }
        const draft: Record<string, number | null> = {};
        for (const result of this.exam.getCourseResults(courseId, semesterId)) {
            draft[result.studentId] = result.marks;
        }
        this.marksDraft.set(draft);
    }

    // ── Display helpers ───────────────────────────────────────────────────────
    percentOf(result: StudentResult): number {
        return result.maxMarks === 0 ? 0 : (result.marks / result.maxMarks) * 100;
    }

    gradeSeverity(grade: ResultGrade): TagSeverity {
        switch (grade) {
            case 'A+':
            case 'A':
            case 'A-':
                return 'success';
            case 'B+':
            case 'B':
            case 'B-':
                return 'info';
            case 'C+':
            case 'C':
            case 'C-':
                return 'warn';
            case 'D':
                return 'warn';
            default:
                return 'danger';
        }
    }

    programName(id: string): string {
        return this.core.get<Program>('programs', id)?.name ?? id;
    }

    departmentName(id: string): string {
        return this.core.get<Department>('departments', id)?.name ?? id;
    }
}
