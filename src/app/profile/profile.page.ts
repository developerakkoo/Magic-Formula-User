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
      });
  }

  // Refresh profile whenever the view is about to enter
  ionViewWillEnter() {
    this.loadUserProfile();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadUserProfile() {
    // First try to get from cached user data
    const cachedUser = this.authService.getCurrentUser();
    if (cachedUser) {
      this.userProfile = cachedUser;
    }

    // Then fetch fresh data from backend
    this.isLoading = true;
    try {
      const user = await firstValueFrom(this.userService.getUserProfile());
      this.userProfile = user;
      // Update auth service with fresh data
      this.authService.updateUser(user);
    } catch (error: any) {
      console.error('Error loading profile:', error);
      // If backend fails but we have cached data, use that
      if (!this.userProfile) {
        await this.showToast(error.message || 'Failed to load profile', 'danger');
        this.router.navigate(['/folder/home']);
      } else {
        await this.showToast('Using cached profile data', 'warning');
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
    const alert = await this.alertController.create({
      header: 'Request Device Change',
      message: 'To change your device, please contact the admin. They will reset your device restriction, allowing you to login from a new device.',
      cssClass: 'custom-alert',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'alert-button-cancel'
        },
        {
          text: 'OK',
          cssClass: 'alert-button-confirm'
        }
      ]
    });

    await alert.present();
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

