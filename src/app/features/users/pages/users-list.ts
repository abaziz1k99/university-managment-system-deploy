import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { PageHeader } from '@/app/shared/components/page-header';
import { StatusTag } from '@/app/shared/components/status-tag';
import { EmptyState } from '@/app/shared/components/empty-state';
import { UserService } from '@/app/core/services/user.service';
import { CoreDataService } from '@/app/core/services/core-data.service';
import type { SystemUser } from '@/app/core/models/index';

type UserRole = SystemUser['role'];
type UserStatus = SystemUser['status'];

interface SelectOption<T> {
    label: string;
    value: T;
}

interface RoleMeta {
    role: UserRole;
    label: string;
    description: string;
    icon: string;
}

@Component({
    selector: 'app-users-list',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        CardModule,
        ButtonModule,
        InputTextModule,
        SelectModule,
        TableModule,
        DialogModule,
        TagModule,
        MessageModule,
        ToastModule,
        ConfirmDialogModule,
        TooltipModule,
        PageHeader,
        StatusTag,
        EmptyState
    ],
    providers: [ConfirmationService, MessageService],
    template: `
        <app-page-header title="User Management" subtitle="Invite staff, assign roles and control account access across the system">
            <p-button label="Invite User" icon="pi pi-user-plus" (onClick)="openCreate()"></p-button>
        </app-page-header>

        <p-message severity="info" icon="pi pi-info-circle" styleClass="w-full mb-4">
            Mock authentication — UI demonstration only. Accounts, roles and logins are simulated and stored in your browser; no real credentials are handled.
        </p-message>

        <p-card>
            <!-- Filters -->
            <div class="flex flex-col xl:flex-row gap-3 mb-4">
                <div class="flex-1">
                    <span class="relative block w-full">
                        <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-muted-color"></i>
                        <input pInputText type="text" placeholder="Search by name or email..." class="w-full pl-10" [ngModel]="search()" (ngModelChange)="search.set($event)" />
                    </span>
                </div>
                <div class="flex gap-2 flex-wrap items-center">
                    <p-select
                        [ngModel]="roleFilter()"
                        (ngModelChange)="roleFilter.set($event)"
                        [options]="roleFilterOptions"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Role"
                        styleClass="w-44"
                        appendTo="body"
                        [showClear]="true"
                    >
                    </p-select>
                    <p-select
                        [ngModel]="statusFilter()"
                        (ngModelChange)="statusFilter.set($event)"
                        [options]="statusFilterOptions"
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Status"
                        styleClass="w-44"
                        appendTo="body"
                        [showClear]="true"
                    >
                    </p-select>
                </div>
            </div>

            <div class="flex flex-wrap items-center gap-3 mb-3 text-xs text-muted-color">
                <span>Showing {{ filteredUsers().length }} of {{ totalCount() }} user(s)</span>
                <span class="inline-flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                    {{ activeCount() }} active
                </span>
                <span class="inline-flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                    {{ suspendedCount() }} suspended
                </span>
                @if (hasFilters()) {
                    <a class="text-primary cursor-pointer underline" (click)="clearFilters()">Clear filters</a>
                }
            </div>

            @if (totalCount() === 0) {
                <app-empty-state
                    icon="pi pi-users"
                    title="No users yet"
                    message="Invite your first user to give staff and students access to the portal."
                    actionLabel="Invite User"
                    (action)="openCreate()"
                ></app-empty-state>
            } @else if (filteredUsers().length === 0) {
                <app-empty-state
                    icon="pi pi-search"
                    title="No matching users"
                    message="Adjust or clear the filters to see more users."
                    actionLabel="Clear filters"
                    (action)="clearFilters()"
                ></app-empty-state>
            } @else {
                <div class="overflow-x-auto">
                    <p-table
                        [value]="filteredUsers()"
                        dataKey="id"
                        [paginator]="true"
                        [rows]="rows()"
                        [rowsPerPageOptions]="rowsPerPageOptions"
                        (onPage)="onPageChange($event)"
                        sortMode="single"
                        [tableStyle]="{ 'min-width': '68rem' }"
                        styleClass="w-full"
                        currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
                        [showCurrentPageReport]="true"
                    >
                        <ng-template pTemplate="header">
                            <tr>
                                <th pSortableColumn="name" style="min-width:220px">Name <p-sortIcon field="name"></p-sortIcon></th>
                                <th style="min-width:220px">Email</th>
                                <th style="width:180px">Role</th>
                                <th style="width:240px">Status</th>
                                <th pSortableColumn="lastLogin" style="width:180px">Last Login <p-sortIcon field="lastLogin"></p-sortIcon></th>
                                <th style="width:140px">Actions</th>
                            </tr>
                        </ng-template>
                        <ng-template pTemplate="body" let-row>
                            <tr>
                                <td>
                                    <div class="font-medium">{{ row.name }}</div>
                                    @if (row.facultyMemberId) {
                                        <div class="text-xs text-muted-color inline-flex items-center gap-1 mt-0.5">
                                            <i class="pi pi-id-card text-[10px]"></i>
                                            {{ facultyName(row.facultyMemberId) }}
                                        </div>
                                    }
                                </td>
                                <td class="text-sm break-all">{{ row.email }}</td>
                                <td>
                                    <p-select
                                        [ngModel]="roleValue(row)"
                                        (ngModelChange)="requestRoleChange(row, $event)"
                                        [options]="roleOptions"
                                        optionLabel="label"
                                        optionValue="value"
                                        styleClass="w-40"
                                        appendTo="body"
                                        pTooltip="Assign a different role"
                                        tooltipPosition="top"
                                    >
                                    </p-select>
                                </td>
                                <td>
                                    <div class="flex items-center gap-2 flex-wrap">
                                        <app-status-tag [status]="row.status"></app-status-tag>
                                        <p-select
                                            [ngModel]="statusValue(row)"
                                            (ngModelChange)="requestStatusChange(row, $event)"
                                            [options]="statusOptions"
                                            optionLabel="label"
                                            optionValue="value"
                                            styleClass="w-36"
                                            appendTo="body"
                                            pTooltip="Change account status"
                                            tooltipPosition="top"
                                        >
                                        </p-select>
                                    </div>
                                </td>
                                <td>
                                    @if (row.lastLogin) {
                                        <div class="text-sm">{{ lastLoginLabel(row.lastLogin) }}</div>
                                        <div class="text-xs text-muted-color">{{ relativeLogin(row.lastLogin) }}</div>
                                    } @else {
                                        <span class="text-sm text-muted-color">Never</span>
                                    }
                                </td>
                                <td>
                                    <div class="flex items-center gap-1">
                                        <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" severity="info" pTooltip="Edit user" tooltipPosition="top" (onClick)="openEdit(row)"></p-button>
                                        <p-button
                                            [icon]="row.status === 'ACTIVE' ? 'pi pi-ban' : 'pi pi-check-circle'"
                                            [rounded]="true"
                                            [text]="true"
                                            [severity]="row.status === 'ACTIVE' ? 'warn' : 'success'"
                                            [pTooltip]="row.status === 'ACTIVE' ? 'Deactivate account' : 'Activate account'"
                                            tooltipPosition="top"
                                            (onClick)="confirmToggleStatus(row)"
                                        ></p-button>
                                        <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger" pTooltip="Delete user" tooltipPosition="top" (onClick)="confirmDelete(row)"></p-button>
                                    </div>
                                </td>
                            </tr>
                        </ng-template>
                        <ng-template pTemplate="emptymessage">
                            <tr>
                                <td colspan="6" class="text-center py-10 text-muted-color">No users match the current filters.</td>
                            </tr>
                        </ng-template>
                    </p-table>
                </div>
            }
        </p-card>

        <!-- Role descriptions -->
        <p-card styleClass="mt-4">
            <ng-template pTemplate="header">
                <div class="px-4 pt-4">
                    <h2 class="text-lg font-semibold">Roles &amp; Permissions</h2>
                    <p class="text-xs text-muted-color mt-0.5">Six roles are available. User counts below are derived from the current user list.</p>
                </div>
            </ng-template>
            <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                @for (role of roleSummary(); track role.role) {
                    <div class="border border-surface-200 dark:border-surface-700 rounded-lg p-3 flex gap-3">
                        <div class="w-9 h-9 rounded-lg flex items-center justify-center bg-surface-100 dark:bg-surface-800 shrink-0">
                            <i [class]="role.icon" class="text-primary"></i>
                        </div>
                        <div class="min-w-0">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="font-medium">{{ role.label }}</span>
                                <p-tag [value]="role.count + (role.count === 1 ? ' user' : ' users')" severity="secondary"></p-tag>
                            </div>
                            <p class="text-xs text-muted-color mt-0.5">{{ role.description }}</p>
                        </div>
                    </div>
                }
            </div>
        </p-card>

        <!-- Invite / Edit dialog -->
        <p-dialog
            [header]="editingUser() ? 'Edit User' : 'Invite User'"
            [visible]="formDialogVisible()"
            (visibleChange)="formDialogVisible.set($event)"
            [modal]="true"
            [closable]="true"
            [dismissableMask]="true"
            [style]="{ width: '560px', 'max-width': '95vw' }"
            (onHide)="closeForm()"
        >
            <form [formGroup]="form" (ngSubmit)="save()" class="flex flex-col gap-4">
                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-medium" for="userName">Name *</label>
                    <input pInputText id="userName" formControlName="name" placeholder="e.g. Jane Doe" />
                    @if (form.controls.name.touched && form.controls.name.hasError('required')) {
                        <small class="text-red-500">Name is required.</small>
                    }
                </div>

                <div class="flex flex-col gap-1.5">
                    <label class="text-sm font-medium" for="userEmail">Email *</label>
                    <input pInputText id="userEmail" type="email" formControlName="email" placeholder="name@unimanage.edu" />
                    @if (form.controls.email.touched && form.controls.email.hasError('required')) {
                        <small class="text-red-500">Email is required.</small>
                    }
                    @if (form.controls.email.touched && form.controls.email.hasError('email')) {
                        <small class="text-red-500">Enter a valid email address.</small>
                    }
                    @if (form.controls.email.touched && form.controls.email.hasError('emailTaken')) {
                        <small class="text-red-500">This email is already used by another user.</small>
                    }
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Role *</label>
                        <p-select formControlName="role" [options]="roleOptions" optionLabel="label" optionValue="value" appendTo="body" styleClass="w-full"></p-select>
                    </div>
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Status *</label>
                        <p-select formControlName="status" [options]="statusOptions" optionLabel="label" optionValue="value" appendTo="body" styleClass="w-full"></p-select>
                    </div>
                </div>

                @if (form.controls.role.value === 'FACULTY') {
                    <div class="flex flex-col gap-1.5">
                        <label class="text-sm font-medium">Linked Faculty Member</label>
                        <p-select
                            formControlName="facultyMemberId"
                            [options]="facultyOptions()"
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Select faculty member (optional)"
                            [showClear]="true"
                            [filter]="true"
                            filterBy="label"
                            appendTo="body"
                            styleClass="w-full"
                        >
                        </p-select>
                        <small class="text-muted-color">Only relevant for users with the Faculty role.</small>
                    </div>
                }

                <div class="flex justify-end gap-2 pt-2">
                    <p-button label="Cancel" severity="secondary" [text]="true" (onClick)="closeForm()"></p-button>
                    <p-button [label]="editingUser() ? 'Save Changes' : 'Send Invite'" icon="pi pi-save" type="submit"></p-button>
                </div>
            </form>
        </p-dialog>

        <p-toast></p-toast>
        <p-confirmDialog></p-confirmDialog>
    `
})
export class UsersList {
    private readonly users = inject(UserService);
    private readonly core = inject(CoreDataService);
    private readonly fb = inject(FormBuilder);
    private readonly confirm = inject(ConfirmationService);
    private readonly msg = inject(MessageService);

