import { Injectable } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';

export interface ConfirmOptions {
    message: string;
    header?: string;
    icon?: string;
    acceptLabel?: string;
    rejectLabel?: string;
    acceptIcon?: string;
    rejectIcon?: string;
    acceptButtonStyleClass?: string;
    rejectButtonStyleClass?: string;
}

@Injectable({
    providedIn: 'root'
})
export class ConfirmDialogService {
    constructor(private confirmation: ConfirmationService, private message: MessageService) {}

    confirm(options: ConfirmOptions): Promise<boolean> {
        return new Promise((resolve) => {
            this.confirmation.confirm({
                message: options.message,
                header: options.header ?? 'Confirm',
                icon: options.icon ?? 'pi pi-exclamation-triangle',
                acceptLabel: options.acceptLabel ?? 'Yes',
                rejectLabel: options.rejectLabel ?? 'No',
                acceptIcon: options.acceptIcon ?? 'pi pi-check',
                rejectIcon: options.rejectIcon ?? 'pi pi-times',
                acceptButtonStyleClass: options.acceptButtonStyleClass ?? 'p-button-danger',
                rejectButtonStyleClass: options.rejectButtonStyleClass ?? 'p-button-text',
                accept: () => resolve(true),
                reject: () => resolve(false)
            });
        });
    }

    confirmDelete(entityName: string): Promise<boolean> {
        return this.confirm({
            message: `Are you sure you want to delete this ${entityName}? This action cannot be undone.`,
            header: 'Delete Confirmation',
            acceptLabel: 'Delete',
            acceptButtonStyleClass: 'p-button-danger'
        });
    }

    success(detail: string, summary = 'Success'): void {
        this.message.add({ severity: 'success', summary, detail });
    }

    error(detail: string, summary = 'Error'): void {
        this.message.add({ severity: 'error', summary, detail });
    }

    warn(detail: string, summary = 'Warning'): void {
        this.message.add({ severity: 'warn', summary, detail });
    }

    info(detail: string, summary = 'Info'): void {
        this.message.add({ severity: 'info', summary, detail });
    }
}