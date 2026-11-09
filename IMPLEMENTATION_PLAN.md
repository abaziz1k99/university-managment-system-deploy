# UniManage — Implementation Workflow

University Management System prototype built on the existing Sakai NG scaffold
(Angular 21 standalone components, PrimeNG 21, Tailwind 4, Chart.js).

This document is the step-by-step build plan. Work top to bottom. Each step has a
definition of done so the prototype stays demo-ready at every phase boundary.

---

## 0. Ground Rules

- **Stack:** Angular 21 (standalone, zoneless), PrimeNG 21, Tailwind CSS 4, Chart.js, RxJS.
- **Alias:** `@/*` → `src/*` (already configured in `tsconfig.json`).
- **State:** in-memory mock database + `localStorage` persistence via one central service.
- **No backend calls.** All business logic lives in services, never in components.
- **Business logic separation:** services return typed models; components only render and dispatch.
- **Design language:** commercial SaaS admin. Neutral surfaces, one accent color, 8px radius,
  no decorative gradients, minimal motion, dense but readable tables. Brand: **UniManage —
  University Administration Portal**, graduation-cap mark.
- **Node/Angular:** Angular 21 and the current Node setup are already in place.
  Do not upgrade or change Node or Angular versions.
- **Assets:** `src/assets` is a git submodule (already initialized); run
  `git submodule update --init` on fresh clones.

### Definition of done for every module

1. Route is lazy-loaded, reachable from the sidebar, and the active item is highlighted.
2. Create + edit work through Reactive Forms with visible validation errors.
3. Search, filters, sorting and pagination work against live data.
4. Mutations persist to `localStorage` and survive refresh.
5. Success/error feedback uses PrimeNG `MessageService` toasts.
6. No dead primary buttons; no placeholder-only screens.
7. Layout holds at 360 px, 768 px and 1440 px widths.

---

## 1. Phase 0 — Foundation & Rebrand

### 1.1 Toolchain

- [x] Keep the existing Node and Angular 21 versions as-is (no upgrade required).
- [ ] `npm install` and confirm `npm start` builds.
- [ ] Remove or ignore Sakai demo leftovers that are not part of the product
      (`uikit`, `documentation`, `landing`, `crud`, `empty` routes; keep auth screens
      as the mock login entry).

### 1.2 Folder structure

Create the target structure and move the existing layout into `layouts/`:

```
src/app/
├── core/
│   ├── models/            # all typed interfaces
│   ├── data/              # seed data factories
│   ├── services/          # data + business services
│   ├── guards/            # mock auth guard (optional)
│   └── utils/             # csv export, grade calc, id gen, date helpers
├── shared/
│   ├── components/        # page-header, stat-card, data-table, confirm-dialog,
│   │                      # empty-state, status-tag, avatar, chart-card, form-field
│   ├── pipes/
│   └── ui/                # toolbar/filter bar primitives
├── layouts/
│   ├── app.layout.ts
│   ├── app.sidebar.ts
│   ├── app.topbar.ts
│   ├── app.menu.ts
│   └── app.footer.ts
├── features/
│   ├── dashboard/
│   ├── students/
│   ├── admissions/
│   ├── faculty/
│   ├── academic-structure/   # faculties + departments
│   ├── programs/
│   ├── courses/
│   ├── semesters/
│   ├── routine/
│   ├── attendance/
│   ├── examinations/         # schedule + results
│   ├── fees/
│   ├── notices/
│   ├── reports/
│   ├── users/
│   └── settings/
└── app.routes.ts / app.config.ts (src root, as today)
```

Each feature folder:

```
features/<name>/
├── <name>.routes.ts
├── pages/<name>-list.ts
├── pages/<name>-form.ts          (dialog or page)
├── pages/<name>-detail.ts        (when required)
├── components/                   (feature-specific pieces)
└── services/<name>.service.ts    (thin wrapper over CoreDataService when needed)
```

### 1.3 Branding and shell

- [ ] Rename project references from `sakai-ng` where user-visible (`index.html` title,
      favicon alt text, footer, topbar).
- [ ] Replace the Sakai logo SVG with a graduation-cap mark + "UniManage" wordmark.
- [ ] Topbar: page context, global search (students/courses), notifications menu,
      user menu (profile, settings, sign out).
- [ ] Sidebar: collapsible, sectioned (Overview / Academics / Administration / System),
      active-route highlight, icon + label, collapsed icon-only mode with tooltips.
- [ ] Footer: version, "Demo data — not a production system".
- [ ] `styles.scss`: design tokens (surface, border, text, accent, success/warn/danger),
      table density, card elevation, responsive breakpoints. Prefer PrimeNG theme tokens
      over hard-coded colors.
