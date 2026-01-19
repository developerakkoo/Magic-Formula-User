import { Component, OnInit, OnDestroy } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { SubscriptionService, Plan, PaymentVerificationRequest } from '../services/subscription.service';
import { LoadingController, ToastController } from '@ionic/angular';
import { environment } from '../../environments/environment';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';

declare var Razorpay: any;

interface SubscriptionPlan {
  id: string;
  _id?: string;
  title: string;
  description: string;
  icon: string;
  duration: string;
  price: number;
  originalPrice?: number;
  features: string[];
  popular?: boolean;
  showOfferBadge?: boolean;
  offerText?: string;
  offerStartAt?: Date | string;
  offerEndAt?: Date | string;
}

interface ActiveSubscription {
  planId: string;
  planName: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'cancelled';
}

@Component({
  selector: 'app-subscriptions',
  templateUrl: './subscriptions.page.html',
  styleUrls: ['./subscriptions.page.scss'],
  standalone: false,
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('600ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('fadeInScale', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.9)' }),
        animate('500ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ opacity: 1, transform: 'scale(1)' }))
      ])
    ]),
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-20px)' }),
        animate('400ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ])
  ]
})
export class SubscriptionsPage implements OnInit, OnDestroy {
  activeSubscription: ActiveSubscription | null = null;
  plans: SubscriptionPlan[] = [];
  isLoading: boolean = false;
  isSubscribing: boolean = false;
  private countdownInterval: any;

  constructor(
    private subscriptionService: SubscriptionService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private authService: AuthService,
    private userService: UserService
  ) { }

  ngOnInit() {
    this.loadSubscriptionData();
    this.startCountdownTimer();
  }

  ngOnDestroy() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  loadSubscriptionData() {
    this.isLoading = true;
    
    // Load active plans
    this.subscriptionService.getActivePlans().subscribe({
      next: (plans) => {
        this.plans = this.mapPlansToUI(plans);
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        const errorMessage = error?.message || 'Failed to load subscription plans. Please try again.';
        this.presentToast(errorMessage, 'danger');
      }
    });

    // Load user's active subscription
    this.subscriptionService.getMySubscription().subscribe({
      next: (subscription) => {
        if (subscription) {
          this.activeSubscription = {
            planId: subscription.planName,
            planName: subscription.planName,
            startDate: '',
            endDate: subscription.expiryDate.toString(),
            status: 'active'
          };
        }
      },
      error: (error) => {
        // Silent fail for subscription check - user might not have one
        console.log('No active subscription');
      }
    });
  }

  mapPlansToUI(backendPlans: Plan[]): SubscriptionPlan[] {
    const iconMap: { [key: number]: string } = {
      1: 'calendar-outline',
      3: 'time-outline',
      6: 'trophy-outline',
      12: 'diamond-outline'
    };

    const durationMap: { [key: number]: string } = {
      1: '1 Month',
      3: '3 Months',
      6: '6 Months',
      12: '1 Year'
    };

    return backendPlans.map(plan => ({
      id: plan.durationInMonths.toString(),
      _id: plan._id,
      title: plan.title,
      description: plan.description?.[0] || '',
      icon: iconMap[plan.durationInMonths] || 'calendar-outline',
      duration: durationMap[plan.durationInMonths] || `${plan.durationInMonths} Months`,
      price: plan.discountedPrice,
      originalPrice: plan.actualPrice,
      features: plan.description || [],
      popular: false,
      showOfferBadge: plan.showOfferBadge,
      offerText: plan.offerText,
      offerStartAt: plan.offerStartAt,
      offerEndAt: plan.offerEndAt
    }));
  }

  isOfferActive(plan: SubscriptionPlan): boolean {
    if (!plan.showOfferBadge || !plan.offerStartAt || !plan.offerEndAt) {
      return false;
    }
    const now = new Date();
    const start = new Date(plan.offerStartAt);
    const end = new Date(plan.offerEndAt);
    return now >= start && now <= end;
  }

