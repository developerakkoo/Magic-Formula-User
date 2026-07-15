import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Promise<boolean> {
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }

    // Check cached block status first (fast check)
    if (this.authService.isBlocked()) {
      // Verify with backend to ensure it's not stale cache
      const isBlocked = await this.authService.checkBlockStatus();
      if (isBlocked) {
        // User is blocked - checkBlockStatus already logged out and redirected
        return false;
      }
    } else {
      // Even if cache says not blocked, verify with backend
      // This catches cases where user was blocked while app was open
      const isBlocked = await this.authService.checkBlockStatus();
      if (isBlocked) {
        // User is blocked - checkBlockStatus already logged out and redirected
        return false;
      }
    }

    // User is authenticated and account is in good standing
    return true;
  }
}

/**
 * Guard to redirect authenticated users away from login/register pages
 */
@Injectable({
  providedIn: 'root'
})
export class LoginGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): boolean {
    if (
      this.authService.isAuthenticated() &&
      !this.authService.isBlocked() &&
      this.authService.isApproved()
    ) {
      this.router.navigate(['/folder/Magic Formula']);
      return false;
    }

    return true;
  }
}