    // ── Static option lists ────────────────────────────────────────────────────
    readonly rowsPerPageOptions: number[] = [10, 25, 50, 100];

    readonly roleMeta: RoleMeta[] = [
        { role: 'SUPER_ADMIN', label: 'Super Admin', description: 'Full system access — manages users, settings and every module.', icon: 'pi pi-shield' },
        { role: 'REGISTRAR', label: 'Registrar', description: 'Oversees admissions, student records and academic registration.', icon: 'pi pi-id-card' },
        { role: 'FACULTY', label: 'Faculty', description: 'Manages courses, class schedules, attendance and student grades.', icon: 'pi pi-book' },
        { role: 'STUDENT', label: 'Student', description: 'Views enrolled courses, attendance, results, fees and notices.', icon: 'pi pi-graduation-cap' },
        { role: 'ACCOUNTS', label: 'Accounts', description: 'Handles student fees, invoices and payment reconciliation.', icon: 'pi pi-wallet' },
        { role: 'LIBRARIAN', label: 'Librarian', description: 'Manages the library catalogue and lending records.', icon: 'pi pi-briefcase' }
    ];

    readonly roleOptions: SelectOption<UserRole>[] = this.roleMeta.map((meta) => ({ label: meta.label, value: meta.role }));
    readonly roleFilterOptions: SelectOption<UserRole | null>[] = [{ label: 'All Roles', value: null }, ...this.roleOptions];

