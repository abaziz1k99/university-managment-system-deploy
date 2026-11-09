import { Component, Input, Output, EventEmitter, inject, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
    FormBuilder,
    Validators,
    AbstractControl,
    ValidationErrors,
    ReactiveFormsModule,
    FormsModule
} from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { TextareaModule } from 'primeng/textarea';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { PageHeader } from '@/app/shared/components/page-header';
import { FormField } from '@/app/shared/components/form-field';
import { FacultyService } from '@/app/core/services/faculty.service';
import { FacultyMember, Course } from '@/app/core/models/index';

function notFutureValidator(control: AbstractControl): ValidationErrors | null {
    const v = control.value;
    if (!v) return null;
    const d = v instanceof Date ? v : new Date(v);
    if (isNaN(d.getTime())) return { invalidDate: true };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return d.getTime() <= today.getTime() ? null : { futureDate: true };
}

function bdPhoneValidator(control: AbstractControl): ValidationErrors | null {
    const v = (control.value ?? '').toString().trim();
    if (!v) return null;
    const normalized = v.replace(/[\s\-()]/g, '');
    const re = /^(?:\+880|\+88)?0?1[3-9]\d{8}$/;
    return re.test(normalized) ? null : { phonePattern: true };
}

@Component({
    selector: 'app-faculty-form',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        RouterModule,
        CardModule,
        InputTextModule,
        SelectModule,
        MultiSelectModule,
        ButtonModule,
        DatePickerModule,
        TextareaModule,
        MessageModule,
        ToastModule,
        PageHeader,
        FormField
    ],
    providers: [MessageService],
    template: `
        <app-page-header [title]="isEdit ? 'Edit Faculty' : 'Add Faculty'" [subtitle]="isEdit ? 'Update faculty information' : 'Create a new faculty or staff record'">
            <p-button label="Back to Directory" icon="pi pi-arrow-left" styleClass="p-button-secondary" (onClick)="handleCancel()" />
        </app-page-header>

        <p-card>
            <form [formGroup]="form" (ngSubmit)="onSubmit()">
                <div class="grid gap-4 md:grid-cols-2">
                    <app-form-field label="Employee ID" [hint]="isEdit ? 'System generated (read-only)' : 'Auto-generated on save (EMP-YYYY-####)'" [error]="fieldError('employeeId')">
                        <input pInputText formControlName="employeeId" readonly placeholder="Auto-generated" class="bg-surface-100 dark:bg-surface-800" />
                    </app-form-field>

                    <app-form-field label="Joining Date *" [error]="fieldError('joiningDate')">
                        <p-datepicker formControlName="joiningDate" dateFormat="yy-mm-dd" [maxDate]="maxJoiningDate" [showIcon]="true" inputId="joiningDate" appendTo="body" />
                        @if (form.get('joiningDate')?.hasError('futureDate') && form.get('joiningDate')?.touched) {
                            <small class="text-red-500">Joining date cannot be in the future.</small>
                        }
                    </app-form-field>

                    <app-form-field label="First Name *" [error]="fieldError('firstName')">
                        <input pInputText formControlName="firstName" placeholder="Ahmed" />
                    </app-form-field>

                    <app-form-field label="Last Name *" [error]="fieldError('lastName')">
                        <input pInputText formControlName="lastName" placeholder="Karim" />
                    </app-form-field>

                    <app-form-field label="Email *" [error]="fieldError('email')">
                        <input pInputText formControlName="email" type="email" placeholder="name@unimanage.edu" />
                        @if (emailDuplicate()) {
                            <small class="text-amber-600 dark:text-amber-400">Warning: this email is already used by another faculty member.</small>
                        }
                    </app-form-field>

                    <app-form-field label="Phone *" [error]="fieldError('phone')">
                        <input pInputText formControlName="phone" placeholder="+8801711000001" />
                        @if (form.get('phone')?.hasError('phonePattern') && form.get('phone')?.touched) {
                            <small class="text-red-500">Invalid BD phone. Use 01XXXXXXXXX or +8801XXXXXXXXX.</small>
                        }
                    </app-form-field>

                    <app-form-field label="Designation *" [error]="fieldError('designation')">
                        <p-select formControlName="designation" [options]="designationOptions" placeholder="Select designation" appendTo="body" />
                    </app-form-field>

                    <app-form-field label="Department *" [error]="fieldError('departmentId')">
                        <p-select formControlName="departmentId" [options]="departments()" optionLabel="name" optionValue="id" placeholder="Select Department" appendTo="body" />
                    </app-form-field>

                    <app-form-field label="Employment Status *" [error]="fieldError('employmentStatus')">
                        <p-select formControlName="employmentStatus" [options]="employmentOptions" placeholder="Select status" appendTo="body" />
                    </app-form-field>

                    <app-form-field label="Qualification" [error]="fieldError('qualification')">
                        <input pInputText formControlName="qualification" placeholder="Ph.D. in CSE, BUET" />
                    </app-form-field>

                    <app-form-field label="Address" [class.md:col-span-2]="true" [error]="fieldError('address')">
                        <textarea pTextarea formControlName="address" rows="3" class="w-full" placeholder="House 12, Road 7, Dhanmondi, Dhaka"></textarea>
                    </app-form-field>

                    <app-form-field label="Assigned Courses (optional)" [class.md:col-span-2]="true" [hint]="'Search and select courses. Cross-department assignments are soft-allowed with warning.'">
                        <p-multiselect
                            formControlName="courseIds"
                            [options]="courseOptions()"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Select courses (optional)"
                            display="chip"
                            [filter]="true"
                            appendTo="body"
                            styleClass="w-full" />
                    </app-form-field>
                </div>

                @if (form.get('joiningDate')?.hasError('futureDate')) {
                    <p-message severity="error" text="Joining date cannot be in the future." styleClass="mt-4" />
                }

                <div class="flex justify-end gap-2 mt-6 pt-4 border-t border-surface-200 dark:border-surface-700">
                    <p-button label="Cancel" icon="pi pi-times" styleClass="p-button-secondary" (onClick)="handleCancel()" />
                    <p-button label="{{ isEdit ? 'Update' : 'Create' }}" icon="pi pi-save" type="submit" [disabled]="saving()" />
                </div>
            </form>
        </p-card>
        <p-toast />
    `
})
export class FacultyForm implements OnInit {
    @Input() facultyIdInput: string | null = null;
    @Output() close = new EventEmitter<boolean>();

