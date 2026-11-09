import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { RippleModule } from 'primeng/ripple';
import { MessageModule } from 'primeng/message';
import { AppFloatingConfigurator } from '../../layouts/app.floatingconfigurator';
import { AuthService } from '@/app/core/services/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [ButtonModule, CheckboxModule, InputTextModule, PasswordModule, FormsModule, RouterModule, RippleModule, MessageModule, AppFloatingConfigurator],
    template: `
        <app-floating-configurator />
        <div class="bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen min-w-screen overflow-hidden">
            <div class="flex flex-col items-center justify-center">
                <div style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, var(--primary-color) 10%, rgba(33, 150, 243, 0) 30%)">
                    <div class="w-full bg-surface-0 dark:bg-surface-900 py-20 px-8 sm:px-20" style="border-radius: 53px">
                        <div class="text-center mb-8">
                            <img
                                src="/assets/images/Navy%20Gold%20University%20Shield%20Logo.png"
                                alt="Infinity University logo"
                                class="mb-6 w-36 h-24 sm:w-48 sm:h-32 shrink-0 mx-auto object-contain rounded-2xl shadow-lg ring-1 ring-surface-200"
                            />
                            <div class="text-surface-900 dark:text-surface-0 text-3xl font-semibold tracking-tight mb-3">Infinity University Management</div>
                            <span class="text-muted-color font-medium">Empowering Education, Simplifying Administration</span>
                        </div>

                        <div>
                            <label for="email1" class="block text-surface-900 dark:text-surface-0 text-xl font-medium mb-2">Username</label>
                            <input pInputText id="email1" type="text" placeholder="Administrator, Teacher1 or Student1" class="w-full md:w-120 mb-8" [(ngModel)]="username" (keydown.enter)="signIn()" />

                            <label for="password1" class="block text-surface-900 dark:text-surface-0 font-medium text-xl mb-2">Password</label>
                            <p-password id="password1" [(ngModel)]="password" placeholder="Password" [toggleMask]="true" styleClass="mb-4" [fluid]="true" [feedback]="false" (keydown.enter)="signIn()"></p-password>
                            @if (error) {
                                <p-message severity="error" [text]="error" styleClass="w-full mb-4"></p-message>
                            }

                            <div class="flex items-center justify-between mt-2 mb-8 gap-8">
                                <div class="flex items-center">
                                    <p-checkbox [(ngModel)]="checked" id="rememberme1" binary class="mr-2"></p-checkbox>
                                    <label for="rememberme1">Remember me</label>
                                </div>
                                <span class="font-medium no-underline ml-2 text-right cursor-pointer text-primary">Forgot password?</span>
                            </div>
                            <p-button label="Sign In" styleClass="w-full" (onClick)="signIn()"></p-button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
})
export class Login {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);

    username: string = '';

    password: string = '';

    checked: boolean = false;

    error: string | null = null;

    signIn(): void {
        if (this.auth.login(this.username.trim(), this.password)) {
            this.error = null;
            this.router.navigate([this.auth.role() === 'TEACHER' ? '/teacher/dashboard' : this.auth.role() === 'STUDENT' ? '/student/dashboard' : '/dashboard']);
        } else {
            this.error = 'Unauthorized: invalid username or password.';
        }
    }
}