    readonly statusOptions: SelectOption<UserStatus>[] = [
        { label: 'Active', value: 'ACTIVE' },
        { label: 'Inactive', value: 'INACTIVE' },
        { label: 'Suspended', value: 'SUSPENDED' }
    ];
    readonly statusFilterOptions: SelectOption<UserStatus | null>[] = [{ label: 'All Statuses', value: null }, ...this.statusOptions];

    // ── Filters / paging ───────────────────────────────────────────────────────
    readonly search = signal('');
    readonly roleFilter = signal<UserRole | null>(null);
    readonly statusFilter = signal<UserStatus | null>(null);
    readonly rows = signal(10);

    // ── Data ───────────────────────────────────────────────────────────────────
    readonly allUsers = computed<SystemUser[]>(() => this.users.list());

    readonly totalCount = computed(() => this.allUsers().length);
    readonly activeCount = computed(() => this.allUsers().filter((u) => u.status === 'ACTIVE').length);
    readonly suspendedCount = computed(() => this.allUsers().filter((u) => u.status === 'SUSPENDED').length);

    readonly facultyOptions = computed<SelectOption<string>[]>(() =>
        this.core.facultyMembers().map((f) => ({
            label: `${f.firstName} ${f.lastName} (${f.employeeId})`,
            value: f.id
        }))
    );