- [ ] Toast host (`<p-toast>`) and confirm dialog host mounted once in the layout.

**Done when:** shell renders branded, sidebar toggles on desktop/mobile, all 15 menu
entries route to (initially empty) feature pages, and deep links restore the active item.

---

## 2. Phase 0.5 — Data Models, Seed Data, Persistence

### 2.1 Models (`core/models/*.ts`)

Define interfaces exactly once, with stable string IDs and a `createdAt`/`updatedAt`
where useful. Keep field names SQL-friendly (camelCase in TS, mapping documented).

| Interface | Key relationships |
|---|---|
| `Faculty` (academic faculty, e.g. Engineering) | 1–N departments |
| `Department` | belongs to `Faculty`; has `headId` → `FacultyMember` |
| `Program` | belongs to `Department`; 1–N semesters |
| `Course` | belongs to `Department`; `programIds: string[]`; `facultyId?` |
| `Semester` | academic year, dates, status |
| `Student` | `departmentId`, `programId`, `currentSemesterId`, `session`, `status` |
| `AdmissionApplication` | `programId`; optional `studentId` after enrollment |
| `FacultyMember` | `departmentId`; `courseIds: string[]` |
| `ClassSession` | `courseId`, `facultyId`, `room`, `day`, `startTime`, `endTime`, `semesterId` |
| `AttendanceRecord` | `studentId`, `courseId`, `date`, `status` |
| `Examination` | `courseId`, `semesterId`, `date`, `startTime`, `room`, `type` |
| `StudentResult` | `studentId`, `courseId`, `semesterId`, `marks`, `maxMarks`, derived grade |
| `FeeAccount` | `studentId`, `semesterId`, charges |
| `Payment` | `feeAccountId`, `amount`, `date`, `method`, `receiptNo` |
| `Notice` | category, priority, audience, publish/expiry dates, status |
| `SystemUser` | role, status, linked `facultyMemberId?` |
| `SystemSettings` | university info, academic year, grading scale, preferences |

Supporting enums/unions: `StudentStatus`, `AdmissionStatus`, `EmploymentStatus`,
`SemesterStatus`, `AttendanceStatus`, `GradeLetter`, `FeeStatus`, `NoticeStatus`,
`UserRole`.

### 2.2 Seed data (`core/data/seed.ts`)

- [ ] 6 departments: CSE, EEE, BBA, English, Mathematics, Economics.
- [ ] 8 programs: BSc CSE, BSc EEE, BBA, BA English, BSc Mathematics, BSc Economics,
      MSc CSE, MBA.
- [ ] 25 realistic courses across departments (Database Systems, Data Structures,
      Computer Networks, Accounting, Business Statistics, Calculus, …) with codes,
      credits, type, semester, prerequisites.
- [ ] 12 faculty/staff with designations (Professor, Associate Professor, Lecturer,
      Registrar, Accounts Officer, …), emails, joining dates, course assignments.
- [ ] 50 students with deterministic IDs (`UM-2023-0001`…), realistic names, guardian
      info, departments/programs/semesters, mixed statuses.
- [ ] 5–6 semesters spanning past/current/upcoming (e.g. Spring 2024 → Fall 2026).
- [ ] Admission applications (≥ 18 across all statuses).
- [ ] Class sessions for at least 2 departments × 2 semesters.
- [ ] Attendance records for 3–4 courses over several dates (varied, some low).
- [ ] Examinations + results for completed semesters with consistent marks.
- [ ] Fee accounts + payments producing paid/partial/unpaid mixes.
- [ ] Notices (published + draft) and events (exams, deadlines, holidays).
- [ ] System users for all 6 roles.

> Rule: seed data must be internally consistent. Every FK resolves. Every dashboard
> number is derived from these arrays, never hardcoded.

### 2.3 Persistence (`core/services/core-data.service.ts`)

- [ ] Signals/BehaviorSubject store keyed by collection.
- [ ] Load from `localStorage` on init; fall back to seed; `schemaVersion` for resets.
- [ ] Generic `list/create/update/remove` helpers + `resetDemoData()`.
- [ ] Debounced write-through to `localStorage` (single storage key, e.g. `unimanage.v1`).
- [ ] Cross-entity integrity helpers: delete guards (e.g. cannot delete department with
      students/programs; reassign or block with a clear message).
- [ ] Relationship selectors/computed maps (department → programs, student → fee account,
      course → faculty, etc.).

### 2.4 Domain services

