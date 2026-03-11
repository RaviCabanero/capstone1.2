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

 
  getCurrentUserId(): string {
    return this.auth.currentUser?.uid || 'Not authenticated';
  }

  
  private debugCheckFirestore() {
    
    const allNotificationsQuery = query(collection(this.firestore, 'notifications'));
    collectionData(allNotificationsQuery, { idField: 'id' }).subscribe(
      (data: any[]) => {
        
      },
      (error) => {
        console.error('DEBUG: Error checking notifications:', error);
      }
    );

    
    const allEventsQuery = query(collection(this.firestore, 'events'));
    collectionData(allEventsQuery, { idField: 'id' }).subscribe(
      (data: any[]) => {
        
      },
      (error) => {
        console.error('DEBUG: Error checking events:', error);
      }
    );
  }

  
  loadUserProfile() {
    
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
    
   
    this.userProfile$?.subscribe(
      (profile: any) => {
        this.userProfile = profile;
      },
      (error: any) => {
        console.error('Error in subscription:', error);
      }
    );
  }

  
  ngOnDestroy() {
    
    if (this.upcomingEventsUnsubscribe && typeof this.upcomingEventsUnsubscribe.unsubscribe === 'function') {
      this.upcomingEventsUnsubscribe.unsubscribe();
    }
  }

 
  loadNotifications() {
    const uid = this.auth.currentUser?.uid;
    
    if (!uid) {
     
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

  private loadNotificationsForUser(uid: string) {
    
    const notificationsQuery = query(
      collection(this.firestore, 'notifications')
    );

    collectionData(notificationsQuery, { idField: 'id' }).subscribe(
      (notifications: any[]) => {
        
        const userNotifications = notifications.filter(n => 
          n.target === 'all' || n.userId === uid
        );
        
        
        const previousNotifs = this.notifications || [];
        this.notifications = userNotifications.sort((a, b) => b.timestamp - a.timestamp);
        
        
        const newNotifications = this.notifications.filter(
          notif => !previousNotifs.find(p => p.id === notif.id)
        );
        
        if (newNotifications.length > 0) {
         
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

  
  private async playNotificationAlert(notification: Notification) {
    
    await this.triggerNotificationHaptics();
    
   
    await this.playNotificationSound();
  }

  
  loadUpcomingEvents() {
    const now = new Date().getTime();
    
    const eventsQuery = query(
      collection(this.firestore, 'events'),
      where('eventDate', '>=', now),
      orderBy('eventDate', 'asc')
    );

    
    const subscription = collectionData(eventsQuery, { idField: 'id' }).subscribe(
      (events: any[]) => {
        console.log('Upcoming events loaded:', events.length);
        
        
        const previousEventIds = new Set(this.upcomingEvents.map(e => e.id));
        
        const newEvents = events.filter(e => !previousEventIds.has(e.id));
        
       
        if (newEvents.length > 0) {
          console.log('New events detected:', newEvents.length);
          newEvents.forEach(event => {
            this.createEventNotification(event);
          });
        }

        
        this.upcomingEvents = events.slice(0, 5).map(event => ({
          ...event,
          eventDate: event.eventDate && event.eventDate.toDate 
            ? event.eventDate.toDate() 
            : new Date(event.eventDate)
        }));
        
        
        this.loading = false;
        console.log('Upcoming events processed:', this.upcomingEvents.length);
      },
      (error) => {
        console.error('Error loading upcoming events:', error);
        this.upcomingEvents = [];
        this.loading = false; 
      }
    );

    
    if (!this.upcomingEventsUnsubscribe) {
      this.upcomingEventsUnsubscribe = subscription;
    }
  }

  
  async createEventNotification(event: any) {
    try {
      const uid = this.auth.currentUser?.uid;
      if (!uid) return;

      
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

      await this.addNotificationToFirestore(currentUserNotification);
      
      await this.broadcastEventNotificationToAllUsers(event);
      
      
      this.showNewEventToast(event.eventTitle);
      
      console.log('Event notification created and broadcasted:', event.eventTitle);
    } catch (error) {
      console.error('Error creating event notification:', error);
    }
  }

  private async broadcastEventNotificationToAllUsers(event: any) {
    try {
     
      const usersQuery = query(collection(this.firestore, 'users'));
      
      const usersSnapshot = await collectionData(usersQuery, { idField: 'id' }).toPromise();
      
      if (usersSnapshot && Array.isArray(usersSnapshot)) {
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

  
  async showNewEventToast(eventTitle: string) {
    await this.triggerNotificationHaptics();
    
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
            const eventsSection = document.querySelector('.events-section');
            eventsSection?.scrollIntoView({ behavior: 'smooth' });
          }
        }
      ]
    });
    await toast.present();
  }

  
  private async triggerNotificationHaptics() {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
      
      setTimeout(async () => {
        await Haptics.impact({ style: ImpactStyle.Light });
      }, 100);
    } catch (error) {
      console.warn('Haptics not available:', error);
    }
  }

  
  private async playNotificationSound() {
    this.playWebAudioNotification();
  }

  private playWebAudioNotification() {
    try {
      const audioContext = new (window as any).AudioContext() || new (window as any).webkitAudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

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

  
  private async addNotificationToFirestore(notification: Notification) {
    try {
      const uid = this.auth.currentUser?.uid;
      if (!uid) {
        console.warn('No user ID available for notification');
        return;
      }

      const notificationsCollection = collection(this.firestore, 'notifications');
      
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

  
  async handleNotificationClick(notification: Notification) {
    
    if (!notification.read) {
      await this.markAsRead(notification);
    }

    switch (notification.type) {
      case 'event':
       
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

  async acceptConnectionRequest(notification: Notification) {
    try {
      const requestId = notification.data?.requestId;
      if (!requestId) {
        throw new Error('Request ID not found');
      }

      await this.connectionRequestService.acceptConnectionRequest(requestId);

      if (!notification.read) {
        await this.markAsRead(notification);
      }

      const toast = await this.toastCtrl.create({
        message: 'Connection accepted!',
        duration: 2000,
        position: 'bottom',
        color: 'success'
      });
      await toast.present();

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

  async rejectConnectionRequest(notification: Notification) {
    try {
      const requestId = notification.data?.requestId;
      if (!requestId) {
        throw new Error('Request ID not found');
      }

      await this.connectionRequestService.rejectConnectionRequest(requestId);

      const toast = await this.toastCtrl.create({
        message: 'Connection request declined',
        duration: 2000,
        position: 'bottom',
        color: 'warning'
      });
      await toast.present();

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

  private async deleteNotificationQuietly(notificationId: string | undefined) {
    if (!notificationId) return;
    try {
      await deleteDoc(doc(this.firestore, `notifications/${notificationId}`));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }

  
  navigateToEvent(event: any) {
    this.router.navigate(['/home']);
  }

  
  goToProfile() {
    this.router.navigate(['/profile']);
  }

  
  goToMessages() {
    this.router.navigate(['/messages']);
  }

  searchAlumni(event: any) {
    this.searchQuery = event.target.value.toLowerCase().trim();
  }

  
  handleImageError(event: any) {
    console.error('❌ Image loading error:', event);
    event.target.style.display = 'none';
  }

  
  openSettings() {
    console.log('Opening notification settings');
  }

  
  openPostModal() {
    this.router.navigate(['/create-post']);
  }

  
  openMenu() {
    this.router.navigate(['/menu']);
  }

  
  hasUnreadNotifications(): boolean {
    return this.notifications.some(n => !n.read);
  }
}