    readonly roleSummary = computed(() => {
        const users = this.allUsers();
        return this.roleMeta.map((meta) => ({
            ...meta,
            count: users.filter((u) => u.role === meta.role).length
        }));
    });

    readonly filteredUsers = computed<SystemUser[]>(() => {
        const q = this.search().trim().toLowerCase();
        const role = this.roleFilter();
        const status = this.statusFilter();
        let list = this.allUsers();

        if (role) {
            list = list.filter((u) => u.role === role);
        }
        if (status) {
            list = list.filter((u) => u.status === status);
        }
        if (q) {
            list = list.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
        }

        return [...list].sort((a, b) => a.name.localeCompare(b.name));
    });

    readonly hasFilters = computed(() => !!this.search().trim() || !!this.roleFilter() || !!this.statusFilter());

    // ── Inline edit drafts (kept in sync with the confirm dialogs) ─────────────
    private readonly roleDraft = signal<Record<string, UserRole>>({});
    private readonly statusDraft = signal<Record<string, UserStatus>>({});

    // ── Dialog state ───────────────────────────────────────────────────────────
    readonly formDialogVisible = signal(false);
    readonly editingUser = signal<SystemUser | null>(null);

    readonly form = this.fb.group({
        name: ['', Validators.required],
        email: ['', [Validators.required, Validators.email, (control: AbstractControl) => this.validateEmail(control)]],
        role: ['STUDENT' as UserRole, Validators.required],
        status: ['ACTIVE' as UserStatus, Validators.required],
        facultyMemberId: [null as string | null]
    });

    constructor() {
        // Faculty link only applies to the Faculty role — clear it when the role changes.
        this.form.controls.role.valueChanges.subscribe((role) => {
            if (role !== 'FACULTY') {
                this.form.controls.facultyMemberId.setValue(null, { emitEvent: false });
            }
        });
    }

