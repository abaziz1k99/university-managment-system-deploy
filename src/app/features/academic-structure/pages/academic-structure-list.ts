import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { TabsModule } from 'primeng/tabs';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { PageHeader } from '@/app/shared/components/page-header';
import { StatusTag } from '@/app/shared/components/status-tag';
import { CoreDataService } from '@/app/core/services/core-data.service';
import { Faculty, Department, FacultyMember } from '@/app/core/models/index';

@Component({
    selector: 'app-academic-structure-list',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        CardModule,
        ButtonModule,
        InputTextModule,
        TextareaModule,
        SelectModule,
        TagModule,
        TableModule,
        DialogModule,
        TabsModule,
        ToastModule,
        ConfirmDialogModule,
        PageHeader,
        StatusTag
    ],
    template: `
        <app-page-header title="Academic Structure" subtitle="Manage faculties and departments — counts are live from departments, programs and students">
        </app-page-header>

        <p-tabs [value]="activeTab()" (valueChange)="activeTab.set(($any($event) ?? 'faculties') + '')">
            <p-tablist>
                <p-tab value="faculties">Faculties ({{ faculties().length }})</p-tab>
                <p-tab value="departments">Departments ({{ departments().length }})</p-tab>
            </p-tablist>
            <p-tabpanels>
                <p-tabpanel value="faculties">
                    <p-card styleClass="mt-4">
                        <div class="flex flex-col lg:flex-row gap-3 mb-4">
                            <div class="flex-1">
                                <span class="relative block w-full">
                                    <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-muted-color"></i>
                                    <input
                                        pInputText
                                        type="text"
                                        placeholder="Search faculties by name, code or description..."
                                        class="w-full pl-10"
                                        [ngModel]="facultySearch()"
                                        (ngModelChange)="facultySearch.set($event)" />
                                </span>
                            </div>
                            <div class="flex gap-2 flex-wrap items-center">
                                <p-select
                                    [ngModel]="facultyStatusFilter()"
                                    (ngModelChange)="facultyStatusFilter.set($event)"
                                    [options]="statusOptions"
                                    optionLabel="label"
                                    optionValue="value"
                                    placeholder="Status"
                                    styleClass="w-36"
                                    [showClear]="true" />
                                <p-button label="Add Faculty" icon="pi pi-plus" (onClick)="openFacultyCreate()" />
                            </div>
                        </div>

                        <p class="text-xs text-muted-color mb-3">
                            Showing {{ filteredFaculties().length }} of {{ faculties().length }} faculties
                            @if (facultySearch() || facultyStatusFilter()) {
                                <span> · <a class="text-primary cursor-pointer underline" (click)="clearFacultyFilters()">Clear filters</a></span>
                            }
                        </p>

                        <p-table
                            [value]="filteredFaculties()"
                            dataKey="id"
                            [paginator]="true"
                            [rows]="10"
                            [rowsPerPageOptions]="[10, 25, 50]"
                            sortMode="single"
                            [tableStyle]="{ 'min-width': '64rem' }"
                            styleClass="w-full"
                            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
                            [showCurrentPageReport]="true">
                            <ng-template pTemplate="header">
                                <tr>
                                    <th pSortableColumn="name">Name <p-sortIcon field="name"></p-sortIcon></th>
                                    <th pSortableColumn="code" style="width:130px">Code <p-sortIcon field="code"></p-sortIcon></th>
                                    <th style="width:28%">Description</th>
                                    <th pSortableColumn="status" style="width:110px">Status <p-sortIcon field="status"></p-sortIcon></th>
                                    <th style="width:90px">Students</th>
                                    <th style="width:132px">Actions</th>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="body" let-row>
                                <tr>
                                    <td class="font-medium">{{ row.name }}</td>
                                    <td><p-tag [value]="row.code" severity="secondary"></p-tag></td>
                                    <td class="text-sm text-muted-color max-w-[28ch] truncate" [title]="row.description">{{ row.description || '—' }}</td>
                                    <td><app-status-tag [status]="row.status"></app-status-tag></td>
                                    <td class="text-center">{{ facultyStudentCount(row.id) }}</td>
                                    <td>
                                        <div class="flex items-center gap-1">
                                            <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" severity="info" size="small" (onClick)="openFacultyEdit(row)" pTooltip="Edit" tooltipPosition="top"></p-button>
                                            <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger" size="small" (onClick)="confirmDeleteFaculty(row)" pTooltip="Delete" tooltipPosition="top"></p-button>
                                        </div>
                                    </td>
                                </tr>
                            </ng-template>
                             <ng-template pTemplate="emptymessage">
                                <tr><td colspan="6" class="text-center py-10 text-muted-color">No faculties match your criteria.</td></tr>
                            </ng-template>
                        </p-table>
                    </p-card>
                </p-tabpanel>

                <p-tabpanel value="departments">
                    <p-card styleClass="mt-4">
                        <div class="flex flex-col lg:flex-row gap-3 mb-4">
                            <div class="flex-1">
                                <span class="relative block w-full">
                                    <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-muted-color"></i>
                                    <input
                                        pInputText
                                        type="text"
                                        placeholder="Search departments by name, code, faculty, head..."
                                        class="w-full pl-10"
                                        [ngModel]="deptSearch()"
                                        (ngModelChange)="deptSearch.set($event)" />
                                </span>
                            </div>
                            <div class="flex gap-2 flex-wrap items-center">
                                <p-select
                                    [ngModel]="deptFacultyFilter()"
                                    (ngModelChange)="deptFacultyFilter.set($event)"
                                    [options]="facultyFilterOptions()"
                                    optionLabel="label"
                                    optionValue="value"
                                    placeholder="Faculty"
                                    styleClass="w-52"
                                    [showClear]="true" />
                                <p-select
                                    [ngModel]="deptStatusFilter()"
                                    (ngModelChange)="deptStatusFilter.set($event)"
                                    [options]="statusOptions"
                                    optionLabel="label"
                                    optionValue="value"
                                    placeholder="Status"
                                    styleClass="w-36"
                                    [showClear]="true" />
                                <p-button label="Add Department" icon="pi pi-plus" (onClick)="openDeptCreate()" />
                            </div>
                        </div>

                        <p class="text-xs text-muted-color mb-3">
                            Showing {{ filteredDepartments().length }} of {{ departments().length }} departments
                            @if (deptSearch() || deptFacultyFilter() || deptStatusFilter()) {
                                <span> · <a class="text-primary cursor-pointer underline" (click)="clearDeptFilters()">Clear filters</a></span>
                            }
                        </p>

                        <p-table
                            [value]="filteredDepartments()"
                            dataKey="id"
                            [paginator]="true"
                            [rows]="10"
                            [rowsPerPageOptions]="[10, 25, 50]"
                            sortMode="single"
                            [tableStyle]="{ 'min-width': '74rem' }"
                            styleClass="w-full"
                            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
                            [showCurrentPageReport]="true">
                            <ng-template pTemplate="header">
                                <tr>
                                    <th pSortableColumn="name">Name <p-sortIcon field="name"></p-sortIcon></th>
                                    <th pSortableColumn="code" style="width:120px">Code <p-sortIcon field="code"></p-sortIcon></th>
                                    <th pSortableColumn="facultyId" style="width:190px">Faculty <p-sortIcon field="facultyId"></p-sortIcon></th>
                                    <th style="width:180px">Head</th>
                                    <th pSortableColumn="status" style="width:110px">Status <p-sortIcon field="status"></p-sortIcon></th>
                                    <th style="width:86px">Students</th>
                                    <th style="width:132px">Actions</th>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="body" let-row>
                                <tr>
                                    <td class="font-medium">{{ row.name }}</td>
                                    <td><p-tag [value]="row.code" severity="secondary"></p-tag></td>
                                    <td class="text-sm">{{ facultyName(row.facultyId) }}</td>
                                    <td class="text-sm">
                                        @if (headName(row.headId); as hn) {
                                            {{ hn }}
                                        } @else {
                                            <span class="text-muted-color">— Not assigned</span>
                                        }
                                    </td>
                                    <td><app-status-tag [status]="row.status"></app-status-tag></td>
                                    <td class="text-center">{{ deptStudentCount(row.id) }}</td>
                                    <td>
                                        <div class="flex items-center gap-1">
                                            <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" severity="info" size="small" (onClick)="openDeptEdit(row)" pTooltip="Edit" tooltipPosition="top"></p-button>
                                            <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger" size="small" (onClick)="confirmDeleteDepartment(row)" pTooltip="Delete" tooltipPosition="top"></p-button>
                                        </div>
                                    </td>
                                </tr>
                            </ng-template>
                            <ng-template pTemplate="emptymessage">
                                <tr><td colspan="7" class="text-center py-10 text-muted-color">No departments match your criteria.</td></tr>
                            </ng-template>
                        </p-table>
                    </p-card>
                </p-tabpanel>
            </p-tabpanels>
        </p-tabs>

        <!-- Faculty Dialog -->
        <p-dialog
            [header]="editingFaculty() ? 'Edit Faculty' : 'Add Faculty'"
            [visible]="facultyDialogVisible()"
            (visibleChange)="facultyDialogVisible.set($event)"
            [modal]="true"
            [closable]="true"
            [dismissableMask]="true"
            [style]="{ width: '560px', 'max-width': '95vw' }"
            (onHide)="closeFacultyDialog()">
            <form [formGroup]="facultyForm" (ngSubmit)="saveFaculty()" class="flex flex-col gap-4">
                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-medium">Name *</label>
                    <input pInputText formControlName="name" placeholder="e.g. Faculty of Engineering" />
                    @if (facultyForm.get('name')?.touched && facultyForm.get('name')?.hasError('required')) {
                        <small class="text-red-500">Name is required.</small>
                    }
                </div>
                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-medium">Code *</label>
                    <input pInputText formControlName="code" placeholder="e.g. FENG" class="uppercase" />
                    <small class="text-muted-color text-xs">Unique across faculties, case-insensitive. Stored upper-cased.</small>
                    @if (facultyForm.get('code')?.touched && facultyForm.get('code')?.hasError('required')) {
                        <small class="text-red-500">Code is required.</small>
                    }
                    @if (facultyForm.get('code')?.hasError('duplicate')) {
                        <small class="text-red-500">This code is already used by another faculty.</small>
                    }
                </div>
                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-medium">Description</label>
                    <textarea pTextarea formControlName="description" rows="3" placeholder="Short description..."></textarea>
                </div>
                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-medium">Status *</label>
                    <p-select formControlName="status" [options]="statusOptionsForForm" optionLabel="label" optionValue="value" appendTo="body"></p-select>
                </div>
                @if (facultyForm.hasError('duplicateCode')) {
                    <small class="text-red-500">Faculty code must be unique.</small>
                }
                <div class="flex justify-end gap-2 pt-2">
                    <p-button label="Cancel" severity="secondary" [text]="true" (onClick)="closeFacultyDialog()"></p-button>
                    <p-button [label]="editingFaculty() ? 'Update' : 'Create'" icon="pi pi-save" type="submit"></p-button>
                </div>
            </form>
        </p-dialog>

        <!-- Department Dialog -->
        <p-dialog
            [header]="editingDept() ? 'Edit Department' : 'Add Department'"
            [visible]="deptDialogVisible()"
            (visibleChange)="deptDialogVisible.set($event)"
            [modal]="true"
            [closable]="true"
            [dismissableMask]="true"
            [style]="{ width: '560px', 'max-width': '95vw' }"
            (onHide)="closeDeptDialog()">
            <form [formGroup]="deptForm" (ngSubmit)="saveDepartment()" class="flex flex-col gap-4">
                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-medium">Name *</label>
                    <input pInputText formControlName="name" placeholder="e.g. Computer Science & Engineering" />
                    @if (deptForm.get('name')?.touched && deptForm.get('name')?.hasError('required')) {
                        <small class="text-red-500">Name is required.</small>
                    }
                </div>
                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-medium">Code *</label>
                    <input pInputText formControlName="code" placeholder="e.g. CSE" class="uppercase" />
                    <small class="text-muted-color text-xs">Unique across departments, case-insensitive. Stored upper-cased.</small>
                    @if (deptForm.get('code')?.touched && deptForm.get('code')?.hasError('required')) {
                        <small class="text-red-500">Code is required.</small>
                    }
                    @if (deptForm.get('code')?.hasError('duplicate')) {
                        <small class="text-red-500">This code is already used by another department.</small>
                    }
                </div>
                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-medium">Faculty *</label>
                    <p-select formControlName="facultyId" [options]="facultyOptionsForForm()" optionLabel="label" optionValue="value" placeholder="Select faculty" appendTo="body"></p-select>
                    @if (deptForm.get('facultyId')?.touched && deptForm.get('facultyId')?.hasError('required')) {
                        <small class="text-red-500">Faculty is required.</small>
                    }
                </div>
                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-medium">Head (optional)</label>
                    <p-select
                        formControlName="headId"
                        [options]="headOptionsForSelectedFaculty()"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="— Not assigned —"
                        [showClear]="true"
                        appendTo="body"></p-select>
                    <small class="text-muted-color text-xs">Only faculty members whose department belongs to the selected faculty are allowed. Leave empty for no head.</small>
                    @if (deptForm.get('headId')?.hasError('invalidHead')) {
                        <small class="text-red-500">Selected head does not belong to this faculty. Pick a member from the same faculty or clear the field.</small>
                    }
                </div>
                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-medium">Description</label>
                    <textarea pTextarea formControlName="description" rows="3" placeholder="Short description..."></textarea>
                </div>
                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-medium">Status *</label>
                    <p-select formControlName="status" [options]="statusOptionsForForm" optionLabel="label" optionValue="value" appendTo="body"></p-select>
                </div>
                <div class="flex justify-end gap-2 pt-2">
                    <p-button label="Cancel" severity="secondary" [text]="true" (onClick)="closeDeptDialog()"></p-button>
                    <p-button [label]="editingDept() ? 'Update' : 'Create'" icon="pi pi-save" type="submit"></p-button>
                </div>
            </form>
        </p-dialog>

        <p-toast></p-toast>
        <p-confirmDialog></p-confirmDialog>
    `
})
export class AcademicStructureList {
    private readonly core = inject(CoreDataService);
    private readonly confirm = inject(ConfirmationService);
    private readonly msg = inject(MessageService);
    private readonly fb = inject(FormBuilder);

