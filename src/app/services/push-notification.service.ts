import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { 
  PushNotifications, 
  Token, 
  PushNotificationSchema,
  ActionPerformed 
} from '@capacitor/push-notifications';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {
  
  constructor(
    private router: Router,
    private auth: Auth,
    private firestore: Firestore
  ) {}

  /**
   * Initialize push notifications
   * Call this method after user login
   */
  async initPushNotifications(): Promise<void> {
    // Only initialize on native platforms (iOS/Android)
    if (!Capacitor.isNativePlatform()) {
      console.log('Push notifications only work on native platforms');
      return;
    }

    // Request permission
    const permissionResult = await PushNotifications.requestPermissions();
    
    if (permissionResult.receive === 'granted') {
      // Register with Apple / Google to receive push notifications
      await PushNotifications.register();
      console.log('✅ Push notification registration successful');
    } else {
      console.log('❌ Push notification permission denied');
    }

    // Setup listeners
    this.setupPushNotificationListeners();
  }

  /**
   * Setup push notification listeners
   */
  private setupPushNotificationListeners(): void {
    // On successful registration, save the token
    PushNotifications.addListener('registration', async (token: Token) => {
      console.log('Push registration success, token:', token.value);
      await this.saveDeviceToken(token.value);
    });

    // Handle registration errors
    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Push registration error:', error);
    });

    // Show notification when app is in foreground
    PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        console.log('Push notification received:', notification);
        // You can show a local notification or update badge
      }
    );

    // Handle notification action (when user taps on notification)
    PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (notification: ActionPerformed) => {
        console.log('Push notification action performed:', notification);
        this.handleNotificationTap(notification);
      }
    );
  }

  /**
   * Save device token to Firestore for sending targeted notifications
   */
  private async saveDeviceToken(token: string): Promise<void> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return;

    try {
      await setDoc(
        doc(this.firestore, `users/${uid}/devices/current`),
        {
          token,
          platform: Capacitor.getPlatform(),
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
      console.log('✅ Device token saved to Firestore');
    } catch (error) {
      console.error('❌ Error saving device token:', error);
    }
  }

  /**
   * Handle notification tap - navigate to appropriate screen
   */
  private handleNotificationTap(notification: ActionPerformed): void {
    const data = notification.notification.data;
    
    if (data) {
      // Navigate based on notification type
      switch (data.type) {
        case 'event':
          this.router.navigate(['/home']);
          break;
        case 'approval':
          this.router.navigate(['/alumni-id-request']);
          break;
        case 'announcement':
          this.router.navigate(['/home']);
          break;
        default:
          this.router.navigate(['/notifications']);
      }
    } else {
      this.router.navigate(['/notifications']);
    }
  }

  /**
   * Get notification badges
   */
  async getBadgeCount(): Promise<number> {
    if (!Capacitor.isNativePlatform()) return 0;
    
    try {
      const result = await PushNotifications.getDeliveredNotifications();
      return result.notifications.length;
    } catch (error) {
      console.error('Error getting badge count:', error);
      return 0;
    }
  }

  /**
   * Remove all delivered notifications
   */
  async removeAllDeliveredNotifications(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    
    await PushNotifications.removeAllDeliveredNotifications();
    console.log('✅ All delivered notifications removed');
  }
}