    private readonly fb = inject(FormBuilder);
    private readonly svc = inject(FacultyService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly msg = inject(MessageService);

    isEdit = false;
    facultyId = '';
    saving = signal(false);
    maxJoiningDate = new Date();

    departments = this.svc.core.departments;
    courses = this.svc.core.courses;

    designationOptions = [
        { label: 'Professor', value: 'Professor' },
        { label: 'Associate Professor', value: 'Associate Professor' },
        { label: 'Assistant Professor', value: 'Assistant Professor' },
        { label: 'Lecturer', value: 'Lecturer' },
        { label: 'Senior Lecturer', value: 'Senior Lecturer' },
        { label: 'Registrar', value: 'Registrar' },
        { label: 'Accounts Officer', value: 'Accounts Officer' },
        { label: 'Administrative Officer', value: 'Administrative Officer' },
        { label: 'Lab Assistant', value: 'Lab Assistant' }
    ];

    employmentOptions = [
        { label: 'Active', value: 'ACTIVE' },
        { label: 'On Leave', value: 'ON_LEAVE' },
        { label: 'Resigned', value: 'RESIGNED' },
        { label: 'Retired', value: 'RETIRED' }
    ];

    courseOptions = computed(() => {
        const depts = this.svc.core.departments();
        const deptMap = new Map(depts.map((d) => [d.id, d.code]));
        return this.courses().map((c: Course) => ({
            label: `${c.code} — ${c.title} ${deptMap.get(c.departmentId) ? '(' + deptMap.get(c.departmentId) + ')' : ''}`,
            value: c.id,
            deptId: c.departmentId
        }));
    });

    emailDuplicate = computed(() => {
        const email = (this.form?.get('email')?.value ?? '').toString().trim().toLowerCase();
        if (!email) return false;
        return this.svc.list().some((f) => f.email.toLowerCase() === email && f.id !== this.facultyId);
    });

    previewEmployeeId = '';

    form = this.fb.group({
        employeeId: [{ value: '', disabled: true }],
        firstName: ['', Validators.required],
        lastName: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        phone: ['', [Validators.required, bdPhoneValidator]],
        designation: ['', Validators.required],
        departmentId: ['', Validators.required],
        joiningDate: [null as Date | string | null, [Validators.required, notFutureValidator]],
        employmentStatus: ['ACTIVE', Validators.required],
        qualification: [''],
        address: [''],
        courseIds: [[] as string[]]
    });

    handleCancel(): void {
        if (this.close.observed) {
            this.close.emit(false);
        } else {
            this.router.navigate(['/faculty']);
        }
    }

    ngOnInit(): void {
        const today = new Date();
        this.maxJoiningDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        // Prefer embedded input, fallback to route param
        let routeId: string | null = null;
        try {
            routeId = this.route.snapshot.paramMap.get('id');
        } catch {}
        const urlHasNew = (() => {
            try {
                return this.route.snapshot.url.some((s) => s.path === 'new');
            } catch {
                return false;
            }
        })();

        if (this.facultyIdInput) {
            this.facultyId = this.facultyIdInput;
            this.isEdit = !!this.facultyId;
        } else if (routeId && routeId !== 'new') {
            this.facultyId = routeId;
            this.isEdit = !!this.facultyId;
            if (urlHasNew) {
                this.isEdit = false;
                this.facultyId = '';
            }
        } else if (urlHasNew) {
            this.isEdit = false;
            this.facultyId = '';
        }

        if (this.isEdit) {
            this.loadFaculty();
        } else {
            const yr = new Date().getFullYear();
            this.previewEmployeeId = this.svc.generateEmployeeId(yr);
            this.form.get('employeeId')?.setValue(this.previewEmployeeId);
        }
    }

    fieldError(field: string): string {
        const c = this.form.get(field);
        if (!c || !c.touched || !c.invalid) return '';
        if (c.hasError('required')) return 'This field is required.';
        if (c.hasError('email')) return 'Invalid email format.';
        if (c.hasError('phonePattern')) return 'Invalid phone.';
        if (c.hasError('futureDate')) return 'Date cannot be in the future.';
        if (c.hasError('invalidDate')) return 'Invalid date.';
        return 'Invalid value.';
    }

    private loadFaculty(): void {
        const fm = this.svc.get(this.facultyId);
        if (!fm) {
            this.msg.add({ severity: 'error', summary: 'Error', detail: 'Faculty member not found' });
            if (this.close.observed) this.close.emit(false);
            else this.router.navigate(['/faculty']);
            return;
        }
        this.form.patchValue({
            employeeId: fm.employeeId,
            firstName: fm.firstName,
            lastName: fm.lastName,
            email: fm.email,
            phone: fm.phone,
            designation: fm.designation,
            departmentId: fm.departmentId,
            joiningDate: fm.joiningDate ? new Date(fm.joiningDate) : null,
            employmentStatus: fm.employmentStatus,
            qualification: fm.qualification,
            address: fm.address,
            courseIds: fm.courseIds ?? []
        });
    }

    private toISODate(value: Date | string | null): string {
        if (!value) return new Date().toISOString().slice(0, 10);
        if (value instanceof Date) return value.toISOString().slice(0, 10);
        const d = new Date(value);
        return isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
    }

    onSubmit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.msg.add({ severity: 'warn', summary: 'Validation', detail: 'Please fix the highlighted errors.' });
            return;
        }
        this.saving.set(true);
        try {
            const raw = this.form.getRawValue() as Record<string, unknown>;
            const joiningDate = this.toISODate(raw['joiningDate'] as Date | string | null);
            const year = joiningDate ? new Date(joiningDate).getFullYear() : new Date().getFullYear();
            const data: Partial<FacultyMember> = {
                firstName: (raw['firstName'] as string).trim(),
                lastName: (raw['lastName'] as string).trim(),
                email: (raw['email'] as string).trim(),
                phone: (raw['phone'] as string).trim(),
                designation: raw['designation'] as string,
                departmentId: raw['departmentId'] as string,
                joiningDate,
                employmentStatus: raw['employmentStatus'] as FacultyMember['employmentStatus'],
                qualification: (raw['qualification'] as string)?.trim() ?? '',
                address: (raw['address'] as string)?.trim() ?? '',
                courseIds: (raw['courseIds'] as string[]) ?? []
            };

            const selectedDept = data.departmentId ?? '';
            const crossDeptCourses = (data.courseIds ?? []).filter((cid) => {
                const c = this.svc.core.get<Course>('courses', cid);
                return !!c && c.departmentId !== selectedDept;
            });
            if (crossDeptCourses.length > 0) {
                this.msg.add({
                    severity: 'warn',
                    summary: 'Cross-department assignment',
                    detail: `${crossDeptCourses.length} course(s) are outside the selected department. Proceeding with soft-allow (warning).`
                });
            }

            if (this.isEdit) {
                const existing = this.svc.get(this.facultyId);
                if (!existing) throw new Error('Faculty member not found');
                const prevIds = new Set(existing.courseIds ?? []);
                const nextIds = new Set(data.courseIds ?? []);
                prevIds.forEach((cid) => {
                    if (!nextIds.has(cid)) {
                        try {
                            this.svc.unassignCourse(existing.id, cid);
                        } catch {}
                    }
                });
                const updated: FacultyMember = { ...existing, ...data, id: this.facultyId, employeeId: existing.employeeId } as FacultyMember;
                this.svc.update(updated);
                nextIds.forEach((cid) => {
                    if (!prevIds.has(cid)) {
                        try {
                            this.svc.assignCourse(this.facultyId, cid);
                        } catch {}
                    }
                });
                this.msg.add({ severity: 'success', summary: 'Updated', detail: 'Faculty member updated successfully' });
                if (this.close.observed) this.close.emit(true);
                else this.router.navigate(['/faculty']);
            } else {
                const safeYear = isNaN(year) ? new Date().getFullYear() : year;
                data.employeeId = this.svc.generateEmployeeId(safeYear);
                const created = this.svc.create(data);
                (data.courseIds ?? []).forEach((cid) => {
                    try {
                        this.svc.assignCourse(created.id, cid);
                    } catch {}
                });
                this.msg.add({ severity: 'success', summary: 'Created', detail: `Faculty ${created.employeeId} created successfully` });
                if (this.close.observed) this.close.emit(true);
                else this.router.navigate(['/faculty']);
            }
        } catch (e: unknown) {
            const m = e instanceof Error ? e.message : String(e);
            this.msg.add({ severity: 'error', summary: 'Error', detail: m });
        } finally {
            this.saving.set(false);
        }
    }
}
