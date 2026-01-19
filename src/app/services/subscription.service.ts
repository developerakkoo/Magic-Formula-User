import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Plan {
  _id: string;
  title: string;
  description: string[];
  durationInMonths: 1 | 3 | 6 | 12;
  actualPrice: number;
  discountedPrice: number;
  showOfferBadge: boolean;
  offerText?: string;
  offerStartAt?: Date | string;
  offerEndAt?: Date | string;
  isActive: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface PlansResponse {
  success: boolean;
  data: Plan[];
}

export interface MySubscriptionResponse {
  success: boolean;
  message?: string;
  data: {
    planName: string;
    expiryDate: Date | string;
    daysLeft: number;
  } | null;
}

export interface SubscriptionOrderResponse {
  success: boolean;
  message: string;
  data: {
    orderId: string;
    amount: number;
    currency: string;
    planName: string;
  };
}

export interface PaymentVerificationRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  planId: string;
}

export interface PaymentVerificationResponse {
  success: boolean;
  message: string;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private readonly apiUrl = `${environment.API_URL}/api/subscriptions`;

  constructor(private http: HttpClient) {}

  /**
   * Get active plans (user view - only active plans with valid offers)
   */
  getActivePlans(): Observable<Plan[]> {
    return this.http.get<PlansResponse>(`${this.apiUrl}/plans`).pipe(
      map(response => response.data),
      catchError(error => {
        return throwError(() => this.handleError(error));
      })
    );
  }

  /**
   * Get current user's active subscription
   */
  getMySubscription(): Observable<MySubscriptionResponse['data']> {
    return this.http.get<MySubscriptionResponse>(`${this.apiUrl}/my-subscription`).pipe(
      map(response => response.data),
      catchError(error => {
        return throwError(() => this.handleError(error));
      })
    );
  }

  /**
   * Create Razorpay subscription order
   */
  createSubscriptionOrder(planId: string): Observable<SubscriptionOrderResponse['data']> {
    return this.http.post<SubscriptionOrderResponse>(`${this.apiUrl}/subscribe`, { planId }).pipe(
      map(response => response.data),
      catchError(error => {
        return throwError(() => this.handleError(error));
      })
    );
  }

  /**
   * Verify payment and activate subscription
   */
  verifyPayment(paymentData: PaymentVerificationRequest): Observable<PaymentVerificationResponse> {
    return this.http.post<PaymentVerificationResponse>(`${this.apiUrl}/verify-payment`, paymentData).pipe(
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
      return { ...error, message: 'Please login to view subscriptions.' };
    }
    
    if (error.status === 500) {
      return { ...error, message: 'Server error. Please try again later.' };
    }
    
    return { ...error, message: 'An unexpected error occurred. Please try again.' };
  }
}