    activeTab = signal<string>('faculties');

    // ── Faculty list state ──
    faculties = this.core.faculties;
    departments = this.core.departments;
    programs = this.core.programs;
    students = this.core.students;
    facultyMembers = this.core.facultyMembers;

    facultySearch = signal('');
    facultyStatusFilter = signal<string | null>(null);

    deptSearch = signal('');
    deptFacultyFilter = signal<string | null>(null);
    deptStatusFilter = signal<string | null>(null);

    statusOptions = [
        { label: 'All Statuses', value: null },
        { label: 'Active', value: 'ACTIVE' },
        { label: 'Inactive', value: 'INACTIVE' }
    ];
    statusOptionsForForm = [
        { label: 'Active', value: 'ACTIVE' },
        { label: 'Inactive', value: 'INACTIVE' }
    ];

    filteredFaculties = computed(() => {
        let list = this.faculties();
        const q = this.facultySearch().trim().toLowerCase();
        const status = this.facultyStatusFilter();
        if (q) {
            list = list.filter(
                (f) => f.name.toLowerCase().includes(q) || f.code.toLowerCase().includes(q) || (f.description ?? '').toLowerCase().includes(q)
            );
        }
        if (status) list = list.filter((f) => f.status === status);
        return [...list].sort((a, b) => a.name.localeCompare(b.name));
    });

