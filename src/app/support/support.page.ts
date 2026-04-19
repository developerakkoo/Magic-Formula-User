import { Component, OnInit } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-support',
  templateUrl: './support.page.html',
  styleUrls: ['./support.page.scss'],
  standalone: false,
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('600ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class SupportPage implements OnInit {
  email = 'support@moneycrafttrader.com';
  phone = '+91 7499240812';

  constructor() { }

  ngOnInit() {
  }

  openEmail() {
    window.location.href = `mailto:${this.email}`;
  }

  openPhone() {
    window.location.href = `tel:${this.phone}`;
  }
}

