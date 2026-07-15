import {
  Component,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChildren
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';
import { ToastController, IonInput } from '@ionic/angular';
import { trigger, transition, style, animate } from '@angular/animations';
import { firstValueFrom } from 'rxjs';
import { UserService } from '../services/user.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: false,
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate(
          '600ms cubic-bezier(0.4, 0, 0.2, 1)',
          style({ opacity: 1, transform: 'translateY(0)' })
        )
      ])
    ]),
    trigger('fadeInScale', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.9)' }),
        animate(
          '500ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          style({ opacity: 1, transform: 'scale(1)' })
        )
      ])
    ])
  ]
})
export class ForgotPasswordPage implements OnInit, OnDestroy {
  @ViewChildren('otpInput') otpInputs!: QueryList<IonInput>;

  step: 1 | 2 = 1;
  emailForm: FormGroup;
  resetForm: FormGroup;
  isLoading = false;
  isResetting = false;
  isResending = false;
  pendingEmail = '';
  obscurePassword = true;
  obscureConfirmPassword = true;

  otpDigits: string[] = ['', '', '', '', '', ''];
  otpExpirySeconds = 600;
  resendCooldownSeconds = 0;
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private userService: UserService,
    private toastController: ToastController
  ) {
    this.emailForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]]
    });

    this.resetForm = this.formBuilder.group(
      {
        newPassword: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', [Validators.required]]
      },
      { validators: this.passwordsMatchValidator }
    );
  }

  ngOnInit() {}

  ngOnDestroy() {
    this.clearOtpTimers();
  }

  get maskedEmail(): string {
    const email = this.pendingEmail;
    const atIndex = email.indexOf('@');
    if (atIndex <= 1) {
      return email;
    }
    const local = email.slice(0, atIndex);
    const domain = email.slice(atIndex);
    const visible = local.slice(0, 2);
    return `${visible}${'*'.repeat(Math.max(local.length - 2, 1))}${domain}`;
  }

  passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  async handleSendOtp() {
    if (!this.emailForm.valid) {
      this.emailForm.get('email')?.markAsTouched();
      await this.showToast('Please enter a valid email address', 'warning');
      return;
    }

    const email = String(this.emailForm.get('email')?.value ?? '').trim();
    this.isLoading = true;

    try {
      const result = await firstValueFrom(
        this.userService.requestPasswordResetOtp(email)
      );

      this.pendingEmail = email.toLowerCase();
      this.step = 2;
      this.otpDigits = ['', '', '', '', '', ''];
      this.startOtpTimers();
      await this.showToast(
        result?.message || 'OTP sent to your email',
        'success'
      );
      setTimeout(() => this.focusOtpInput(0), 300);
    } catch (error: any) {
      await this.showToast(
        error?.message || 'Failed to send OTP. Please try again.',
        'danger'
      );
    } finally {
      this.isLoading = false;
    }
  }

  async handleResetPassword() {
    const otp = this.getOtpValue();

    if (otp.length !== 6) {
      await this.showToast('Please enter the 6-digit OTP', 'warning');
      return;
    }

    if (this.otpExpirySeconds <= 0) {
      await this.showToast('OTP expired. Please resend.', 'warning');
      return;
    }

    if (!this.resetForm.valid) {
      Object.keys(this.resetForm.controls).forEach(key => {
        this.resetForm.get(key)?.markAsTouched();
      });

      if (this.resetForm.hasError('passwordMismatch')) {
        await this.showToast('Passwords do not match', 'warning');
      } else {
        await this.showToast('Password must be at least 8 characters', 'warning');
      }
      return;
    }

    this.isResetting = true;

    try {
      const newPassword = this.resetForm.get('newPassword')?.value;
      const confirmPassword = this.resetForm.get('confirmPassword')?.value;

      const result = await firstValueFrom(
        this.userService.resetPasswordWithOtp({
          email: this.pendingEmail,
          otp,
          newPassword,
          confirmPassword
        })
      );

      this.clearOtpTimers();
      await this.showToast(
        result?.message || 'Password reset successfully',
        'success'
      );
      this.router.navigate(['/login']);
    } catch (error: any) {
      await this.showToast(
        error?.message || 'Failed to reset password. Please try again.',
        'danger'
      );
    } finally {
      this.isResetting = false;
    }
  }

  async resendOtp() {
    if (this.resendCooldownSeconds > 0 || !this.pendingEmail || this.isResending) {
      return;
    }

    this.isResending = true;

    try {
      const result = await firstValueFrom(
        this.userService.requestPasswordResetOtp(this.pendingEmail)
      );
      this.otpDigits = ['', '', '', '', '', ''];
      this.startOtpTimers();
      await this.showToast(result?.message || 'OTP resent to your email', 'success');
      setTimeout(() => this.focusOtpInput(0), 300);
    } catch (error: any) {
      await this.showToast(
        error?.message || 'Failed to resend OTP. Please try again.',
        'danger'
      );
    } finally {
      this.isResending = false;
    }
  }

  goBackToEmailStep() {
    this.step = 1;
    this.otpDigits = ['', '', '', '', '', ''];
    this.resetForm.reset();
    this.clearOtpTimers();
  }

  togglePasswordVisibility() {
    this.obscurePassword = !this.obscurePassword;
  }

  toggleConfirmPasswordVisibility() {
    this.obscureConfirmPassword = !this.obscureConfirmPassword;
  }

  startOtpTimers() {
    this.clearOtpTimers();
    this.otpExpirySeconds = 600;
    this.resendCooldownSeconds = 30;
    this.timerInterval = setInterval(() => {
      if (this.otpExpirySeconds > 0) {
        this.otpExpirySeconds--;
      }
      if (this.resendCooldownSeconds > 0) {
        this.resendCooldownSeconds--;
      }
    }, 1000);
  }

  clearOtpTimers() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  onOtpInput(index: number, event: Event | CustomEvent) {
    const ev = event as CustomEvent;
    const raw = (ev.detail?.value ??
      (event.target as HTMLInputElement)?.value ??
      '') as string;
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
    const pasted = (event.clipboardData?.getData('text') || '')
      .replace(/\D/g, '')
      .slice(0, 6);
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

  navigateToLogin() {
    this.router.navigate(['/login']);
  }

  goBack() {
    this.router.navigate(['/login']);
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