    filteredDepartments = computed(() => {
        let list = this.departments();
        const q = this.deptSearch().trim().toLowerCase();
        const fac = this.deptFacultyFilter();
        const status = this.deptStatusFilter();
        if (fac) list = list.filter((d) => d.facultyId === fac);
        if (status) list = list.filter((d) => d.status === status);
        if (q) {
            list = list.filter((d) => {
                const facName = this.facultyName(d.facultyId).toLowerCase();
                const head = (this.headName(d.headId) ?? '').toLowerCase();
                return (
                    d.name.toLowerCase().includes(q) ||
                    d.code.toLowerCase().includes(q) ||
                    (d.description ?? '').toLowerCase().includes(q) ||
                    facName.includes(q) ||
                    head.includes(q)
                );
            });
        }
        return [...list].sort((a, b) => a.name.localeCompare(b.name));
    });

    facultyFilterOptions = computed(() => [{ label: 'All Faculties', value: null }, ...this.faculties().map((f) => ({ label: f.name, value: f.id }))]);
    facultyOptionsForForm = computed(() => this.faculties().map((f) => ({ label: `${f.name} (${f.code})`, value: f.id })));

    // ── Counts ──
    facultyName(id: string): string {
        return this.core.get<Faculty>('faculties', id)?.name ?? id;
    }

