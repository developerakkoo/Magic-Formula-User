import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-registration-rejected',
  templateUrl: './registration-rejected.page.html',
  styleUrls: ['./registration-rejected.page.scss'],
  standalone: false
})
export class RegistrationRejectedPage {
  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  registerAgain() {
    this.authService.clearSession();
    this.router.navigate(['/register']);
  }

  goToLogin() {
    this.authService.clearSession();
    this.router.navigate(['/login']);
  }
}
