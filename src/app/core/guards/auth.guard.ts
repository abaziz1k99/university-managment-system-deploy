import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@/app/core/services/auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (auth.isLoggedIn()) {
        if (auth.role() === 'TEACHER' && !state.url.startsWith('/teacher')) return router.createUrlTree(['/teacher/dashboard']);
        if (auth.role() === 'STUDENT' && !state.url.startsWith('/student')) return router.createUrlTree(['/student/dashboard']);
        if (auth.role() === 'ADMIN' && (state.url.startsWith('/teacher') || state.url.startsWith('/student'))) return router.createUrlTree(['/dashboard']);
        if (auth.role() === 'TEACHER' && state.url.startsWith('/student')) return router.createUrlTree(['/teacher/dashboard']);
        return true;
    }
    return router.createUrlTree(['/auth/login']);
};
