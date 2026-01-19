import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ToastController, LoadingController } from '@ionic/angular';
import { trigger, transition, style, animate } from '@angular/animations';
import { AuthService, User } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-edit-profile',
  templateUrl: './edit-profile.page.html',
  styleUrls: ['./edit-profile.page.scss'],
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
export class EditProfilePage implements OnInit {
  editProfileForm: FormGroup;
  avatarUrl = 'https://api.dicebear.com/7.x/avataaars/svg?seed=profile';
  isLoading = false;
  currentUser: User | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private authService: AuthService,
    private userService: UserService
  ) {
    this.editProfileForm = this.formBuilder.group({
      fullName: ['', [Validators.required]],
      email: [{ value: '', disabled: true }], // Read-only
      mobile: [{ value: '', disabled: true }], // Read-only (same as WhatsApp number)
      whatsapp: [{ value: '', disabled: true }], // Read-only
    });
  }

  async ngOnInit() {
    await this.loadUserData();
  }

  async loadUserData() {
    this.isLoading = true;
    try {
      // Get current user from auth service or fetch from backend
      this.currentUser = this.authService.getCurrentUser();
      if (!this.currentUser) {
        this.currentUser = await firstValueFrom(this.userService.getUserProfile());
        this.authService.updateUser(this.currentUser);
      }

      // Populate form with user data
      // Use patchValue with options to update disabled fields
      this.editProfileForm.patchValue({
        fullName: this.currentUser.fullName || ''
      }, { emitEvent: false });
      
      // Update disabled fields separately
      this.editProfileForm.get('email')?.setValue(this.currentUser.email || '', { emitEvent: false });
      this.editProfileForm.get('mobile')?.setValue(this.currentUser.mobile || '', { emitEvent: false });
      this.editProfileForm.get('whatsapp')?.setValue(this.currentUser.whatsapp || '', { emitEvent: false });

      // Set avatar URL
      if (this.currentUser.profilePic) {
        this.avatarUrl = this.currentUser.profilePic;
      } else {
        this.generateAvatar();
      }
    } catch (error: any) {
      console.error('Error loading user data:', error);
      await this.showToast(error.message || 'Failed to load user data', 'danger');
      this.router.navigate(['/profile']);
    } finally {
      this.isLoading = false;
    }
  }

  generateAvatar() {
    const random = Math.floor(Math.random() * 10000);
    this.avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${random}`;
  }

  async onSaveChanges() {
    if (this.editProfileForm.valid) {
      const loading = await this.loadingController.create({
        message: 'Saving changes...',
        spinner: 'crescent'
      });
      await loading.present();

      try {
        const formValue = this.editProfileForm.getRawValue(); // Use getRawValue() to get disabled field values
        const updatedUser = await firstValueFrom(
          this.userService.updateUserProfile({
            fullName: formValue.fullName
            // Email, mobile, and whatsapp are read-only, don't send them in update
          })
        );

        // Update auth service with new user data
        this.authService.updateUser(updatedUser);

        loading.dismiss();
        await this.showToast('Profile updated successfully', 'success');
        this.router.navigate(['/profile']);
      } catch (error: any) {
        loading.dismiss();
        console.error('Error updating profile:', error);
        await this.showToast(error.message || 'Failed to update profile', 'danger');
      }
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.editProfileForm.controls).forEach(key => {
        this.editProfileForm.get(key)?.markAsTouched();
      });
      await this.showToast('Please fill in all required fields correctly', 'warning');
    }
  }

  async onProfilePictureSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      await this.showToast('Please select an image file', 'danger');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      await this.showToast('Image size must be less than 5MB', 'danger');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Uploading profile picture...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const response = await firstValueFrom(this.userService.uploadProfilePicture(file));
      
      // Update avatar URL
      this.avatarUrl = response.profilePic;
      
      // Refresh user data
      const updatedUser = await firstValueFrom(this.userService.getUserProfile());
      this.authService.updateUser(updatedUser);

      loading.dismiss();
      await this.showToast('Profile picture updated successfully', 'success');
    } catch (error: any) {
      loading.dismiss();
      console.error('Error uploading profile picture:', error);
      await this.showToast(error.message || 'Failed to upload profile picture', 'danger');
    }
  }

  onCancel() {
    this.router.navigate(['/profile']);
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

