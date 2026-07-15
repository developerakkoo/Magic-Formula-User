import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

export interface User {
  _id: string;
  mobile: string;
  fullName?: string;
  email?: string;
  whatsapp?: string;
  firebaseToken?: string;
  isBlocked: boolean;
  registrationStatus?: 'pending' | 'approved' | 'rejected';
  activePlan?: string;
  planExpiry?: Date | string;
  profilePic?: string;
  deviceChangeRequested?: boolean;
  deviceChangeRequestedAt?: Date | string;
}

export interface LoginRequest {
  email: string;
  password: string;
  deviceId?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName?: string;
  mobile?: string;
  whatsapp?: string;
  profilePic?: string;
  firebaseToken?: string;
  activePlan?: string;
  planExpiry?: Date | string;
  deviceId?: string;
}

export interface LoginResponse {
  message: string;
  isRegistered?: boolean; // Only for register
  isBlocked: boolean;
  isDeviceMismatch?: boolean;
  accessToken: string;
  user: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = `${environment.API_URL}/api/auth`;
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'user_data';
  
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Load user from storage on service initialization
    this.loadUserFromStorage();
  }

  // Device ID verification disabled — do not attach deviceId to auth requests.
  // To re-enable: restore getNativeDeviceIdForAuth() using @capacitor/core + @capacitor/device
  // and spread ...(deviceId ? { deviceId } : {}) into login/register/verify payloads.

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<Observable<LoginResponse>> {
    const loginData: LoginRequest = {
      email: (email ?? '').trim(),
      password: (password ?? '').trim()
    };

    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, loginData).pipe(
      tap(response => {
        // Check if user is blocked or device mismatch
        if (response.isBlocked || response.isDeviceMismatch) {
          // User is blocked or device mismatch, don't store token
          // Navigate will be handled by the component
          return;
        }
        
        // Store token and user data only if not blocked
        this.setToken(response.accessToken);
        this.setUser(response.user);
        this.currentUserSubject.next(response.user);
      }),
      catchError(error => {
        return throwError(() => this.handleError(error));
      })
    );
  }

  /**
   * Register user with email and password
   */
  async register(registerData: RegisterRequest): Promise<Observable<LoginResponse>> {
    const payload: RegisterRequest = { ...registerData };
    delete payload.deviceId;

    return this.http.post<LoginResponse>(`${this.apiUrl}/register`, payload).pipe(
      tap(response => {
        // Check if user is blocked or device mismatch
        if (response.isBlocked || response.isDeviceMismatch) {
          // User is blocked or device mismatch, don't store token
          // Navigate will be handled by the component
          return;
        }
        
        // Store token and user data only if not blocked
        this.setToken(response.accessToken);
        this.setUser(response.user);
        this.currentUserSubject.next(response.user);
      }),
      catchError(error => {
        return throwError(() => this.handleError(error));
      })
    );
  }

  /**
   * Logout user
   * Calls backend logout endpoint, then clears local storage
   */
  logout(): void {
    const token = this.getToken();
    
    // Call backend logout endpoint if token exists
    if (token) {
      this.http.post(`${this.apiUrl}/logout`, {}).subscribe({
        next: () => {
          // Clear stored data on success
          this.clearStorage();
          this.router.navigate(['/login']);
        },
        error: (error) => {
          // Even if logout API call fails, clear local storage and navigate
          console.error('Logout API error:', error);
          this.clearStorage();
          this.router.navigate(['/login']);
        }
      });
    } else {
      // No token, just clear local storage and navigate
      this.clearStorage();
      this.router.navigate(['/login']);
    }
  }

  /**
   * Update user activity (heartbeat for live user tracking)
   * Called periodically to track that user is active
   */
  updateUserActivity(): Observable<any> {
    return this.http.post(`${environment.API_URL}/api/users/activity`, {}).pipe(
      catchError(error => {
        // Silently fail - don't interrupt user experience
        console.debug('Activity update failed:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Refresh user profile from backend
   */
  refreshUserProfile(): Observable<User> {
    return this.http.get<{ success: boolean; data: User }>(`${environment.API_URL}/api/users/profile`).pipe(
      map(response => response.data),
      tap(user => {
        // Update stored user data
        this.setUser(user);
      }),
      catchError(error => {
        return throwError(() => this.handleError(error));
      })
    );
  }

  /**
   * Check block / registration status with backend.
   * Returns true if user should not access the app.
   */
  async checkBlockStatus(skipNavigation: boolean = false): Promise<boolean> {
    const token = this.getToken();
    
    if (!token) {
      return false;
    }

    try {
      const user = await firstValueFrom(
        this.http.get<{ success: boolean; data: User }>(`${environment.API_URL}/api/users/profile`).pipe(
          map(response => response.data),
          catchError(error => {
            if (error.status === 401 || error.status === 403) {
              return throwError(() => this.normalizeAccountStatusError(error));
            }
            return throwError(() => error);
          })
        )
      );

      this.setUser(user);

      if (user.isBlocked) {
        this.clearStorage();
        if (!skipNavigation) {
          this.router.navigate(['/blocked']);
        }
        return true;
      }

      if (user.registrationStatus === 'pending') {
        this.clearStorage();
        if (!skipNavigation) {
          this.router.navigate(['/pending-approval']);
        }
        return true;
      }

      if (user.registrationStatus === 'rejected') {
        this.clearStorage();
        if (!skipNavigation) {
          this.router.navigate(['/registration-rejected']);
        }
        return true;
      }

      return false;
    } catch (error: any) {
      if (error?.isBlocked) {
        this.clearStorage();
        if (!skipNavigation) {
          this.router.navigate(['/blocked']);
        }
        return true;
      }
      if (error?.isPendingApproval) {
        this.clearStorage();
        if (!skipNavigation) {
          this.router.navigate(['/pending-approval']);
        }
        return true;
      }
      if (error?.isRejected) {
        this.clearStorage();
        if (!skipNavigation) {
          this.router.navigate(['/registration-rejected']);
        }
        return true;
      }
      
      console.error('Error checking block status:', error);
      return false;
    }
  }

  isPendingApproval(): boolean {
    return this.getCurrentUser()?.registrationStatus === 'pending';
  }

  isRejected(): boolean {
    return this.getCurrentUser()?.registrationStatus === 'rejected';
  }

  isApproved(): boolean {
    const status = this.getCurrentUser()?.registrationStatus;
    return !status || status === 'approved';
  }

  private normalizeAccountStatusError(error: any): any {
    if (error.error?.isPendingApproval) {
      return {
        ...error,
        isPendingApproval: true,
        message: error.error?.message
      };
    }
    if (error.error?.isRejected) {
      return {
        ...error,
        isRejected: true,
        message: error.error?.message
      };
    }
    if (error.error?.isBlocked || error.status === 403) {
      return { ...error, isBlocked: true };
    }
    return error;
  }
  /**
   * Get stored authentication token
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Get current user data
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    return !!token && !!this.getCurrentUser();
  }

  /**
   * Check if current user is blocked
   */
  isBlocked(): boolean {
    const user = this.getCurrentUser();
    return user?.isBlocked === true;
  }

  /**
   * Store authentication token
   */
  private setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  /**
   * Store user data
   */
  private setUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  /**
   * Load user from storage on app initialization
   */
  private loadUserFromStorage(): void {
    const userData = localStorage.getItem(this.USER_KEY);
    if (userData) {
      try {
        const user = JSON.parse(userData);
        this.currentUserSubject.next(user);
        // Note: Block status check will be done in app.component.ts on initialization
        // to avoid blocking the constructor
      } catch (error) {
        console.error('Error parsing user data from storage:', error);
        this.clearStorage();
      }
    }
  }

  /**
   * Clear all stored authentication data
   */
  private clearStorage(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
  }

  /**
   * Clear session (token and user) without navigating.
   * Use when registration or another flow fails after partial auth so the user is not left logged in.
   */
  clearSession(): void {
    this.clearStorage();
  }

  /**
   * Update current user data (e.g., after profile update)
   */
  updateUser(user: Partial<User>): void {
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      const updatedUser = { ...currentUser, ...user };
      this.setUser(updatedUser);
    }
  }

  /**
   * Block user for device mismatch
   * Called when user confirms device mismatch on login
   */
  blockUserForDeviceMismatch(email: string, deviceId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/block-device-mismatch`, {
      email,
      deviceId
    }).pipe(
      catchError(error => {
        return throwError(() => this.handleError(error));
      })
    );
  }

  /**
   * Create penalty payment order
   * Creates Razorpay order for penalty payment
   */
  createPenaltyPaymentOrder(email: string, amount: number = 500): Observable<any> {
    return this.http.post(`${this.apiUrl}/penalty-payment-order`, {
      email,
      amount
    }).pipe(
      map((response: any) => response.data),
      catchError(error => {
        return throwError(() => this.handleError(error));
      })
    );
  }

  /**
   * Verify penalty payment
   * Verifies Razorpay payment and unblocks user
   */
  verifyPenaltyPayment(email: string, paymentData: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/verify-penalty-payment`, {
      email,
      ...paymentData
    }).pipe(
      catchError(error => {
        return throwError(() => this.handleError(error));
      })
    );
  }

  /**
   * Send WhatsApp OTP (for registration or login)
   */
  sendWhatsAppOtp(whatsapp: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/whatsapp/send-otp`, {
      whatsapp
    }).pipe(
      catchError(error => {
        return throwError(() => this.handleError(error));
      })
    );
  }

  /**
   * Resend WhatsApp OTP
   */
  resendWhatsAppOtp(whatsapp: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/whatsapp/resend-otp`, {
      whatsapp
    }).pipe(
      catchError(error => {
        return throwError(() => this.handleError(error));
      })
    );
  }

  /**
   * Verify WhatsApp OTP and log in
   */
  verifyWhatsAppOtp(whatsapp: string, otp: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/whatsapp/verify-otp`, {
      whatsapp,
      otp
    }).pipe(
      tap(response => {
        if (response.isBlocked || response.isDeviceMismatch) {
          return;
        }
        this.setToken(response.accessToken);
        this.setUser(response.user);
        this.currentUserSubject.next(response.user);
      }),
      catchError(error => {
        return throwError(() => this.handleError(error));
      })
    );
  }

  /**
   * Complete registration after OTP verification (fullName, email, password)
   * Requires auth; for users created via send-otp who only have whatsapp set
   */
  completeRegistrationAfterOtp(fullName: string, email: string, password: string): Observable<{ success: boolean; message?: string; data?: User }> {
    return this.http.post<{ success: boolean; message?: string; data?: User }>(`${this.apiUrl}/complete-registration`, {
      fullName,
      email,
      password
    }).pipe(
      tap(response => {
        if (response.data) {
          this.setUser(response.data);
          this.currentUserSubject.next(response.data);
        }
      }),
      catchError(error => {
        return throwError(() => this.handleError(error));
      })
    );
  }

  /**
   * Handle HTTP errors and return user-friendly messages
   */
  private handleError(error: any): any {
    if (error.status === 403) {
      const isDeviceMismatch = error.error?.isDeviceMismatch === true;
      if (error.error?.isPendingApproval) {
        return {
          ...error,
          message:
            error.error?.message ||
            'Your account is not approved yet. Please wait for admin approval.',
          isPendingApproval: true
        };
      }
      if (error.error?.isRejected) {
        return {
          ...error,
          message:
            error.error?.message ||
            'Your registration was not approved. Check your email for details.',
          isRejected: true
        };
      }
      const message = error.error?.message || 
        (isDeviceMismatch 
          ? 'Login failed. This account is registered to another device. Contact admin to reset device.'
          : 'Your account has been blocked. Contact admin.');
      return { 
        ...error, 
        message, 
        isBlocked: true,
        isDeviceMismatch 
      };
    }
    
    // Handle other errors with messages
    if (error.error?.message) {
      return { ...error, message: error.error.message };
    }
    
    if (error.status === 0) {
      return { ...error, message: 'Network error. Please check your connection and try again.' };
    }
    
    if (error.status === 400) {
      return { ...error, message: error.error?.message || 'Invalid request. Please check your input.' };
    }
    
    if (error.status === 401) {
      return { ...error, message: 'Authentication failed. Please login again.' };
    }
    
    if (error.status === 500) {
      return { ...error, message: 'Server error. Please try again later.' };
    }
    
    return { ...error, message: 'An unexpected error occurred. Please try again.' };
  }
}

