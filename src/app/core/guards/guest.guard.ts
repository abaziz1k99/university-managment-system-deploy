import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@/app/core/services/auth.service';

export const guestGuard: CanActivateFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (!auth.isLoggedIn()) return true;
    return router.createUrlTree([auth.role() === 'TEACHER' ? '/teacher/dashboard' : auth.role() === 'STUDENT' ? '/student/dashboard' : '/dashboard']);
};
