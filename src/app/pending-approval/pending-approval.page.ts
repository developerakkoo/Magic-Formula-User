import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-pending-approval',
  templateUrl: './pending-approval.page.html',
  styleUrls: ['./pending-approval.page.scss'],
  standalone: false
})
export class PendingApprovalPage {
  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  goToLogin() {
    this.authService.clearSession();
    this.router.navigate(['/login']);
  }
}