    headName(headId: string | null): string | null {
        if (!headId) return null;
        const fm = this.core.get<FacultyMember>('facultyMembers', headId);
        return fm ? `${fm.firstName} ${fm.lastName} (${fm.employeeId})` : null;
    }

    facultyDeptCount(facultyId: string): number {
        return this.departments().filter((d) => d.facultyId === facultyId).length;
    }

    facultyProgramCount(facultyId: string): number {
        const deptIds = new Set(this.departments().filter((d) => d.facultyId === facultyId).map((d) => d.id));
        return this.programs().filter((p) => deptIds.has(p.departmentId)).length;
    }

    facultyStudentCount(facultyId: string): number {
        const deptIds = new Set(this.departments().filter((d) => d.facultyId === facultyId).map((d) => d.id));
        return this.students().filter((s) => deptIds.has(s.departmentId)).length;
    }

    deptProgramCount(deptId: string): number {
        return this.programs().filter((p) => p.departmentId === deptId).length;
    }

    deptStudentCount(deptId: string): number {
        return this.students().filter((s) => s.departmentId === deptId).length;
    }

    clearFacultyFilters(): void {
        this.facultySearch.set('');
        this.facultyStatusFilter.set(null);
    }

    clearDeptFilters(): void {
        this.deptSearch.set('');
        this.deptFacultyFilter.set(null);
        this.deptStatusFilter.set(null);
    }

