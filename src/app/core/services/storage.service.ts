import { Injectable, signal, computed } from '@angular/core';

export const STORAGE_AVAILABLE = typeof localStorage !== 'undefined';

@Injectable({
    providedIn: 'root'
})
export class StorageService {
    private readonly inMemory = new Map<string, string>();

    set(key: string, value: any): void {
        try {
            if (STORAGE_AVAILABLE) {
                localStorage.setItem(key, JSON.stringify(value));
            } else {
                this.inMemory.set(key, JSON.stringify(value));
            }
        } catch {
            this.inMemory.set(key, JSON.stringify(value));
        }
    }

    get<T = any>(key: string): T | null {
        try {
            if (STORAGE_AVAILABLE) {
                const raw = localStorage.getItem(key);
                return raw ? (JSON.parse(raw) as T) : null;
            }
            const raw = this.inMemory.get(key);
            return raw ? (JSON.parse(raw) as T) : null;
        } catch {
            return null;
        }
    }

    remove(key: string): void {
        try {
            if (STORAGE_AVAILABLE) {
                localStorage.removeItem(key);
            } else {
                this.inMemory.delete(key);
            }
        } catch {
            this.inMemory.delete(key);
        }
    }

    clear(): void {
        try {
            if (STORAGE_AVAILABLE) {
                localStorage.clear();
            }
            this.inMemory.clear();
        } catch {
            this.inMemory.clear();
        }
    }
}
