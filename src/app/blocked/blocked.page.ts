import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { trigger, transition, style, animate } from '@angular/animations';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';
import { firstValueFrom } from 'rxjs';

declare var Razorpay: any;

@Component({
  selector: 'app-blocked',
  templateUrl: './blocked.page.html',
  styleUrls: ['./blocked.page.scss'],
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
    trigger('pulse', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.8)' }),
        animate('800ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ opacity: 1, transform: 'scale(1)' }))
      ])
    ])
  ]
})
export class BlockedPage implements OnInit {
  penaltyAmount = 500; // Penalty amount in rupees
  isDeviceMismatch = false;
  blockMessage = 'Your account has been blocked. Contact admin.';
  userEmail: string | null = null; // Store email for payment
  isPayingPenalty = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private alertController: AlertController,
    private authService: AuthService,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) { }

  async ngOnInit() {
    // Check if blocked due to device mismatch from route state
    const navigation = this.router.getCurrentNavigation();
    this.isDeviceMismatch = navigation?.extras?.state?.['isDeviceMismatch'] === true;
    
    // Also check from history state (in case page is refreshed)
    if (!this.isDeviceMismatch && window.history.state?.isDeviceMismatch) {
      this.isDeviceMismatch = true;
    }
    
    // Store email from route state if available
    if (navigation?.extras?.state?.['email']) {
      this.userEmail = navigation.extras.state['email'];
    } else if (window.history.state?.email) {
      this.userEmail = window.history.state.email;
    }
    
    this.blockMessage = this.isDeviceMismatch 
      ? 'This account is registered to another device. Please contact admin to reset your device.'
      : 'Your account has been blocked by the admin. Contact admin for assistance.';
    
    // If device mismatch, allow unauthenticated access
    if (this.isDeviceMismatch && !this.authService.isAuthenticated()) {
      // User came from device mismatch - allow them to stay on blocked page
      return;
    }
    
    // For authenticated users, verify block status
    if (this.authService.isAuthenticated()) {
      const isBlocked = await this.authService.checkBlockStatus(true);
      if (!isBlocked) {
        // User is not blocked, redirect to home
        this.router.navigate(['/folder/home']);
        return;
      }
      // If isBlocked is true, user is confirmed blocked (checkBlockStatus already logged out)
    } else {
      // Not authenticated and not device mismatch - redirect to login
      this.router.navigate(['/login']);
      return;
    }
  }

  logout() {
    // Logout and redirect to login page
    this.authService.logout();
  }

  async payPenaltyAndAccess() {
    const alert = await this.alertController.create({
      header: 'Pay Penalty Fee',
      message: `You need to pay ₹${this.penaltyAmount} as penalty fee to unblock your account. Do you want to proceed with the payment?`,
      cssClass: 'custom-alert',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'alert-button-cancel'
        },
        {
          text: 'Pay ₹' + this.penaltyAmount,
          cssClass: 'alert-button-confirm',
          handler: async () => {
            // TODO: Implement payment logic
            await this.showPaymentSuccess();
          }
        }
      ]
    });

    await alert.present();
  }

  async showPaymentSuccess() {
    const alert = await this.alertController.create({
      header: 'Payment Successful',
      message: 'Your account has been unblocked. You can now access all features.',
      cssClass: 'custom-alert success-alert',
      buttons: [
        {
          text: 'OK',
          cssClass: 'alert-button-confirm',
          handler: () => {
            // TODO: Unblock account and redirect to home
            this.router.navigate(['/folder/home']);
          }
        }
      ]
    });

    await alert.present();
  }

  async payPenalty() {
    if (this.isPayingPenalty) return;
    
    // If email is not stored, prompt user to enter it
    if (!this.userEmail) {
      const email = await this.promptForEmail();
      if (!email) {
        // User cancelled or didn't provide email
        return;
      }
      this.userEmail = email;
    }
    
    this.isPayingPenalty = true;
    const loading = await this.loadingController.create({
      message: 'Preparing payment...',
      spinner: 'crescent'
    });
    await loading.present();
    
    try {
      // Create payment order
      const orderData = await firstValueFrom(
        this.authService.createPenaltyPaymentOrder(this.userEmail!, this.penaltyAmount)
      );
      
      await loading.dismiss();
      
      // Initialize Razorpay checkout
      const options = {
        key: environment.RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Magic Formula',
        description: `Penalty Payment - ₹${this.penaltyAmount}`,
        order_id: orderData.orderId,
        handler: async (response: any) => {
          await this.handlePenaltyPaymentSuccess(response);
        },
        modal: {
          ondismiss: () => {
            this.isPayingPenalty = false;
            this.showToast('Payment cancelled', 'warning');
          }
        }
      };
      
      const razorpay = new Razorpay(options);
      razorpay.on('payment.failed', (response: any) => {
        this.isPayingPenalty = false;
        this.showToast('Payment failed. Please try again.', 'danger');
        console.error('Payment failed:', response.error);
      });
      
      razorpay.open();
      
    } catch (error: any) {
      await loading.dismiss();
      this.isPayingPenalty = false;
      this.showToast(error?.message || 'Failed to initiate payment', 'danger');
      console.error('Error creating penalty payment order:', error);
    }
  }
  
  async handlePenaltyPaymentSuccess(response: any) {
    this.isPayingPenalty = false;
    const loading = await this.loadingController.create({
      message: 'Verifying payment...',
      spinner: 'crescent'
    });
    await loading.present();
    
    try {
      const paymentData = {
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature
      };
      
      await firstValueFrom(
        this.authService.verifyPenaltyPayment(this.userEmail!, paymentData)
      );
      
      await loading.dismiss();
      await this.showToast('Penalty paid successfully! Account unblocked.', 'success');
      
      // Navigate to login page
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 1500);
      
    } catch (error: any) {
      await loading.dismiss();
      this.showToast(error?.message || 'Payment verification failed', 'danger');
      console.error('Error verifying penalty payment:', error);
    }
  }
  
  async promptForEmail(): Promise<string | null> {
    return new Promise(async (resolve) => {
      const alert = await this.alertController.create({
        header: 'Enter Email',
        message: 'Please enter your email address to proceed with penalty payment.',
        inputs: [
          {
            name: 'email',
            type: 'email',
            placeholder: 'your.email@example.com',
            attributes: {
              required: true,
              autocomplete: 'email'
            }
          }
        ],
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel',
            handler: () => {
              resolve(null);
            }
          },
          {
            text: 'Continue',
            handler: (data) => {
              if (data.email && data.email.trim()) {
                resolve(data.email.trim());
              } else {
                this.showToast('Please enter a valid email address', 'warning');
                resolve(null);
              }
            }
          }
        ]
      });
      
      await alert.present();
    });
  }

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
