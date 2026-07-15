import { Component, OnInit, OnDestroy, ViewChildren, QueryList } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { IonInput } from '@ionic/angular';
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
export class RegisterPage implements OnInit, OnDestroy {
  @ViewChildren('otpInput') otpInputs!: QueryList<IonInput>;

  registerForm: FormGroup;
  obscurePassword = true;
  isLoading = false;

  // OTP modal state
  showOtpModal = false;
  otpSentAt: number | null = null;
  resendCooldownSeconds = 0;
  otpExpirySeconds = 300;
  isSendingOtp = false;
  isVerifyingOtp = false;
  otpDigits: string[] = ['', '', '', '', '', ''];
  pendingWhatsapp = '';
  pendingFullName = '';
  pendingEmail = '';
  pendingPassword = '';
  private timerInterval: ReturnType<typeof setInterval> | null = null;

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
      mobile: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]], // Required for WhatsApp OTP
      password: ['', [Validators.required]],
    });
  }

  ngOnInit() {
    this.generateAvatar();

    this.registerForm.get('password')?.valueChanges.subscribe(() => {
      this.checkPasswordRequirements();
    });
  }

  ngOnDestroy() {
    this.clearOtpTimers();
  }

  normalizeWhatsapp(mobile: string): string {
    const digits = String(mobile || '').replace(/\D/g, '');
    if (digits.length === 10 && !digits.startsWith('91')) {
      return '91' + digits;
    }
    return digits;
  }

  get maskedWhatsapp(): string {
    if (!this.pendingWhatsapp || this.pendingWhatsapp.length < 4) return '****';
    return '*'.repeat(this.pendingWhatsapp.length - 4) + this.pendingWhatsapp.slice(-4);
  }

  startOtpTimers() {
    this.clearOtpTimers();
    this.otpExpirySeconds = 300;
    this.resendCooldownSeconds = 30;
    this.timerInterval = setInterval(() => {
      if (this.otpExpirySeconds > 0) this.otpExpirySeconds--;
      if (this.resendCooldownSeconds > 0) this.resendCooldownSeconds--;
    }, 1000);
  }

  clearOtpTimers() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  closeOtpModal() {
    this.showOtpModal = false;
    this.otpDigits = ['', '', '', '', '', ''];
    this.clearOtpTimers();
    this.otpSentAt = null;
  }

  onOtpInput(index: number, event: Event | CustomEvent) {
    const ev = event as CustomEvent;
    const raw = (ev.detail?.value ?? (event.target as HTMLInputElement)?.value ?? '') as string;
    const value = raw.replace(/\D/g, '').slice(0, 1);
    this.otpDigits[index] = value;
    if (value && index < 5) {
      setTimeout(() => this.focusOtpInput(index + 1), 0);
    }
  }

  onOtpKeydown(index: number, event: Event) {
    const keyEvent = event as KeyboardEvent;
    if (keyEvent.key === 'Backspace' && !this.otpDigits[index] && index > 0) {
      this.otpDigits[index - 1] = '';
      setTimeout(() => this.focusOtpInput(index - 1), 0);
    }
  }

  onOtpPaste(event: ClipboardEvent) {
    event.preventDefault();
    const pasted = (event.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    for (let i = 0; i < 6; i++) {
      this.otpDigits[i] = pasted[i] || '';
    }
    const next = Math.min(pasted.length, 5);
    setTimeout(() => this.focusOtpInput(next), 0);
  }

  focusOtpInput(index: number) {
    const inputs = this.otpInputs?.toArray();
    if (inputs && inputs[index]) {
      inputs[index].setFocus();
    }
  }

  getOtpValue(): string {
    return this.otpDigits.join('');
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
    if (!this.registerForm.valid || !this.allRequirementsMet) {
      Object.keys(this.registerForm.controls).forEach(key => {
        this.registerForm.get(key)?.markAsTouched();
      });
      if (!this.allRequirementsMet) {
        await this.showToast('Please meet all password requirements', 'warning');
      } else {
        await this.showToast('Please fill in all required fields including WhatsApp number', 'warning');
      }
      return;
    }

    const fullName = this.registerForm.get('fullName')?.value?.trim() || '';
    const email = this.registerForm.get('email')?.value?.trim() || '';
    const mobile = this.registerForm.get('mobile')?.value?.trim() || '';
    const password = this.registerForm.get('password')?.value || '';

    const whatsapp = this.normalizeWhatsapp(mobile);
    if (whatsapp.length < 10) {
      await this.showToast('Valid WhatsApp number is required', 'danger');
      return;
    }

    this.isSendingOtp = true;
    try {
      const result = await firstValueFrom(this.authService.sendWhatsAppOtp(whatsapp));
      if (result?.success) {
        this.pendingWhatsapp = whatsapp;
        this.pendingFullName = fullName;
        this.pendingEmail = email;
        this.pendingPassword = password;
        this.showOtpModal = true;
        this.otpSentAt = Date.now();
        this.startOtpTimers();
        await this.showToast('OTP sent to your WhatsApp', 'success');
        setTimeout(() => this.focusOtpInput(0), 300);
      } else {
        await this.showToast(result?.message || 'Failed to send OTP', 'danger');
      }
    } catch (error: any) {
      if (error?.isBlocked || error?.isDeviceMismatch) {
        this.router.navigate(['/blocked']);
        return;
      }
      await this.showToast(error?.message || 'Failed to send OTP. Please try again.', 'danger');
    } finally {
      this.isSendingOtp = false;
    }
  }

  async resendOtp() {
    if (this.resendCooldownSeconds > 0 || !this.pendingWhatsapp) return;
    try {
      const result = await firstValueFrom(this.authService.resendWhatsAppOtp(this.pendingWhatsapp));
      if (result?.success) {
        this.resendCooldownSeconds = 30;
        this.otpExpirySeconds = 300;
        await this.showToast('OTP resent', 'success');
      } else {
        await this.showToast(result?.message || 'Failed to resend OTP', 'danger');
      }
    } catch (error: any) {
      await this.showToast(error?.message || 'Failed to resend OTP', 'danger');
    }
  }

  async verifyOtp() {
    const otp = this.getOtpValue();
    if (otp.length !== 6) return;
    if (this.otpExpirySeconds <= 0) {
      await this.showToast('OTP expired. Please resend.', 'warning');
      return;
    }

    this.isVerifyingOtp = true;
    try {
      const verifyObservable = await this.authService.verifyWhatsAppOtp(this.pendingWhatsapp, otp);
      await firstValueFrom(verifyObservable);

      await firstValueFrom(
        this.authService.completeRegistrationAfterOtp(this.pendingFullName, this.pendingEmail, this.pendingPassword)
      );

      this.closeOtpModal();
      this.authService.clearSession();
      await this.showToast('Registration submitted. Awaiting admin approval.', 'success');
      this.router.navigate(['/pending-approval']);
    } catch (error: any) {
      if (error?.isBlocked || error?.isDeviceMismatch) {
        this.closeOtpModal();
        this.router.navigate(['/blocked']);
        return;
      }
      if (error?.isPendingApproval) {
        this.closeOtpModal();
        this.authService.clearSession();
        this.router.navigate(['/pending-approval']);
        return;
      }
      this.authService.clearSession();
      const message = error?.message || (error?.error?.message) || 'Invalid OTP or registration failed. Please try again.';
      await this.showToast(message, 'danger');
    } finally {
      this.isVerifyingOtp = false;
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
