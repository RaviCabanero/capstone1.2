import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { Subscription } from 'rxjs';
import { ToastController } from '@ionic/angular';
import { AdminService } from '../services/admin.service';
import { ChatService } from '../services/chat.service';

interface ChatConversation {
  id: string;
  name: string;
  avatar?: string;
  initials: string;
  lastMessage: string;
  lastMessageAt?: number; // timestamp ms for sorting
  time: string;
  unread?: number;
  type: 'personal' | 'group' | 'community';
}

interface ChatMessage {
  id: string;
  fromMe: boolean;
  text: string;
  time: string;
}

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  standalone: false,
})
export class ChatPage implements OnInit, OnDestroy {
  private adminService = inject(AdminService);
  private chatService = inject(ChatService);
  private auth = inject(Auth);
  private toastController = inject(ToastController);
  private route = inject(ActivatedRoute);

  segment: 'all' | 'unread' | 'groups' | 'communities' = 'all';
  search: string = '';

  chats: ChatConversation[] = [];
  alumni: any[] = [];
  private alumniMap = new Map<string, any>();

  activeChatId?: string;
  activeMessages: ChatMessage[] = [];
  newMessage: string = '';

  private currentUid?: string;
  private authSub?: Subscription;
  private chatSub?: Subscription;
  private messageSub?: Subscription;
  private queryParamSub?: Subscription;

  get activeChatName() {
    if (!this.activeChatId) return '';
    const chat = this.chats.find((c) => c.id === this.activeChatId);
    if (chat) return chat.name;
    const alumni = this.alumni.find((a) => a.uid === this.activeChatId);
    return alumni?.name || 'Chat';
  }

  get activeChatAvatar() {
    if (!this.activeChatId) return undefined;
    const chat = this.chats.find((c) => c.id === this.activeChatId);
    if (chat?.avatar) return chat.avatar;
    const alumni = this.alumni.find((a) => a.uid === this.activeChatId);
    return alumni?.avatar;
  }

  get activeChatInitials() {
    if (!this.activeChatId) return '';
    const chat = this.chats.find((c) => c.id === this.activeChatId);
    if (chat?.initials) return chat.initials;
    const alumni = this.alumni.find((a) => a.uid === this.activeChatId);
    return alumni?.initials || '';
  }

  ngOnInit() {
    this.authSub = authState(this.auth).subscribe(async (user) => {
      this.currentUid = user?.uid;
      // Ensure alumni list is loaded before subscribing to chats so names are available for search
      await this.loadAlumni();
      this.subscribeToChats(this.currentUid);
    });

    this.queryParamSub = this.route.queryParams.subscribe((params) => {
      const openChatWith = params['openChatWith'];
      if (openChatWith) {
        this.openConversation(openChatWith);
      }
    });
  }

