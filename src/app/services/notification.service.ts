import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Notification {
  _id: string;
  title: string;
  message: string;
  type: 'INFO' | 'PROMOTION' | 'ALERT';
  read: boolean;
  readAt?: Date | null;
  createdAt: Date;
}

export interface NotificationsResponse {
  success: boolean;
  count: number;
  page: number;
  totalPages: number;
  data: Notification[];
}

export interface UnreadCountResponse {
  success: boolean;
  count: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly apiUrl = `${environment.API_URL}/api/users`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  /**
   * Get user's notifications (paginated)
   */
  getNotifications(page: number = 1, limit: number = 20): Observable<NotificationsResponse> {
    return this.http.get<NotificationsResponse>(`${this.apiUrl}/notifications`, {
      params: {
        page: page.toString(),
        limit: limit.toString()
      }
    }).pipe(
      catchError(error => {
        return throwError(() => this.handleError(error));
      })
    );
  }

  /**
   * Get unread notification count
   */
  getUnreadCount(): Observable<number> {
    return this.http.get<UnreadCountResponse>(`${this.apiUrl}/notifications/unread-count`).pipe(
      map(response => response.count),
      catchError(error => {
        return throwError(() => this.handleError(error));
      })
    );
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/notifications/${notificationId}/read`, {}).pipe(
      catchError(error => {
        return throwError(() => this.handleError(error));
      })
    );
  }

  /**
   * Delete notification
   */
  deleteNotification(notificationId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/notifications/${notificationId}`).pipe(
      catchError(error => {
        return throwError(() => this.handleError(error));
      })
    );
  }

  /**
   * Clear all notifications
   */
  clearAllNotifications(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/notifications`).pipe(
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
    
    if (error.status === 401) {
      return { ...error, message: 'Please login to view notifications.' };
    }
    
    if (error.status === 404) {
      return { ...error, message: 'Notification not found.' };
    }
    
    if (error.status === 500) {
      return { ...error, message: 'Server error. Please try again later.' };
    }
    
    return { ...error, message: 'An unexpected error occurred. Please try again.' };
  }
}

