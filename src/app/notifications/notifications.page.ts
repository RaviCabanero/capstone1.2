import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { 
  Firestore, 
  collection, 
  query, 
  where, 
  orderBy, 
  collectionData, 
  doc,
  docData,
  updateDoc,
  deleteDoc,
  addDoc
} from '@angular/fire/firestore';
import { AlertController, ToastController, ModalController } from '@ionic/angular';
import { Observable, from } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { ConnectionRequestService } from '../services/connection-request.service';

export interface Notification {
  id?: string;
  userId: string;
  type: 'event' | 'announcement' | 'approval' | 'reminder' | 'general' | 'connection_request';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  data?: any; // Additional data like eventId, postId, requestId, etc.
}

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
  standalone: false,
})
export class NotificationsPage implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  upcomingEvents: any[] = [];
  loading = true;
  userProfile: any = {}; // Initialize with empty object
  userProfile$: Observable<any> | undefined;
  searchQuery: string = '';
  upcomingEventsUnsubscribe: any; // Store unsubscribe function for real-time listener

  constructor(
    private router: Router,
    private auth: Auth,
    private firestore: Firestore,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private modalCtrl: ModalController,
    private connectionRequestService: ConnectionRequestService
  ) {
  }

  ngOnInit() {
    this.loadUserProfile();
    this.loadNotifications();
    this.loadUpcomingEvents();
    
    // Safety timeout - ensure loading is set to false after 3 seconds regardless
    setTimeout(() => {
      if (this.loading) {
        console.warn('Loading timeout - forcing loading to false');
        this.loading = false;
      }
    }, 3000);
    
    // Retry loading profile after a short delay if auth wasn't ready
    setTimeout(() => {
      if (!this.userProfile?.photoDataUrl) {
        this.loadUserProfile();
      }
    }, 1000);
  }

  /**
   * Get current user ID for debugging
   */
  getCurrentUserId(): string {
    return this.auth.currentUser?.uid || 'Not authenticated';
  }

  /**
   * Debug: Check what's in Firestore
   */
  private debugCheckFirestore() {
    // Check notifications collection (all items)
    const allNotificationsQuery = query(collection(this.firestore, 'notifications'));
    collectionData(allNotificationsQuery, { idField: 'id' }).subscribe(
      (data: any[]) => {
        // Notifications loaded
      },
      (error) => {
        console.error('DEBUG: Error checking notifications:', error);
      }
    );

    // Check events collection
    const allEventsQuery = query(collection(this.firestore, 'events'));
    collectionData(allEventsQuery, { idField: 'id' }).subscribe(
      (data: any[]) => {
        // Events loaded
      },
      (error) => {
        console.error('DEBUG: Error checking events:', error);
      }
    );
  }

  /**
   * Load current user profile - Using RxJS Observable approach
   */
  loadUserProfile() {
    // Create an observable from auth state
    this.userProfile$ = from(
      new Promise<string>((resolve) => {
        onAuthStateChanged(this.auth, (user) => {
          if (user) {
            resolve(user.uid);
          } else {
            const currentUser = this.auth.currentUser;
            resolve(currentUser?.uid || '');
          }
        });
      })
    ).pipe(
      switchMap((uid: string) => {
        if (!uid) {
          return new Observable<any>(observer => observer.error('No UID'));
        }
        return docData(doc(this.firestore, `users`, uid));
      }),
      catchError((error) => {
        console.error('Error in profile loading:', error);
        return new Observable<any>(observer => observer.next({}));
      })
    );
    
    // Subscribe to the observable
    this.userProfile$?.subscribe(
      (profile: any) => {
        this.userProfile = profile;
      },
      (error: any) => {
        console.error('Error in subscription:', error);
      }
    );
  }

  /**
   * Cleanup on component destroy
   */
  ngOnDestroy() {
    // Unsubscribe from real-time event listener
    if (this.upcomingEventsUnsubscribe && typeof this.upcomingEventsUnsubscribe.unsubscribe === 'function') {
      this.upcomingEventsUnsubscribe.unsubscribe();
    }
  }

  /**
   * Load user notifications from Firestore
   */
  loadNotifications() {
    const uid = this.auth.currentUser?.uid;
    
    if (!uid) {
      // Wait for auth to be ready
      const unsubscribe = onAuthStateChanged(this.auth, (user) => {
        if (user) {
          unsubscribe();
          this.loadNotificationsForUser(user.uid);
        }
      });
      return;
    }

    this.loadNotificationsForUser(uid);
  }

  /**
   * Load notifications for a specific user
   */
  private loadNotificationsForUser(uid: string) {
    // Load all notifications (target: "all" means broadcast to everyone)
    const notificationsQuery = query(
      collection(this.firestore, 'notifications')
    );

    collectionData(notificationsQuery, { idField: 'id' }).subscribe(
      (notifications: any[]) => {
        // Filter notifications that are:
        // 1. Broadcast to all users (target: "all")
        // 2. OR specifically for this user (userId field matches)
        const userNotifications = notifications.filter(n => 
          n.target === 'all' || n.userId === uid
        );
        
        // Check for new notifications
        const previousNotifs = this.notifications || [];
        this.notifications = userNotifications.sort((a, b) => b.timestamp - a.timestamp);
        
        // If there are new notifications not in the previous list, trigger notification
        const newNotifications = this.notifications.filter(
          notif => !previousNotifs.find(p => p.id === notif.id)
        );
        
        if (newNotifications.length > 0) {
          // Trigger alert for first new notification
          this.playNotificationAlert(newNotifications[0]);
        }
        
        this.loading = false;
      },
      (error) => {
        console.error('Error loading notifications:', error);
        this.loading = false;
      }
    );
  }

  /**
   * Play notification alert with sound and vibration
   */
  private async playNotificationAlert(notification: Notification) {
    // Trigger haptic feedback
    await this.triggerNotificationHaptics();
    
    // Play notification sound
    await this.playNotificationSound();
  }

  /**
   * Load upcoming events from Firestore with real-time updates
   */
  loadUpcomingEvents() {
    const now = new Date().getTime();
    
    const eventsQuery = query(
      collection(this.firestore, 'events'),
      where('eventDate', '>=', now),
      orderBy('eventDate', 'asc')
    );

    // Use subscription for real-time updates
    const subscription = collectionData(eventsQuery, { idField: 'id' }).subscribe(
      (events: any[]) => {
        console.log('Upcoming events loaded:', events.length);
        
        // Check for new events compared to previously loaded events
        const previousEventIds = new Set(this.upcomingEvents.map(e => e.id));
        
        const newEvents = events.filter(e => !previousEventIds.has(e.id));
        
        // If there are new events, create notifications for them
        if (newEvents.length > 0) {
          console.log('New events detected:', newEvents.length);
          newEvents.forEach(event => {
            this.createEventNotification(event);
          });
        }

        // Limit to next 5 upcoming events and convert timestamps
        this.upcomingEvents = events.slice(0, 5).map(event => ({
          ...event,
          eventDate: event.eventDate && event.eventDate.toDate 
            ? event.eventDate.toDate() 
            : new Date(event.eventDate)
        }));
        
        // Set loading to false when events are loaded
        this.loading = false;
        console.log('Upcoming events processed:', this.upcomingEvents.length);
      },
      (error) => {
        console.error('Error loading upcoming events:', error);
        this.upcomingEvents = [];
        this.loading = false; // Set to false on error too
      }
    );

    // Store subscription for cleanup
    if (!this.upcomingEventsUnsubscribe) {
      this.upcomingEventsUnsubscribe = subscription;
    }
  }

  /**
   * Create a notification for a new event and send to all users
   */
  async createEventNotification(event: any) {
    try {
      const uid = this.auth.currentUser?.uid;
      if (!uid) return;

      // Create notification for current user
      const currentUserNotification: Notification = {
        userId: uid,
        type: 'event',
        title: `New Event: ${event.eventTitle}`,
        message: `${event.eventTitle} has been scheduled for ${new Date(event.eventDate).toLocaleDateString()}`,
        timestamp: new Date().getTime(),
        read: false,
        data: {
          eventId: event.id,
          eventTitle: event.eventTitle,
          eventDate: event.eventDate
        }
      };

      // Add notification to Firestore for current user
      await this.addNotificationToFirestore(currentUserNotification);
      
      // Send notifications to all other alumni users
      await this.broadcastEventNotificationToAllUsers(event);
      
      // Show toast notification with audio and vibration
      this.showNewEventToast(event.eventTitle);
      
      console.log('Event notification created and broadcasted:', event.eventTitle);
    } catch (error) {
      console.error('Error creating event notification:', error);
    }
  }

  /**
   * Broadcast event notification to all alumni users
   */
  private async broadcastEventNotificationToAllUsers(event: any) {
    try {
      // Get all users from the users collection
      const usersQuery = query(collection(this.firestore, 'users'));
      
      const usersSnapshot = await collectionData(usersQuery, { idField: 'id' }).toPromise();
      
      if (usersSnapshot && Array.isArray(usersSnapshot)) {
        // Send notification to each user (except the admin who created it)
        const currentUid = this.auth.currentUser?.uid;
        
        for (const user of usersSnapshot) {
          if (user.id !== currentUid) {
            const notification: Notification = {
              userId: user.id,
              type: 'event',
              title: `New Event: ${event.eventTitle}`,
              message: `${event.eventTitle} has been scheduled for ${new Date(event.eventDate).toLocaleDateString()}`,
              timestamp: new Date().getTime(),
              read: false,
              data: {
                eventId: event.id,
                eventTitle: event.eventTitle,
                eventDate: event.eventDate
              }
            };

            await this.addNotificationToFirestore(notification);
          }
        }
        
        console.log('Event notification sent to all users');
      }
    } catch (error) {
      console.error('Error broadcasting event notification:', error);
    }
  }

  /**
   * Show toast notification for new event with audio and vibration
   */
  async showNewEventToast(eventTitle: string) {
    // Trigger haptic feedback
    await this.triggerNotificationHaptics();
    
    // Play notification sound
    await this.playNotificationSound();

    const toast = await this.toastCtrl.create({
      message: `📅 New event: ${eventTitle}`,
      duration: 5000,
      position: 'top',
      color: 'success',
      buttons: [
        {
          text: 'View',
          role: 'cancel',
          handler: () => {
            // Scroll to events section
            const eventsSection = document.querySelector('.events-section');
            eventsSection?.scrollIntoView({ behavior: 'smooth' });
          }
        }
      ]
    });
    await toast.present();
  }

  /**
   * Trigger haptic feedback for notifications
   */
  private async triggerNotificationHaptics() {
    try {
      // Light haptic impact
      await Haptics.impact({ style: ImpactStyle.Light });
      
      // Add a small delay and another haptic
      setTimeout(async () => {
        await Haptics.impact({ style: ImpactStyle.Light });
      }, 100);
    } catch (error) {
      console.warn('Haptics not available:', error);
    }
  }

  /**
   * Play notification sound using Web Audio API
   */
  private async playNotificationSound() {
    this.playWebAudioNotification();
  }

  /**
   * Fallback: Play notification sound using Web Audio API
   */
  private playWebAudioNotification() {
    try {
      const audioContext = new (window as any).AudioContext() || new (window as any).webkitAudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Set frequency and duration for notification beep
      oscillator.frequency.value = 800; // Hz
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.warn('Web Audio API not available:', error);
    }
  }

  /**
   * Add notification to Firestore
   */
  private async addNotificationToFirestore(notification: Notification) {
    try {
      const uid = this.auth.currentUser?.uid;
      if (!uid) {
        console.warn('No user ID available for notification');
        return;
      }

      const notificationsCollection = collection(this.firestore, 'notifications');
      
      // Add notification with user ID
      const docData = {
        ...notification,
        userId: uid,
        createdAt: new Date().getTime()
      };

      const docRef = await addDoc(notificationsCollection, docData);
      console.log('Notification added to Firestore with ID:', docRef.id);
    } catch (error) {
      console.error('Error adding notification to Firestore:', error);
    }
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
      general: 'notifications',
      connection_request: 'person-add'
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
      general: 'medium',
      connection_request: 'success'
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

    // Navigate based on notification type
    switch (notification.type) {
      case 'event':
        // Just navigate to home
        this.router.navigate(['/home']);
        break;
      case 'approval':
        if (notification.data?.approvalType === 'alumni-id') {
          this.router.navigate(['/alumni-id-request']);
        }
        break;
      case 'announcement':
        this.router.navigate(['/home']);
        break;
      default:
        this.router.navigate(['/home']);
        break;
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
   * Accept a connection request
   */
  async acceptConnectionRequest(notification: Notification) {
    try {
      const requestId = notification.data?.requestId;
      if (!requestId) {
        throw new Error('Request ID not found');
      }

      // Accept the connection request
      await this.connectionRequestService.acceptConnectionRequest(requestId);

      // Mark notification as read
      if (!notification.read) {
        await this.markAsRead(notification);
      }

      // Show success toast
      const toast = await this.toastCtrl.create({
        message: 'Connection accepted!',
        duration: 2000,
        position: 'bottom',
        color: 'success'
      });
      await toast.present();

      // Delete the notification
      await this.deleteNotificationQuietly(notification.id);

    } catch (error) {
      console.error('Error accepting connection request:', error);
      const toast = await this.toastCtrl.create({
        message: 'Failed to accept connection request',
        duration: 2000,
        position: 'bottom',
        color: 'danger'
      });
      await toast.present();
    }
  }

  /**
   * Reject a connection request
   */
  async rejectConnectionRequest(notification: Notification) {
    try {
      const requestId = notification.data?.requestId;
      if (!requestId) {
        throw new Error('Request ID not found');
      }

      // Reject the connection request
      await this.connectionRequestService.rejectConnectionRequest(requestId);

      // Show confirmation toast
      const toast = await this.toastCtrl.create({
        message: 'Connection request declined',
        duration: 2000,
        position: 'bottom',
        color: 'warning'
      });
      await toast.present();

      // Delete the notification
      await this.deleteNotificationQuietly(notification.id);

    } catch (error) {
      console.error('Error rejecting connection request:', error);
      const toast = await this.toastCtrl.create({
        message: 'Failed to decline connection request',
        duration: 2000,
        position: 'bottom',
        color: 'danger'
      });
      await toast.present();
    }
  }

  /**
   * Delete notification without confirmation dialog
   */
  private async deleteNotificationQuietly(notificationId: string | undefined) {
    if (!notificationId) return;
    try {
      await deleteDoc(doc(this.firestore, `notifications/${notificationId}`));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }

  /**
   * Navigate to event details
   */
  navigateToEvent(event: any) {
    // Navigate to home page which displays all events
    this.router.navigate(['/home']);
  }

  /**
   * Navigate to profile
   */
  goToProfile() {
    this.router.navigate(['/profile']);
  }

  /**
   * Navigate to messages
   */
  goToMessages() {
    this.router.navigate(['/messages']);
  }

  /**
   * Search alumni
   */
  searchAlumni(event: any) {
    this.searchQuery = event.target.value.toLowerCase().trim();
    // Add search logic here if needed
  }

  /**
   * Handle image loading errors
   */
  handleImageError(event: any) {
    console.error('❌ Image loading error:', event);
    event.target.style.display = 'none';
  }

  /**
   * Open notification settings
   */
  openSettings() {
    // Navigate to settings or show a settings modal
    console.log('Opening notification settings');
    // You can add navigation or modal logic here
  }

  /**
   * Open post modal
   */
  openPostModal() {
    this.router.navigate(['/create-post']);
  }

  /**
   * Open menu
   */
  openMenu() {
    this.router.navigate(['/menu']);
  }

  /**
   * Check if there are unread notifications
   */
  hasUnreadNotifications(): boolean {
    return this.notifications.some(n => !n.read);
  }
}
