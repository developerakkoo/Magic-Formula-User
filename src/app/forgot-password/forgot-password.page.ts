import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
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
    ])
  ]
})
export class ForgotPasswordPage implements OnInit {
  forgotPasswordForm: FormGroup;
  isLoading = false;
  emailSent = false;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router
  ) {
    this.forgotPasswordForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  ngOnInit() {
  }

  async handleSendLink() {
    if (this.forgotPasswordForm.valid) {
      this.isLoading = true;
      const email = this.forgotPasswordForm.get('email')?.value;

      console.log('Forgot password request - Email:', email);

      // Simulate API call
      setTimeout(() => {
        this.isLoading = false;
        this.emailSent = true;
        console.log('Password reset link sent (mock)');
      }, 1500);
    } else {
      console.log('Email validation failed');
    }
  }

  navigateToLogin() {
    this.router.navigate(['/login']);
  }

  goBack() {
    this.router.navigate(['/login']);
  }
}
