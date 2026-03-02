import { Injectable, NgZone } from '@angular/core';
import {
  Firestore,
  collection,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  collectionData,
  getDocs,
  WriteBatch,
  writeBatch,
  arrayUnion
} from '@angular/fire/firestore';
import { getDoc } from 'firebase/firestore';
import { Auth } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { NotificationService } from './notification.service';

export interface ConnectionRequest {
  id?: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: number;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConnectionRequestService {

  constructor(
    private firestore: Firestore,
    private auth: Auth,
    private notificationService: NotificationService,
    private ngZone: NgZone
  ) { }

  /**
   * Send a connection request from current user to target user
   */
  async sendConnectionRequest(toUserId: string): Promise<void> {
    try {
      const currentUser = this.auth.currentUser;
      
      if (!currentUser || !currentUser.uid) {
        throw new Error('User authentication failed - please log in again');
      }

      const fromUserId = currentUser.uid;

      console.log('📝 Initiating connection request:', { from: fromUserId, to: toUserId });

      // Use email or a generic sender name for notification
      const senderName = currentUser.email || 'An Alumni';

      // Create connection request document
      const requestRef = collection(this.firestore, 'connectionRequests');
      console.log('✏️ Creating connection request...');
      
      const requestDocRef = await addDoc(requestRef, {
        fromUserId: fromUserId,
        toUserId: toUserId,
        status: 'pending',
        timestamp: Date.now(),
        createdAt: new Date().toISOString()
      });

      console.log('✅ Connection request created:', requestDocRef.id);

      // Create notification for the receiver (non-critical, don't fail if this fails)
      try {
        await this.notificationService.createNotification({
          userId: toUserId,
          type: 'connection_request',
          title: 'Connection Request',
          message: `${senderName} sent you a connection request`,
          data: {
            fromUserId: fromUserId,
            fromUserName: senderName,
            requestId: requestDocRef.id,
            type: 'connection_request'
          }
        });
        console.log('✅ Notification created for receiver');
      } catch (notificationError) {
        console.warn('⚠️ Notification creation failed (non-critical):', notificationError);
        // Don't throw - request was created successfully
      }
    } catch (error: any) {
      console.error('❌ Error sending connection request:', error);
      console.error('Error code:', error.code);
      console.error('Auth state:', {
        user: this.auth.currentUser?.uid,
        email: this.auth.currentUser?.email
      });
      throw new Error(`Failed to send connection request: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Accept a connection request
   */
  async acceptConnectionRequest(requestId: string): Promise<void> {
    try {
      console.log('📝 Accepting connection request:', requestId);
      
      const requestDoc = await this.getConnectionRequestById(requestId);
      if (!requestDoc) {
        throw new Error('Connection request not found');
      }

      const { fromUserId, toUserId } = requestDoc;

      // Update request status first (this is critical)
      const requestRef = doc(this.firestore, `connectionRequests/${requestId}`);
      console.log('✏️ Updating request status to accepted...');
      await updateDoc(requestRef, {
        status: 'accepted'
      });
      console.log('✅ Request status updated');

      // Update user profiles (non-critical, don't fail if this fails)
      try {
        const batch = writeBatch(this.firestore);
        const fromUserRef = doc(this.firestore, `users/${fromUserId}`);
        const toUserRef = doc(this.firestore, `users/${toUserId}`);

        batch.update(fromUserRef, {
          connections: arrayUnion(toUserId),
          updatedAt: new Date().toISOString()
        });

        batch.update(toUserRef, {
          connections: arrayUnion(fromUserId),
          updatedAt: new Date().toISOString()
        });

        await batch.commit();
        console.log('✅ User profiles updated with connections');
      } catch (profileError) {
        console.warn('⚠️ Failed to update user profiles (non-critical):', profileError);
        // Don't throw - request was accepted successfully
      }

      // Create notification for the original sender
      try {
        await this.notificationService.createNotification({
          userId: fromUserId,
          type: 'general',
          title: 'Connection Accepted',
          message: `An Alumni accepted your connection request`,
          data: {
            fromUserId: toUserId,
            fromUserName: 'An Alumni',
            type: 'connection_accepted'
          }
        });
        console.log('✅ Notification created for sender');
      } catch (notificationError) {
        console.warn('⚠️ Failed to create notification (non-critical):', notificationError);
        // Don't throw - request was accepted successfully
      }

      console.log('✅ Connection request fully accepted');
    } catch (error: any) {
      console.error('❌ Error accepting connection request:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      throw new Error(`Failed to accept connection request: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Reject a connection request
   */
  async rejectConnectionRequest(requestId: string): Promise<void> {
    try {
      const requestRef = doc(this.firestore, `connectionRequests/${requestId}`);
      await updateDoc(requestRef, {
        status: 'rejected'
      });
      
      console.log('Connection request rejected');
    } catch (error) {
      console.error('Error rejecting connection request:', error);
      throw error;
    }
  }

  /**
   * Get incoming connection requests for a user
   */
  getIncomingRequests(userId: string): Observable<ConnectionRequest[]> {
    const q = query(
      collection(this.firestore, 'connectionRequests'),
      where('toUserId', '==', userId),
      where('status', '==', 'pending')
    );
    return collectionData(q, { idField: 'id' }) as Observable<ConnectionRequest[]>;
  }

  /**
   * Get outgoing connection requests from a user
   */
  getOutgoingRequests(userId: string): Observable<ConnectionRequest[]> {
    const q = query(
      collection(this.firestore, 'connectionRequests'),
      where('fromUserId', '==', userId),
      where('status', '==', 'pending')
    );
    return collectionData(q, { idField: 'id' }) as Observable<ConnectionRequest[]>;
  }

  /**
   * Check if a pending request exists between two users
   */
  async getExistingRequest(fromUserId: string, toUserId: string): Promise<ConnectionRequest | null> {
    try {
      const q = query(
        collection(this.firestore, 'connectionRequests'),
        where('fromUserId', '==', fromUserId),
        where('toUserId', '==', toUserId),
        where('status', '==', 'pending')
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return null;
      }
      
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as ConnectionRequest;
    } catch (error: any) {
      console.warn('Error checking existing request:', error.message);
      // Return null if query fails (could be permission issue or no matching docs)
      return null;
    }
  }

  /**
   * Get a specific connection request by ID
   */
  private async getConnectionRequestById(requestId: string): Promise<ConnectionRequest | null> {
    try {
      const docRef = doc(this.firestore, `connectionRequests/${requestId}`);
      const snapshot = await this.ngZone.run(async () => {
        return await getDoc(docRef);
      });
      
      if (!snapshot.exists()) {
        return null;
      }
      
      return { id: requestId, ...snapshot.data() } as ConnectionRequest;
    } catch (error) {
      console.error('Error fetching connection request:', error);
      return null;
    }
  }

  /**
   * Helper method to add value to array (Firestore compatible)
   */
  private arrayUnion(value: string): any[] {
    // This would be replaced with actual Firestore arrayUnion in the component
    return [value];
  }
}