    // ── Faculty Dialog ──
    facultyDialogVisible = signal(false);
    editingFaculty = signal<Faculty | null>(null);

    facultyForm = this.fb.group({
        name: ['', Validators.required],
        code: ['', Validators.required],
        description: [''],
        status: ['ACTIVE' as Faculty['status'], Validators.required]
    });

    openFacultyCreate(): void {
        this.editingFaculty.set(null);
        this.facultyForm.reset({ name: '', code: '', description: '', status: 'ACTIVE' as Faculty['status'] });
        this.facultyDialogVisible.set(true);
    }

    openFacultyEdit(f: Faculty): void {
        this.editingFaculty.set(f);
        this.facultyForm.reset({ name: f.name, code: f.code, description: f.description ?? '', status: f.status });
        this.facultyDialogVisible.set(true);
    }

    closeFacultyDialog(): void {
        this.facultyDialogVisible.set(false);
        this.editingFaculty.set(null);
    }

    saveFaculty(): void {
        if (this.facultyForm.invalid) {
            this.facultyForm.markAllAsTouched();
            this.msg.add({ severity: 'warn', summary: 'Validation', detail: 'Please fix the highlighted errors.' });
            return;
        }
        const raw = this.facultyForm.getRawValue() as { name: string; code: string; description: string; status: Faculty['status'] };
        const name = raw.name.trim();
        const code = raw.code.trim().toUpperCase();
        const description = (raw.description ?? '').trim();
        const status = raw.status;

        if (!name || !code) {
            this.msg.add({ severity: 'warn', summary: 'Validation', detail: 'Name and code are required.' });
            return;
        }

        const editing = this.editingFaculty();
        const duplicate = this.faculties().some((f) => f.code.trim().toUpperCase() === code && f.id !== editing?.id);
        if (duplicate) {
            this.facultyForm.get('code')?.setErrors({ duplicate: true });
            this.msg.add({ severity: 'error', summary: 'Duplicate code', detail: `Faculty code "${code}" is already in use.` });
            return;
        }

        const now = new Date().toISOString();
        if (editing) {
            const updated: Faculty = { ...editing, name, code, description, status, updatedAt: now };
            this.core.update<Faculty & { id: string }>('faculties', updated);
            this.msg.add({ severity: 'success', summary: 'Updated', detail: `Faculty "${name}" updated.` });
        } else {
            const created = this.core.create<Faculty & { id: string }>('faculties', {
                id: this.core.generateId('fac'),
                name,
                code,
                description,
                status,
                createdAt: now,
                updatedAt: now
            } as Faculty & { id: string });
            void created;
            this.msg.add({ severity: 'success', summary: 'Created', detail: `Faculty "${name}" created.` });
        }
        this.closeFacultyDialog();
    }

