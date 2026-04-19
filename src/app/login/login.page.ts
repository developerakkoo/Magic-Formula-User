import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastController, AlertController } from '@ionic/angular';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { Device } from '@capacitor/device';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { AuthService } from '../services/auth.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
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
    trigger('slideInRight', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-20px)' }),
        animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ]),
    trigger('staggerFadeIn', [
      transition(':enter', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger(100, [
            animate('500ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ])
  ]
})
export class LoginPage implements OnInit {
  loginForm: FormGroup;
  isLoading = false;
  obscurePassword = true;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private toastController: ToastController,
    private alertController: AlertController
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.email, Validators.required]],
      password: ['', [Validators.required, Validators.minLength(4)]],
    });
  }

  ngOnInit() {
  }

  togglePasswordVisibility() {
    this.obscurePassword = !this.obscurePassword;
  }

  async handleSignIn() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      
      const email = this.loginForm.get('email')?.value;
      const password = this.loginForm.get('password')?.value;

      try {
        // Debug: Fetch device ID and show toast
        try {
          const deviceInfo = await Device.getId();
          const deviceId = deviceInfo.identifier;
          if (deviceId) {
            await this.showToast(`Debug: Device ID: ${deviceId}`, 'warning');
          }
        } catch (deviceError) {
          console.error('Error fetching device ID for debug:', deviceError);
        }

        const loginObservable = await this.authService.login(email, password);
        const response = await firstValueFrom(loginObservable);
        
        if (response) {
          // Check if user is blocked
          if (response.isBlocked) {
            this.router.navigate(['/blocked']);
            return;
          }
          
          // Check for device mismatch - show warning alert
          if (response.isDeviceMismatch) {
            await this.showDeviceMismatchAlert();
            return;
          }

          // Show success message
          await this.showToast('Login successful!', 'success');

          // Navigate to home screen
          this.router.navigate(['/folder/Magic Formula']);
        }
      } catch (error: any) {
        console.error('Login error:', error);
        console.log('isDeviceMismatch:', error.isDeviceMismatch);
        console.log('isBlocked:', error.isBlocked);
        console.log('error.error:', error.error);
        console.log('error.status:', error.status);
        
        // Handle device mismatch - show warning alert first
        if (error.isDeviceMismatch) {
          await this.showDeviceMismatchAlert();
          return;
        }
        
        // Handle blocked user (admin blocking)
        if (error.isBlocked && !error.isDeviceMismatch) {
          this.router.navigate(['/blocked']);
          return;
        }

        // Show error message (only if not device mismatch)
        const errorMessage = error.message || 'Login failed. Please try again.';
        await this.showToast(errorMessage, 'danger');
      } finally {
        this.isLoading = false;
      }
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.loginForm.controls).forEach(key => {
        this.loginForm.get(key)?.markAsTouched();
      });
      await this.showToast('Please enter valid email and password', 'warning');
    }
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

  navigateToRegister() {
    console.log('Register link clicked');
    this.router.navigate(['/register']);
  }

  navigateToForgotPassword() {
    console.log('Forgot password link clicked');
    this.router.navigate(['/forgot-password']);
  }

  async openPrivacyPolicy() {
    const url = 'https://www.moneycrafttrader.com/privacy-policy';
    await this.openUrlInApp(url);
  }

  async openTermsAndConditions() {
    const url = 'https://www.moneycrafttrader.com/terms-and-conditions';
    await this.openUrlInApp(url);
  }

  private async openUrlInApp(url: string) {
    try {
      // Check if running on native platform
      if (Capacitor.isNativePlatform()) {
        // Use Capacitor Browser for native apps
        await Browser.open({
          url: url,
          presentationStyle: 'popover'
        });
      } else {
        // Use window.open for web platform
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Error opening URL:', error);
      // Fallback to window.open if Browser plugin fails
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  async showDeviceMismatchAlert() {
    const alert = await this.alertController.create({
      header: 'Device Mismatch Warning',
      message: 'You are trying to login from a different device. If you proceed, your account will be blocked and you will have to pay penalty charges. Do you want to continue?',
      cssClass: 'custom-alert',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'alert-button-cancel',
          handler: () => {
            // User cancelled - stay on login page
            this.showToast('Login cancelled. Please use your registered device.', 'warning');
          }
        },
        {
          text: 'Continue',
          cssClass: 'alert-button-confirm',
          handler: async () => {
            // Get device ID and email
            const email = this.loginForm.get('email')?.value;
            let deviceId: string;
            try {
              const deviceInfo = await Device.getId();
              deviceId = deviceInfo.identifier;
            } catch (error) {
              console.error('Error getting device ID:', error);
              // Still navigate to blocked page
              this.router.navigate(['/blocked'], {
                state: { isDeviceMismatch: true, email }
              });
              return;
            }
            
            // Block user in backend
            try {
              await firstValueFrom(
                this.authService.blockUserForDeviceMismatch(email, deviceId)
              );
            } catch (error) {
              console.error('Error blocking user:', error);
              // Still navigate to blocked page even if blocking fails
            }
            
            // Navigate to blocked page
            this.router.navigate(['/blocked'], {
              state: { isDeviceMismatch: true, email }
            });
          }
        }
      ]
    });

    await alert.present();
  }
}
