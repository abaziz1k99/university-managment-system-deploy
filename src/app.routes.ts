import { Routes } from '@angular/router';
import { AppLayout } from './app/layouts/app.layout';
import { Landing } from './app/pages/landing/landing';
import { Notfound } from './app/pages/notfound/notfound';
import { authGuard } from './app/core/guards/auth.guard';

export const appRoutes: Routes = [
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    {
        path: '',
        component: AppLayout,
        canActivate: [authGuard],
        children: [
            { path: 'dashboard', loadComponent: () => import('./app/features/dashboard/dashboard').then(m => m.Dashboard) },
            { path: 'teacher', redirectTo: 'teacher/dashboard', pathMatch: 'full' },
            { path: 'teacher/:section', loadComponent: () => import('./app/features/teacher/teacher-portal').then(m => m.TeacherPortal) },
            { path: 'student', redirectTo: 'student/dashboard', pathMatch: 'full' },
            { path: 'student/:section', loadComponent: () => import('./app/features/student/student-portal').then(m => m.StudentPortal) },
            { path: 'grade-approvals', loadComponent: () => import('./app/features/teacher/grade-approvals').then(m => m.GradeApprovals) },
            { path: 'registration-approvals', loadComponent: () => import('./app/features/student/registration-approvals').then(m => m.RegistrationApprovals) },
            { path: 'students', loadComponent: () => import('./app/features/students/students').then(m => m.StudentsList) },
            { path: 'students/new', loadComponent: () => import('./app/features/students/student-form').then(m => m.StudentForm) },
            { path: 'students/:id', loadComponent: () => import('./app/features/students/student-detail').then(m => m.StudentDetail) },
            { path: 'students/:id/edit', loadComponent: () => import('./app/features/students/student-form').then(m => m.StudentForm) },
            { path: 'admissions', loadComponent: () => import('./app/features/admissions/pages/admissions-list').then(m => m.AdmissionsList) },
            { path: 'faculty', loadComponent: () => import('./app/features/faculty/pages/faculty-list').then(m => m.FacultyStaffList) },
            { path: 'academic-structure', loadComponent: () => import('./app/features/academic-structure/pages/academic-structure-list').then(m => m.AcademicStructureList) },
            { path: 'programs', loadComponent: () => import('./app/features/programs/pages/programs-list').then(m => m.ProgramsList) },
            { path: 'courses', loadComponent: () => import('./app/features/courses/pages/courses-list').then(m => m.CoursesList) },
            { path: 'semesters', loadComponent: () => import('./app/features/semesters/pages/semesters-list').then(m => m.SemestersList) },
            { path: 'routine', loadComponent: () => import('./app/features/routine/pages/routine-list').then(m => m.ClassRoutineList) },
            { path: 'attendance', loadComponent: () => import('./app/features/attendance/pages/attendance-list').then(m => m.AttendanceList) },
            { path: 'examinations', loadComponent: () => import('./app/features/examinations/pages/examinations-list').then(m => m.ExaminationsList) },
            { path: 'examinations/results', loadComponent: () => import('./app/features/examinations/pages/results-list').then(m => m.ResultsList) },
            { path: 'fees', loadComponent: () => import('./app/features/fees/pages/fees-list').then(m => m.FeesPaymentsList) },
            { path: 'notices', loadComponent: () => import('./app/features/notices/pages/notices-list').then(m => m.NoticesList) },
            { path: 'reports', loadComponent: () => import('./app/features/reports/pages/reports-list').then(m => m.ReportsList) },
            { path: 'users', loadComponent: () => import('./app/features/users/pages/users-list').then(m => m.UsersList) },
            { path: 'settings', loadComponent: () => import('./app/features/settings/pages/settings-list').then(m => m.SettingsList) }
        ]
    },
    { path: 'landing', component: Landing },
    { path: 'notfound', component: Notfound },
    { path: 'auth', loadChildren: () => import('./app/pages/auth/auth.routes') },
    { path: '**', redirectTo: '/notfound' }
];