`StudentService`, `AdmissionService`, `FacultyService`, `AcademicService` (faculties,
departments, programs), `CourseService`, `SemesterService`, `RoutineService`,
`AttendanceService`, `ExamService` (schedule + results + GPA), `FeeService`,
`NoticeService`, `ReportService`, `UserService`, `SettingsService`, `DashboardService`.

Each service owns validation and derivations (GPA, attendance %, balances, conflict
detection, ID generation). Components never compute these inline.

**Done when:** the app boots with full seeded data, a refresh preserves edits, and
`resetDemoData()` restores the pristine demo.

---

## 3. Phase 1 — Shell, Dashboard, Students, Faculty

### 3.1 Shared components (build first, reuse everywhere)

- [ ] `PageHeader` — title, subtitle, breadcrumb, primary actions slot.
- [ ] `StatCard` — label, value, delta/context, icon, optional trend sparkline.
- [ ] `DataTable` wrapper — sortable columns, global search slot, paginator,
      row actions, empty state, loading state.
- [ ] `ConfirmDialog` service — typed title/message/confirm label, returns a promise.
- [ ] `StatusTag` — maps status enums to PrimeNG Tag severity consistently.
- [ ] `Avatar` — image with deterministic initials fallback.
- [ ] `ChartCard` — titled container with Chart.js canvas + empty state.
- [ ] `CsvExport` util — takes column defs + rows, triggers download.
- [ ] Form field wrapper for label/control/error spacing.

### 3.2 Dashboard

- [ ] 8 summary cards derived from data: total students, active students, faculty,
      departments, active programs, courses, pending admissions, outstanding fees.
- [ ] Charts (Chart.js via PrimeNG `p-chart` or direct):
      enrollment trend by month (line), department distribution (doughnut/bar),
      student status (doughnut), fee collected vs outstanding (bar).
- [ ] Panels: recent admissions, upcoming examinations/events, recent activity feed.
- [ ] Quick actions (Register Student, Add Faculty, Create Department, Add Course,
      Record Payment, Publish Notice) → navigate to the right page/dialog with prefilled
      context, not decorative.
- [ ] Recent activity derived from actual mutations (a small activity log in the store)
      plus seeded entries.

### 3.3 Student Management

- [ ] Routes: `/students`, `/students/new`, `/students/:id`, `/students/:id/edit`.
- [ ] Directory: sortable columns (ID, name, department, program, semester, status,
      admission date), global search across ID/name/email/phone, filters for
      department/program/semester/session/status, pagination, page-size selector.
- [ ] Register/Edit with Reactive Forms and full validation:
      required fields, email format, phone pattern, DOB age check, unique student ID
      (auto-generated `UM-<year>-####`), admission date not in the future.
- [ ] Detail/profile page: identity block, guardian block, academic summary
      (courses, results, GPA), fee summary (billed/paid/outstanding), attendance %,
      status change action, edit, delete with confirmation.
- [ ] Delete cascade rules: remove orphan fee account/results/attendance or archive.
- [ ] Status update (Active / Inactive / Graduated / Suspended / Withdrawn) with toast.

### 3.4 Faculty & Staff

- [ ] Directory with search + department/designation filters + pagination.
- [ ] Add/edit form (employee ID auto-generated, designation, department, contact,
      joining date, employment status).
- [ ] Detail view with assigned courses and department context.
- [ ] Assign/unassign courses; prevent assigning a course to faculty outside its
      department unless explicitly allowed (document the rule).
- [ ] Department-wise faculty count panel.
- [ ] Delete confirmed, blocked if the member is a department head (reassign first).

**Done when:** a new student/faculty added here appears in lists, detail pages, and
dashboard counts immediately and after refresh.

---

## 4. Phase 2 — Academic Structure, Programs, Courses, Semesters, Routine

### 4.1 Academic Structure (`/academic-structure`)

- [ ] Two sections/tabs: Faculties and Departments.
- [ ] Faculty (academic): name, code, description, status, counts.
- [ ] Department: name, code, faculty, head, description, status, program/student counts.
- [ ] CRUD with validation (unique codes, required head from same faculty).
- [ ] Delete blocked while programs/students exist; explain the blocker.

### 4.2 Programs (`/programs`)

- [ ] List: name, code, degree type, department, duration, credits, semesters, status.
- [ ] Search/filter by department and degree type.
- [ ] Create/edit with unique code, positive duration/credits, semester count.
- [ ] Detail view with courses and enrolled students.

### 4.3 Courses (`/courses`)

- [ ] Catalog with search + department/program/semester/type/status filters.
- [ ] CRUD: code (unique, normalized), title, department, programs (multi-select),
      credits, type (Core/Elective/Lab), faculty, semester, prerequisite, status.
