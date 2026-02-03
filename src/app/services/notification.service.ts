import { Injectable } from '@angular/core';
import { Firestore, addDoc, collection } from '@angular/fire/firestore';

export interface NotificationData {
  userId: string;
  type: 'event' | 'announcement' | 'approval' | 'reminder' | 'general';
  title: string;
  message: string;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  constructor(private firestore: Firestore) {}

  /**
   * Create a notification in Firestore
   * This will be displayed in the notifications page
   */
  async createNotification(notificationData: NotificationData): Promise<void> {
    try {
      await addDoc(collection(this.firestore, 'notifications'), {
        ...notificationData,
        timestamp: new Date().getTime(),
        read: false,
        createdAt: new Date().toISOString()
      });
      console.log('✅ Notification created successfully');
    } catch (error) {
      console.error('❌ Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Send notification to multiple users
   */
  async sendBulkNotifications(userIds: string[], notificationData: Omit<NotificationData, 'userId'>): Promise<void> {
    const promises = userIds.map(userId => 
      this.createNotification({
        userId,
        ...notificationData
      })
    );
    
    await Promise.all(promises);
    console.log(`✅ Sent notifications to ${userIds.length} users`);
  }

  /**
   * Send event notification to all attendees
   */
  async notifyEventAttendees(eventId: string, eventTitle: string, attendeeIds: string[], message: string): Promise<void> {
    await this.sendBulkNotifications(attendeeIds, {
      type: 'event',
      title: eventTitle,
      message: message,
      data: { eventId }
    });
  }

  /**
   * Send announcement notification
   */
  async sendAnnouncement(userIds: string[], title: string, message: string): Promise<void> {
    await this.sendBulkNotifications(userIds, {
      type: 'announcement',
      title: title,
      message: message
    });
  }

  /**
   * Send approval notification
   */
  async notifyApproval(userId: string, title: string, message: string, approvalType: string): Promise<void> {
    await this.createNotification({
      userId,
      type: 'approval',
      title,
      message,
      data: { approvalType }
    });
  }

  /**
   * Send reminder notification
   */
  async sendReminder(userId: string, title: string, message: string, reminderData?: any): Promise<void> {
    await this.createNotification({
      userId,
      type: 'reminder',
      title,
      message,
      data: reminderData
    });
  }
}
