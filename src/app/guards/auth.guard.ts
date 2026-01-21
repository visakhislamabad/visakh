import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

export const authGuard = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const firebaseUser = await firstValueFrom(authService.user$.pipe(take(1)));
  if (firebaseUser) {
    await authService.ensureUserLoaded(firebaseUser.uid);
    return true;
  }

  router.navigate(['/login']);
  return false;
};

export const adminGuard = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const firebaseUser = await firstValueFrom(authService.user$.pipe(take(1)));
  if (firebaseUser) {
    await authService.ensureUserLoaded(firebaseUser.uid);
    if (authService.hasRole('admin')) {
      return true;
    }
  }

  router.navigate(['/']);
  return false;
};

export const waiterGuard = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const firebaseUser = await firstValueFrom(authService.user$.pipe(take(1)));
  if (firebaseUser) {
    await authService.ensureUserLoaded(firebaseUser.uid);
    if (authService.hasRole('waiter')) {
      return true;
    }
  }

  router.navigate(['/']);
  return false;
};
