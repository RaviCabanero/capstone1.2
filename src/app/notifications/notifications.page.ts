import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { 
  Firestore, 
  collection, 
  query, 
  where, 
  orderBy, 
  collectionData, 
  doc, 
  updateDoc,
  deleteDoc 
} from '@angular/fire/firestore';
import { AlertController } from '@ionic/angular';

export interface Notification {
  id?: string;
  userId: string;
  type: 'event' | 'announcement' | 'approval' | 'reminder' | 'general';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  data?: any; // Additional data like eventId, postId, etc.
}

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
  standalone: false,
})
export class NotificationsPage implements OnInit {
  notifications: Notification[] = [];
  loading = true;

  constructor(
    private router: Router,
    private auth: Auth,
    private firestore: Firestore,
    private alertCtrl: AlertController
  ) {}

  ngOnInit() {
    this.loadNotifications();
  }

  /**
   * Load user notifications from Firestore
   */
  loadNotifications() {
    const uid = this.auth.currentUser?.uid;
    if (!uid) {
      this.loading = false;
      return;
    }

    const notificationsQuery = query(
      collection(this.firestore, 'notifications'),
      where('userId', '==', uid),
      orderBy('timestamp', 'desc')
    );

    collectionData(notificationsQuery, { idField: 'id' }).subscribe(
      (notifications: any[]) => {
        this.notifications = notifications;
        this.loading = false;
        console.log('Notifications loaded:', notifications.length);
      },
      (error) => {
        console.error('Error loading notifications:', error);
        this.loading = false;
      }
    );
  }

  /**
   * Get icon based on notification type
   */
  getNotificationIcon(type: string): string {
    const icons: { [key: string]: string } = {
      event: 'calendar',
      announcement: 'megaphone',
      approval: 'checkmark-circle',
      reminder: 'alarm',
      general: 'notifications'
    };
    return icons[type] || 'notifications';
  }

  /**
   * Get color based on notification type
   */
  getNotificationColor(type: string): string {
    const colors: { [key: string]: string } = {
      event: 'primary',
      announcement: 'warning',
      approval: 'success',
      reminder: 'tertiary',
      general: 'medium'
    };
    return colors[type] || 'medium';
  }

  /**
   * Handle notification click
   */
  async handleNotificationClick(notification: Notification) {
    // Mark as read
    if (!notification.read) {
      await this.markAsRead(notification);
    }

    // Navigate based on notification type and data
    if (notification.data) {
      switch (notification.type) {
        case 'event':
          if (notification.data.eventId) {
            this.router.navigate(['/home']); // Navigate to home where events are shown
          }
          break;
        case 'approval':
          if (notification.data.approvalType === 'alumni-id') {
            this.router.navigate(['/alumni-id-request']);
          }
          break;
        case 'announcement':
          this.router.navigate(['/home']);
          break;
        default:
          console.log('No specific action for this notification');
      }
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notification: Notification) {
    if (!notification.id) return;

    try {
      await updateDoc(doc(this.firestore, `notifications/${notification.id}`), {
        read: true
      });
      console.log('Notification marked as read');
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead() {
    const unreadNotifications = this.notifications.filter(n => !n.read);
    
    for (const notification of unreadNotifications) {
      if (notification.id) {
        try {
          await updateDoc(doc(this.firestore, `notifications/${notification.id}`), {
            read: true
          });
        } catch (error) {
          console.error('Error marking notification as read:', error);
        }
      }
    }
    
    console.log('All notifications marked as read');
  }

  /**
   * Delete notification
   */
  async deleteNotification(notification: Notification) {
    if (!notification.id) return;

    const alert = await this.alertCtrl.create({
      header: 'Delete Notification',
      message: 'Are you sure you want to delete this notification?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            try {
              await deleteDoc(doc(this.firestore, `notifications/${notification.id}`));
              console.log('Notification deleted');
            } catch (error) {
              console.error('Error deleting notification:', error);
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Check if there are unread notifications
   */
  hasUnreadNotifications(): boolean {
    return this.notifications.some(n => !n.read);
  }
}
