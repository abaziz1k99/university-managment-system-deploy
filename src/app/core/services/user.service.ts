import { inject, Injectable } from '@angular/core';
import { CoreDataService } from '@/app/core/services/core-data.service';
import { SystemUser } from '@/app/core/models/index';

@Injectable({
    providedIn: 'root'
})
export class UserService {
    protected readonly core = inject(CoreDataService);

    list() {
        return this.core.users();
    }

    get(id: string) {
        return this.core.get<SystemUser>('users', id);
    }

    create(data: Partial<SystemUser>): SystemUser {
        const now = new Date().toISOString();
        const entity: SystemUser = {
            id: data.id ?? this.core.generateId('usr'),
            name: data.name ?? '',
            email: data.email ?? '',
            role: data.role ?? 'STUDENT',
            status: data.status ?? 'ACTIVE',
            facultyMemberId: data.facultyMemberId ?? null,
            lastLogin: data.lastLogin ?? null,
            createdAt: data.createdAt ?? now,
            updatedAt: now
        };
        return this.core.create<SystemUser>('users', entity);
    }

    update(entity: SystemUser): SystemUser {
        return this.core.update<SystemUser & { id: string }>('users', entity);
    }

    remove(id: string): void {
        this.core.remove('users', id);
    }

    toggleStatus(id: string): void {
        const user = this.get(id);
        if (!user) throw new Error('User not found');
        this.update({ ...user, status: user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' });
    }

    updateRole(id: string, role: SystemUser['role']): void {
        const user = this.get(id);
        if (!user) throw new Error('User not found');
        this.update({ ...user, role });
    }
}