  getTimeRemaining(plan: SubscriptionPlan): string {
    if (!this.isOfferActive(plan) || !plan.offerEndAt) {
      return '';
    }

    const now = new Date();
    const end = new Date(plan.offerEndAt);
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) {
      return 'Expired';
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  startCountdownTimer() {
    // Update countdown every minute
    this.countdownInterval = setInterval(() => {
      // Trigger change detection for countdown updates
      this.plans = [...this.plans];
    }, 60000);
  }

  async presentToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color
    });
    toast.present();
  }

  async subscribeToPlan(planId: string) {
    if (this.isSubscribing) {
      return; // Prevent multiple simultaneous subscription attempts
    }

    this.isSubscribing = true;
    const loading = await this.loadingController.create({
      message: 'Preparing payment...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      // Step 1: Create Razorpay order
      const orderData = await firstValueFrom(
        this.subscriptionService.createSubscriptionOrder(planId)
      );

      await loading.dismiss();

      // Step 2: Initialize Razorpay checkout
      const options = {
        key: environment.RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Magic Formula',
        description: `Subscription for ${orderData.planName}`,
        order_id: orderData.orderId,
        handler: async (response: any) => {
          // Payment successful - verify payment
          await this.handlePaymentSuccess(response, planId);
        },
        prefill: {
          // You can prefill user details if available
        },
        theme: {
          color: '#0f1115'
        },
        modal: {
          ondismiss: () => {
            // User closed the payment modal
            this.isSubscribing = false;
            this.presentToast('Payment cancelled', 'warning');
          }
        }
      };

      const razorpay = new Razorpay(options);
      
      razorpay.on('payment.failed', (response: any) => {
        this.isSubscribing = false;
        this.presentToast('Payment failed. Please try again.', 'danger');
        console.error('Payment failed:', response.error);
      });

      razorpay.open();
      
    } catch (error: any) {
      await loading.dismiss();
      this.isSubscribing = false;
      const errorMessage = error?.message || 'Failed to initiate payment. Please try again.';
      this.presentToast(errorMessage, 'danger');
      console.error('Error creating subscription order:', error);
    }
  }

  async handlePaymentSuccess(response: any, planId: string) {
    this.isSubscribing = false;
    const loading = await this.loadingController.create({
      message: 'Verifying payment...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const paymentData: PaymentVerificationRequest = {
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
        planId: planId
      };

      const verificationResult = await firstValueFrom(
        this.subscriptionService.verifyPayment(paymentData)
      );

      await loading.dismiss();

      if (verificationResult.success) {
        this.presentToast('Subscription activated successfully!', 'success');
        
        // Refresh user data to update activePlan
        try {
          const updatedUser = await firstValueFrom(this.userService.getUserProfile());
          this.authService.updateUser(updatedUser);
        } catch (error) {
          console.error('Error refreshing user data:', error);
          // Non-critical error, continue anyway
        }
        
        // Reload subscription data to show active subscription
        await this.loadSubscriptionData();
        
        // Small delay to ensure UI updates
        setTimeout(() => {
          // Scroll to top to show active subscription card
          const content = document.querySelector('ion-content');
          if (content) {
            content.scrollToTop(300);
          }
        }, 500);
      } else {
        this.presentToast(verificationResult.message || 'Payment verification failed', 'danger');
      }
    } catch (error: any) {
      await loading.dismiss();
      const errorMessage = error?.message || 'Payment verification failed. Please contact support.';
      this.presentToast(errorMessage, 'danger');
      console.error('Error verifying payment:', error);
    }
  }

  getActivePlan() {
    if (!this.activeSubscription) return null;
    return this.plans.find(p => p.title === this.activeSubscription?.planName);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  calculateSavings(plan: SubscriptionPlan): number {
    if (!plan.originalPrice) return 0;
    return plan.originalPrice - plan.price;
  }
}
