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
  arrayUnion,
  setDoc
} from '@angular/fire/firestore';
import { getDoc, collectionGroup, documentId } from 'firebase/firestore';
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
      // Create connection request document under sender's subcollection
      const fromCollection = collection(this.firestore, 'users', fromUserId, 'ConnectionRequest');
      console.log('✏️ Creating connection request under sender...');
      const requestDocRef = await addDoc(fromCollection, {
        fromUserId: fromUserId,
        toUserId: toUserId,
        status: 'pending',
        timestamp: Date.now(),
        createdAt: new Date().toISOString()
      });

      console.log('✅ Connection request created with id:', requestDocRef.id);

      // Mirror the request under receiver's subcollection with same id
      try {
        await setDoc(doc(this.firestore, 'users', toUserId, 'ConnectionRequest', requestDocRef.id), {
          fromUserId: fromUserId,
          toUserId: toUserId,
          status: 'pending',
          timestamp: Date.now(),
          createdAt: new Date().toISOString()
        }, { merge: true });
        console.log('✅ Mirrored connection request under receiver');
      } catch (mirrorErr) {
        console.warn('⚠️ Failed to mirror connection request under receiver:', mirrorErr);
      }

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

      // Update request status in both sender and receiver subcollections
      console.log('✏️ Updating request status to accepted in user subcollections...');
      try {
        const fromRef = doc(this.firestore, `users/${fromUserId}/ConnectionRequest/${requestId}`);
        const toRef = doc(this.firestore, `users/${toUserId}/ConnectionRequest/${requestId}`);
        await updateDoc(fromRef, { status: 'accepted' });
        await updateDoc(toRef, { status: 'accepted' });
        console.log('✅ Request status updated in both subcollections');
      } catch (err) {
        console.warn('⚠️ Failed updating one or both subcollection docs, attempting collectionGroup fallback', err);
        // Fallback: try to update any matching connection request document by id across collection group
        try {
          const q = query(collectionGroup(this.firestore, 'ConnectionRequest'), where(documentId(), '==', requestId));
          const snaps = await getDocs(q);
          for (const s of snaps.docs) {
            await updateDoc(doc(this.firestore, s.ref.path), { status: 'accepted' } as any);
          }
        } catch (cgErr) {
          console.warn('⚠️ collectionGroup fallback failed:', cgErr);
        }
      }

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
      // Update status to rejected in both user subcollections if present
      // We don't know the users here, so attempt collectionGroup update first
      const q = query(collectionGroup(this.firestore, 'ConnectionRequest'), where(documentId(), '==', requestId));
      const snaps = await getDocs(q);
      if (!snaps.empty) {
        for (const s of snaps.docs) {
          await updateDoc(doc(this.firestore, s.ref.path), { status: 'rejected' } as any);
        }
        console.log('Connection request rejected in subcollections');
      } else {
        console.warn('Connection request not found in subcollections for id', requestId);
      }
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
      collection(this.firestore, 'users', userId, 'ConnectionRequest'),
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
      collection(this.firestore, 'users', userId, 'ConnectionRequest'),
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
        collection(this.firestore, 'users', fromUserId, 'ConnectionRequest'),
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
      // Try to find the request document anywhere under users/*/ConnectionRequest
      const q = query(collectionGroup(this.firestore, 'ConnectionRequest'), where(documentId(), '==', requestId));
      const snaps = await getDocs(q);
      if (snaps.empty) return null;
      const d = snaps.docs[0];
      return { id: d.id, ...(d.data() as any) } as ConnectionRequest;
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
