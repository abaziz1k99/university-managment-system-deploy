import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-avatar',
    standalone: true,
    template: `
        <div class="relative inline-flex shrink-0" [class]="sizeClass">
            @if (image) {
                <img [src]="image" [alt]="name" class="w-full h-full rounded-full object-cover">
            } @else {
                <div class="w-full h-full rounded-full flex items-center justify-center font-semibold" [style.background-color]="bgColor" [style.color]="textColor">
                    {{ initials }}
                </div>
            }
            @if (status) {
                <span class="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-surface-900" [class]="statusClass"></span>
            }
        </div>
    `
})
export class Avatar {
    @Input() name = '';
    @Input() image?: string;
    @Input() size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md';
    @Input() status?: 'online' | 'offline' | 'busy' | 'away';

    get sizeClass(): string {
        const sizes = { xs: 'w-6 h-6 text-xs', sm: 'w-8 h-8 text-sm', md: 'w-10 h-10 text-base', lg: 'w-12 h-12 text-lg', xl: 'w-16 h-16 text-xl' };
        return sizes[this.size];
    }

    get initials(): string {
        return this.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    }

    get bgColor(): string {
        let hash = 0;
        for (let i = 0; i < this.name.length; i++) {
            hash = this.name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash) % 360;
        return `hsl(${hue}, 60%, 45%)`;
    }

    get textColor(): string {
        return '#ffffff';
    }

    get statusClass(): string {
        const classes = { online: 'bg-green-500', offline: 'bg-gray-400', busy: 'bg-red-500', away: 'bg-yellow-500' };
        return classes[this.status!] ?? 'bg-gray-400';
    }
}