import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { User } from './auth.service';

export interface UserProfileResponse {
  success: boolean;
  data: User;
}

export interface UpdateProfileRequest {
  fullName?: string;
  email?: string;
  mobile?: string;
  whatsapp?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface PasswordResetOtpResponse {
  success: boolean;
  message: string;
}

export interface ResetPasswordWithOtpRequest {
  email: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly apiUrl = `${environment.API_URL}/api/users`;

  constructor(private http: HttpClient) {}

  /**
   * Get current user profile from backend
   */
  getUserProfile(): Observable<User> {
    return this.http.get<UserProfileResponse>(`${this.apiUrl}/profile`).pipe(
      map(response => response.data),
      catchError(error => {
        return throwError(() => this.handleError(error));
      })
    );
  }

  /**
   * Update current user profile
   */
  updateUserProfile(profileData: UpdateProfileRequest): Observable<User> {
    return this.http.put<UserProfileResponse>(`${this.apiUrl}/profile`, profileData).pipe(
      map(response => response.data),
      catchError(error => {
        return throwError(() => this.handleError(error));
      })
    );
  }

  /**
   * Change user password
   */
  changePassword(passwordData: ChangePasswordRequest): Observable<any> {
    return this.http.put(`${this.apiUrl}/profile/password`, passwordData).pipe(
      catchError(error => {
        return throwError(() => this.handleError(error));
      })
    );
  }

  /**
   * Upload profile picture
   */
  uploadProfilePicture(file: File): Observable<{ profilePic: string }> {
    const formData = new FormData();
    formData.append('profilePic', file);

    return this.http.post<{ success: boolean; profilePic: string }>(`${this.apiUrl}/profile-pic`, formData).pipe(
      map(response => ({ profilePic: response.profilePic })),
      catchError(error => {
        return throwError(() => this.handleError(error));
      })
    );
  }

  /**
   * Request device change
   * Creates a device change request - user will be logged out until admin approves
   */
  requestDeviceChange(): Observable<any> {
    return this.http.post(`${this.apiUrl}/device-change-request`, {}).pipe(
      catchError(error => {
        return throwError(() => this.handleError(error));
      })
    );
  }

  /**
   * Request password reset OTP via email
   */
  requestPasswordResetOtp(email: string): Observable<PasswordResetOtpResponse> {
    const normalizedEmail = String(email || '').trim().toLowerCase();

    return this.http
      .post<PasswordResetOtpResponse>(`${this.apiUrl}/forgot-password/request-otp`, {
        email: normalizedEmail
      })
      .pipe(
        catchError(error => {
          return throwError(() => this.handleError(error));
        })
      );
  }

  /**
   * Reset password using email OTP
   */
  resetPasswordWithOtp(
    payload: ResetPasswordWithOtpRequest
  ): Observable<PasswordResetOtpResponse> {
    return this.http
      .post<PasswordResetOtpResponse>(`${this.apiUrl}/forgot-password/reset`, {
        email: String(payload.email || '').trim().toLowerCase(),
        otp: String(payload.otp || '').trim(),
        newPassword: payload.newPassword,
        confirmPassword: payload.confirmPassword
      })
      .pipe(
        catchError(error => {
          return throwError(() => this.handleError(error));
        })
      );
  }

  /**
   * Handle HTTP errors and return user-friendly messages
   */
  private handleError(error: any): any {
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
      return {
        ...error,
        message: error.error?.message || 'Authentication failed. Please login again.'
      };
    }

    if (error.status === 429) {
      return {
        ...error,
        message: error.error?.message || 'Please wait before requesting another OTP.'
      };
    }
    
    if (error.status === 403) {
      return { ...error, message: 'Access denied. Your account may be blocked.' };
    }
    
    if (error.status === 409) {
      return { ...error, message: error.error?.message || 'This email or mobile number is already in use.' };
    }
    
    if (error.status === 500) {
      return { ...error, message: 'Server error. Please try again later.' };
    }
    
    return { ...error, message: 'An unexpected error occurred. Please try again.' };
  }
}