    confirmDeleteFaculty(f: Faculty): void {
        const deptCount = this.facultyDeptCount(f.id);
        const progCount = this.facultyProgramCount(f.id);
        const stuCount = this.facultyStudentCount(f.id);
        if (deptCount > 0 || progCount > 0 || stuCount > 0) {
            const parts: string[] = [];
            if (deptCount) parts.push(`${deptCount} department(s)`);
            if (progCount) parts.push(`${progCount} program(s)`);
            if (stuCount) parts.push(`${stuCount} student(s)`);
            this.confirm.confirm({
                message: `Cannot delete faculty "${f.name}" (${f.code}): it still has ${parts.join(', ')}. Reassign or remove those records first, then try again.`,
                header: 'Delete Blocked',
                icon: 'pi pi-ban',
                acceptLabel: 'OK',
                rejectVisible: false,
                accept: () => {}
            });
            return;
        }
        this.confirm.confirm({
            message: `Delete faculty "${f.name}" (${f.code})? This cannot be undone.`,
            header: 'Delete Faculty',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Delete',
            rejectLabel: 'Cancel',
            accept: () => {
                this.core.remove('faculties', f.id);
                this.msg.add({ severity: 'success', summary: 'Deleted', detail: `Faculty "${f.name}" removed.` });
            }
        });
    }

    // ── Department Dialog ──
    deptDialogVisible = signal(false);
    editingDept = signal<Department | null>(null);

    deptForm = this.fb.group({
        name: ['', Validators.required],
        code: ['', Validators.required],
        facultyId: ['', Validators.required],
        headId: [null as string | null],
        description: [''],
        status: ['ACTIVE' as Department['status'], Validators.required]
    });

    headOptionsForSelectedFaculty = computed(() => {
        const facultyId = this.deptForm.get('facultyId')?.value as string | null;
        const allMembers = this.facultyMembers();
        const allDepts = this.departments();
        const deptFacultyMap = new Map<string, string>(allDepts.map((d) => [d.id, d.facultyId]));
        let filtered = allMembers;
        if (facultyId) {
            filtered = allMembers.filter((m) => deptFacultyMap.get(m.departmentId) === facultyId);
        }
        const opts = [{ label: '— Not assigned —', value: null as string | null }, ...filtered.map((m) => ({
            label: `${m.firstName} ${m.lastName} — ${m.employeeId} (${allDepts.find((d) => d.id === m.departmentId)?.code ?? m.departmentId})`,
            value: m.id as string | null
        }))];
        return opts;
    });

    openDeptCreate(): void {
        this.editingDept.set(null);
        const firstFacultyId = this.faculties()[0]?.id ?? '';
        this.deptForm.reset({ name: '', code: '', facultyId: firstFacultyId, headId: null, description: '', status: 'ACTIVE' as Department['status'] });
        // Trigger head options recompute: value is already set via reset
        this.deptDialogVisible.set(true);
    }

    openDeptEdit(d: Department): void {
        this.editingDept.set(d);
        this.deptForm.reset({ name: d.name, code: d.code, facultyId: d.facultyId, headId: d.headId, description: d.description ?? '', status: d.status });
        this.deptDialogVisible.set(true);
    }

    closeDeptDialog(): void {
        this.deptDialogVisible.set(false);
        this.editingDept.set(null);
        this.deptForm.get('headId')?.setErrors(null);
    }

    private validateHeadBelongsToFaculty(facultyId: string, headId: string | null): boolean {
        if (!headId) return true;
        const fm = this.core.get<FacultyMember>('facultyMembers', headId);
        if (!fm) return false;
        const dept = this.core.get<Department>('departments', fm.departmentId);
        if (!dept) return false;
        return dept.facultyId === facultyId;
    }