- [ ] Detail view with faculty, programs and schedule.
- [ ] Duplicate course-code prevention with inline error message.
- [ ] Faculty assignment updates both sides of the relationship.

### 4.4 Semesters (`/semesters`)

- [ ] List + timeline visualization (current term highlighted).
- [ ] Create/edit: name, academic year, start/end, registration deadline, exam period, status.
- [ ] Validation: end > start, deadline inside term, exam period inside/after term as
      defined, no overlapping terms for the same academic year.
- [ ] Activate/close actions with constraints (one active semester at a time).
- [ ] Detail: associated courses, enrollment counts, exams.

### 4.5 Class Routine (`/routine`)

- [ ] Weekly grid: Sunday–Thursday visible; Friday/Saturday toggled via settings.
- [ ] Time slots configurable; sessions render as blocks with course, faculty, room.
- [ ] Filters: department, program, semester, faculty.
- [ ] Add/edit session dialog: course, faculty (defaults to course faculty), room,
      day, start/end, semester.
- [ ] Conflict detection for room and faculty overlap, and start < end; blocking
      warning with specifics ("Room A-204 is occupied by CSE-201 at 10:00").
- [ ] Responsive fallback: grid on desktop/tablet, stacked day list on mobile.

**Done when:** editing a department/program/course updates dependent pickers and
counts, and routine conflicts are visibly blocked.

---

## 5. Phase 3 — Admissions, Attendance, Examinations & Results

### 5.1 Admissions (`/admissions`)

- [ ] List with search + status/program/date filters, sortable by date.
- [ ] Detail: applicant info, qualifications, fee status, timeline of status changes.
- [ ] Review actions: Submitted → Under Review → Approved/Rejected; approved → Enrolled.
- [ ] Approve + Enroll creates a `Student` (prefilled form or one-click) and links
      `application.studentId`; prevents double enrollment.
- [ ] Statistics strip: total, submitted, under review, approved, rejected, enrolled,
      conversion rate — all derived.
- [ ] Application fee status editable; application ID auto-generated.

### 5.2 Attendance (`/attendance`)

- [ ] Selection bar: semester → course → date; faculty shown from course.
- [ ] Roster of students enrolled in the course/program; mark Present/Absent/Late.
- [ ] Save creates/updates `AttendanceRecord`s for that course+date; re-opening loads
      existing marks for editing.
- [ ] Bulk actions (all present, clear) and per-student attendance % for the course.
- [ ] Low-attendance highlight (< 75 %, configurable in settings).
- [ ] History tab: per-course/date summary and per-student detail.
- [ ] Updating attendance refreshes dashboard/report percentages.

### 5.3 Examinations (`/examinations`)

- [ ] Schedule list with semester/type filters; create/edit exam (course, date/time,
      room, type, semester).
- [ ] Conflict checks: same room/time and same course duplicate; date inside term.
- [ ] Calendar/timeline view of upcoming exams; feeds dashboard.

### 5.4 Results (`/examinations/results`)

- [ ] Enter marks per exam/course; derive letter grade + grade point from a
      configurable grading table in settings (e.g. 80+ A+ 4.00, 75–79 A 3.75, …).
- [ ] Result status (Passed/Failed) by passing marks threshold.
- [ ] Course-wise result sheet and student-wise result view.
- [ ] Semester GPA = Σ(credit × grade point) / Σ(credits); CGPA across completed
      semesters; show the formula in the UI.
- [ ] Transcript/result sheet view with print stylesheet (`@media print`).

**Done when:** marks → grade → GPA → transcript is consistent end to end, and
attendance/results changes surface in dashboard and reports.

---

## 6. Phase 4 — Fees, Notices, Reports, Users, Settings

### 6.1 Fees & Payments (`/fees`)

- [ ] Overview: total collected, total outstanding, collection rate, recent payments.
- [ ] Student fee accounts: searchable table with billed/paid/balance/status.
- [ ] Account detail: charge breakdown (tuition, semester, lab, other), payment history,
      invoice preview.
- [ ] Record payment dialog: amount ≤ balance, date, method (Cash/Card/Bank/Online),
      reference; updates balance and status; receipt number generated.
- [ ] Receipt/invoice print preview with print stylesheet.
- [ ] Explicit "Simulated transactions — no real money is processed" notice.
- [ ] Fee collection report with date range + CSV export.

### 6.2 Notices & Events (`/notices`)