    // ── Table helpers ──────────────────────────────────────────────────────────
    onPageChange(event: { rows: number }): void {
        if (event.rows !== this.rows()) {
            this.rows.set(event.rows);
        }
    }

    clearFilters(): void {
        this.search.set('');
        this.roleFilter.set(null);
        this.statusFilter.set(null);
    }

    roleValue(user: SystemUser): UserRole {
        return this.roleDraft()[user.id] ?? user.role;
    }

    statusValue(user: SystemUser): UserStatus {
        return this.statusDraft()[user.id] ?? user.status;
    }

    roleLabel(role: UserRole): string {
        return this.roleOptions.find((o) => o.value === role)?.label ?? role;
    }

    statusLabel(status: UserStatus): string {
        return this.statusOptions.find((o) => o.value === status)?.label ?? status;
    }

    facultyName(id: string): string {
        const member = this.core.facultyMembers().find((f) => f.id === id);
        return member ? `${member.firstName} ${member.lastName}` : '—';
    }

    lastLoginLabel(value: string | null): string {
        const date = this.parseDate(value);
        if (!date) {
            return 'Never';
        }
        return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
    }

    relativeLogin(value: string | null): string {
        const date = this.parseDate(value);
        if (!date) {
            return '';
        }
        const minutes = Math.round((Date.now() - date.getTime()) / 60000);
        if (minutes < 1) {
            return 'just now';
        }
        if (minutes < 60) {
            return `${minutes}m ago`;
        }
        const hours = Math.round(minutes / 60);
        if (hours < 24) {
            return `${hours}h ago`;
        }
        const days = Math.round(hours / 24);
        if (days < 30) {
            return `${days}d ago`;
        }
        const months = Math.round(days / 30);
        if (months < 12) {
            return `${months}mo ago`;
        }
        return `${Math.round(months / 12)}y ago`;
    }

    // ── Create / edit / delete ─────────────────────────────────────────────────
    openCreate(): void {
        this.editingUser.set(null);
        this.form.reset({ name: '', email: '', role: 'STUDENT', status: 'ACTIVE', facultyMemberId: null });
        this.formDialogVisible.set(true);
    }

    openEdit(user: SystemUser): void {
        this.editingUser.set(user);
        this.form.reset({
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            facultyMemberId: user.facultyMemberId
        });
        this.form.controls.email.updateValueAndValidity();
        this.formDialogVisible.set(true);
    }

    closeForm(): void {
        this.formDialogVisible.set(false);
        this.editingUser.set(null);
    }

    save(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.msg.add({ severity: 'warn', summary: 'Validation', detail: 'Please fix the highlighted errors.' });
            return;
        }

        const raw = this.form.getRawValue();
        const name = (raw.name ?? '').trim();
        const email = (raw.email ?? '').trim();
        const role: UserRole = raw.role ?? 'STUDENT';
        const status: UserStatus = raw.status ?? 'ACTIVE';
        const facultyMemberId = role === 'FACULTY' ? (raw.facultyMemberId ?? null) : null;

