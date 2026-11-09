import { CommonModule } from '@angular/common';
import { Component, HostListener, signal } from '@angular/core';

@Component({
    selector: 'app-demo-accounts-info',
    standalone: true,
    imports: [CommonModule],
    template: `
        <button type="button" class="info-trigger" aria-label="Show demo account credentials" title="Demo account information" [attr.aria-expanded]="open()" (click)="toggle($event)">
            <i class="pi pi-info-circle" aria-hidden="true"></i>
        </button>
        @if (open()) {
                <section class="info-modal" role="dialog" aria-labelledby="demo-account-title" (click)="$event.stopPropagation()">
                    <header class="modal-header">
                        <div class="title-icon"><i class="pi pi-info-circle"></i></div>
                        <div class="title-copy"><h2 id="demo-account-title">Demo accounts</h2><p>Use one of these accounts to explore the portal.</p></div>
                        <button type="button" class="close-button" aria-label="Close dialog" (click)="close()"><i class="pi pi-times"></i></button>
                    </header>
                    <div class="account-list">
                        <article class="account"><span class="role-icon"><i class="pi pi-shield"></i></span><div><b>Administrator</b><small>Username: Administrator</small><small>Password: Admin@123</small></div></article>
                        <article class="account"><span class="role-icon"><i class="pi pi-briefcase"></i></span><div><b>Teacher</b><small>Username: Teacher1</small><small>Password: Teacher@123</small></div></article>
                        <article class="account"><span class="role-icon"><i class="pi pi-user"></i></span><div><b>Student</b><small>Username: Student1</small><small>Password: Student@123</small></div></article>
                    </div>
                    <footer><button type="button" class="done-button" (click)="close()">Got it</button></footer>
                </section>
        }
    `,
    styles: [`
        :host{display:inline-flex;align-items:center;position:relative}.info-trigger,.close-button{display:inline-flex;align-items:center;justify-content:center;border:0;background:transparent;color:var(--text-color-secondary);cursor:pointer}.info-trigger{width:2.5rem;height:2.5rem;border-radius:50%;font-size:1rem}.info-trigger:hover,.close-button:hover{background:var(--surface-hover);color:var(--primary-color)}
        .info-modal{position:absolute;top:calc(100% + .45rem);right:0;z-index:1300;width:min(390px,calc(100vw - 2rem));background:var(--surface-card);color:var(--text-color);border:1px solid var(--surface-border);border-radius:14px;padding:1rem;box-shadow:0 12px 36px rgba(0,0,0,.24);animation:show .15s ease-out}.modal-header{display:flex;align-items:center;gap:.75rem;margin-bottom:.85rem}.title-icon,.role-icon{width:2.35rem;height:2.35rem;display:grid;place-items:center;flex:0 0 auto;border-radius:10px;background:color-mix(in srgb,var(--primary-color) 13%,transparent);color:var(--primary-color)}.title-copy{flex:1}.title-copy h2{font-size:1.02rem;font-weight:700;margin:0}.title-copy p{font-size:.76rem;color:var(--text-color-secondary);margin:.2rem 0 0}.close-button{width:2rem;height:2rem;border-radius:50%}.account-list{display:grid;gap:.5rem}.account{display:flex;align-items:center;gap:.7rem;border:1px solid var(--surface-border);border-radius:10px;padding:.6rem}.account b{font-size:.86rem}.account small{display:block;color:var(--text-color-secondary);font-size:.75rem;margin-top:.12rem}.info-modal footer{display:flex;justify-content:flex-end;margin-top:.75rem}.done-button{border:0;border-radius:8px;background:var(--primary-color);color:var(--primary-contrast-color,#fff);padding:.5rem .9rem;font-weight:600;cursor:pointer}@keyframes show{from{opacity:0;transform:translateY(4px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
    `]
})
export class DemoAccountsInfo {
    readonly open = signal(false);
    toggle(event: MouseEvent): void { event.stopPropagation(); this.open.update((value) => !value); }
    close(): void { this.open.set(false); }

    @HostListener('document:click')
    closeOnOutsideClick(): void { this.close(); }

    @HostListener('document:keydown.escape')
    closeOnEscape(): void { this.close(); }
}
