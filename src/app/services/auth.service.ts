import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { Device } from '@capacitor/device';
import { environment } from '../../environments/environment';

export interface User {
  _id: string;
  mobile: string;
  fullName?: string;
  email?: string;
  whatsapp?: string;
  firebaseToken?: string;
  isBlocked: boolean;
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

  /**
   * Login with email and password
   * Automatically includes device ID from Capacitor Device API (required)
   */
  async login(email: string, password: string): Promise<Observable<LoginResponse>> {
    // Get device ID before making login request (required)
    let deviceId: string;
    try {
      const deviceInfo = await Device.getId();
      deviceId = deviceInfo.identifier;
      if (!deviceId) {
        throw new Error('Device ID is not available');
      }
    } catch (error) {
      console.error('Error getting device ID:', error);
      // Device ID is required - throw error
      return throwError(() => ({
        message: 'Unable to get device ID. Please ensure the app has proper permissions and try again.',
        status: 0
      }));
    }

    const loginData: LoginRequest = {
      email,
      password,
      deviceId
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
   * Automatically includes device ID from Capacitor Device API (required)
   */
  async register(registerData: RegisterRequest): Promise<Observable<LoginResponse>> {
    // Get device ID before making register request (required)
    let deviceId: string;
    try {
      const deviceInfo = await Device.getId();
      deviceId = deviceInfo.identifier;
      if (!deviceId) {
        throw new Error('Device ID is not available');
      }
    } catch (error) {
      console.error('Error getting device ID:', error);
      // Device ID is required - throw error
      return throwError(() => ({
        message: 'Unable to get device ID. Please ensure the app has proper permissions and try again.',
        status: 0
      }));
    }
    
    // Add deviceId to register data
    registerData.deviceId = deviceId;

    return this.http.post<LoginResponse>(`${this.apiUrl}/register`, registerData).pipe(
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
   * Check block status with backend
   * If user is blocked, logs them out and redirects to blocked page
   * @param skipNavigation - If true, skip navigation (useful when already on blocked page)
   * @returns true if user is blocked, false otherwise
   */
  async checkBlockStatus(skipNavigation: boolean = false): Promise<boolean> {
    const token = this.getToken();
    
    // Only check if user has a token (is authenticated)
    if (!token) {
      return false;
    }

    try {
      const user = await firstValueFrom(
        this.http.get<{ success: boolean; data: User }>(`${environment.API_URL}/api/users/profile`).pipe(
          map(response => response.data),
          catchError(error => {
            // If error is 401 or 403, user is likely blocked or unauthorized
            if (error.status === 401 || error.status === 403) {
              return throwError(() => ({ ...error, isBlocked: true }));
            }
            // For other errors (network, etc.), don't block the app
            return throwError(() => error);
          })
        )
      );

      // Update user data with fresh data from backend
      this.setUser(user);

      // Check if user is blocked
      if (user.isBlocked) {
        // User is blocked - logout
        this.clearStorage();
        // Only navigate if not already on blocked page
        if (!skipNavigation) {
          this.router.navigate(['/blocked']);
        }
        return true;
      }

      return false;
    } catch (error: any) {
      // If error indicates blocked status, handle it
      if (error?.isBlocked || error?.status === 403) {
        this.clearStorage();
        // Only navigate if not already on blocked page
        if (!skipNavigation) {
          this.router.navigate(['/blocked']);
        }
        return true;
      }
      
      // For other errors (network issues, etc.), don't block the app
      // Just log the error and continue
      console.error('Error checking block status:', error);
      return false;
    }
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
   * Uses device ID from Capacitor Device API
   */
  async verifyWhatsAppOtp(whatsapp: string, otp: string): Promise<Observable<LoginResponse>> {
    let deviceId: string;
    try {
      const deviceInfo = await Device.getId();
      deviceId = deviceInfo.identifier;
      if (!deviceId) {
        throw new Error('Device ID is not available');
      }
    } catch (error) {
      return throwError(() => ({
        message: 'Unable to get device ID. Please ensure the app has proper permissions and try again.',
        status: 0
      }));
    }

    return this.http.post<LoginResponse>(`${this.apiUrl}/whatsapp/verify-otp`, {
      whatsapp,
      otp,
      deviceId
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
    // Handle 403 errors first (device mismatch or blocked) - must check before early return
    if (error.status === 403) {
      const isDeviceMismatch = error.error?.isDeviceMismatch === true;
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

