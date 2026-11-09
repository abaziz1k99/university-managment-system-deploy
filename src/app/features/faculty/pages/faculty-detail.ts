import { Component, Input, Output, EventEmitter, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { PageHeader } from '@/app/shared/components/page-header';
import { StatusTag } from '@/app/shared/components/status-tag';
import { Avatar } from '@/app/shared/components/avatar';
import { FacultyService } from '@/app/core/services/faculty.service';
import { FacultyMember, Department, Course, EmploymentStatus } from '@/app/core/models/index';
import { formatDate } from '@/app/core/utils/util';

@Component({
    selector: 'app-faculty-detail',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        CardModule,
        ButtonModule,
        TagModule,
        MultiSelectModule,
        SelectModule,
        MessageModule,
        ToastModule,
        TooltipModule,
        ConfirmDialogModule,
        PageHeader,
        StatusTag,
        Avatar
    ],
    providers: [ConfirmationService, MessageService],
    template: `
        @if (faculty) {
            <app-page-header [title]="faculty.employeeId + ' — ' + faculty.firstName + ' ' + faculty.lastName" [subtitle]="faculty.email">
                <div class="flex items-center gap-2 flex-wrap">
                    <p-select [options]="employmentOptions" [(ngModel)]="selectedStatus" optionLabel="label" optionValue="value" placeholder="Employment Status" styleClass="w-44" (onChange)="onStatusChange($event.value)" />
                    @if (close.observed) {
                        <p-button label="Edit" icon="pi pi-pencil" (onClick)="goEditEmbedded()" />
                        <p-button label="Back" icon="pi pi-arrow-left" styleClass="p-button-secondary" (onClick)="goBack()" />
                    } @else {
                        <p-button label="Edit" icon="pi pi-pencil" [routerLink]="['/faculty']" (onClick)="goEdit()" />
                        <p-button label="Back to Directory" icon="pi pi-arrow-left" styleClass="p-button-secondary" (onClick)="goBack()" />
                    }
                </div>
            </app-page-header>

            <div class="grid gap-6 lg:grid-cols-3">
                <div class="lg:col-span-1 space-y-6">
                    <p-card header="Identity">
                        <div class="flex flex-col items-center text-center mb-4">
                            <app-avatar [name]="faculty.firstName + ' ' + faculty.lastName" size="xl" />
                            <div class="mt-3">
                                <h3 class="text-xl font-semibold">{{ faculty.firstName }} {{ faculty.lastName }}</h3>
                                <p class="text-sm text-muted-color">{{ faculty.designation }}</p>
                                <div class="mt-2"><app-status-tag [status]="faculty.employmentStatus" /></div>
                            </div>
                        </div>
                        <dl class="space-y-3 text-sm">
                            <div class="flex justify-between"><dt class="text-muted-color">Employee ID</dt><dd class="font-medium">{{ faculty.employeeId }}</dd></div>
                            <div class="flex justify-between"><dt class="text-muted-color">Email</dt><dd class="font-medium break-all">{{ faculty.email }}</dd></div>
                            <div class="flex justify-between"><dt class="text-muted-color">Phone</dt><dd class="font-medium">{{ faculty.phone }}</dd></div>
                            <div class="flex justify-between"><dt class="text-muted-color">Designation</dt><dd class="font-medium">{{ faculty.designation }}</dd></div>
                            <div class="flex justify-between"><dt class="text-muted-color">Department</dt><dd class="font-medium">{{ dept()?.name ?? '—' }}</dd></div>
                            <div class="flex justify-between"><dt class="text-muted-color">Joining Date</dt><dd class="font-medium">{{ fmtDate(faculty.joiningDate) }}</dd></div>
                            <div class="flex justify-between"><dt class="text-muted-color">Qualification</dt><dd class="font-medium text-right max-w-[60%]">{{ faculty.qualification || '—' }}</dd></div>
                            <div class="flex justify-between gap-4"><dt class="text-muted-color shrink-0">Address</dt><dd class="font-medium text-right">{{ faculty.address || '—' }}</dd></div>
                        </dl>
                    </p-card>

                    <p-card header="Department Context">
                        @if (dept()) {
                            <dl class="space-y-3 text-sm">
                                <div class="flex justify-between"><dt class="text-muted-color">Department</dt><dd class="font-medium">{{ dept()!.name }} ({{ dept()!.code }})</dd></div>
                                <div class="flex justify-between"><dt class="text-muted-color">Faculty</dt><dd class="font-medium">{{ facultyName() }}</dd></div>
                                <div class="flex justify-between"><dt class="text-muted-color">Head</dt><dd class="font-medium">{{ deptHeadName() }}</dd></div>
                                <div class="flex justify-between"><dt class="text-muted-color">Status</dt><dd class="font-medium"><app-status-tag [status]="dept()!.status" /></dd></div>
                                <div class="flex justify-between gap-4"><dt class="text-muted-color shrink-0">Description</dt><dd class="font-medium text-right">{{ dept()!.description }}</dd></div>
                                <div class="flex justify-between"><dt class="text-muted-color">Faculty in Dept</dt><dd class="font-medium">{{ deptFacultyCount() }}</dd></div>
                            </dl>
                        } @else {
                            <p class="text-muted-color text-sm">Department not found.</p>
                        }
                    </p-card>

                    <p-card header="Employment">
                        <div class="flex items-center gap-2">
                            <app-status-tag [status]="faculty.employmentStatus" />
                            <span class="text-sm text-muted-color">Joined {{ fmtDate(faculty.joiningDate) }}</span>
                        </div>
                        <p class="text-xs text-muted-color mt-2">Status can be changed via the selector above.</p>
                    </p-card>
                </div>

                <div class="lg:col-span-2 space-y-6">
                    <p-card header="Assigned Courses">
                        <p class="text-xs text-muted-color mb-3">
                            <strong>Rule:</strong> Courses are normally assigned within the faculty member's department. Cross-department assignment is <em>soft-allowed with warning</em> — the UI shows a warning toast but does not block the assignment.
                        </p>
                        @if (assignedCourses().length > 0) {
                            <div class="space-y-2">
                                @for (c of assignedCourses(); track c.id) {
                                    <div class="flex items-center justify-between p-3 rounded-lg border border-surface-200 dark:border-surface-700">
                                        <div>
                                            <p class="font-medium">{{ c.code }} — {{ c.title }}</p>
                                            <p class="text-xs text-muted-color">Dept: {{ deptName(c.departmentId) }} · {{ c.credits }} cr · {{ c.type }} · Sem {{ c.semester }}</p>
                                            @if (c.departmentId !== faculty.departmentId) {
                                                <p-tag value="Cross-department (soft-allow)" severity="warn" [rounded]="true" styleClass="mt-1" />
                                            }
                                        </div>
                                        <p-button icon="pi pi-times" severity="danger" [rounded]="true" [text]="true" size="small" (onClick)="unassign(c.id)" pTooltip="Unassign course" tooltipPosition="top" />
                                    </div>
                                }
                            </div>
                        } @else {
                            <p class="text-muted-color text-center py-6">No courses assigned yet.</p>
                        }
                    </p-card>

                    <p-card header="Assign / Unassign Courses">
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium mb-1">Add courses</label>
                                <p-multiselect
                                    [(ngModel)]="selectedToAssign"
                                    [options]="availableCourseOptions()"
                                    optionLabel="label"
                                    optionValue="value"
                                    placeholder="Select courses to assign (filtered by department, cross-dept allowed with warning)"
                                    display="chip"
                                    [filter]="true"
                                    appendTo="body"
                                    styleClass="w-full" />
                                <p class="text-xs text-muted-color mt-1">Available courses are those not yet assigned. Department badge shows origin.</p>
                            </div>
                            <div class="flex gap-2">
                                <p-button label="Assign Selected" icon="pi pi-plus" (onClick)="assignSelected()" [disabled]="selectedToAssign.length === 0" />
                                <p-button label="Clear" icon="pi pi-times" severity="secondary" (onClick)="selectedToAssign = []" [disabled]="selectedToAssign.length === 0" />
                            </div>
                            @if (crossDeptWarning()) {
                                <p-message severity="warn" [text]="crossDeptWarning()" styleClass="w-full" />
                            }
                            <div class="pt-4 border-t border-surface-200 dark:border-surface-700">
                                <p class="text-sm font-medium mb-2">Quick assign: department courses</p>
                                <div class="flex flex-wrap gap-2">
                                    @for (c of deptCourses(); track c.id) {
                                        @if (!isAssigned(c.id)) {
                                            <p-button [label]="c.code" [pTooltip]="c.title + ' — ' + c.type" tooltipPosition="top" severity="secondary" size="small" (onClick)="assignOne(c.id)" />
                                        }
                                    }
                                    @empty {
                                        <p class="text-xs text-muted-color">No unassigned department courses.</p>
                                    }
                                </div>
                            </div>
                        </div>
                    </p-card>
                </div>
            </div>
        } @else {
            <p-card>
                <p class="text-center py-8 text-muted-color">Faculty member not found.</p>
                <div class="flex justify-center">
                    <p-button label="Back to Directory" icon="pi pi-arrow-left" (onClick)="goBack()" />
                </div>
            </p-card>
        }
        <p-toast />
        <p-confirmDialog />
    `
})
export class FacultyDetail implements OnInit {
    @Input() facultyIdInput: string | null = null;
    @Output() close = new EventEmitter<void>();
    @Output() editRequested = new EventEmitter<string>();