  private subscribeToChats(uid?: string) {
    this.chatSub?.unsubscribe();
    this.chatSub = this.chatService.watchChatsForUser(uid).subscribe({
      next: (chatDocs) => {
        // Build a map of alumni for quick lookup.
        this.alumniMap.clear();
        this.alumni.forEach((user) => this.alumniMap.set(user.uid, user));

        // Only show conversations that already exist in Firestore.
        this.chats = chatDocs
          .map((doc) => {
            const otherId = doc.participants?.find((id) => id !== this.currentUid);
            const other = otherId ? this.alumniMap.get(otherId) : null;

            const lastMessageAt = (doc?.lastMessageAt as any)?.toDate?.()?.getTime?.() || (doc?.lastMessageAt as number) || 0;
            const time = lastMessageAt ? new Date(lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

            const id = (otherId ?? doc.id) as string;

            return {
              id,
              name: other?.name || otherId || 'Unknown',
              initials: other?.initials || (otherId ? otherId.substring(0, 2).toUpperCase() : '??'),
              avatar: other?.avatar,
              lastMessage: (doc?.lastMessageText as string) || '',
              lastMessageAt,
              time,
              type: 'personal' as const,
            };
          })
          .filter((chat) => !!chat.id);
      },
      error: (error) => {
        console.error('watchChatsForCurrentUser error:', error);
      },
    });
  }

  private async loadAlumni() {
    try {
      const users: any[] = await this.adminService.getAllUsers();
      this.alumni = users.map((user) => ({
        uid: user.uid,
        // Prefer explicit firstName/lastName from Firestore over auth/displayName
        name:
          `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
          user.displayName ||
          user.email ||
          'Unknown',
        email: user.email,
        initials: this.getInitials(user),
        avatar:
          user.photoURL ||
          user.avatar ||
          user.profilePicture ||
          user.profileImage ||
          user.photoUrl ||
          undefined,
      }));
      console.debug('Loaded alumni for chat:', { count: this.alumni.length, currentUid: this.currentUid });
    } catch (error) {
      console.error('Failed to load alumni for chat search:', error);
    }
  }

  private getInitials(user: any) {
    const first = (user.firstName || '').toString().trim();
    const last = (user.lastName || '').toString().trim();
    if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
    if (first) return first.substring(0, 2).toUpperCase();
    if (user.email) return user.email.substring(0, 2).toUpperCase();
    return '??';
  }

  get filteredChats() {
    const query = this.search.trim().toLowerCase();

    return this.chats
      .filter((chat) => {
        const matchesSearch = !query || chat.name.toLowerCase().includes(query) || chat.lastMessage.toLowerCase().includes(query);

        if (!matchesSearch) {
          return false;
        }

        switch (this.segment) {
          case 'unread':
            return !!chat.unread;
          case 'groups':
            return chat.type === 'group';
          default:
            return true;
        }
      })
      .sort((a, b) => {
        const aTime = a.lastMessageAt || 0;
        const bTime = b.lastMessageAt || 0;
        return bTime - aTime;
      });
  }


  parseRelativeTime(timeStr: string) {
    // Very basic parsing for strings like "1m", "3h" or "10:00 AM".
    if (!timeStr) {
      return 0;
    }

    const minutesMatch = timeStr.match(/(\d+)m$/);
    if (minutesMatch) {
      return parseInt(minutesMatch[1], 10);
    }

    const hoursMatch = timeStr.match(/(\d+)h$/);
    if (hoursMatch) {
      return parseInt(hoursMatch[1], 10) * 60;
    }

    const date = new Date(timeStr);
    return isNaN(date.getTime()) ? 0 : date.getTime();
  }

  private getCurrentUid(): string | undefined {
    const uid = this.auth.currentUser?.uid || this.currentUid;
    if (!uid) {
      console.warn('ChatPage: getCurrentUid() returned undefined. auth.currentUser:', this.auth.currentUser);
    }
    return uid;
  }

  async openConversation(conversationId: string, name?: string) {
    this.activeChatId = conversationId;
    this.activeMessages = [];

    const uid = this.getCurrentUid();
    if (!uid) {
      console.error('ChatPage.openConversation: no current UID (not authenticated yet)');
      return;
    }

    const chatId = this.chatService.getChatIdForUsers(uid, conversationId);
    console.debug('ChatPage.openConversation', { uid, conversationId, chatId });

    // Ensure a chat doc exists for this user pair so it shows up in the chat list.
    await this.chatService.ensureChatDocument(chatId, [uid, conversationId]);

    const infoToast = await this.toastController.create({
      message: `Chat opened (chatId: ${chatId})`,
      duration: 1200,
      color: 'tertiary',
    });
    await infoToast.present();

    this.messageSub?.unsubscribe();
    this.messageSub = this.chatService.watchMessages(chatId).subscribe({
      next: (messages) => {
        this.activeMessages = messages.map((m) => ({
          id: m.id || '',
          fromMe: m.senderId === uid,
          text: m.text,
          time: m.createdAt?.toDate
            ? m.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }));
      },
      error: (error) => {
        console.error('watchMessages error:', error);
      },
    });
  }

  closeConversation() {
    this.activeChatId = undefined;
    this.activeMessages = [];
    this.newMessage = '';
    this.messageSub?.unsubscribe();
    this.messageSub = undefined;
  }

  async sendMessage() {
    const text = this.newMessage.trim();
    const uid = this.getCurrentUid();

    if (!text) {
      console.warn('SendMessage blocked: message is empty');
      return;
    }
    if (!this.activeChatId) {
      console.warn('SendMessage blocked: no active chat selected');
      return;
    }
    if (!uid) {
      console.warn('SendMessage blocked: user not authenticated yet');
      return;
    }

    const chatId = this.chatService.getChatIdForUsers(uid, this.activeChatId);
    console.debug('ChatPage.sendMessage', { uid, activeChatId: this.activeChatId, chatId, text });

    try {
      await this.chatService.sendMessage(chatId, uid, this.activeChatId, text);
      this.newMessage = '';

      const [chatDoc, messages] = await Promise.all([
        this.chatService.debugGetChat(chatId),
        this.chatService.debugGetMessages(chatId),
      ]);

      console.debug('Chat saved (chat doc):', chatDoc);
      console.debug('Chat messages:', messages);

      const chatDocAny = chatDoc as any;
      const successToast = await this.toastController.create({
        message: `Message sent (msgs: ${messages.length}, last: ${chatDocAny?.lastMessageText ?? ''})`,
        duration: 1600,
        color: 'success',
      });
      await successToast.present();

      // Refresh chat list so lastMessageText updates immediately.
      this.subscribeToChats(this.currentUid);
    } catch (error: any) {
      console.error('Failed to send message:', error);

      const errorToast = await this.toastController.create({
        message: `Send failed: ${error?.message || error}`,
        duration: 3000,
        color: 'danger',
      });
      await errorToast.present();

      // If Firestore is still denying permission, log the exact rule input values.
      console.debug('sendMessage debug', {
        authUid: uid,
        chatId,
        participants: [uid, this.activeChatId],
        senderId: uid,
        errorCode: error?.code,
        errorMessage: error?.message,
      });
    }
  }

  onNewChat() {
    // Clear any active conversation and focus search
    this.closeConversation();
  }

  ngOnDestroy() {
    this.authSub?.unsubscribe();
    this.chatSub?.unsubscribe();
    this.messageSub?.unsubscribe();
    this.queryParamSub?.unsubscribe();
  }
}
