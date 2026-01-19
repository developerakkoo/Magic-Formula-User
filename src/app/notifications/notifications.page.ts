import { Component, OnInit } from '@angular/core';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { NotificationService, Notification } from '../services/notification.service';
import { firstValueFrom } from 'rxjs';

// UI notification type for display
type UINotificationType = 'alert' | 'offer' | 'high-priority';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
  standalone: false,
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('600ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('slideOut', [
      transition(':leave', [
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ 
          opacity: 0, 
          transform: 'translateX(-100%)',
          height: 0,
          marginBottom: 0,
          paddingTop: 0,
          paddingBottom: 0
        }))
      ])
    ]),
    trigger('listAnimation', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger(100, [
            animate('400ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ])
  ]
})
export class NotificationsPage implements OnInit {
  notifications: Notification[] = [];
  isLoading = false;
  currentPage = 1;
  totalPages = 1;
  hasMore = false;

  constructor(private notificationService: NotificationService) { }

  ngOnInit() {
    this.loadNotifications();
  }

  ionViewWillEnter() {
    // Reload notifications when page is entered
    this.loadNotifications();
  }

  async loadNotifications() {
    this.isLoading = true;
    try {
      const response = await firstValueFrom(
        this.notificationService.getNotifications(this.currentPage, 20)
      );
      
      if (response.success) {
        this.notifications = response.data;
        this.currentPage = response.page;
        this.totalPages = response.totalPages;
        this.hasMore = this.currentPage < this.totalPages;
      }
    } catch (error: any) {
      console.error('Error loading notifications:', error);
      // Keep existing notifications on error
    } finally {
      this.isLoading = false;
    }
  }

  async loadMore() {
    if (this.hasMore && !this.isLoading) {
      this.currentPage++;
      try {
        const response = await firstValueFrom(
          this.notificationService.getNotifications(this.currentPage, 20)
        );
        
        if (response.success) {
          this.notifications = [...this.notifications, ...response.data];
          this.currentPage = response.page;
          this.totalPages = response.totalPages;
          this.hasMore = this.currentPage < this.totalPages;
        }
      } catch (error: any) {
        console.error('Error loading more notifications:', error);
        this.currentPage--; // Revert page increment on error
      }
    }
  }

  getTimeAgo(timestamp: Date | string): string {
    const now = new Date();
    const notificationDate = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const diffInMs = now.getTime() - notificationDate.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 60) {
      return `${diffInMinutes} min ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }
  }

  getNotificationType(backendType: string): UINotificationType {
    // Map backend types to UI types
    switch (backendType) {
      case 'INFO':
        return 'alert';
      case 'PROMOTION':
        return 'offer';
      case 'ALERT':
        return 'high-priority';
      default:
        return 'alert';
    }
  }

  getNotificationTypeLabel(type: string): string {
    // Return display label matching backend type names
    switch (type) {
      case 'INFO':
        return 'Info';
      case 'PROMOTION':
        return 'Promotion';
      case 'ALERT':
        return 'Alert';
      default:
        return 'Info';
    }
  }

  getNotificationIcon(type: string): string {
    const uiType = this.getNotificationType(type);
    switch (uiType) {
      case 'high-priority':
        return 'warning';
      case 'offer':
        return 'gift';
      case 'alert':
        return 'checkmark-circle';
      default:
        return 'notifications';
    }
  }

  getNotificationColor(type: string): string {
    const uiType = this.getNotificationType(type);
    switch (uiType) {
      case 'high-priority':
        return '#FF5050';
      case 'offer':
        return '#FFD700';
      case 'alert':
        return '#6CD84E';
      default:
        return '#6CD84E';
    }
  }

  getNotificationBgColor(type: string): string {
    const uiType = this.getNotificationType(type);
    switch (uiType) {
      case 'high-priority':
        return 'rgba(255, 80, 80, 0.1)';
      case 'offer':
        return 'rgba(255, 215, 0, 0.1)';
      case 'alert':
        return 'rgba(108, 216, 78, 0.1)';
      default:
        return 'rgba(108, 216, 78, 0.1)';
    }
  }

  async deleteNotification(notificationId: string) {
    try {
      await firstValueFrom(this.notificationService.deleteNotification(notificationId));
      // Remove from local array
      const index = this.notifications.findIndex(n => n._id === notificationId);
      if (index > -1) {
        this.notifications.splice(index, 1);
      }
    } catch (error: any) {
      console.error('Error deleting notification:', error);
    }
  }

  async clearAllNotifications() {
    try {
      await firstValueFrom(this.notificationService.clearAllNotifications());
      this.notifications = [];
    } catch (error: any) {
      console.error('Error clearing notifications:', error);
    }
  }

  async markAsRead(notification: Notification) {
    if (notification.read) {
      return; // Already read
    }

    try {
      await firstValueFrom(this.notificationService.markAsRead(notification._id));
      notification.read = true;
      notification.readAt = new Date();
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
    }
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  trackByNotificationId(index: number, notification: Notification): string {
    return notification._id;
  }
}