- [ ] Notice list with category/priority/status filters.
- [ ] Create/edit: title, body, category, priority, audience, publish/expiry, draft/published.
- [ ] Validation: expiry > publish; draft cannot expire before publish.
- [ ] Event calendar (month view) for exams, deadlines, holidays, events; derived from
      exams/semesters plus manual notices marked as events.
- [ ] Published notices appear on the dashboard (top 5 by priority/date).

### 6.3 Reports & Analytics (`/reports`)

- [ ] Filters: date range, department, program, semester — all applied consistently.
- [ ] Sections with chart + summary table each: enrollment by department, admissions,
      faculty distribution, program/course summary, attendance %, exam performance,
      fee collection/outstanding, semester-wise counts.
- [ ] CSV export per table (reuse util).
- [ ] Print-friendly report layout.
- [ ] All values computed from the store; no hardcoded series.

### 6.4 User Management (`/users`)

- [ ] User list: name, email, role, status, last login (seeded).
- [ ] Role assignment (6 roles), account status toggle, invite/create user dialog.
- [ ] Role descriptions and a clear "mock authentication — UI demonstration only" note.

### 6.5 Settings (`/settings`)

- [ ] University profile: name, short name, logo, address, contact.
- [ ] Academic year + current semester.
- [ ] Grading scale editor (grade, min %, grade point) with validation and live preview.
- [ ] General preferences: attendance threshold, visible weekend days, currency, date format.
- [ ] Reset demo data with confirmation.

**Done when:** every menu entry is a working page, all primary buttons perform an action,
and print/CSV paths produce usable output.

---

## 7. Cross-Cutting Work

### 7.1 UX polish pass

- [ ] Consistent spacing scale, card headers, table density, button hierarchy.
- [ ] Empty states with a call to action, not blank panels.
- [ ] Loading/skeleton states for list pages (simulated latency optional).
- [ ] Keyboard focus states, `aria-label`s on icon buttons, contrast check.
- [ ] Responsive review at 360/768/1024/1440; tables switch to card rows on mobile.
- [ ] Print stylesheet for transcript, receipt, report.

### 7.2 Quality gates

- [ ] `npm run build` succeeds with no template type errors.
- [ ] `npx prettier --check` on changed files; `npm run format` before finishing.
- [ ] No `any` in models/services; strict template typing respected.
- [ ] Manual smoke script: add student → check dashboard; approve application → student
      exists; record payment → balance updates; edit grade → GPA changes; publish notice
      → dashboard shows it; refresh → all persist; reset → seed restored.
- [ ] `README.md` updated with run instructions and demo credentials (mock).

---

## 8. Suggested Execution Order (single sitting)

1. Toolchain + rebrand shell + sidebar routes (skeleton pages).
2. Models + seed + `CoreDataService` + localStorage.
3. Shared components + dashboard.
4. Students (list/form/detail) + faculty.
5. Academic structure + programs + courses + semesters.
6. Routine with conflict detection.
7. Admissions + student creation flow.
8. Attendance.
9. Exams + results + GPA + transcript.
10. Fees + payments + receipts.
11. Notices + events.
12. Reports + CSV + print.
13. Users + settings.
14. UX polish, responsive and print pass.
15. Full smoke test, build, documentation.

---

## 9. Data Consistency Rules

- One active semester; new enrollment references the active semester by default.
- Student belongs to exactly one department and one program; program must belong to
  that department (guard in form).
- Course codes unique across the catalog (case-insensitive, trimmed).
- A class session references an existing course, faculty and semester; no room/faculty
  double-booking.
- Attendance unique per (student, course, date).
- One result per (student, course, semester); grade derived, never stored independently
  of marks + grading scale.
- Fee account per (student, semester); payments cannot exceed outstanding balance or be
  dated in the future.
- Deleting any parent entity is blocked or explicitly cascaded with a confirmation that
  names the dependent records.
- Dashboard/report aggregates always read from the store, never from constants.

---

## 10. Future Backend Migration Notes

Keep services as the seam: each service method maps to a future REST/EF Core endpoint
(`GET /api/students`, `POST /api/payments`, …). Models avoid UI-only types; use ISO date
strings for JSON/SQL compatibility. `CoreDataService` is the only place that touches
`localStorage`, so swapping it for `HttpClient` is a contained change.

Planned SQL Server shape: `Faculties`, `Departments`, `Programs`, `Courses`,
`CoursePrograms`, `Semesters`, `Students`, `AdmissionApplications`, `FacultyMembers`,
`FacultyCourses`, `ClassSessions`, `AttendanceRecords`, `Examinations`, `StudentResults`,
`FeeAccounts`, `FeeCharges`, `Payments`, `Notices`, `SystemUsers`, `Settings`.
