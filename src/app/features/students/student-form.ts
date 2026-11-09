import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { RadioButtonModule } from 'primeng/radiobutton';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { TextareaModule } from 'primeng/textarea';
import { MessageService } from 'primeng/api';
import { PageHeader } from '@/app/shared/components/page-header';
import { FormField } from '@/app/shared/components/form-field';
import { StudentService } from '@/app/core/services/student.service';
import { Student } from '@/app/core/models/index';

function bdPhoneValidator(control: AbstractControl): ValidationErrors | null {
    const v = (control.value ?? '').toString().trim();
    if (!v) return null;
    const normalized = v.replace(/[\s\-()]/g, '');
    // Accepts: 01XXXXXXXXX (11 chars incl 0), +8801XXXXXXXXX, +88 01XXXXXXXXX, 1XXXXXXXXX variants
    // Core: optional +880 or +88, optional leading 0, then 1[3-9] + 8 digits (total 10 digits after leading 1)
    const re = /^(?:\+880|\+88)?0?1[3-9]\d{8}$/;
    return re.test(normalized) ? null : { phonePattern: true };
}

function minAgeValidator(minYears: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const v = control.value;
        if (!v) return null;
        const dob = v instanceof Date ? v : new Date(v);
        if (isNaN(dob.getTime())) return { invalidDate: true };
        const today = new Date();
        const minDate = new Date(today.getFullYear() - minYears, today.getMonth(), today.getDate());
        // strip time for comparison
        minDate.setHours(0, 0, 0, 0);
        dob.setHours(0, 0, 0, 0);
        return dob <= minDate ? null : { minAge: { requiredAge: minYears } };
    };
}

function notFutureValidator(control: AbstractControl): ValidationErrors | null {
    const v = control.value;
    if (!v) return null;
    const d = v instanceof Date ? v : new Date(v);
    if (isNaN(d.getTime())) return { invalidDate: true };
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    d.setHours(0, 0, 0, 0);
    // compare date-only: d should be <= today
    const todayOnly = new Date();
    todayOnly.setHours(0, 0, 0, 0);
    return d.getTime() <= todayOnly.getTime() ? null : { futureDate: true };
}

function departmentProgramValidator(svc: StudentService): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
        const dept = group.get('departmentId')?.value;
        const prog = group.get('programId')?.value;
        if (!dept || !prog) return null;
        const ok = svc.validateDepartmentProgram(dept, prog);
        return ok ? null : { programDepartmentMismatch: true };
    };
}

