import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AttendanceService } from '@/app/core/services/attendance.service';
import { AuthService } from '@/app/core/services/auth.service';
import { CoreDataService } from '@/app/core/services/core-data.service';
import { ExamService } from '@/app/core/services/exam.service';
import { StudentService } from '@/app/core/services/student.service';
import { StudentWorkspaceService } from '@/app/core/services/student-workspace.service';
import { TeacherWorkspaceService, TeacherMessage } from '@/app/core/services/teacher-workspace.service';
import { downloadCsv } from '@/app/core/utils/util';
import { Course, FeeAccount, Student } from '@/app/core/models';

type StudentSection = 'dashboard' | 'registration' | 'resources' | 'routine' | 'results' | 'fees' | 'communication' | 'profile';

@Component({
    selector: 'app-student-portal', standalone: true,
    imports: [CommonModule, FormsModule, DatePipe, DecimalPipe],
    template: `
    <div class="student-portal">
        <header class="portal-header"><div><p class="eyebrow">INFINITY UNIVERSITY</p><h1>{{ sectionTitle() }}</h1><p class="muted">{{ studentName() }} <span class="dot">·</span> {{ student()?.admissionNo }} <span class="dot">·</span> {{ programName() }}</p></div><span class="badge">Student Portal</span></header>
        @if (notice()) { <div class="notice-banner" role="status">{{ notice() }}</div> }

        @if (activeSection() === 'dashboard') {
            <section class="stats-grid">
                <article class="stat"><span>Registered courses</span><strong>{{ enrolledCourses().length }}</strong><small>{{ currentSemesterName() }}</small></article>
                <article class="stat"><span>Attendance average</span><strong>{{ attendanceAverage() }}%</strong><small>Across courses with attendance records</small></article>
                <article class="stat"><span>Current GPA</span><strong>{{ gpa() | number:'1.2-2' }}</strong><small>CGPA {{ cgpa() | number:'1.2-2' }}</small></article>
                <article class="stat"><span>Outstanding fees</span><strong>{{ balance() | number:'1.0-0' }}</strong><small>{{ currency }}</small></article>
            </section>
            <div class="content-grid">
                <section class="panel"><div class="panel-heading"><div><h2>Upcoming routine</h2><p>Your next scheduled classes and exams</p></div><button class="link-button" (click)="navigate('routine')">View routine →</button></div>
                    @for (session of upcomingSessions().slice(0, 5); track session.id) { <div class="list-row"><span class="date-tile">{{ session.day.slice(0, 3) }}<b>{{ session.startTime }}</b></span><div class="grow"><b>{{ courseCode(session.courseId) }} · {{ courseTitle(session.courseId) }}</b><small>{{ session.day }} · Room {{ session.room }}</small></div></div> }
                    @for (exam of upcomingExams().slice(0, 3); track exam.id) { <div class="list-row"><span class="date-tile">EXAM<b>{{ exam.date | date:'MMM d' }}</b></span><div class="grow"><b>{{ courseCode(exam.courseId) }} · {{ exam.title }}</b><small>{{ exam.startTime }} · Room {{ exam.room }}</small></div></div> }
                    @if (!upcomingSessions().length && !upcomingExams().length) { <p class="empty">No scheduled classes or exams are available for your registered courses.</p> }
                </section>
                <section class="panel"><div class="panel-heading"><div><h2>Notices & reminders</h2><p>Updates for your courses and university</p></div></div>
                    @for (item of notices().slice(0, 5); track item.id) { <article class="notice-item"><div class="row-between"><b>{{ item.title }}</b><span class="priority" [class.urgent]="item.priority === 'URGENT' || item.priority === 'HIGH'">{{ item.priority }}</span></div><p>{{ item.body }}</p><small>{{ item.publishDate | date:'mediumDate' }}</small></article> }
                    @if (!notices().length) { <p class="empty">No published notices for you yet.</p> }
                    <div class="task-box"><b>Pending tasks</b><span>{{ pendingAssessments().length }} assignment(s) due</span><button class="link-button" (click)="navigate('resources')">Open learning resources →</button></div>
                </section>
            </div>
        }

        @if (activeSection() === 'registration') {
            <section class="panel"><div class="panel-heading"><div><h2>Semester course registration</h2><p>Choose courses offered for your program. Requests are saved as pending until reviewed.</p></div></div>
                <label class="field-label">Semester<select class="field" [(ngModel)]="selectedSemesterId"><option *ngFor="let semester of semesters" [value]="semester.id">{{ semester.name }} · {{ semester.academicYear }} ({{ semester.status }})</option></select></label>
                <div class="table-wrap"><table><thead><tr><th>Course</th><th>Credits</th><th>Type</th><th>Prerequisite</th><th>Registration</th></tr></thead><tbody>
                    @for (course of registrationCourses(); track course.id) { <tr><td><b>{{ course.code }}</b><small>{{ course.title }}</small></td><td>{{ course.credits }}</td><td>{{ course.type }}</td><td>{{ prerequisiteName(course.prerequisite) }}</td><td><button class="primary-button" [disabled]="!canRegister(course)" (click)="register(course)">{{ registrationStatus(course.id) || 'Request registration' }}</button></td></tr> }
                    @empty { <tr><td colspan="5" class="empty">No additional active courses are available for this semester.</td></tr> }
                </tbody></table></div>
                <h3 class="subheading">Current registrations</h3><div class="table-wrap"><table><thead><tr><th>Course</th><th>Semester</th><th>Requested</th><th>Status</th></tr></thead><tbody>
                    @for (item of myRegistrations(); track item.id) { <tr><td>{{ courseCode(item.courseId) }} · {{ courseTitle(item.courseId) }}</td><td>{{ semesterName(item.semesterId) }}</td><td>{{ item.submittedAt | date:'mediumDate' }}</td><td><span class="status" [class.approved]="item.status === 'APPROVED'" [class.rejected]="item.status === 'REJECTED'">{{ item.status }}</span></td></tr> }
                    @empty { <tr><td colspan="4" class="empty">No registration requests have been submitted.</td></tr> }
                </tbody></table></div>
            </section>
        }

        @if (activeSection() === 'resources') {
            <section class="panel"><div class="panel-heading"><div><h2>Learning resources & assignments</h2><p>Course materials and coursework shared by your teachers</p></div></div>
                @for (course of enrolledCourses(); track course.id) { <h3 class="subheading">{{ course.code }} · {{ course.title }}</h3>
                    @for (resource of resourcesFor(course.id); track resource.id) { <div class="resource-row"><span class="resource-icon">▤</span><div class="grow"><b>{{ resource.title }}</b><small>{{ resource.fileName }} · Added {{ resource.uploadedAt | date:'mediumDate' }}</small></div><a class="secondary-button" [href]="resource.dataUrl" [download]="resource.fileName">Download</a></div> }
                    @for (assessment of assessmentsFor(course.id); track assessment.id) { <article class="assignment"><div class="row-between"><div><b>{{ assessment.title }}</b><small>{{ assessment.type }} · Due {{ assessment.dueDate | date:'mediumDate' }} · {{ assessment.maxMarks }} marks</small></div><span class="status" [class.approved]="submissionFor(assessment.id)">{{ submissionFor(assessment.id) ? 'SUBMITTED' : (assessment.dueDate < today ? 'CLOSED' : 'OPEN') }}</span></div>
                        @if (assessment.type === 'ASSIGNMENT' && assessment.dueDate >= today && !submissionFor(assessment.id)) { <textarea class="field response" [(ngModel)]="responses[assessment.id]" placeholder="Write your submission or response"></textarea><div class="row-between"><label class="file-label">Optional file (max 2 MB)<input type="file" (change)="selectSubmissionFile(assessment.id, $event)" /></label><button class="primary-button" (click)="submitAssignment(assessment.id)">Submit assignment</button></div> }
                        @if (submissionFor(assessment.id); as submission) { <p class="submission-copy">Submitted {{ submission.submittedAt | date:'medium' }}{{ submission.fileName ? ' · ' + submission.fileName : '' }} · {{ submission.response }}</p> }
                    </article> }
                }
                @if (!enrolledCourses().length) { <p class="empty">Your courses will appear here after registration is approved.</p> }
            </section>
        }

        @if (activeSection() === 'routine') {
            <div class="content-grid"><section class="panel"><div class="panel-heading"><div><h2>Class routine</h2><p>Classes for {{ currentSemesterName() }}</p></div></div>
                @for (session of routineSessions(); track session.id) { <div class="list-row"><span class="date-tile">{{ session.day.slice(0, 3) }}<b>{{ session.startTime }}</b></span><div class="grow"><b>{{ courseCode(session.courseId) }} · {{ courseTitle(session.courseId) }}</b><small>{{ session.day }} · {{ session.startTime }}–{{ session.endTime }} · Room {{ session.room }}</small></div><span>{{ teacherName(session.facultyId) }}</span></div> }
                @empty { <p class="empty">No class routine is available for your registered courses.</p> }</section>
                <section class="panel"><div class="panel-heading"><div><h2>Exam schedule</h2><p>Upcoming exams for your courses</p></div></div>
                    @for (exam of courseExams(); track exam.id) { <div class="list-row"><span class="date-tile">{{ exam.type }}<b>{{ exam.date | date:'MMM d' }}</b></span><div class="grow"><b>{{ courseCode(exam.courseId) }} · {{ exam.title }}</b><small>{{ exam.date | date:'fullDate' }} · {{ exam.startTime }}–{{ exam.endTime }} · Room {{ exam.room }}</small></div></div> }
                    @empty { <p class="empty">No exam schedule is available for your registered courses.</p> }</section></div>
            <section class="panel mt-5"><div class="panel-heading"><div><h2>Attendance by course</h2><p>Present and late sessions count as attended</p></div></div><div class="table-wrap"><table><thead><tr><th>Course</th><th>Sessions</th><th>Attended</th><th>Attendance</th><th>Records</th></tr></thead><tbody>@for (course of enrolledCourses(); track course.id) { <tr><td>{{ course.code }} · {{ course.title }}</td><td>{{ attendanceCounts(course.id).total }}</td><td>{{ attendanceCounts(course.id).attended }}</td><td><span class="meter"><i [style.width.%]="attendancePercent(course.id)"></i></span>{{ attendancePercent(course.id) }}%</td><td><button class="link-button" (click)="showAttendance(course)">View dates</button></td></tr> } @empty { <tr><td colspan="5" class="empty">No enrolled courses to show.</td></tr> }</tbody></table></div>
                @if (attendanceCourse()) { <div class="attendance-details"><b>{{ attendanceCourse()!.code }} attendance records</b>@for (record of attendanceRecords(attendanceCourse()!.id); track record.id) { <span>{{ record.date | date:'mediumDate' }} · {{ record.status }}</span>}</div> }</section>
        }

        @if (activeSection() === 'results') {
            <section class="panel"><div class="panel-heading"><div><h2>Academic results</h2><p>Grades currently published to your academic record</p></div><button class="secondary-button" (click)="downloadTranscript()">Download result sheet</button></div>
                <div class="stats-grid compact"><article class="stat"><span>Current GPA</span><strong>{{ gpa() | number:'1.2-2' }}</strong><small>{{ currentSemesterName() }}</small></article><article class="stat"><span>CGPA</span><strong>{{ cgpa() | number:'1.2-2' }}</strong><small>Completed semesters</small></article></div>
                <div class="table-wrap"><table><thead><tr><th>Semester</th><th>Course</th><th>Marks</th><th>Grade</th><th>Grade point</th><th>Status</th></tr></thead><tbody>@for (result of results(); track result.id) { <tr><td>{{ semesterName(result.semesterId) }}</td><td>{{ courseCode(result.courseId) }} · {{ courseTitle(result.courseId) }}</td><td>{{ result.marks }} / {{ result.maxMarks }}</td><td><b>{{ result.grade }}</b></td><td>{{ result.gradePoint | number:'1.1-2' }}</td><td>{{ result.status }}</td></tr> } @empty { <tr><td colspan="6" class="empty">Published results will appear here when available.</td></tr> }</tbody></table></div>
            </section>
        }

        @if (activeSection() === 'fees') {
            <section class="panel"><div class="panel-heading"><div><h2>Fees & payments</h2><p>Fee balances and payment history</p></div></div><div class="stats-grid compact"><article class="stat"><span>Total billed</span><strong>{{ totalBilled() | number:'1.0-0' }}</strong><small>{{ currency }}</small></article><article class="stat"><span>Total paid</span><strong>{{ totalPaid() | number:'1.0-0' }}</strong><small>{{ currency }}</small></article><article class="stat"><span>Outstanding balance</span><strong>{{ balance() | number:'1.0-0' }}</strong><small>{{ currency }}</small></article></div>
                @for (account of feeAccounts(); track account.id) { <div class="fee-card"><div class="row-between"><div><b>{{ semesterName(account.semesterId) }}</b><small>Account {{ account.id }} · {{ account.status }}</small></div><span class="amount">{{ account.balance | number:'1.0-0' }} {{ currency }} due</span></div><div class="table-wrap"><table><thead><tr><th>Charge</th><th>Due date</th><th>Amount</th></tr></thead><tbody>@for (charge of account.charges; track charge.id) { <tr><td>{{ charge.title }}</td><td>{{ charge.dueDate | date:'mediumDate' }}</td><td>{{ charge.amount | number:'1.0-0' }} {{ currency }}</td></tr> }</tbody></table></div><button class="secondary-button" (click)="downloadReceipt(account)">Download statement</button></div> }
                <h3 class="subheading">Payment history</h3><div class="table-wrap"><table><thead><tr><th>Receipt</th><th>Date</th><th>Method</th><th>Amount</th><th>Receipt file</th></tr></thead><tbody>@for (payment of payments(); track payment.id) { <tr><td>{{ payment.receiptNo }}</td><td>{{ payment.date | date:'mediumDate' }}</td><td>{{ payment.method }}</td><td>{{ payment.amount | number:'1.0-0' }} {{ currency }}</td><td><button class="link-button" (click)="downloadPaymentReceipt(payment.receiptNo)">Download</button></td></tr> } @empty { <tr><td colspan="5" class="empty">No payments have been recorded.</td></tr> }</tbody></table></div>
            </section>
        }

        @if (activeSection() === 'communication') {
            <div class="content-grid"><section class="panel"><div class="panel-heading"><div><h2>Send a query</h2><p>Contact a teacher about a course or send a request to administration</p></div></div>
                <label class="field-label">Recipient / course<select class="field" [(ngModel)]="messageCourseId"><option value="">Administration</option>@for (course of enrolledCourses(); track course.id) { <option [value]="course.id">{{ course.code }} · {{ teacherName(course.facultyId) }}</option> }</select></label>
                <label class="field-label">Subject<input class="field" [(ngModel)]="messageSubject" placeholder="What do you need help with?" /></label><label class="field-label">Message<textarea class="field" rows="5" [(ngModel)]="messageBody" placeholder="Write your question or request"></textarea></label><button class="primary-button" (click)="sendMessage()">Send query</button>
            </section><section class="panel"><div class="panel-heading"><div><h2>Notices and conversations</h2><p>Course announcements, university notices and your message threads</p></div></div>
                @for (thread of visibleMessages(); track thread.id) { <article class="notice-item"><b>{{ thread.subject }}</b><p>{{ thread.body }}</p><small>{{ thread.sender }} → {{ thread.recipient }} · {{ courseCode(thread.courseId) }} · {{ thread.createdAt | date:'medium' }}</small>@if (thread.reply && thread.sender === studentName()) { <div class="reply-box"><b>Teacher reply</b><p>{{ thread.reply }}</p></div> }</article> }
                @for (item of notices(); track item.id) { <article class="notice-item"><b>{{ item.title }}</b><p>{{ item.body }}</p><small>{{ item.publishDate | date:'mediumDate' }} · {{ item.category }}</small></article> }
                @if (!visibleMessages().length && !notices().length) { <p class="empty">No messages or notices yet.</p> }</section></div>
        }

        @if (activeSection() === 'profile') {
            <section class="panel profile-panel"><div class="panel-heading"><div><h2>Personal profile</h2><p>Update contact information. Official academic details are managed by administration.</p></div></div>
                <div class="form-grid"><label class="field-label">First name<input class="field" [value]="student()?.firstName" disabled /></label><label class="field-label">Last name<input class="field" [value]="student()?.lastName" disabled /></label><label class="field-label">Admission number<input class="field" [value]="student()?.admissionNo" disabled /></label><label class="field-label">Program<input class="field" [value]="programName()" disabled /></label><label class="field-label">Email<input class="field" type="email" [(ngModel)]="profileEmail" /></label><label class="field-label">Phone<input class="field" [(ngModel)]="profilePhone" /></label><label class="field-label full">Address<textarea class="field" rows="3" [(ngModel)]="profileAddress"></textarea></label><label class="field-label">Guardian<input class="field" [value]="student()?.guardianName" disabled /></label></div><button class="primary-button mt-4" (click)="saveProfile()">Save contact details</button>
            </section>
        }
    </div>
    `,
})
export class StudentPortal {
    private readonly auth = inject(AuthService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly core = inject(CoreDataService);
    private readonly students = inject(StudentService);
    private readonly attendance = inject(AttendanceService);
    private readonly exams = inject(ExamService);
    private readonly workspace = inject(TeacherWorkspaceService);
    private readonly studentWorkspace = inject(StudentWorkspaceService);
    readonly activeSection = signal<StudentSection>('dashboard');
    readonly notice = signal('');
    readonly attendanceCourse = signal<Course | null>(null);
    readonly sections: { id: StudentSection; label: string }[] = [
        { id: 'dashboard', label: 'Student Dashboard' }, { id: 'registration', label: 'Course Registration' }, { id: 'resources', label: 'Learning Resources' }, { id: 'routine', label: 'Attendance & Routine' }, { id: 'results', label: 'Results' }, { id: 'fees', label: 'Fees & Payments' }, { id: 'communication', label: 'Communication' }, { id: 'profile', label: 'Profile' }
    ];
    readonly student = computed(() => this.students.get('stu-001'));
    readonly studentName = computed(() => this.student() ? `${this.student()!.firstName} ${this.student()!.lastName}` : 'Student');
    readonly currentSemester = computed(() => this.core.semesters().find((item) => item.id === this.student()?.currentSemesterId));
    readonly registeredIds = computed(() => {
        const studentId = this.student()?.id;
        const currentSemesterId = this.currentSemester()?.id;
        const programId = this.student()?.programId;
        const programCourseIds = new Set(this.core.courses().filter((course) => course.programIds.includes(programId ?? '')).map((course) => course.id));
        const classIds = this.core.classSessions().filter((session) => session.semesterId === currentSemesterId && programCourseIds.has(session.courseId)).map((session) => session.courseId);
        const approvedIds = this.studentWorkspace.registrations().filter((item) => item.studentId === studentId && item.semesterId === currentSemesterId && item.status === 'APPROVED').map((item) => item.courseId);
        return new Set([...classIds, ...approvedIds]);
    });
    readonly enrolledCourses = computed(() => this.core.courses().filter((course) => this.registeredIds().has(course.id)));
    readonly results = computed(() => this.core.studentResults().filter((result) => result.studentId === this.student()?.id).slice().sort((a,b) => b.semesterId.localeCompare(a.semesterId)));
    readonly gpa = computed(() => this.exams.calcGPA(this.student()?.id ?? '', this.currentSemester()?.id));
    readonly cgpa = computed(() => this.exams.calcCGPA(this.student()?.id ?? ''));
    readonly feeAccounts = computed(() => this.core.feeAccounts().filter((item) => item.studentId === this.student()?.id));
    readonly payments = computed(() => this.core.payments().filter((item) => item.studentId === this.student()?.id).slice().sort((a,b) => b.date.localeCompare(a.date)));
    readonly totalBilled = computed(() => this.feeAccounts().reduce((sum, item) => sum + item.totalBilled, 0));
    readonly totalPaid = computed(() => this.feeAccounts().reduce((sum, item) => sum + item.totalPaid, 0));
    readonly balance = computed(() => this.feeAccounts().reduce((sum, item) => sum + item.balance, 0));
    readonly currency = this.core.getSettings().currency || 'BDT';
    selectedSemesterId = this.student()?.currentSemesterId ?? '';
    messageCourseId = '';
    messageSubject = '';
    messageBody = '';
    profileEmail = this.student()?.email ?? '';
    profilePhone = this.student()?.phone ?? '';
    profileAddress = this.student()?.address ?? '';
    readonly today = new Date().toISOString().slice(0, 10);
    readonly responses: Record<string, string> = {};
    private readonly selectedFiles: Record<string, { name: string; dataUrl: string }> = {};

    constructor() {
        if (this.auth.role() !== 'STUDENT') return;
        this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
            const section = params.get('section') as StudentSection | null;
            this.activeSection.set(this.sections.some((item) => item.id === section) ? section! : 'dashboard');
        });
    }
    readonly sectionTitle = computed(() => this.sections.find((item) => item.id === this.activeSection())?.label ?? 'Student Dashboard');
    get semesters() { return this.core.semesters(); }
    programName(): string { return this.core.programs().find((item) => item.id === this.student()?.programId)?.name ?? 'Program'; }
    currentSemesterName(): string { const item = this.currentSemester(); return item ? `${item.name} · ${item.academicYear}` : 'Current semester'; }
    semesterName(id: string): string { const item = this.core.semesters().find((sem) => sem.id === id); return item ? `${item.name} · ${item.academicYear}` : id; }
    courseCode(id: string | null): string { return this.core.courses().find((item) => item.id === id)?.code ?? 'Administration'; }
    courseTitle(id: string): string { return this.core.courses().find((item) => item.id === id)?.title ?? ''; }
    teacherName(id: string | null): string { const teacher = this.core.facultyMembers().find((item) => item.id === id); return teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Faculty'; }
    prerequisiteName(id: string | null): string { return id ? this.courseCode(id) : 'None'; }
    navigate(section: StudentSection): void { this.router.navigate(['/student', section]); }
    registrationCourses(): Course[] { return this.core.courses().filter((course) => course.status === 'ACTIVE' && course.programIds.includes(this.student()?.programId ?? '') && !this.registeredInSemester(course.id)); }
    myRegistrations() { return this.studentWorkspace.registrations().filter((item) => item.studentId === this.student()?.id).slice().sort((a,b) => b.submittedAt.localeCompare(a.submittedAt)); }
    registrationStatus(courseId: string): string | null { return this.studentWorkspace.registrations().find((item) => item.studentId === this.student()?.id && item.semesterId === this.selectedSemesterId && item.courseId === courseId)?.status ?? null; }
    registeredInSemester(courseId: string): boolean { return this.core.classSessions().some((session) => session.courseId === courseId && session.semesterId === this.selectedSemesterId) || this.studentWorkspace.registrations().some((item) => item.studentId === this.student()?.id && item.semesterId === this.selectedSemesterId && item.courseId === courseId && item.status !== 'REJECTED'); }
    canRegister(course: Course): boolean { return !!this.selectedSemesterId && !this.registeredInSemester(course.id) && this.core.semesters().find((item) => item.id === this.selectedSemesterId)?.status !== 'CLOSED'; }
    register(course: Course): void { if (!this.student()) return; this.studentWorkspace.register(this.student()!.id, course.id, this.selectedSemesterId); this.notify(`Registration request submitted for ${course.code}.`); }
    resourcesFor(courseId: string) { return this.workspace.data().resources.filter((item) => item.courseId === courseId).slice().reverse(); }
    assessmentsFor(courseId: string) { return this.workspace.data().assessments.filter((item) => item.courseId === courseId).slice().reverse(); }
    pendingAssessments() { return this.enrolledCourses().flatMap((course) => this.assessmentsFor(course.id)).filter((item) => item.type === 'ASSIGNMENT' && item.dueDate >= this.today && !this.submissionFor(item.id)); }
    submissionFor(assessmentId: string) { return this.workspace.data().studentSubmissions.find((item) => item.assessmentId === assessmentId && item.studentId === this.student()?.id); }
    selectSubmissionFile(id: string, event: Event): void { const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return; if (file.size > 2_000_000) { this.notify('Choose a file smaller than 2 MB.'); (event.target as HTMLInputElement).value = ''; return; } const reader = new FileReader(); reader.onload = () => { this.selectedFiles[id] = { name:file.name, dataUrl:String(reader.result) }; }; reader.readAsDataURL(file); }
    submitAssignment(id: string): void { const assessment = this.workspace.data().assessments.find((item) => item.id === id); if (!assessment || assessment.dueDate < this.today || this.submissionFor(id)) return; const response = this.responses[id]?.trim() ?? ''; const file = this.selectedFiles[id]; if (!response && !file) { this.notify('Write a response or attach a file before submitting.'); return; } const submission = { id:`sub-${Date.now()}`, assessmentId:id, studentId:this.student()?.id ?? '', response, ...(file ? { fileName:file.name, fileDataUrl:file.dataUrl } : {}), submittedAt:new Date().toISOString() }; this.workspace.update({ studentSubmissions:[...this.workspace.data().studentSubmissions, submission] }); this.notify('Assignment submitted successfully.'); }
    routineSessions() { const ids=this.registeredIds(); return this.core.classSessions().filter((session) => ids.has(session.courseId) && session.semesterId === this.currentSemester()?.id).slice().sort((a,b) => ['Sunday','Monday','Tuesday','Wednesday','Thursday'].indexOf(a.day)-['Sunday','Monday','Tuesday','Wednesday','Thursday'].indexOf(b.day) || a.startTime.localeCompare(b.startTime)); }
    upcomingSessions() { return this.routineSessions(); }
    courseExams() { const ids=this.registeredIds(); return this.core.examinations().filter((item) => ids.has(item.courseId)).slice().sort((a,b) => a.date.localeCompare(b.date)); }
    upcomingExams() { return this.courseExams().filter((item) => item.date >= this.today); }
    attendanceRecords(courseId: string) { return this.core.attendanceRecords().filter((record) => record.studentId === this.student()?.id && record.courseId === courseId).slice().sort((a,b) => b.date.localeCompare(a.date)); }
    attendanceCounts(courseId: string) { const records=this.attendanceRecords(courseId); return { total:records.length, attended:records.filter((item) => item.status === 'PRESENT' || item.status === 'LATE').length }; }
    attendancePercent(courseId: string): number { const counts=this.attendanceCounts(courseId); return counts.total ? Math.round(counts.attended/counts.total*100) : 0; }
    attendanceAverage(): number { const values=this.enrolledCourses().map((item) => this.attendancePercent(item.id)).filter((value) => value > 0); return values.length ? Math.round(values.reduce((sum,value) => sum+value,0)/values.length) : 0; }
    showAttendance(course: Course): void { this.attendanceCourse.set(this.attendanceCourse()?.id === course.id ? null : course); }
    notices() { const ids=this.registeredIds(); return this.core.notices().filter((item) => item.status === 'PUBLISHED' && (!item.expiryDate || item.expiryDate >= new Date().toISOString()) && item.audience.some((aud) => ['all','ALL','STUDENT','STUDENTS'].includes(aud) || ids.has(aud))).slice().sort((a,b) => (b.publishDate ?? '').localeCompare(a.publishDate ?? '')); }
    visibleMessages(): TeacherMessage[] { const ids=this.registeredIds(); const name=this.studentName(); return this.workspace.data().messages.filter((item) => (!item.courseId || ids.has(item.courseId)) && (item.direction === 'SENT' || item.sender === name || item.recipient === name)); }
    sendMessage(): void { if (!this.messageSubject.trim() || !this.messageBody.trim()) { this.notify('Enter a subject and message.'); return; } const course=this.core.courses().find((item) => item.id === this.messageCourseId); const recipient=course ? this.teacherName(course.facultyId) : 'Administration'; const item: TeacherMessage={id:`msg-${Date.now()}`,courseId:course?.id ?? null,subject:this.messageSubject.trim(),body:this.messageBody.trim(),direction:'RECEIVED',sender:this.studentName(),recipient,createdAt:new Date().toISOString()}; this.workspace.update({messages:[...this.workspace.data().messages,item]}); this.messageSubject='';this.messageBody='';this.notify('Your query has been sent.'); }
    saveProfile(): void { const student=this.student(); if (!student || !this.profileEmail.includes('@')) { this.notify('Enter a valid email address.'); return; } this.students.update({...student,email:this.profileEmail.trim(),phone:this.profilePhone.trim(),address:this.profileAddress.trim()});this.notify('Profile contact details updated.'); }
    downloadTranscript(): void { downloadCsv('infinity-university-result-sheet.csv',['Semester','Course code','Course title','Marks','Maximum marks','Grade','Grade point','Status'],this.results().map((item) => [this.semesterName(item.semesterId),this.courseCode(item.courseId),this.courseTitle(item.courseId),item.marks,item.maxMarks,item.grade,item.gradePoint,item.status])); }
    downloadReceipt(account: FeeAccount): void { downloadCsv(`fee-statement-${account.id}.csv`,['Account','Semester','Charge','Due date','Amount','Total billed','Total paid','Balance'],account.charges.map((charge) => [account.id,this.semesterName(account.semesterId),charge.title,charge.dueDate,charge.amount,account.totalBilled,account.totalPaid,account.balance])); }
    downloadPaymentReceipt(receiptNo: string): void { const payment=this.payments().find((item) => item.receiptNo === receiptNo); if (!payment) return; downloadCsv(`${receiptNo}.csv`,['Receipt number','Student','Admission number','Date','Method','Amount','Note'],[[payment.receiptNo,this.studentName(),this.student()?.admissionNo,payment.date,payment.method,payment.amount,payment.note]]); }
    private notify(message: string): void { this.notice.set(message); setTimeout(() => this.notice.set(''), 4000); }
}
