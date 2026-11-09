import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CoreDataService } from '@/app/core/services/core-data.service';
import { AttendanceService } from '@/app/core/services/attendance.service';
import { NoticeService } from '@/app/core/services/notice.service';
import { TeacherWorkspaceService, type TeacherMessage } from '@/app/core/services/teacher-workspace.service';
import { downloadCsv } from '@/app/core/utils/util';
import type { AttendanceRecord, Course, Student } from '@/app/core/models/index';

type Section = 'home' | 'courses' | 'attendance' | 'assessments' | 'communication' | 'reports' | 'profile';
type AttendanceStatus = AttendanceRecord['status'];

@Component({
    selector: 'app-teacher-portal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
        <header class="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
                <p class="text-sm text-primary font-semibold">INFINITY UNIVERSITY</p>
                <h1 class="text-2xl sm:text-3xl font-semibold mt-1">{{ sectionTitle() }}</h1>
                <p class="text-muted-color mt-1">Welcome, {{ teacherName() }} · {{ teacher()?.designation }}</p>
            </div>
            <div class="text-sm text-muted-color">{{ todayLabel() }}</div>
        </header>

        @if (message()) {
            <div class="mb-4 p-3 rounded-lg bg-primary-50 dark:bg-primary-950 text-primary-800 dark:text-primary-200">{{ message() }}</div>
        }

        @if (activeSection() === 'home') {
            <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
                <article class="rounded-xl border border-surface-200 dark:border-surface-700 p-4"><div class="text-sm text-muted-color">Assigned courses</div><div class="text-3xl font-semibold mt-2">{{ courses().length }}</div></article>
                <article class="rounded-xl border border-surface-200 dark:border-surface-700 p-4"><div class="text-sm text-muted-color">Students in classes</div><div class="text-3xl font-semibold mt-2">{{ totalStudents() }}</div></article>
                <article class="rounded-xl border border-surface-200 dark:border-surface-700 p-4"><div class="text-sm text-muted-color">Pending grade reviews</div><div class="text-3xl font-semibold mt-2">{{ pendingSubmissions() }}</div></article>
                <article class="rounded-xl border border-surface-200 dark:border-surface-700 p-4"><div class="text-sm text-muted-color">Low attendance alerts</div><div class="text-3xl font-semibold mt-2">{{ lowAttendance().length }}</div></article>
            </section>
            <div class="grid gap-4 xl:grid-cols-2">
                <section class="rounded-xl border border-surface-200 dark:border-surface-700 p-4">
                    <h2 class="font-semibold text-lg mb-3">My courses</h2>
                    @for (course of courses(); track course.id) {
                        <button class="w-full text-left flex items-center justify-between gap-3 py-3 border-b last:border-b-0 border-surface-200 dark:border-surface-700" (click)="openCourse(course.id)">
                            <span><b class="text-primary">{{ course.code }}</b><span class="block mt-1">{{ course.title }}</span></span>
                            <span class="text-sm text-muted-color">{{ rosterFor(course).length }} students <i class="pi pi-angle-right ml-1"></i></span>
                        </button>
                    } @empty { <p class="text-muted-color">No courses are assigned to this teacher.</p> }
                </section>
                <section class="rounded-xl border border-surface-200 dark:border-surface-700 p-4">
                    <h2 class="font-semibold text-lg mb-3">Low attendance alerts</h2>
                    @for (row of lowAttendance(); track row.student.id + row.course.id) {
                        <div class="py-3 border-b last:border-0 border-surface-200 dark:border-surface-700 flex justify-between gap-3">
                            <span>{{ studentName(row.student) }} <small class="block text-muted-color">{{ row.course.code }}</small></span>
                            <span class="text-orange-500 font-semibold">{{ row.percent }}%</span>
                        </div>
                    } @empty { <p class="text-muted-color">No low-attendance alerts.</p> }
                </section>
            </div>
        }

        @if (activeSection() === 'courses') {
            <section class="rounded-xl border border-surface-200 dark:border-surface-700 p-4 mb-4">
                <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div><h2 class="text-lg font-semibold">Course management</h2><p class="text-sm text-muted-color mt-1">View your course roster and class routine.</p></div>
                    <select class="field" [ngModel]="selectedCourseId()" (ngModelChange)="selectCourse($event)">
                        @for (course of courses(); track course.id) { <option [value]="course.id">{{ course.code }} — {{ course.title }}</option> }
                    </select>
                </div>
                @if (selectedCourse(); as course) {
                    <div class="grid gap-3 sm:grid-cols-3 mb-4">
                        <div><span class="text-muted-color text-sm">Course</span><div class="font-medium">{{ course.code }} · {{ course.title }}</div></div>
                        <div><span class="text-muted-color text-sm">Credits</span><div class="font-medium">{{ course.credits }}</div></div>
                        <div><span class="text-muted-color text-sm">Enrolled students</span><div class="font-medium">{{ roster().length }}</div></div>
                    </div>
                    <h3 class="font-semibold mb-2">Class routine</h3>
                    <div class="overflow-x-auto mb-5"><table class="w-full text-sm"><thead><tr><th class="text-left p-2">Day</th><th class="text-left p-2">Time</th><th class="text-left p-2">Room</th><th class="text-left p-2">Semester</th></tr></thead><tbody>
                        @for (session of sessionsFor(course.id); track session.id) { <tr class="border-t border-surface-200 dark:border-surface-700"><td class="p-2">{{ session.day }}</td><td class="p-2">{{ session.startTime }}–{{ session.endTime }}</td><td class="p-2">{{ session.room }}</td><td class="p-2">{{ semesterName(session.semesterId) }}</td></tr> }
                        @empty { <tr><td colspan="4" class="p-3 text-muted-color">No routine has been scheduled.</td></tr> }
                    </tbody></table></div>
                    <div class="flex flex-wrap items-center justify-between gap-2 mb-2"><h3 class="font-semibold">Student list</h3><button class="btn-secondary" (click)="downloadRoster()">Download student list</button></div>
                    <div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr><th class="text-left p-2">Student ID</th><th class="text-left p-2">Name</th><th class="text-left p-2">Program</th><th class="text-left p-2">Email</th></tr></thead><tbody>
                        @for (student of roster(); track student.id) { <tr class="border-t border-surface-200 dark:border-surface-700"><td class="p-2">{{ student.admissionNo }}</td><td class="p-2">{{ studentName(student) }}</td><td class="p-2">{{ programName(student.programId) }}</td><td class="p-2">{{ student.email }}</td></tr> }
                        @empty { <tr><td colspan="4" class="p-3 text-muted-color">No active students are enrolled in this course.</td></tr> }
                    </tbody></table></div>
                }
            </section>
            <section class="rounded-xl border border-surface-200 dark:border-surface-700 p-4">
                <h2 class="text-lg font-semibold">Learning resources</h2><p class="text-sm text-muted-color mt-1 mb-4">Upload lecture materials, syllabi and resources for your students.</p>
                <div class="grid gap-3 sm:grid-cols-3 items-end">
                    <label class="field-label">Resource title<input class="field" [(ngModel)]="resourceTitle" placeholder="e.g. Week 1 lecture notes" /></label>
                    <label class="field-label">Course<select class="field" [(ngModel)]="resourceCourseId">@for (course of courses(); track course.id) {<option [value]="course.id">{{ course.code }}</option>}</select></label>
                    <label class="field-label">File<input class="field" type="file" (change)="uploadResource($event)" /></label>
                </div>
                <div class="mt-4 divide-y divide-surface-200 dark:divide-surface-700">
                    @for (resource of resources(); track resource.id) {
                        <div class="flex flex-wrap items-center justify-between gap-2 py-3"><span><b>{{ resource.title }}</b><small class="block text-muted-color">{{ courseCode(resource.courseId) }} · {{ resource.fileName }} · {{ resource.uploadedAt | date:'mediumDate' }}</small></span><a class="btn-secondary" [href]="resource.dataUrl" [download]="resource.fileName">Download</a></div>
                    } @empty { <p class="text-sm text-muted-color py-3">No resources uploaded yet.</p> }
                </div>
            </section>
        }

        @if (activeSection() === 'attendance') {
            <section class="rounded-xl border border-surface-200 dark:border-surface-700 p-4">
                <div class="flex flex-wrap items-end gap-3 mb-4">
                    <label class="field-label">Course<select class="field" [ngModel]="selectedCourseId()" (ngModelChange)="selectCourse($event)">@for (course of courses(); track course.id) {<option [value]="course.id">{{ course.code }} — {{ course.title }}</option>}</select></label>
                    <label class="field-label">Class date<input class="field" type="date" [(ngModel)]="attendanceDate" (ngModelChange)="loadAttendanceDraft()" /></label>
                    <button class="btn-primary" (click)="saveAttendance()" [disabled]="!roster().length">Save attendance</button>
                </div>
                <div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr><th class="text-left p-2">Student ID</th><th class="text-left p-2">Student</th><th class="text-left p-2">Attendance</th><th class="text-left p-2">Course attendance</th></tr></thead><tbody>
                    @for (student of roster(); track student.id) { <tr class="border-t border-surface-200 dark:border-surface-700"><td class="p-2">{{ student.admissionNo }}</td><td class="p-2">{{ studentName(student) }}</td><td class="p-2"><select class="field" [ngModel]="attendanceValue(student.id)" (ngModelChange)="setAttendance(student.id, $event)"><option value="PRESENT">Present</option><option value="ABSENT">Absent</option><option value="LATE">Late</option><option value="EXCUSED">Excused</option></select></td><td class="p-2">{{ attendancePercent(student.id) }}%</td></tr> }
                </tbody></table></div>
            </section>
        }

        @if (activeSection() === 'assessments') {
            <div class="grid gap-4 xl:grid-cols-2">
                <section class="rounded-xl border border-surface-200 dark:border-surface-700 p-4">
                    <h2 class="text-lg font-semibold">Create assessment</h2><p class="text-sm text-muted-color mt-1 mb-4">Set up assignments, quizzes or exams for an assigned course.</p>
                    <div class="grid gap-3">
                        <label class="field-label">Course<select class="field" [(ngModel)]="assessmentCourseId">@for (course of courses(); track course.id) {<option [value]="course.id">{{ course.code }} — {{ course.title }}</option>}</select></label>
                        <label class="field-label">Title<input class="field" [(ngModel)]="assessmentTitle" placeholder="Assessment title" /></label>
                        <div class="grid grid-cols-3 gap-2"><label class="field-label">Type<select class="field" [(ngModel)]="assessmentType"><option value="ASSIGNMENT">Assignment</option><option value="QUIZ">Quiz</option><option value="EXAM">Exam</option></select></label><label class="field-label">Due date<input class="field" type="date" [(ngModel)]="assessmentDueDate" /></label><label class="field-label">Max marks<input class="field" type="number" min="1" [(ngModel)]="assessmentMaxMarks" /></label></div>
                        <button class="btn-primary justify-self-start" (click)="createAssessment()">Create assessment</button>
                    </div>
                    <div class="mt-5 divide-y divide-surface-200 dark:divide-surface-700">
                        @for (assessment of assessments(); track assessment.id) { <div class="py-3"><b>{{ assessment.title }}</b><small class="block text-muted-color">{{ courseCode(assessment.courseId) }} · {{ assessment.type }} · Due {{ assessment.dueDate }} · {{ assessment.maxMarks }} marks</small></div> }
                        @empty { <p class="text-sm text-muted-color py-3">No assessments created yet.</p> }
                    </div>
                </section>
                <section class="rounded-xl border border-surface-200 dark:border-surface-700 p-4">
                    <h2 class="text-lg font-semibold">Enter and submit marks</h2><p class="text-sm text-muted-color mt-1 mb-4">Submitted grades are saved for administrator review.</p>
                    <label class="field-label mb-3">Assessment<select class="field" [(ngModel)]="selectedAssessmentId" (ngModelChange)="loadMarksDraft()"><option value="">Choose an assessment</option>@for (assessment of assessments(); track assessment.id) {<option [value]="assessment.id">{{ courseCode(assessment.courseId) }} · {{ assessment.title }}</option>}</select></label>
                    @if (selectedAssessment(); as assessment) {
                        <div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr><th class="text-left p-2">Student</th><th class="text-left p-2">Marks / {{ assessment.maxMarks }}</th></tr></thead><tbody>
                            @for (student of rosterForCourse(assessment.courseId); track student.id) {<tr class="border-t border-surface-200 dark:border-surface-700"><td class="p-2">{{ studentName(student) }}</td><td class="p-2"><input class="field w-28" type="number" min="0" [max]="assessment.maxMarks" [ngModel]="marksDraft()[student.id] ?? null" (ngModelChange)="setMark(student.id, $event)" /></td></tr>}
                        </tbody></table></div>
                        <button class="btn-secondary mt-3" (click)="downloadMarkSheet(assessment)">Download mark sheet</button>
                        <button class="btn-primary mt-4" (click)="submitGrades(assessment)">Submit grades for admin approval</button>
                        <div class="mt-5 border-t border-surface-200 dark:border-surface-700 pt-3"><h3 class="font-semibold">Student assignment submissions</h3>
                            @for (submission of studentSubmissions(assessment.id); track submission.id) { <div class="py-2 border-b border-surface-200 dark:border-surface-700"><b>{{ studentNameById(submission.studentId) }}</b><small class="block text-muted-color">Submitted {{ submission.submittedAt | date:'medium' }}</small>@if (submission.response) { <p class="text-sm my-2">{{ submission.response }}</p> }@if (submission.fileName && submission.fileDataUrl) { <a class="text-primary text-sm" [href]="submission.fileDataUrl" [download]="submission.fileName">Download {{ submission.fileName }}</a> }</div> }
                            @empty { <p class="text-sm text-muted-color py-2">No online submissions yet.</p> }
                        </div>
                    }
                    <div class="mt-4 text-sm"><b>Submission status</b>
                        @for (submission of gradeSubmissions(); track submission.id) {<p class="mt-2">{{ courseCode(submission.courseId) }} · {{ assessmentName(submission.assessmentId) }} <span class="text-primary">{{ submission.status.replace('_', ' ') }}</span> · {{ submission.marks.length }} grades</p>}
                        @empty {<p class="text-muted-color mt-2">No grade submissions yet.</p>}
                    </div>
                </section>
            </div>
        }

        @if (activeSection() === 'communication') {
            <div class="grid gap-4 xl:grid-cols-2">
                <section class="rounded-xl border border-surface-200 dark:border-surface-700 p-4">
                    <h2 class="text-lg font-semibold">Course announcements</h2><p class="text-sm text-muted-color mt-1 mb-4">Publish a notice for students in an assigned course.</p>
                    <div class="grid gap-3"><label class="field-label">Course<select class="field" [(ngModel)]="announcementCourseId">@for (course of courses(); track course.id) {<option [value]="course.id">{{ course.code }}</option>}</select></label><label class="field-label">Subject<input class="field" [(ngModel)]="announcementTitle" /></label><label class="field-label">Message<textarea class="field" rows="4" [(ngModel)]="announcementBody"></textarea></label><button class="btn-primary justify-self-start" (click)="publishAnnouncement()">Publish announcement</button></div>
                    <div class="mt-4 divide-y divide-surface-200 dark:divide-surface-700">@for (notice of courseNotices(); track notice.id) {<div class="py-3"><b>{{ notice.title }}</b><p class="text-sm text-muted-color">{{ notice.body }}</p></div>}</div>
                </section>
                <section class="rounded-xl border border-surface-200 dark:border-surface-700 p-4">
                    <h2 class="text-lg font-semibold">Messages and student queries</h2><p class="text-sm text-muted-color mt-1 mb-4">Send course messages and record replies to student queries.</p>
                    <div class="grid gap-3"><label class="field-label">Course<select class="field" [(ngModel)]="messageCourseId"><option value="">All courses</option>@for (course of courses(); track course.id) {<option [value]="course.id">{{ course.code }}</option>}</select></label><label class="field-label">Subject<input class="field" [(ngModel)]="messageSubject" /></label><label class="field-label">Message<textarea class="field" rows="3" [(ngModel)]="messageBody"></textarea></label><button class="btn-primary justify-self-start" (click)="sendMessage()">Send message</button></div>
                    <div class="mt-4 divide-y divide-surface-200 dark:divide-surface-700">@for (thread of messages(); track thread.id) {<article class="py-3"><div class="flex justify-between gap-2"><b>{{ thread.subject }} @if (thread.demo) {<small class="text-primary font-normal">Demo query</small>}</b><small class="text-muted-color">{{ thread.createdAt | date:'short' }}</small></div><p class="text-sm mt-1">{{ thread.body }}</p><small class="text-muted-color">{{ thread.direction === 'RECEIVED' ? 'From' : 'To' }} {{ thread.direction === 'RECEIVED' ? thread.sender : thread.recipient }} · {{ courseCode(thread.courseId) }}</small>@if (thread.direction === 'RECEIVED') {<div class="flex gap-2 mt-2"><input class="field flex-1" [ngModel]="replyValue(thread.id)" (ngModelChange)="setReply(thread.id, $event)" placeholder="Write a reply" /><button class="btn-secondary" (click)="replyTo(thread)">Reply</button></div>} @if (thread.reply) {<p class="mt-2 text-sm text-primary">Your reply: {{ thread.reply }}</p>}</article>}
                        @empty {<p class="text-sm text-muted-color py-3">No messages or queries yet.</p>}
                    </div>
                </section>
            </div>
        }

        @if (activeSection() === 'reports') {
            <section class="rounded-xl border border-surface-200 dark:border-surface-700 p-4">
                <div class="flex flex-wrap justify-between items-center gap-3 mb-4"><div><h2 class="text-lg font-semibold">Class reports</h2><p class="text-sm text-muted-color">Performance and attendance summaries for your assigned courses.</p></div><button class="btn-primary" (click)="downloadReport()">Download report (Excel CSV)</button></div>
                <div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr><th class="text-left p-2">Course</th><th class="text-left p-2">Students</th><th class="text-left p-2">Attendance average</th><th class="text-left p-2">Graded results</th><th class="text-left p-2">Average mark</th></tr></thead><tbody>
                    @for (row of reportRows(); track row.course.id) {<tr class="border-t border-surface-200 dark:border-surface-700"><td class="p-2">{{ row.course.code }} · {{ row.course.title }}</td><td class="p-2">{{ row.students }}</td><td class="p-2">{{ row.attendance }}%</td><td class="p-2">{{ row.grades }}</td><td class="p-2">{{ row.averageMarks }}%</td></tr>}
                </tbody></table></div>
            </section>
        }

        @if (activeSection() === 'profile') {
            <section class="rounded-xl border border-surface-200 dark:border-surface-700 p-4 max-w-3xl">
                <h2 class="text-lg font-semibold">Teacher profile</h2><p class="text-sm text-muted-color mt-1 mb-4">Review and update your contact details.</p>
                @if (teacher(); as person) {
                    <div class="grid gap-3 sm:grid-cols-2"><label class="field-label">Name<input class="field" [value]="teacherName()" disabled /></label><label class="field-label">Employee ID<input class="field" [value]="person.employeeId" disabled /></label><label class="field-label">Email<input class="field" [(ngModel)]="profileEmail" /></label><label class="field-label">Phone<input class="field" [(ngModel)]="profilePhone" /></label><label class="field-label sm:col-span-2">Address<textarea class="field" rows="3" [(ngModel)]="profileAddress"></textarea></label></div>
                    <button class="btn-primary mt-4" (click)="saveProfile()">Save profile</button>
                }
            </section>
        }
    `,
    styles: [`
        :host { display: block; }
        .field-label { display:flex; flex-direction:column; gap:.35rem; font-size:.875rem; font-weight:500; }
        .field { min-width:12rem; width:100%; border:1px solid var(--surface-border); background:var(--surface-card); color:var(--text-color); border-radius:.5rem; padding:.6rem .75rem; }
        .btn-primary,.btn-secondary { border-radius:.5rem; padding:.6rem .9rem; font-size:.875rem; font-weight:600; cursor:pointer; }
        .btn-primary { background:var(--primary-color); color:var(--primary-contrast-color); }
        .btn-primary:disabled { opacity:.5; cursor:not-allowed; }
        .btn-secondary { border:1px solid var(--surface-border); background:var(--surface-card); color:var(--text-color); }
        th { padding:.5rem; color:var(--text-muted-color); font-weight:600; border-bottom:1px solid var(--surface-border); }
    `]
})
export class TeacherPortal {
    private readonly core = inject(CoreDataService);
    private readonly attendance = inject(AttendanceService);
    private readonly noticesService = inject(NoticeService);
    private readonly workspace = inject(TeacherWorkspaceService);
    private readonly route = inject(ActivatedRoute);
    private readonly teacherId = 'fm-002';

    readonly sections: { id: Section; label: string }[] = [
        { id: 'home', label: 'Dashboard' }, { id: 'courses', label: 'Courses & Resources' }, { id: 'attendance', label: 'Attendance' },
        { id: 'assessments', label: 'Assessments & Grading' }, { id: 'communication', label: 'Communication' }, { id: 'reports', label: 'Reports' }, { id: 'profile', label: 'Profile' }
    ];
    readonly activeSection = signal<Section>('home');
    readonly message = signal('');
    readonly data = this.workspace.data;
    readonly teacher = computed(() => this.core.facultyMembers().find((person) => person.id === this.teacherId));
    readonly teacherName = computed(() => this.teacher() ? `${this.teacher()!.firstName} ${this.teacher()!.lastName}` : 'Teacher');
    readonly courses = computed(() => {
        const ids = this.teacher()?.courseIds ?? [];
        return this.core.courses().filter((course) => ids.includes(course.id) && course.status === 'ACTIVE');
    });
    readonly selectedCourseId = signal('');
    readonly selectedCourse = computed(() => this.courses().find((course) => course.id === this.selectedCourseId()) ?? this.courses()[0]);
    readonly roster = computed(() => this.selectedCourse() ? this.rosterFor(this.selectedCourse()!) : []);
    readonly attendanceDraft = signal<Record<string, AttendanceStatus>>({});
    readonly marksDraft = signal<Record<string, number | null>>({});
    readonly replyDraft = signal<Record<string, string>>({});
    readonly resources = computed(() => this.data().resources.filter((resource) => this.isAssigned(resource.courseId)).slice().reverse());
    readonly messages = computed(() => this.data().messages.filter((thread) => !thread.courseId || this.isAssigned(thread.courseId)).slice().reverse());
    readonly assessments = computed(() => this.data().assessments.filter((assessment) => this.isAssigned(assessment.courseId)).slice().reverse());
    readonly gradeSubmissions = computed(() => this.data().gradeSubmissions.filter((item) => this.isAssigned(item.courseId)).slice().reverse());
    readonly pendingSubmissions = computed(() => this.gradeSubmissions().filter((item) => item.status === 'PENDING_ADMIN').length);
    readonly totalStudents = computed(() => new Set(this.courses().flatMap((course) => this.rosterFor(course).map((student) => student.id))).size);
    readonly lowAttendance = computed(() => this.courses().flatMap((course) => this.rosterFor(course).map((student) => ({ student, course, percent: this.attendance.getCourseAttendancePercent(course.id, student.id) }))).filter((row) => row.percent > 0 && row.percent < (this.core.getSettings().attendanceThreshold ?? 75)));
    readonly reportRows = computed(() => this.courses().map((course) => {
        const students = this.rosterFor(course);
        const attendance = students.map((student) => this.attendance.getCourseAttendancePercent(course.id, student.id)).filter((percent) => percent > 0);
        const results = this.core.studentResults().filter((result) => result.courseId === course.id);
        return { course, students: students.length, attendance: attendance.length ? Math.round(attendance.reduce((sum, value) => sum + value, 0) / attendance.length) : 0, grades: results.length, averageMarks: results.length ? Math.round(results.reduce((sum, result) => sum + (result.marks / result.maxMarks) * 100, 0) / results.length) : 0 };
    }));
    readonly sectionTitle = computed(() => this.sections.find((section) => section.id === this.activeSection())?.label ?? 'Teacher Dashboard');

    attendanceDate = new Date().toISOString().slice(0, 10);
    resourceTitle = '';
    resourceCourseId = 'cse-101';
    assessmentCourseId = 'cse-101';
    assessmentTitle = '';
    assessmentType: 'ASSIGNMENT' | 'QUIZ' | 'EXAM' = 'ASSIGNMENT';
    assessmentDueDate = '';
    assessmentMaxMarks = 100;
    selectedAssessmentId = '';
    announcementCourseId = 'cse-101';
    announcementTitle = '';
    announcementBody = '';
    messageCourseId = '';
    messageSubject = '';
    messageBody = '';
    profileEmail = '';
    profilePhone = '';
    profileAddress = '';

    constructor() {
        this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
            const section = params.get('section');
            this.activeSection.set(section === 'dashboard' ? 'home' : this.sections.some((item) => item.id === section) ? section as Section : 'home');
        });
        this.selectedCourseId.set(this.courses()[0]?.id ?? '');
        this.resourceCourseId = this.courses()[0]?.id ?? '';
        this.assessmentCourseId = this.courses()[0]?.id ?? '';
        this.announcementCourseId = this.courses()[0]?.id ?? '';
        const profile = this.data().profile;
        this.profileEmail = profile['email'] ?? this.teacher()?.email ?? '';
        this.profilePhone = profile['phone'] ?? this.teacher()?.phone ?? '';
        this.profileAddress = profile['address'] ?? this.teacher()?.address ?? '';
        this.seedDemoQuery();
        this.loadAttendanceDraft();
    }

    private isAssigned(courseId: string): boolean { return this.courses().some((course) => course.id === courseId); }
    rosterFor(course: Course): Student[] { return this.core.students().filter((student) => student.status === 'ACTIVE' && course.programIds.includes(student.programId)); }
    rosterForCourse(courseId: string): Student[] { const course = this.courses().find((item) => item.id === courseId); return course ? this.rosterFor(course) : []; }
    studentName(student: Student): string { return `${student.firstName} ${student.lastName}`; }
    studentNameById(studentId: string): string { const student = this.core.students().find((item) => item.id === studentId); return student ? this.studentName(student) : studentId; }
    studentSubmissions(assessmentId: string) { return this.data().studentSubmissions.filter((item) => item.assessmentId === assessmentId).slice().reverse(); }
    courseCode(courseId: string | null): string { return this.core.courses().find((course) => course.id === courseId)?.code ?? 'All courses'; }
    semesterName(id: string): string { const semester = this.core.semesters().find((item) => item.id === id); return semester ? `${semester.name} ${semester.academicYear}` : id; }
    programName(id: string): string { return this.core.programs().find((item) => item.id === id)?.name ?? id; }
    sessionsFor(courseId: string) { return this.core.classSessions().filter((session) => session.courseId === courseId && session.facultyId === this.teacherId); }
    todayLabel(): string { return new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); }
    selectCourse(courseId: string): void { this.selectedCourseId.set(courseId); this.loadAttendanceDraft(); }
    openCourse(courseId: string): void { this.selectCourse(courseId); this.activeSection.set('courses'); }
    attendancePercent(studentId: string): number { return Math.round(this.attendance.getCourseAttendancePercent(this.selectedCourseId(), studentId)); }
    attendanceValue(studentId: string): AttendanceStatus { return this.attendanceDraft()[studentId] || 'PRESENT'; }
    replyValue(id: string): string { return this.replyDraft()[id] || ''; }
    setAttendance(studentId: string, status: AttendanceStatus): void { this.attendanceDraft.update((draft) => ({ ...draft, [studentId]: status })); }
    loadAttendanceDraft(): void {
        const records = this.attendance.getByCourseAndDate(this.selectedCourseId(), this.attendanceDate);
        this.attendanceDraft.set(Object.fromEntries(records.map((record) => [record.studentId, record.status])));
    }

    saveAttendance(): void {
        const course = this.selectedCourse();
        if (!course) return;
        const semesterId = this.core.classSessions().find((session) => session.courseId === course.id)?.semesterId ?? this.core.semesters()[0]?.id ?? '';
        const now = new Date().toISOString();
        this.attendance.upsert(this.roster().map((student) => {
            const old = this.attendance.getByCourseAndDate(course.id, this.attendanceDate).find((record) => record.studentId === student.id);
            return { id: old?.id ?? this.core.generateId('att'), studentId: student.id, courseId: course.id, semesterId, date: this.attendanceDate, status: this.attendanceDraft()[student.id] ?? 'PRESENT', markedBy: this.teacherId, createdAt: old?.createdAt ?? now, updatedAt: now };
        }));
        this.notify('Attendance saved for the selected class.');
    }

    async uploadResource(event: Event): Promise<void> {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;
        if (file.size > 2_000_000) { this.notify('Choose a file smaller than 2 MB for this browser-based prototype.'); input.value = ''; return; }
        const reader = new FileReader();
        reader.onload = () => {
            const item = { id: this.id(), courseId: this.resourceCourseId, title: this.resourceTitle.trim() || file.name, fileName: file.name, mimeType: file.type || 'application/octet-stream', dataUrl: String(reader.result), uploadedAt: new Date().toISOString() };
            this.workspace.update({ resources: [...this.data().resources, item] });
            this.resourceTitle = '';
            this.notify('Course resource uploaded.');
            input.value = '';
        };
        reader.onerror = () => this.notify('Could not read the selected file.');
        reader.readAsDataURL(file);
    }

    createAssessment(): void {
        if (!this.assessmentTitle.trim() || !this.assessmentDueDate || this.assessmentMaxMarks < 1) { this.notify('Enter an assessment title, due date, and valid maximum marks.'); return; }
        const item = { id: this.id(), courseId: this.assessmentCourseId, title: this.assessmentTitle.trim(), type: this.assessmentType, dueDate: this.assessmentDueDate, maxMarks: Number(this.assessmentMaxMarks), createdAt: new Date().toISOString() };
        this.workspace.update({ assessments: [...this.data().assessments, item] });
        this.assessmentTitle = '';
        this.selectedAssessmentId = item.id;
        this.marksDraft.set({});
        this.notify('Assessment created.');
    }

    selectedAssessment() { return this.assessments().find((assessment) => assessment.id === this.selectedAssessmentId); }
    assessmentName(id: string): string { return this.assessments().find((assessment) => assessment.id === id)?.title ?? id; }
    loadMarksDraft(): void {
        const assessment = this.selectedAssessment();
        if (!assessment) { this.marksDraft.set({}); return; }
        const existing = this.gradeSubmissions().find((submission) => submission.assessmentId === assessment.id);
        this.marksDraft.set(Object.fromEntries((existing?.marks ?? []).map((item) => [item.studentId, item.marks])));
    }
    setMark(studentId: string, value: number | null): void {
        const assessment = this.selectedAssessment();
        if (assessment && assessment.dueDate < new Date().toISOString().slice(0, 10)) { this.notify('The marks entry period for this assessment has ended.'); return; }
        this.marksDraft.update((draft) => ({ ...draft, [studentId]: value === null || value === undefined ? null : Number(value) }));
    }

    submitGrades(assessment: NonNullable<ReturnType<TeacherPortal['selectedAssessment']>>): void {
        if (assessment.dueDate < new Date().toISOString().slice(0, 10)) { this.notify('The marks entry period for this assessment has ended.'); return; }
        const students = this.rosterForCourse(assessment.courseId);
        const marks = students.filter((student) => this.marksDraft()[student.id] !== null && this.marksDraft()[student.id] !== undefined).map((student) => ({ studentId: student.id, marks: Number(this.marksDraft()[student.id]) }));
        if (!marks.length || marks.some((item) => item.marks < 0 || item.marks > assessment.maxMarks)) { this.notify(`Enter marks from 0 to ${assessment.maxMarks} for at least one student.`); return; }
        const previous = this.data().gradeSubmissions.find((item) => item.assessmentId === assessment.id);
        const submission = { id: previous?.id ?? this.id(), courseId: assessment.courseId, assessmentId: assessment.id, submittedAt: new Date().toISOString(), status: 'PENDING_ADMIN' as const, marks };
        this.workspace.update({ gradeSubmissions: [...this.data().gradeSubmissions.filter((item) => item.assessmentId !== assessment.id), submission] });
        this.notify('Grades submitted and marked pending administrator review.');
    }

    publishAnnouncement(): void {
        if (!this.announcementTitle.trim() || !this.announcementBody.trim()) { this.notify('Enter an announcement title and message.'); return; }
        this.noticesService.create({ title: this.announcementTitle.trim(), body: this.announcementBody.trim(), category: 'ACADEMIC', priority: 'MEDIUM', audience: ['STUDENT', this.announcementCourseId], status: 'PUBLISHED', publishDate: new Date().toISOString(), expiryDate: null });
        this.announcementTitle = ''; this.announcementBody = '';
        this.notify('Announcement published to students.');
    }
    courseNotices() { return this.noticesService.list().filter((notice) => notice.audience.includes(this.announcementCourseId)).slice().reverse().slice(0, 8); }

    sendMessage(): void {
        if (!this.messageSubject.trim() || !this.messageBody.trim()) { this.notify('Enter a subject and message.'); return; }
        const item: TeacherMessage = { id: this.id(), courseId: this.messageCourseId || null, subject: this.messageSubject.trim(), body: this.messageBody.trim(), direction: 'SENT', sender: this.teacherName(), recipient: this.messageCourseId ? `${this.courseCode(this.messageCourseId)} students` : 'Students', createdAt: new Date().toISOString() };
        this.workspace.update({ messages: [...this.data().messages, item] });
        this.messageSubject = ''; this.messageBody = '';
        this.notify('Message saved in the teacher communication log.');
    }
    private seedDemoQuery(): void {
        if (this.data().messages.some((thread) => thread.direction === 'RECEIVED')) return;
        const course = this.courses()[0];
        const student = course ? this.rosterFor(course)[0] : undefined;
        if (!course || !student) return;
        const query: TeacherMessage = {
            id: this.id(), courseId: course.id, subject: 'Where can I find the lecture materials?',
            body: 'Hello, could you please let me know where the course lecture materials are available?',
            direction: 'RECEIVED', sender: this.studentName(student), recipient: this.teacherName(), createdAt: new Date().toISOString(), demo: true
        };
        this.workspace.update({ messages: [...this.data().messages, query] });
    }
    setReply(id: string, text: string): void { this.replyDraft.update((draft) => ({ ...draft, [id]: text })); }
    replyTo(thread: TeacherMessage): void {
        const reply = this.replyDraft()[thread.id]?.trim();
        if (!reply) { this.notify('Write a reply before sending.'); return; }
        this.workspace.update({ messages: this.data().messages.map((item) => item.id === thread.id ? { ...item, reply } : item) });
        this.notify('Reply saved to the query thread.');
    }

    saveProfile(): void {
        const person = this.teacher();
        if (!person || !this.profileEmail.includes('@')) { this.notify('Enter a valid email address.'); return; }
        this.core.update('facultyMembers', { ...person, email: this.profileEmail.trim(), phone: this.profilePhone.trim(), address: this.profileAddress.trim() });
        this.workspace.update({ profile: { email: this.profileEmail.trim(), phone: this.profilePhone.trim(), address: this.profileAddress.trim() } });
        this.notify('Profile updated.');
    }

    downloadRoster(): void {
        const course = this.selectedCourse();
        if (!course) return;
        downloadCsv(`${course.code.toLowerCase()}-student-list.csv`, ['Student ID', 'Name', 'Program', 'Email'], this.roster().map((student) => [student.admissionNo, this.studentName(student), this.programName(student.programId), student.email]));
    }
    downloadMarkSheet(assessment: { id: string; courseId: string; title: string; maxMarks: number }): void {
        const submission = this.data().gradeSubmissions.find((item) => item.assessmentId === assessment.id);
        const marks = new Map((submission?.marks ?? []).map((item) => [item.studentId, item.marks]));
        downloadCsv(`${assessment.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-marks.csv`, ['Student ID', 'Student Name', 'Marks', 'Maximum Marks', 'Status'], this.rosterForCourse(assessment.courseId).map((student) => {
            const mark = marks.get(student.id);
            return [student.admissionNo, this.studentName(student), mark ?? '', assessment.maxMarks, submission?.status ?? 'NOT SUBMITTED'];
        }));
    }
    downloadReport(): void {
        downloadCsv('teacher-class-report.csv', ['Course', 'Course title', 'Students', 'Average attendance %', 'Graded results', 'Average marks %'], this.reportRows().map((row) => [row.course.code, row.course.title, row.students, row.attendance, row.grades, row.averageMarks]));
    }
    private id(): string { return `tch-${Math.random().toString(36).slice(2, 10).toUpperCase()}`; }
    private notify(text: string): void { this.message.set(text); setTimeout(() => { if (this.message() === text) this.message.set(''); }, 4500); }
}