        try {
            const editing = this.editingUser();
            if (editing) {
                this.users.update({ ...editing, name, email, role, status, facultyMemberId });
                this.msg.add({ severity: 'success', summary: 'User updated', detail: `${name} has been updated.` });
            } else {
                this.users.create({ name, email, role, status, facultyMemberId, lastLogin: null });
                this.msg.add({ severity: 'success', summary: 'Invite sent', detail: `${name} has been invited as ${this.roleLabel(role)}.` });
            }
            this.closeForm();
        } catch (error) {
            this.msg.add({ severity: 'error', summary: 'Save failed', detail: this.errorText(error) });
        }
    }

    confirmDelete(user: SystemUser): void {
        this.confirm.confirm({
            message: `Delete user "${user.name}"? This action cannot be undone.`,
            header: 'Delete User',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Delete',
            rejectLabel: 'Cancel',
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                try {
                    this.users.remove(user.id);
                    this.msg.add({ severity: 'success', summary: 'Deleted', detail: `User "${user.name}" removed.` });
                } catch (error) {
                    this.msg.add({ severity: 'error', summary: 'Delete failed', detail: this.errorText(error) });
                }
            }
        });
    }

    // ── Role / status assignment ───────────────────────────────────────────────
    requestRoleChange(user: SystemUser, role: UserRole): void {
        if (role === user.role) {
            return;
        }
        this.roleDraft.update((map) => ({ ...map, [user.id]: role }));
        this.confirm.confirm({
            message: `Change role of "${user.name}" from ${this.roleLabel(user.role)} to ${this.roleLabel(role)}?`,
            header: 'Change Role',
            icon: 'pi pi-shield',
            acceptLabel: 'Change Role',
            rejectLabel: 'Cancel',
            accept: () => {
                try {
                    this.users.updateRole(user.id, role);
                    this.clearRoleDraft(user.id);
                    this.msg.add({ severity: 'success', summary: 'Role updated', detail: `${user.name} is now ${this.roleLabel(role)}.` });
                } catch (error) {
                    this.clearRoleDraft(user.id);
                    this.msg.add({ severity: 'error', summary: 'Update failed', detail: this.errorText(error) });
                }
            },
            reject: () => this.clearRoleDraft(user.id)
        });
    }

    requestStatusChange(user: SystemUser, status: UserStatus): void {
        if (status === user.status) {
            return;
        }
        this.statusDraft.update((map) => ({ ...map, [user.id]: status }));
        this.confirm.confirm({
            message: `Change status of "${user.name}" to ${this.statusLabel(status)}?`,
            header: 'Update Account Status',
            icon: 'pi pi-refresh',
            acceptLabel: 'Update',
            rejectLabel: 'Cancel',
            accept: () => {
                try {
                    this.users.update({ ...user, status });
                    this.clearStatusDraft(user.id);
                    this.msg.add({ severity: 'success', summary: 'Status updated', detail: `${user.name} is now ${this.statusLabel(status)}.` });
                } catch (error) {
                    this.clearStatusDraft(user.id);
                    this.msg.add({ severity: 'error', summary: 'Update failed', detail: this.errorText(error) });
                }
            },
            reject: () => this.clearStatusDraft(user.id)
        });
    }

    confirmToggleStatus(user: SystemUser): void {
        const deactivating = user.status === 'ACTIVE';
        const next: UserStatus = deactivating ? 'INACTIVE' : 'ACTIVE';
        this.confirm.confirm({
            message: `${deactivating ? 'Deactivate' : 'Activate'} account for "${user.name}"?`,
            header: deactivating ? 'Deactivate User' : 'Activate User',
            icon: deactivating ? 'pi pi-ban' : 'pi pi-check-circle',
            acceptLabel: deactivating ? 'Deactivate' : 'Activate',
            rejectLabel: 'Cancel',
            acceptButtonStyleClass: deactivating ? 'p-button-warn' : 'p-button-success',
            accept: () => {
                try {
                    this.users.toggleStatus(user.id);
                    this.msg.add({ severity: 'success', summary: 'Status updated', detail: `${user.name} is now ${this.statusLabel(next)}.` });
                } catch (error) {
                    this.msg.add({ severity: 'error', summary: 'Update failed', detail: this.errorText(error) });
                }
            }
        });
    }

    // ── Internal helpers ───────────────────────────────────────────────────────
    private clearRoleDraft(id: string): void {
        this.roleDraft.update((map) => {
            const next = { ...map };
            delete next[id];
            return next;
        });
    }

    private clearStatusDraft(id: string): void {
        this.statusDraft.update((map) => {
            const next = { ...map };
            delete next[id];
            return next;
        });
    }

    private validateEmail(control: AbstractControl): ValidationErrors | null {
        const raw = control.value;
        const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
        if (!value) {
            return null;
        }
        const editing = this.editingUser();
        const taken = this.allUsers().some((u) => u.email.trim().toLowerCase() === value && u.id !== editing?.id);
        return taken ? { emailTaken: true } : null;
    }

    private parseDate(value: string | null): Date | null {
        if (!value) {
            return null;
        }
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    private errorText(error: unknown): string {
        return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
    }
}