    saveDepartment(): void {
        if (this.deptForm.invalid) {
            this.deptForm.markAllAsTouched();
            this.msg.add({ severity: 'warn', summary: 'Validation', detail: 'Please fix the highlighted errors.' });
            return;
        }
        const raw = this.deptForm.getRawValue() as { name: string; code: string; facultyId: string; headId: string | null; description: string; status: Department['status'] };
        const name = raw.name.trim();
        const code = raw.code.trim().toUpperCase();
        const facultyId = raw.facultyId;
        const headId = raw.headId ?? null;
        const description = (raw.description ?? '').trim();
        const status = raw.status;

        if (!name || !code || !facultyId) {
            this.msg.add({ severity: 'warn', summary: 'Validation', detail: 'Name, code and faculty are required.' });
            return;
        }

        const editing = this.editingDept();
        const duplicate = this.departments().some((d) => d.code.trim().toUpperCase() === code && d.id !== editing?.id);
        if (duplicate) {
            this.deptForm.get('code')?.setErrors({ duplicate: true });
            this.msg.add({ severity: 'error', summary: 'Duplicate code', detail: `Department code "${code}" is already in use.` });
            return;
        }

        if (!this.validateHeadBelongsToFaculty(facultyId, headId)) {
            this.deptForm.get('headId')?.setErrors({ invalidHead: true });
            const fm = headId ? this.core.get<FacultyMember>('facultyMembers', headId) : null;
            const dept = fm ? this.core.get<Department>('departments', fm.departmentId) : null;
            const facultyName = this.facultyName(facultyId);
            this.msg.add({
                severity: 'error',
                summary: 'Invalid head',
                detail: headId
                    ? `Head ${fm ? fm.firstName + ' ' + fm.lastName : headId} belongs to ${dept ? this.facultyName(dept.facultyId) : 'another faculty'}, not ${facultyName}. Pick a member from ${facultyName} or clear the head.`
                    : 'Invalid head selection.'
            });
            return;
        }

        const now = new Date().toISOString();
        if (editing) {
            const updated: Department = { ...editing, name, code, facultyId, headId, description, status, updatedAt: now };
            this.core.update<Department & { id: string }>('departments', updated);
            this.msg.add({ severity: 'success', summary: 'Updated', detail: `Department "${name}" updated.` });
        } else {
            this.core.create<Department & { id: string }>('departments', {
                id: this.core.generateId('dept'),
                name,
                code,
                facultyId,
                headId,
                description,
                status,
                createdAt: now,
                updatedAt: now
            } as Department & { id: string });
            this.msg.add({ severity: 'success', summary: 'Created', detail: `Department "${name}" created.` });
        }
        this.closeDeptDialog();
    }

    confirmDeleteDepartment(d: Department): void {
        const progCount = this.deptProgramCount(d.id);
        const stuCount = this.deptStudentCount(d.id);
        if (progCount > 0 || stuCount > 0) {
            const parts: string[] = [];
            if (progCount) parts.push(`${progCount} program(s)`);
            if (stuCount) parts.push(`${stuCount} student(s)`);
            // Also surface faculty member count as context but not blocking per spec — optional info
            const facCount = this.facultyMembers().filter((m) => m.departmentId === d.id).length;
            const extra = facCount ? ` It also has ${facCount} faculty member(s) assigned.` : '';
            this.confirm.confirm({
                message: `Cannot delete department "${d.name}" (${d.code}): it still has ${parts.join(' and ')}.${extra} Reassign or remove those programs/students first, then try again.`,
                header: 'Delete Blocked',
                icon: 'pi pi-ban',
                acceptLabel: 'OK',
                rejectVisible: false,
                accept: () => {}
            });
            return;
        }
        // Even if no programs/students, warn if courses/faculty exist? Spec says blocked while programs/students exist only, so allow but inform
        const courseCount = this.core.courses().filter((c) => c.departmentId === d.id).length;
        const extraWarn = courseCount ? ` Note: ${courseCount} course(s) still reference this department and will become orphaned.` : '';
        this.confirm.confirm({
            message: `Delete department "${d.name}" (${d.code})?${extraWarn} This cannot be undone.`,
            header: 'Delete Department',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Delete',
            rejectLabel: 'Cancel',
            accept: () => {
                this.core.remove('departments', d.id);
                this.msg.add({ severity: 'success', summary: 'Deleted', detail: `Department "${d.name}" removed.` });
            }
        });
    }
}
