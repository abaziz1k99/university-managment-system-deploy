import { Injectable, signal } from '@angular/core';

const AUTH_KEY = 'unimanage.auth';
const ROLE_KEY = 'unimanage.role';
export type PortalRole = 'ADMIN' | 'TEACHER' | 'STUDENT';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private readonly _loggedIn = signal(this.hasSession());
    private readonly _role = signal<PortalRole | null>(this.readRole());

    readonly isLoggedIn = this._loggedIn.asReadonly();
    readonly role = this._role.asReadonly();

    private hasSession(): boolean {
        try {
            return sessionStorage.getItem(AUTH_KEY) === '1';
        } catch {
            return false;
        }
    }

    private readRole(): PortalRole | null {
        try {
            if (sessionStorage.getItem(AUTH_KEY) !== '1') return null;
            const role = sessionStorage.getItem(ROLE_KEY);
            return role === 'TEACHER' || role === 'STUDENT' ? role : 'ADMIN';
        } catch {
            return null;
        }
    }

    login(username: string, password: string): boolean {
        const normalizedUsername = username.trim().toLowerCase();
        const role: PortalRole | null = normalizedUsername === 'administrator' && password === 'Admin@123'
            ? 'ADMIN'
            : normalizedUsername === 'teacher1' && password === 'Teacher@123'
              ? 'TEACHER'
              : normalizedUsername === 'student1' && password === 'Student@123'
                ? 'STUDENT'
                : null;
        const ok = role !== null;
        if (ok) {
            try {
                sessionStorage.setItem(AUTH_KEY, '1');
                sessionStorage.setItem(ROLE_KEY, role);
            } catch {
                // storage unavailable — still treat as logged in for this session
            }
            this._loggedIn.set(true);
            this._role.set(role);
            return true;
        }
        return false;
    }

    logout(): void {
        try {
            sessionStorage.removeItem(AUTH_KEY);
            sessionStorage.removeItem(ROLE_KEY);
        } catch {
            // ignore
        }
        this._loggedIn.set(false);
        this._role.set(null);
    }
}
