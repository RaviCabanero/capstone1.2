import { Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  collection,
  collectionData,
  doc,
  Firestore,
  query,
  orderBy,
  where,
  addDoc,
  setDoc,
  serverTimestamp,
  writeBatch,
  getDoc,
  getDocs,
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';

export interface ChatMessageRecord {
  id?: string;
  senderId: string;
  text: string;
  createdAt: any;
}

export interface ChatRecord {
  id?: string;
  participants: string[];
  lastMessageText?: string;
  lastMessageAt?: any;
  updatedAt?: any;
  displayName?: string;
  avatar?: string;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  constructor(private firestore: Firestore, private auth: Auth) {}

  getChatIdForUsers(userA: string, userB: string) {
    const sorted = [userA, userB].sort();
    return `${sorted[0]}_${sorted[1]}`;
  }

  async ensureChatDocument(chatId: string, participants: string[], metadata: Partial<ChatRecord> = {}) {
    const chatDoc = doc(this.firestore, 'chats', chatId);

    // Ensure there is always a timestamp field we can sort on (even before the first message).
    const baseData: Partial<ChatRecord> = {
      participants,
      updatedAt: serverTimestamp(),
      lastMessageAt: metadata.lastMessageAt ? metadata.lastMessageAt : serverTimestamp(),
      ...metadata,
    };

    await setDoc(chatDoc, baseData, { merge: true });
  }

  async sendMessage(chatId: string, senderId: string, recipientId: string, text: string) {
    const participants = [senderId, recipientId];

    // Ensure the chat document exists/contains the latest `lastMessage` info.
    await this.ensureChatDocument(chatId, participants, {
      lastMessageText: text,
      lastMessageAt: serverTimestamp(),
    });

    // Add message to the messages subcollection.
    const messagesCol = collection(this.firestore, 'chats', chatId, 'messages');
    await addDoc(messagesCol, {
      senderId,
      text,
      createdAt: serverTimestamp(),
      participants,
    });
  }

  watchMessages(chatId: string): Observable<ChatMessageRecord[]> {
    if (!chatId) return of([]);
    const messagesQuery = query(
      collection(this.firestore, `chats/${chatId}/messages`),
      orderBy('createdAt', 'asc')
    );

    return collectionData(messagesQuery, { idField: 'id' }) as Observable<ChatMessageRecord[]>;
  }

  watchChatsForCurrentUser(): Observable<ChatRecord[]> {
    const currentUser = this.auth.currentUser;
    return this.watchChatsForUser(currentUser?.uid);
  }

  watchChatsForUser(userId?: string): Observable<ChatRecord[]> {
    if (!userId) return of([]);

    const chatsQuery = query(
      collection(this.firestore, 'chats'),
      where('participants', 'array-contains', userId),
      orderBy('lastMessageAt', 'desc')
    );

    return collectionData(chatsQuery, { idField: 'id' }) as Observable<ChatRecord[]>;
  }

  async debugGetChat(chatId: string) {
    const docRef = doc(this.firestore, 'chats', chatId);
    const snap = await getDoc(docRef);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }

  async debugGetMessages(chatId: string) {
    const messagesQuery = query(
      collection(this.firestore, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc')
    );
    const snap = await getDocs(messagesQuery);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
}
