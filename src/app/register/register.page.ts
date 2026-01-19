import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { AuthService } from '../services/auth.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
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
export class RegisterPage implements OnInit {
  registerForm: FormGroup;
  obscurePassword = true;
  isLoading = false;
  
  // Password requirements
  hasMinLength = false;
  hasUppercase = false;
  hasNumber = false;
  hasSymbol = false;
  requirementsMetCount = 0;
  passwordStrength = 0;
  
  // Avatar
  avatarUrl = '';

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private toastController: ToastController
  ) {
    this.registerForm = this.formBuilder.group({
      fullName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      mobile: ['', [Validators.pattern(/^[0-9]{10}$/)]], // Optional but must be 10 digits if provided
      password: ['', [Validators.required]],
    });
  }

  ngOnInit() {
    this.generateAvatar();
    
    // Listen to password changes
    this.registerForm.get('password')?.valueChanges.subscribe(() => {
      this.checkPasswordRequirements();
    });
  }

  generateAvatar() {
    const random = Math.floor(Math.random() * 10000);
    this.avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${random}`;
  }

  checkPasswordRequirements() {
    const password = this.registerForm.get('password')?.value || '';
    
    this.hasMinLength = password.length >= 8;
    this.hasUppercase = /[A-Z]/.test(password);
    this.hasNumber = /[0-9]/.test(password);
    this.hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    // Count requirements met
    this.requirementsMetCount = 0;
    if (this.hasMinLength) this.requirementsMetCount++;
    if (this.hasUppercase) this.requirementsMetCount++;
    if (this.hasNumber) this.requirementsMetCount++;
    if (this.hasSymbol) this.requirementsMetCount++;
    
    // Calculate progress based on password length (0-8 characters = 0-1.0)
    this.passwordStrength = Math.min(password.length / 8.0, 1.0);
  }

  getStrengthColor(): string {
    if (this.requirementsMetCount === 0) {
      return '#494949'; // Default gray
    } else if (this.requirementsMetCount === 1) {
      return '#FF5050'; // Red
    } else if (this.requirementsMetCount === 2) {
      return '#FFA500'; // Orange
    } else if (this.requirementsMetCount === 3) {
      return '#FF8C00'; // Light orange (deep orange)
    } else {
      return '#6CD84E'; // Green (primary)
    }
  }

  get allRequirementsMet(): boolean {
    return this.hasMinLength && this.hasUppercase && this.hasNumber && this.hasSymbol;
  }

  togglePasswordVisibility() {
    this.obscurePassword = !this.obscurePassword;
  }

  async handleRegister() {
    if (this.registerForm.valid && this.allRequirementsMet) {
      this.isLoading = true;
      
      const fullName = this.registerForm.get('fullName')?.value;
      const email = this.registerForm.get('email')?.value;
      const mobile = this.registerForm.get('mobile')?.value;
      const password = this.registerForm.get('password')?.value;

      try {
        const registerData: any = {
          email,
          password,
          fullName
        };
        
        // Add mobile if provided
        if (mobile && mobile.trim()) {
          registerData.mobile = mobile.trim();
        }

        const registerObservable = await this.authService.register(registerData);
        const response = await firstValueFrom(registerObservable);
        
        if (response) {
          // Check if user is blocked or device mismatch
          if (response.isBlocked || response.isDeviceMismatch) {
            this.router.navigate(['/blocked']);
            return;
          }

          // Show success message
          await this.showToast('Registration successful!', 'success');

          // Navigate to home screen
          this.router.navigate(['/folder/home']);
        }
      } catch (error: any) {
        console.error('Registration error:', error);
        
        // Handle blocked user or device mismatch
        if (error.isBlocked || error.isDeviceMismatch) {
          this.router.navigate(['/blocked']);
          return;
        }

        // Show error message
        const errorMessage = error.message || 'Registration failed. Please try again.';
        await this.showToast(errorMessage, 'danger');
      } finally {
        this.isLoading = false;
      }
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.registerForm.controls).forEach(key => {
        this.registerForm.get(key)?.markAsTouched();
      });
      if (!this.allRequirementsMet) {
        await this.showToast('Please meet all password requirements', 'warning');
      } else {
        await this.showToast('Please fill in all required fields', 'warning');
      }
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

  navigateToLogin() {
    console.log('Login link clicked');
    this.router.navigate(['/login']);
  }

  goBack() {
    this.router.navigate(['/login']);
  }
}
