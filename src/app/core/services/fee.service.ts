import { Injectable, inject } from '@angular/core';
import { CoreDataService } from '@/app/core/services/core-data.service';
import { FeeAccount, Payment } from '@/app/core/models/index';

@Injectable({
    providedIn: 'root'
})
export class FeeService {
    protected readonly core = inject(CoreDataService);

    list(): FeeAccount[] {
        return this.core.feeAccounts();
    }

    get(id: string): FeeAccount | undefined {
        return this.core.get<FeeAccount>('feeAccounts', id);
    }

    getByStudent(studentId: string): FeeAccount[] {
        return this.core.feeAccounts().filter((f: FeeAccount) => f.studentId === studentId);
    }

    create(data: Partial<FeeAccount>): FeeAccount {
        return this.core.create<FeeAccount & { id: string }>('feeAccounts', {
            ...data,
            id: this.core.generateId('fa'),
            createdAt: data.createdAt ?? new Date().toISOString(),
            updatedAt: new Date().toISOString()
        } as FeeAccount & { id: string });
    }

    update(entity: FeeAccount): FeeAccount {
        return this.core.update<FeeAccount & { id: string }>('feeAccounts', entity);
    }

    remove(id: string): void {
        this.core.remove('feeAccounts', id);
    }

    recordPayment(data: Partial<Payment>): Payment {
        const feeAccount = this.get(data.feeAccountId!);
        if (!feeAccount) {
            throw new Error('Fee account not found');
        }
        if (data.amount && data.amount > feeAccount.balance) {
            throw new Error('Payment amount cannot exceed outstanding balance.');
        }
        if (data.date && new Date(data.date) > new Date()) {
            throw new Error('Payment date cannot be in the future.');
        }
        const payment = this.core.create<Payment & { id: string }>('payments', {
            ...data,
            id: this.core.generateId('pay'),
            receiptNo: data.receiptNo ?? `RCPT-${data.feeAccountId}-${Date.now()}`,
            createdAt: data.createdAt ?? new Date().toISOString(),
            updatedAt: new Date().toISOString()
        } as Payment & { id: string });
        const newPaid = feeAccount.totalPaid + (data.amount ?? 0);
        const newBalance = feeAccount.totalBilled - newPaid;
        const newStatus = newBalance === 0 ? 'PAID' : (newPaid > 0 ? 'PARTIAL' : 'UNPAID');
        this.update({ ...feeAccount, totalPaid: newPaid, balance: newBalance, status: newStatus });
        return payment;
    }

    getPayments(feeAccountId: string): Payment[] {
        return this.core.payments().filter((p: Payment) => p.feeAccountId === feeAccountId);
    }

    overview(): { totalCollected: number; totalOutstanding: number; collectionRate: number; recentPayments: Payment[] } {
        const accounts = this.core.feeAccounts();
        return {
            totalCollected: accounts.reduce((s: number, a: FeeAccount) => s + a.totalPaid, 0),
            totalOutstanding: accounts.reduce((s: number, a: FeeAccount) => s + a.balance, 0),
            collectionRate: accounts.length ? (accounts.reduce((s: number, a: FeeAccount) => s + a.totalPaid, 0) / accounts.reduce((s: number, a: FeeAccount) => s + a.totalBilled, 0)) * 100 : 0,
            recentPayments: this.core.payments().slice(0, 5)
        };
    }

    collectionReport(start: string, end: string): Payment[] {
        return this.core.payments().filter((p: Payment) => p.date >= start && p.date <= end);
    }

    /** Number of accounts in each status, used by the fees list filters/summary. */
    getStatusCounts(): Record<FeeAccount['status'], number> {
        const counts: Record<FeeAccount['status'], number> = { PAID: 0, PARTIAL: 0, UNPAID: 0, OVERDUE: 0 };
        for (const account of this.list()) {
            counts[account.status] += 1;
        }
        return counts;
    }
}
