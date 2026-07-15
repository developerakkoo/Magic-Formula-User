import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Platform, AlertController, MenuController } from '@ionic/angular';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { PrivacyScreen } from '@capacitor/privacy-screen';
import { AuthService } from './services/auth.service';
import { NotificationService } from './services/notification.service';
import { SubscriptionService } from './services/subscription.service';
import { BrowserHardeningService } from './services/browser-hardening.service';
import { Subject, interval, from, of } from 'rxjs';
import { takeUntil, switchMap, catchError, filter } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit, OnDestroy {
  public appPages = [
    { title: 'Magic Formula', url: '/folder/Magic Formula By Prashant Shinde', icon: 'calculator-outline' },
    { title: 'View Profile', url: '/profile', icon: 'person-outline' },
    { title: 'My Subscriptions', url: '/subscriptions', icon: 'card-outline' },
    { title: 'Notifications', url: '/notifications', icon: 'notifications-outline' },
    { title: 'Support', url: '/support', icon: 'help-circle-outline' },
    { title: "FAQ's", url: '/faq', icon: 'information-circle-outline' },
    { title: 'Company Policies', url: '/policies', icon: 'document-text-outline' },
  ];

  unreadCount = 0;
  subscriptionExpiryDays: number | null = null;
  showExpiryWarning = false;
  private destroy$ = new Subject<void>();

  private readonly publicPreLoginPaths = ['/login', '/register', '/forgot-password'];

  constructor(
    private platform: Platform,
    private menuController: MenuController,
    private router: Router,
    private authService: AuthService,
    private alertController: AlertController,
    private notificationService: NotificationService,
    private subscriptionService: SubscriptionService,
    private browserHardeningService: BrowserHardeningService
  ) {
    this.initializeApp();
  }

  initializeApp() {
    this.platform.ready().then(() => {
      this.platform.backButton.subscribeWithPriority(101, async () => {
        const path = window.location.pathname || '';
        if (path === '/' || path === '/folder/home' || path.startsWith('/folder/')) {
          this.presentExitConfirm();
        } else {
          window.history.back();
        }
      });
    });
  }

  async presentExitConfirm() {
    const alert = await this.alertController.create({
      header: 'Confirm Exit',
      message: 'Do you want to exit the app?',
      backdropDismiss: false,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          handler: () => {
            // Dismiss the alert and do nothing
          },
        },
        {
          text: 'Exit',
          handler: () => {
            App.exitApp();
          },
        },
      ],
    });

    await alert.present();
  }

  private pathWithoutQuery(url: string): string {
    return url.split('?')[0].split('#')[0];
  }

  private isPublicPreLoginPath(path: string): boolean {
    const p = this.pathWithoutQuery(path);
    return this.publicPreLoginPaths.some(
      (prefix) => p === prefix || p.startsWith(prefix + '/')
    );
  }

  private async syncMenuWithRoute(routerUrl: string): Promise<void> {
    const path = this.pathWithoutQuery(routerUrl);
    if (this.isPublicPreLoginPath(path)) {
      await this.menuController.enable(false);
      await this.menuController.close();
      return;
    }
    if (this.authService.isAuthenticated()) {
      await this.menuController.enable(true);
    } else {
      await this.menuController.enable(false);
      await this.menuController.close();
    }
  }

  async ngOnInit() {
    this.browserHardeningService.init(this.destroy$);

    // Enable privacy screen on native platforms (no screenshots, no screen recordings)
    if (Capacitor.isNativePlatform()) {
      PrivacyScreen.enable({
        android: { dimBackground: true, preventScreenshots: true, privacyModeOnActivityHidden: 'splash' },
        ios: { blurEffect: 'dark' }
      }).catch(err => console.warn('PrivacyScreen enable failed:', err));
    }

    // Check block status on app initialization if user is authenticated
    if (this.authService.isAuthenticated()) {
      await this.authService.checkBlockStatus();
      this.loadUnreadCount();
      this.loadSubscriptionExpiry();
      this.startNotificationPolling();
      this.startBlockStatusPolling();
      this.startActivityHeartbeat();
    }

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event) => {
        void this.syncMenuWithRoute(event.urlAfterRedirects);
      });

    void this.syncMenuWithRoute(this.router.url);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadUnreadCount() {
    if (!this.authService.isAuthenticated()) {
      this.unreadCount = 0;
      return;
    }

    try {
      this.unreadCount = await firstValueFrom(this.notificationService.getUnreadCount());
    } catch (error) {
      console.error('Error loading unread count:', error);
      this.unreadCount = 0;
    }
  }

  async loadSubscriptionExpiry() {
    if (!this.authService.isAuthenticated()) {
      this.showExpiryWarning = false;
      this.subscriptionExpiryDays = null;
      return;
    }

    try {
      const subscription = await firstValueFrom(
        this.subscriptionService.getMySubscription()
      );

      if (subscription?.expiryDate) {
        const now = new Date();
        const expiry = new Date(subscription.expiryDate);
        const diffTime = expiry.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        this.subscriptionExpiryDays = diffDays;
        // Show warning only when subscription expires in 7 days or less
        this.showExpiryWarning = diffDays > 0 && diffDays <= 7;
      } else {
        this.showExpiryWarning = false;
        this.subscriptionExpiryDays = null;
      }
    } catch (error) {
      console.error('Error loading subscription expiry:', error);
      this.showExpiryWarning = false;
      this.subscriptionExpiryDays = null;
    }
  }

  startNotificationPolling() {
    // Poll for new notifications every 30 seconds
    interval(30000)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => {
          if (this.authService.isAuthenticated()) {
            return this.notificationService.getUnreadCount();
          }
          return [];
        })
      )
      .subscribe({
        next: (count) => {
          this.unreadCount = count;
        },
        error: (error) => {
          console.error('Error polling notifications:', error);
        }
      });
  }

  startBlockStatusPolling() {
    // Poll block status every 5 seconds (frequent polling for immediate logout)
    interval(5000)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => {
          if (this.authService.isAuthenticated()) {
            // Return observable that checks block status
            return from(this.authService.checkBlockStatus(true)).pipe(
              catchError(error => {
                // If error indicates blocked, return true
                if (error?.isBlocked || error?.status === 403) {
                  return of(true);
                }
                return of(false);
              })
            );
          }
          return of(null);
        })
      )
      .subscribe({
        next: (isBlocked) => {
          if (isBlocked) {
            // User is blocked - checkBlockStatus already logged out
            console.log('User blocked - logged out automatically via polling');
          }
        },
        error: (error) => {
          console.error('Error polling block status:', error);
        }
      });
  }

  startActivityHeartbeat() {
    // Send activity heartbeat every 2 minutes (120 seconds) to track live users
    // This ensures users are marked as "live" if they're actively using the app
    interval(120000) // 2 minutes
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => {
          if (this.authService.isAuthenticated()) {
            return this.authService.updateUserActivity().pipe(
              catchError(error => {
                // Silently fail - don't interrupt user experience
                console.debug('Activity heartbeat failed:', error);
                return of(null);
              })
            );
          }
          return of(null);
        })
      )
      .subscribe({
        next: () => {
          // Activity updated successfully
          console.debug('Activity heartbeat sent');
        },
        error: (error) => {
          console.debug('Error in activity heartbeat:', error);
        }
      });
  }

  async onLogout() {
    const alert = await this.alertController.create({
      header: 'Confirm Logout',
      message: 'Are you sure you want to logout?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'alert-button-cancel'
        },
        {
          text: 'Logout',
          cssClass: 'alert-button-confirm',
          handler: () => {
            this.menuController.close();
            this.authService.logout();
          }
        }
      ]
    });

    await alert.present();
  }
}
