import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';
import { AuthService } from '@/app/core/services/auth.service';

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [CommonModule, AppMenuitem, RouterModule],
    template: `<ul class="layout-menu">
        @for (item of model; track item.label) {
            @if (!item.separator) {
                <li app-menuitem [item]="item" [root]="true"></li>
            } @else {
                <li class="menu-separator"></li>
            }
        }
    </ul> `,
})
export class AppMenu {
    model: MenuItem[] = [];
    private readonly auth = inject(AuthService);

    ngOnInit() {
        if (this.auth.role() === 'TEACHER') {
            this.model = [{ label: 'Teacher Portal', items: [
                { label: 'Dashboard', icon: 'pi pi-fw pi-home', routerLink: ['/teacher/dashboard'] },
                { label: 'Courses & Resources', icon: 'pi pi-fw pi-book', routerLink: ['/teacher/courses'] },
                { label: 'Attendance', icon: 'pi pi-fw pi-check-square', routerLink: ['/teacher/attendance'] },
                { label: 'Assessments & Grading', icon: 'pi pi-fw pi-clipboard', routerLink: ['/teacher/assessments'] },
                { label: 'Communication', icon: 'pi pi-fw pi-comments', routerLink: ['/teacher/communication'] },
                { label: 'Reports', icon: 'pi pi-fw pi-chart-bar', routerLink: ['/teacher/reports'] },
                { label: 'Profile', icon: 'pi pi-fw pi-user', routerLink: ['/teacher/profile'] }
            ] }];
            return;
        }
        if (this.auth.role() === 'STUDENT') {
            this.model = [{ label: 'Student Portal', items: [
                { label: 'Dashboard', icon: 'pi pi-fw pi-home', routerLink: ['/student/dashboard'] },
                { label: 'Course Registration', icon: 'pi pi-fw pi-book', routerLink: ['/student/registration'] },
                { label: 'Learning Resources', icon: 'pi pi-fw pi-folder-open', routerLink: ['/student/resources'] },
                { label: 'Attendance & Routine', icon: 'pi pi-fw pi-calendar', routerLink: ['/student/routine'] },
                { label: 'Results', icon: 'pi pi-fw pi-chart-line', routerLink: ['/student/results'] },
                { label: 'Fees', icon: 'pi pi-fw pi-credit-card', routerLink: ['/student/fees'] },
                { label: 'Communication', icon: 'pi pi-fw pi-comments', routerLink: ['/student/communication'] },
                { label: 'Profile', icon: 'pi pi-fw pi-user', routerLink: ['/student/profile'] }
            ] }];
            return;
        }
        this.model = [
            {
                label: 'Overview',
                items: [
                    { label: 'Dashboard', icon: 'pi pi-fw pi-home', routerLink: ['/dashboard'] }
                ]
            },
            {
                label: 'Academics',
                items: [
                    { label: 'Students', icon: 'pi pi-fw pi-user', routerLink: ['/students'] },
                    { label: 'Admissions', icon: 'pi pi-fw pi-file-edit', routerLink: ['/admissions'] },
                    { label: 'Faculty & Staff', icon: 'pi pi-fw pi-id-card', routerLink: ['/faculty'] },
                    { label: 'Academic Structure', icon: 'pi pi-fw pi-sitemap', routerLink: ['/academic-structure'] },
                    { label: 'Programs', icon: 'pi pi-fw pi-briefcase', routerLink: ['/programs'] },
                    { label: 'Courses', icon: 'pi pi-fw pi-book', routerLink: ['/courses'] },
                    { label: 'Semesters', icon: 'pi pi-fw pi-calendar', routerLink: ['/semesters'] },
                    { label: 'Class Routine', icon: 'pi pi-fw pi-calendar-plus', routerLink: ['/routine'] },
                    { label: 'Attendance', icon: 'pi pi-fw pi-check-square', routerLink: ['/attendance'] },
                    { label: 'Examinations', icon: 'pi pi-fw pi-clipboard', routerLink: ['/examinations'] },
                    { label: 'Results', icon: 'pi pi-fw pi-chart-line', routerLink: ['/examinations/results'] }
                ]
            },
            {
                label: 'Administration',
                items: [
                    { label: 'Fees & Payments', icon: 'pi pi-fw pi-credit-card', routerLink: ['/fees'] },
                    { label: 'Notices', icon: 'pi pi-fw pi-bell', routerLink: ['/notices'] },
                    { label: 'Reports', icon: 'pi pi-fw pi-file-pdf', routerLink: ['/reports'] }
                ]
            },
            {
                label: 'System',
                items: [
                    { label: 'Users', icon: 'pi pi-fw pi-users', routerLink: ['/users'] },
                    { label: 'Grade Approvals', icon: 'pi pi-fw pi-check-circle', routerLink: ['/grade-approvals'] },
                    { label: 'Course Registrations', icon: 'pi pi-fw pi-bookmark', routerLink: ['/registration-approvals'] },
                    { label: 'Settings', icon: 'pi pi-fw pi-cog', routerLink: ['/settings'] }
                ]
            }
        ];
    }
}
