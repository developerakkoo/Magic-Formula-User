import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastController } from '@ionic/angular';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip adding token for login and register endpoints
    if (req.url.includes('/api/auth/login') || req.url.includes('/api/auth/register')) {
      return next.handle(req);
    }

    // Get token from auth service
    const token = this.authService.getToken();

    // Clone request and add authorization header if token exists
    let authReq = req;
    if (token) {
      authReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    // Handle response
    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        // Handle 401 Unauthorized (token expired/invalid)
        if (error.status === 401) {
          this.authService.logout();
          this.showToast('Session expired. Please login again.', 'warning');
        }
        
        // Handle 403 Forbidden (blocked user or device mismatch)
        if (error.status === 403) {
          const isDeviceMismatch = error.error?.isDeviceMismatch === true;
          const user = this.authService.getCurrentUser();
          
          if (isDeviceMismatch || user?.isBlocked || error.error?.isBlocked) {
            // Logout user first to clear token and storage
            // This prevents further API calls with invalid token
            this.authService.logout();
            
            // Navigate to blocked page with state to indicate device mismatch
            this.router.navigate(['/blocked'], {
              state: { isDeviceMismatch }
            });
            const message = isDeviceMismatch
              ? 'This account is registered to another device. Contact admin to reset device.'
              : 'Your account has been blocked. Contact admin.';
            this.showToast(message, 'danger');
          } else {
            this.showToast('Access denied.', 'danger');
          }
        }

        // Handle network errors
        if (error.status === 0) {
          this.showToast('Network error. Please check your connection.', 'danger');
        }

        return throwError(() => error);
      })
    );
  }

  /**
   * Show toast message
   */
  private async showToast(message: string, color: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    toast.present();
  }
}

