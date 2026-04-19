import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController, LoadingController } from '@ionic/angular';
import { trigger, transition, style, animate } from '@angular/animations';
import { AuthService, User } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { Subject, firstValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
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
    ])
  ]
})
export class ProfilePage implements OnInit, OnDestroy {
  userProfile: User | null = null;
  isLoading = false;
  defaultAvatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=profile';
  private destroy$ = new Subject<void>();
  private statusCheckInterval?: any;

  constructor(
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private authService: AuthService,
    private userService: UserService
  ) {}

  ngOnInit() {
    // Keep local profile in sync with any updates across the app
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.userProfile = user;
        // Start/stop status check based on device change request status
        this.updateStatusCheck();
      });
  }

  // Refresh profile whenever the view is about to enter
  ionViewWillEnter() {
    this.loadUserProfile();
  }

  ngOnDestroy() {
    this.stopStatusCheck();
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadUserProfile() {
    // Always fetch fresh data first (don't use cache for device change status)
    this.isLoading = true;
    try {
      const user = await firstValueFrom(this.userService.getUserProfile());
      this.userProfile = user;
      // Update auth service with fresh data
      this.authService.updateUser(user);
      // Update status check based on new data
      this.updateStatusCheck();
    } catch (error: any) {
      console.error('Error loading profile:', error);
      // Only use cache as fallback if fetch fails
      const cachedUser = this.authService.getCurrentUser();
      if (cachedUser) {
        this.userProfile = cachedUser;
        this.updateStatusCheck();
      } else {
        await this.showToast(error.message || 'Failed to load profile', 'danger');
        this.router.navigate(['/folder/home']);
      }
    } finally {
      this.isLoading = false;
    }
  }

  getProfilePicture(): string {
    if (this.userProfile?.profilePic) {
      return this.userProfile.profilePic;
    }
    return this.defaultAvatar;
  }

  navigateToEditProfile() {
    this.router.navigate(['/edit-profile']);
  }

  async requestDeviceChange() {
    // Check if request already pending
    if (this.userProfile?.deviceChangeRequested) {
      await this.showToast('Device change request is already pending. Please wait for admin approval.', 'warning');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Request Device Change',
      message: 'You will be logged out and blocked until the admin approves your device change request. Do you want to continue?',
      cssClass: 'custom-alert',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'alert-button-cancel'
        },
        {
          text: 'OK',
          cssClass: 'alert-button-confirm',
          handler: async () => {
            await this.submitDeviceChangeRequest();
          }
        }
      ]
    });

    await alert.present();
  }

  private async submitDeviceChangeRequest() {
    const loading = await this.loadingController.create({
      message: 'Submitting request...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const response = await firstValueFrom(this.userService.requestDeviceChange());
      
      loading.dismiss();
      
      if (response && response.success) {
        await this.showToast('Device change request submitted successfully', 'success');
        
        // Logout user after successful request
        setTimeout(() => {
          this.authService.logout();
        }, 1000); // Small delay to show success message
      } else {
        await this.showToast(response?.message || 'Failed to submit request', 'danger');
      }
    } catch (error: any) {
      loading.dismiss();
      const errorMessage = error?.message || 'Failed to submit device change request. Please try again.';
      await this.showToast(errorMessage, 'danger');
    }
  }

  /**
   * Start periodic status check if device change request is pending
   */
  private updateStatusCheck() {
    // Stop existing check
    this.stopStatusCheck();
    
    // Start new check if request is pending
    if (this.userProfile?.deviceChangeRequested) {
      this.startStatusCheck();
    }
  }

  /**
   * Start periodic check for device change request status
   * Checks every 30 seconds if request is pending
   */
  private startStatusCheck() {
    // Only check if request is pending
    if (!this.userProfile?.deviceChangeRequested) {
      return;
    }

    this.statusCheckInterval = setInterval(async () => {
      try {
        // Fetch fresh profile data
        const user = await firstValueFrom(this.userService.getUserProfile());
        
        // Check if status changed from pending to approved
        if (!user.deviceChangeRequested && this.userProfile?.deviceChangeRequested) {
          // Status changed - refresh profile and show success message
          await this.loadUserProfile();
          await this.showToast('Device change request approved! You can now login from a new device.', 'success');
          // Stop checking since request is no longer pending
          this.stopStatusCheck();
        } else if (user.deviceChangeRequested) {
          // Still pending - update profile with latest data
          this.userProfile = user;
          this.authService.updateUser(user);
        }
      } catch (error) {
        // Silently fail - don't interrupt user experience
        console.debug('Status check failed:', error);
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Stop periodic status check
   */
  private stopStatusCheck() {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
      this.statusCheckInterval = undefined;
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
}