@Component({
    selector: 'app-student-form',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, CardModule, InputTextModule, SelectModule, ButtonModule, DatePickerModule, RadioButtonModule, MessageModule, ToastModule, TextareaModule, PageHeader, FormField],
    providers: [MessageService],
    template: `
        <app-page-header [title]="isEdit ? 'Edit Student' : 'Register Student'" [subtitle]="isEdit ? 'Update student information' : 'Create a new student record'">
            <p-button label="Cancel" icon="pi pi-times" styleClass="p-button-secondary" routerLink="/students" />
        </app-page-header>

        <p-card>
            <form [formGroup]="form" (ngSubmit)="onSubmit()">
                <div class="grid gap-4 md:grid-cols-2">
                    <app-form-field label="Admission No" [hint]="isEdit ? '' : 'Auto-generated on save (UM-YYYY-####)'" [error]="fieldError('admissionNo')">
                        <input pInputText formControlName="admissionNo" readonly [attr.disabled]="true" placeholder="Auto-generated" class="bg-surface-100 dark:bg-surface-800" />
                    </app-form-field>

                    <app-form-field label="Admission Date *" [error]="fieldError('admissionDate')">
                        <p-datepicker formControlName="admissionDate" dateFormat="yy-mm-dd" [maxDate]="maxAdmissionDate" [showIcon]="true" inputId="admissionDate" />
                        @if (form.get('admissionDate')?.hasError('futureDate') && form.get('admissionDate')?.touched) {
                            <small class="text-red-500">Admission date cannot be in the future.</small>
                        }
                    </app-form-field>

                    <app-form-field label="First Name *" [error]="fieldError('firstName')">
                        <input pInputText formControlName="firstName" />
                    </app-form-field>

                    <app-form-field label="Last Name *" [error]="fieldError('lastName')">
                        <input pInputText formControlName="lastName" />
                    </app-form-field>

                    <app-form-field label="Email *" [error]="fieldError('email')">
                        <input pInputText formControlName="email" type="email" placeholder="name@example.com" />
                        @if (emailWarning()) {
                            <small class="text-amber-600 dark:text-amber-400">Warning: this email is already used by another student.</small>
                        }
                    </app-form-field>

                    <app-form-field label="Phone *" [error]="fieldError('phone')">
                        <input pInputText formControlName="phone" placeholder="+8801711000001 or 01711-000001" />
                        @if (form.get('phone')?.hasError('phonePattern') && form.get('phone')?.touched) {
                            <small class="text-red-500">Invalid BD phone. Use 01XXXXXXXXX or +8801XXXXXXXXX.</small>
                        }
                    </app-form-field>

                    <app-form-field label="Date of Birth *" [error]="fieldError('dob')">
                        <p-datepicker formControlName="dob" dateFormat="yy-mm-dd" [maxDate]="maxDob" [showIcon]="true" inputId="dob" />
                        @if (form.get('dob')?.hasError('minAge') && form.get('dob')?.touched) {
                            <small class="text-red-500">Student must be at least 16 years old.</small>
                        }
                    </app-form-field>

                    <app-form-field label="Gender *" [error]="fieldError('gender')">
                        <div class="flex gap-4 mt-1">
                            <div class="flex items-center gap-1">
                                <p-radioButton formControlName="gender" value="MALE" inputId="male" name="gender" />
                                <label for="male">Male</label>
                            </div>
                            <div class="flex items-center gap-1">
                                <p-radioButton formControlName="gender" value="FEMALE" inputId="female" name="gender" />
                                <label for="female">Female</label>
                            </div>
                            <div class="flex items-center gap-1">
                                <p-radioButton formControlName="gender" value="OTHER" inputId="other" name="gender" />
                                <label for="other">Other</label>
                            </div>
                        </div>
                    </app-form-field>

                    <app-form-field label="Department *" [error]="fieldError('departmentId')">
                        <p-select formControlName="departmentId" [options]="departments()" optionLabel="name" optionValue="id" placeholder="Select Department" (onChange)="onDepartmentChange()" />
                    </app-form-field>

                    <app-form-field label="Program *" [error]="fieldError('programId')">
                        <p-select formControlName="programId" [options]="filteredPrograms()" optionLabel="name" optionValue="id" placeholder="Select Program" />
                        @if (form.hasError('programDepartmentMismatch') && form.get('programId')?.touched) {
                            <small class="text-red-500">Selected program does not belong to the chosen department.</small>
                        }
                    </app-form-field>

                    <app-form-field label="Semester *" [error]="fieldError('currentSemesterId')">
                        <p-select formControlName="currentSemesterId" [options]="semesters()" optionLabel="name" optionValue="id" placeholder="Select Semester" />
                    </app-form-field>

                    <app-form-field label="Session *" [error]="fieldError('session')">
                        <p-select formControlName="session" [options]="sessionOptions" placeholder="Select Session" />
                    </app-form-field>

                    <app-form-field label="Guardian Name *" [error]="fieldError('guardianName')">
                        <input pInputText formControlName="guardianName" />
                    </app-form-field>

                    <app-form-field label="Guardian Phone *" [error]="fieldError('guardianPhone')">
                        <input pInputText formControlName="guardianPhone" placeholder="+8801712000001" />
                        @if (form.get('guardianPhone')?.hasError('phonePattern') && form.get('guardianPhone')?.touched) {
                            <small class="text-red-500">Invalid BD phone.</small>
                        }
                    </app-form-field>

                    <app-form-field label="Guardian Relation *" [error]="fieldError('guardianRelation')">
                        <p-select formControlName="guardianRelation" [options]="relationOptions" placeholder="Select Relation" />
                    </app-form-field>

                    <app-form-field label="Address *" [class.md:col-span-2]="true" [error]="fieldError('address')">
                        <textarea pTextarea formControlName="address" rows="3" class="w-full"></textarea>
                    </app-form-field>

                    <app-form-field label="Status *" [class.md:col-span-2]="true" [error]="fieldError('status')">
                        <p-select formControlName="status" [options]="statusOptions" placeholder="Select Status" />
                    </app-form-field>
                </div>

                @if (form.hasError('programDepartmentMismatch')) {
                    <p-message severity="error" text="Program must belong to the selected department." styleClass="mt-4" />
                }

                <div class="flex justify-end gap-2 mt-6 pt-4 border-t border-surface-200 dark:border-surface-700">
                    <p-button label="Cancel" icon="pi pi-times" styleClass="p-button-secondary" routerLink="/students" />
                    <p-button label="Save" icon="pi pi-save" type="submit" [disabled]="saving()" />
                </div>
            </form>
        </p-card>
        <p-toast />
    `
})
export class StudentForm implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly svc = inject(StudentService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly msg = inject(MessageService);

    isEdit = false;
    studentId = '';
    saving = signal(false);
    maxAdmissionDate = new Date();
    maxDob = new Date();

    departments = this.svc.core.departments;
    programs = this.svc.core.programs;
    semesters = this.svc.core.semesters;

    sessionOptions = [
        { label: '2021-22', value: '2021-22' },
        { label: '2022-23', value: '2022-23' },
        { label: '2023-24', value: '2023-24' },
        { label: '2024-25', value: '2024-25' },
        { label: '2025-26', value: '2025-26' }
    ];

    relationOptions = [
        { label: 'Father', value: 'Father' },
        { label: 'Mother', value: 'Mother' },
        { label: 'Guardian', value: 'Guardian' },
        { label: 'Other', value: 'Other' }
    ];

    statusOptions = [
        { label: 'Active', value: 'ACTIVE' },
        { label: 'Inactive', value: 'INACTIVE' },
        { label: 'Graduated', value: 'GRADUATED' },
        { label: 'Suspended', value: 'SUSPENDED' },
        { label: 'Withdrawn', value: 'WITHDRAWN' }
    ];

    filteredPrograms = computed(() => {
        const deptId = this.form?.get('departmentId')?.value;
        const all = this.programs();
        if (!deptId) return all;
        return all.filter((p) => p.departmentId === deptId);
    });

    emailWarning = computed(() => {
        const email = (this.form?.get('email')?.value ?? '').toString().trim().toLowerCase();
        if (!email) return false;
        const students = this.svc.list();
        return students.some((s) => s.email.toLowerCase() === email && s.id !== this.studentId);
    });

    form = this.fb.group(
        {
            admissionNo: [{ value: '', disabled: true }],
            admissionDate: [new Date() as Date | string, [Validators.required, notFutureValidator]],
            firstName: ['', Validators.required],
            lastName: ['', Validators.required],
            email: ['', [Validators.required, Validators.email]],
            phone: ['', [Validators.required, bdPhoneValidator]],
            dob: [null as Date | string | null, [Validators.required, minAgeValidator(16)]],
            gender: ['MALE', Validators.required],
            departmentId: ['', Validators.required],
            programId: ['', Validators.required],
            currentSemesterId: ['', Validators.required],
            session: ['2025-26', Validators.required],
            guardianName: ['', Validators.required],
            guardianPhone: ['', [Validators.required, bdPhoneValidator]],
            guardianRelation: ['Father', Validators.required],
            address: ['', Validators.required],
            status: ['ACTIVE', Validators.required]
        },
        { validators: departmentProgramValidator(this.svc) }
    );

    ngOnInit(): void {
        const today = new Date();
        this.maxAdmissionDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        this.maxDob = new Date(today.getFullYear() - 16, today.getMonth(), today.getDate());

        this.studentId = this.route.snapshot.paramMap.get('id') ?? '';
        this.isEdit = !!this.studentId;
        if (this.isEdit) {
            this.loadStudent();
        }
    }

    onDepartmentChange(): void {
        const deptId = this.form.get('departmentId')?.value;
        const progId = this.form.get('programId')?.value;
        if (progId && deptId) {
            const ok = this.svc.validateDepartmentProgram(deptId, progId);
            if (!ok) {
                this.form.get('programId')?.setValue('');
            }
        }
        this.form.updateValueAndValidity();
    }

    fieldError(field: string): string {
        const c = this.form.get(field);
        if (!c || !c.touched || !c.invalid) return '';
        if (c.hasError('required')) return 'This field is required.';
        if (c.hasError('email')) return 'Invalid email format.';
        if (c.hasError('phonePattern')) return 'Invalid phone.';
        if (c.hasError('minAge')) return 'Must be at least 16 years old.';
        if (c.hasError('futureDate')) return 'Date cannot be in the future.';
        if (c.hasError('invalidDate')) return 'Invalid date.';
        return 'Invalid value.';
    }

    private loadStudent(): void {
        const student = this.svc.get(this.studentId);
        if (!student) {
            this.msg.add({ severity: 'error', summary: 'Error', detail: 'Student not found' });
            this.router.navigate(['/students']);
            return;
        }
        this.form.patchValue({
            admissionNo: student.admissionNo,
            admissionDate: student.admissionDate ? new Date(student.admissionDate) : new Date(),
            firstName: student.firstName,
            lastName: student.lastName,
            email: student.email,
            phone: student.phone,
            dob: student.dob ? new Date(student.dob) : null,
            gender: student.gender,
            departmentId: student.departmentId,
            programId: student.programId,
            currentSemesterId: student.currentSemesterId,
            session: student.session,
            guardianName: student.guardianName,
            guardianPhone: student.guardianPhone,
            guardianRelation: student.guardianRelation,
            address: student.address,
            status: student.status
        });
    }

    private toISODate(value: Date | string | null): string {
        if (!value) return new Date().toISOString();
        if (value instanceof Date) return value.toISOString();
        const d = new Date(value);
        return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
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
            const data: Record<string, unknown> = {
                ...raw,
                dob: this.toISODate(raw['dob'] as Date | string | null),
                admissionDate: this.toISODate(raw['admissionDate'] as Date | string | null)
            };
            // admissionNo is auto-generated; drop disabled placeholder on create
            if (!this.isEdit) {
                delete data['admissionNo'];
            }
            if (this.isEdit) {
                const existing = this.svc.get(this.studentId)!;
                this.svc.update({ ...existing, ...data, id: this.studentId } as Student);
                this.msg.add({ severity: 'success', summary: 'Updated', detail: 'Student updated successfully' });
            } else {
                this.svc.create(data as Partial<Student>);
                this.msg.add({ severity: 'success', summary: 'Created', detail: 'Student registered successfully' });
            }
            this.router.navigate(['/students']);
        } catch (e: unknown) {
            const m = e instanceof Error ? e.message : String(e);
            this.msg.add({ severity: 'error', summary: 'Error', detail: m });
        } finally {
            this.saving.set(false);
        }
    }
}
