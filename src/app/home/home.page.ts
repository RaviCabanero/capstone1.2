import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { Firestore, collection, query, orderBy, collectionData, doc, docData, deleteDoc, addDoc } from '@angular/fire/firestore';
import { Observable, of, map } from 'rxjs';
import { ModalController, ActionSheetController } from '@ionic/angular';
import { PostModalComponent } from '../post-modal/post-modal.component';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  allPosts$: Observable<any[]> = of([]);
  userProfile: any;

  constructor(
    private router: Router,
    private auth: Auth,
    private firestore: Firestore,
    private modalCtrl: ModalController,
    private actionSheetCtrl: ActionSheetController
  ) {}

  ngOnInit() {
    this.loadAllPosts();
    this.loadCurrentUserProfile();
  }

  /**
   * Navigate to Alumni Network page
   */
  goToAlumniNetwork() {
    this.router.navigate(['/alumni-network']);
  }

  /**
   * Load current user profile for avatar
   */
  loadCurrentUserProfile() {
    const uid = this.auth.currentUser?.uid;
    if (uid) {
      docData(doc(this.firestore, `users/${uid}`)).subscribe(profile => {
        this.userProfile = profile;
      });
    }
  }

  /**
   * Load all posts from all users
   */
  loadAllPosts() {
    const postsQuery = query(
      collection(this.firestore, 'posts'),
      orderBy('timestamp', 'desc')
    );
    
    this.allPosts$ = collectionData(postsQuery, { idField: 'id' }).pipe(
      map((posts: any[]) =>
        posts.map(post => ({
          ...post,
          timestamp: this.convertTimestamp(post.timestamp),
        }))
      )
    ) as Observable<any[]>;
  }

  /**
   * Convert Firestore timestamp to milliseconds
   */
  private convertTimestamp(timestamp: any): number {
    if (timestamp && typeof timestamp.toMillis === 'function') {
      return timestamp.toMillis();
    }
    if (typeof timestamp === 'number') {
      return timestamp;
    }
    return new Date().getTime();
  }

  /**
   * Open post modal
   */
  async openPostModal() {
    const modal = await this.modalCtrl.create({
      component: PostModalComponent,
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data) {
      await this.savePost(data);
    }
  }

  /**
   * Save post to Firestore
   */
  async savePost(postData: any) {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return;

    try {
      // Get current user profile to get their avatar
      const userDoc = await new Promise<any>((resolve, reject) => {
        const unsubscribe = docData(doc(this.firestore, `users/${uid}`)).subscribe(
          data => {
            unsubscribe.unsubscribe();
            resolve(data);
          },
          err => {
            unsubscribe.unsubscribe();
            reject(err);
          }
        );
      });

      const postToSave = {
        userId: uid,
        userName: this.auth.currentUser?.displayName || userDoc?.firstName + ' ' + userDoc?.lastName || 'User',
        userAvatar: userDoc?.photoDataUrl || '',
        text: postData.text,
        image: postData.image || '',
        visibility: postData.visibility || 'public',
        timestamp: new Date().getTime(),
        likes: 0,
        comments: [],
      };

      console.log('Saving post with data:', postToSave);

      await addDoc(collection(this.firestore, 'posts'), postToSave);
      console.log('Post saved successfully');
    } catch (error) {
      console.error('Failed to save post', error);
    }
  }

  /**
   * Open post menu (3-dot menu)
   */
  async openPostMenu(post: any) {
    const uid = this.auth.currentUser?.uid;
    const isOwner = post.userId === uid;

    const buttons: any[] = [
      {
        text: 'Share',
        icon: 'share-social',
        handler: () => {
          this.sharePost(post);
        }
      }
    ];

    // Only show delete if user owns the post
    if (isOwner) {
      buttons.push({
        text: 'Delete',
        icon: 'trash',
        role: 'destructive',
        handler: () => {
          this.deletePost(post);
        }
      });
    }

    buttons.push({
      text: 'Cancel',
      icon: 'close',
      role: 'cancel'
    });

    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Post Options',
      buttons: buttons
    });

    await actionSheet.present();
  }

  /**
   * Delete post
   */
  async deletePost(post: any) {
    const uid = this.auth.currentUser?.uid;
    if (post.userId !== uid) {
      console.error('Cannot delete post - not owner');
      return;
    }

    try {
      await deleteDoc(doc(this.firestore, `posts/${post.id}`));
      console.log('Post deleted successfully');
    } catch (error) {
      console.error('Failed to delete post', error);
    }
  }

  /**
   * Share post
   */
  async sharePost(post: any) {
    const shareText = `Check out this post: ${post.text || 'Shared post'}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Shared Post',
          text: shareText,
        });
      } catch (error) {
        console.log('Error sharing', error);
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareText);
        console.log('Post text copied to clipboard');
      } catch (error) {
        console.error('Failed to copy', error);
      }
    }
  }

  goToProfile() {
    this.router.navigateByUrl('/profile');
  }
}