    private readonly svc = inject(FacultyService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly msg = inject(MessageService);
    private readonly confirm = inject(ConfirmationService);

    faculty: FacultyMember | null = null;
    selectedToAssign: string[] = [];
    selectedStatus = '';

    employmentOptions = [
        { label: 'Active', value: 'ACTIVE' },
        { label: 'On Leave', value: 'ON_LEAVE' },
        { label: 'Resigned', value: 'RESIGNED' },
        { label: 'Retired', value: 'RETIRED' }
    ];

    dept = computed(() => (this.faculty ? this.svc.core.get<Department>('departments', this.faculty!.departmentId) : null));

    facultyName = computed(() => {
        const d = this.dept();
        if (!d) return '—';
        const fac = this.svc.core.get<import('@/app/core/models/index').Faculty>('faculties', d.facultyId);
        return fac?.name ?? d.facultyId;
    });

    deptHeadName = computed(() => {
        const d = this.dept();
        if (!d?.headId) return '— (vacant)';
        const head = this.svc.get(d.headId);
        return head ? `${head.firstName} ${head.lastName} (${head.employeeId})` : d.headId;
    });

    deptFacultyCount = computed(() => {
        if (!this.faculty) return 0;
        return this.svc.findByDepartment(this.faculty.departmentId).length;
    });

    assignedCourses = computed(() => {
        if (!this.faculty) return [] as Course[];
        const ids = new Set(this.faculty.courseIds ?? []);
        return this.svc.core.courses().filter((c) => ids.has(c.id));
    });

    availableCourseOptions = computed(() => {
        if (!this.faculty) return [] as { label: string; value: string }[];
        const assigned = new Set(this.faculty.courseIds ?? []);
        const deptMap = new Map(this.svc.core.departments().map((d) => [d.id, d.code] as const));
        return this.svc.core
            .courses()
            .filter((c) => !assigned.has(c.id))
            .map((c) => ({
                label: `${c.code} — ${c.title} (${deptMap.get(c.departmentId) ?? c.departmentId})${c.departmentId !== this.faculty!.departmentId ? ' ⚠ cross-dept' : ''}`,
                value: c.id
            }));
    });

    deptCourses = computed(() => {
        if (!this.faculty) return [] as Course[];
        return this.svc.core.courses().filter((c) => c.departmentId === this.faculty!.departmentId);
    });

    crossDeptWarning = computed(() => {
        if (!this.faculty || this.selectedToAssign.length === 0) return '';
        const cross = this.selectedToAssign.filter((cid) => {
            const c = this.svc.core.get<Course>('courses', cid);
            return !!c && c.departmentId !== this.faculty!.departmentId;
        });
        if (cross.length === 0) return '';
        const codes = cross
            .map((cid) => this.svc.core.get<Course>('courses', cid)?.code ?? cid)
            .join(', ');
        return `Warning: ${cross.length} selected course(s) (${codes}) are outside ${this.dept()?.code ?? 'this'} department. Assignment is soft-allowed with warning and will proceed.`;
    });

    isAssigned(courseId: string): boolean {
        return !!this.faculty?.courseIds?.includes(courseId);
    }

    deptName(deptId: string): string {
        return this.svc.core.get<Department>('departments', deptId)?.name ?? deptId;
    }

    fmtDate(d: string): string {
        return formatDate(d, 'DD/MM/YYYY');
    }

    ngOnInit(): void {
        let id: string | null = this.facultyIdInput;
        if (!id) {
            try {
                id = this.route.snapshot.paramMap.get('id');
            } catch {}
        }
        if (!id) {
            try {
                const segments = this.route.snapshot.url.map((s) => s.path);
                const maybeId = segments[segments.length - 1];
                if (maybeId && maybeId !== 'faculty' && maybeId !== 'new' && maybeId !== 'edit') {
                    id = maybeId;
                }
            } catch {}
        }
        if (!id) {
            try {
                const navId = this.router.getCurrentNavigation()?.extras?.state?.['id'] as string | undefined;
                if (navId) id = navId;
            } catch {}
        }
        if (id) {
            this.faculty = this.svc.get(id) ?? null;
            if (this.faculty) this.selectedStatus = this.faculty.employmentStatus;
        }
    }

    goBack(): void {
        if (this.close.observed) {
            this.close.emit();
        } else {
            this.router.navigate(['/faculty']);
        }
    }

    goEdit(): void {
        if (!this.faculty) return;
        this.router.navigate(['/faculty', this.faculty.id, 'edit']).catch(() => {
            this.router.navigate(['/faculty'], { state: { editId: this.faculty!.id } });
        });
    }

    goEditEmbedded(): void {
        if (!this.faculty) return;
        if (this.close.observed) {
            this.editRequested.emit(this.faculty.id);
            this.close.emit();
        } else {
            this.goEdit();
        }
    }

    assignOne(courseId: string): void {
        if (!this.faculty) return;
        const course = this.svc.core.get<Course>('courses', courseId);
        const isCross = !!course && course.departmentId !== this.faculty.departmentId;
        try {
            this.svc.assignCourse(this.faculty.id, courseId);
            this.faculty = this.svc.get(this.faculty.id) ?? this.faculty;
            if (isCross) {
                this.msg.add({ severity: 'warn', summary: 'Cross-department assigned', detail: `${course?.code} assigned with warning (soft-allow). Faculty dept ${this.dept()?.code} ≠ course dept ${this.svc.core.get<Department>('departments', course!.departmentId)?.code}.` });
            } else {
                this.msg.add({ severity: 'success', summary: 'Assigned', detail: `${course?.code} assigned to ${this.faculty.firstName} ${this.faculty.lastName}` });
            }
        } catch (e: unknown) {
            const m = e instanceof Error ? e.message : String(e);
            this.msg.add({ severity: 'error', summary: 'Error', detail: m });
        }
    }

    assignSelected(): void {
        if (!this.faculty || this.selectedToAssign.length === 0) return;
        const toAssign = [...this.selectedToAssign];
        let crossCount = 0;
        for (const cid of toAssign) {
            const course = this.svc.core.get<Course>('courses', cid);
            const isCross = !!course && course.departmentId !== this.faculty.departmentId;
            if (isCross) crossCount++;
            try {
                this.svc.assignCourse(this.faculty.id, cid);
            } catch (e: unknown) {
                const m = e instanceof Error ? e.message : String(e);
                this.msg.add({ severity: 'error', summary: 'Error', detail: `${course?.code ?? cid}: ${m}` });
            }
        }
        this.faculty = this.svc.get(this.faculty.id) ?? this.faculty;
        this.selectedToAssign = [];
        if (crossCount > 0) {
            this.msg.add({ severity: 'warn', summary: 'Assigned with warnings', detail: `${toAssign.length} course(s) assigned (${crossCount} cross-department soft-allowed).` });
        } else {
            this.msg.add({ severity: 'success', summary: 'Assigned', detail: `${toAssign.length} course(s) assigned.` });
        }
    }

    unassign(courseId: string): void {
        if (!this.faculty) return;
        const course = this.svc.core.get<Course>('courses', courseId);
        this.confirm.confirm({
            message: `Unassign ${course?.code ?? courseId} from ${this.faculty.firstName} ${this.faculty.lastName}?`,
            header: 'Unassign Course',
            icon: 'pi pi-question-circle',
            acceptLabel: 'Unassign',
            rejectLabel: 'Cancel',
            accept: () => {
                try {
                    this.svc.unassignCourse(this.faculty!.id, courseId);
                    this.faculty = this.svc.get(this.faculty!.id) ?? this.faculty;
                    this.msg.add({ severity: 'success', summary: 'Unassigned', detail: `${course?.code ?? courseId} unassigned.` });
                } catch (e: unknown) {
                    const m = e instanceof Error ? e.message : String(e);
                    this.msg.add({ severity: 'error', summary: 'Error', detail: m });
                }
            }
        });
    }

    onStatusChange(newStatus: string): void {
        if (!this.faculty || newStatus === this.faculty.employmentStatus) return;
        const prev = this.faculty.employmentStatus;
        this.confirm.confirm({
            message: `Change employment status from ${prev} to ${newStatus}?`,
            header: 'Change Status',
            icon: 'pi pi-question-circle',
            acceptLabel: 'Change',
            rejectLabel: 'Cancel',
            accept: () => {
                try {
                    this.svc.updateStatus(this.faculty!.id, newStatus as EmploymentStatus);
                    this.faculty = this.svc.get(this.faculty!.id) ?? this.faculty;
                    if (this.faculty) this.selectedStatus = this.faculty.employmentStatus;
                    this.msg.add({ severity: 'success', summary: 'Status Updated', detail: `Status changed to ${newStatus}` });
                } catch (e: unknown) {
                    const m = e instanceof Error ? e.message : String(e);
                    this.msg.add({ severity: 'error', summary: 'Error', detail: m });
                    if (this.faculty) this.selectedStatus = this.faculty.employmentStatus;
                }
            },
            reject: () => {
                if (this.faculty) this.selectedStatus = this.faculty.employmentStatus;
            }
        });
    }
}
