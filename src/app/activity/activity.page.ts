import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { IonicModule, ActionSheetController } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { Firestore, collection, query, where, orderBy, collectionData, doc, deleteDoc, Timestamp } from '@angular/fire/firestore';
import { Observable, of, map } from 'rxjs';

@Component({
  selector: 'app-activity',
  templateUrl: './activity.page.html',
  styleUrls: ['./activity.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, DatePipe],
})
export class ActivityPage implements OnInit {
  userPosts$: Observable<any[]> = of([]);

  constructor(private auth: Auth, private firestore: Firestore, private actionSheetCtrl: ActionSheetController) {}

  ngOnInit() {
    const uid = this.auth.currentUser?.uid;
    if (uid) {
      this.loadUserPosts(uid);
    }
  }

  loadUserPosts(uid: string) {
    const postsQuery = query(
      collection(this.firestore, 'posts'),
      where('userId', '==', uid),
      orderBy('timestamp', 'desc')
    );
    this.userPosts$ = collectionData(postsQuery, { idField: 'id' }).pipe(
      map((posts: any[]) =>
        posts.map(post => ({
          ...post,
          timestamp: this.convertTimestamp(post.timestamp),
        }))
      )
    ) as Observable<any[]>;
  }

  private convertTimestamp(timestamp: any): number {
    // Handle Firestore Timestamp objects
    if (timestamp && typeof timestamp.toMillis === 'function') {
      return timestamp.toMillis();
    }
    // Handle milliseconds (already a number)
    if (typeof timestamp === 'number') {
      return timestamp;
    }
    // Fallback to current time
    return new Date().getTime();
  }

  async openPostMenu(post: any) {
    const actionSheet = await this.actionSheetCtrl.create({
      buttons: [
        {
          text: 'Share',
          icon: 'arrow-redo-outline',
          handler: () => {
            this.sharePost(post);
          },
        },
        {
          text: 'Delete',
          icon: 'trash',
          role: 'destructive',
          handler: () => {
            this.deletePost(post);
          },
        },
        {
          text: 'Cancel',
          icon: 'close',
          role: 'cancel',
        },
      ],
    });
    await actionSheet.present();
  }

  async deletePost(post: any) {
    try {
      const currentUserId = this.auth.currentUser?.uid;
      if (currentUserId !== post.userId) {
        console.error('Not authorized to delete this post');
        return;
      }

      await deleteDoc(doc(this.firestore, 'posts', post.id));
      console.log('Post deleted successfully');
    } catch (error) {
      console.error('Failed to delete post', error);
    }
  }

  async sharePost(post: any) {
    try {
      const shareText = `${post.userName}: ${post.text}`;
      
      if (navigator.share) {
        await navigator.share({
          title: 'JosenianLink Post',
          text: shareText,
          url: window.location.href,
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareText);
        console.log('Post copied to clipboard');
      }
    } catch (error) {
      console.error('Failed to share post', error);
    }
  }
}

