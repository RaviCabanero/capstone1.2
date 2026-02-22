import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { Firestore, collection, query, where, orderBy, collectionData, doc, docData, deleteDoc, addDoc, updateDoc, arrayUnion, arrayRemove } from '@angular/fire/firestore';
import { Observable, of, map } from 'rxjs';
import { ModalController, ActionSheetController, AlertController, IonContent } from '@ionic/angular';
import { PostModalComponent } from '../post-modal/post-modal.component';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  @ViewChild(IonContent, { static: false }) content!: IonContent;
  
  allPosts$: Observable<any[]> = of([]);
  userProfile: any;
  selectedEvent: any = null;

  // Events
  events: any[] = [];
  loadingEvents = true;

  // Search Alumni
  searchQuery: string = '';
  isSearching: boolean = false;
  searchResults: any[] = [];
  allAlumni: any[] = [];
  suggestedAlumni: any[] = [];

  // Scroll tracking
  private lastScrollTop = 0;
  showHeader = true;
  showFooter = true;
  currentUserId: string | null = null;
  currentUserConnections: string[] = [];

  constructor(
    private router: Router,
    private auth: Auth,
    private firestore: Firestore,
    private modalCtrl: ModalController,
    private actionSheetCtrl: ActionSheetController,
    private alertCtrl: AlertController
  ) {}

  ngOnInit() {
    this.currentUserId = this.auth.currentUser?.uid || null;
    this.loadCurrentUserConnections();
    this.loadAllPosts();
    this.loadCurrentUserProfile();
    this.loadAllAlumniForSearch();
    this.loadEvents();
    this.loadSuggestedAlumni();
  }

  /**
   * Navigate to Alumni Network page
   */
  goToAlumniNetwork() {
    this.router.navigate(['/alumni-network']);
  }

  /**
   * Load all alumni for search functionality
   */
  loadAllAlumniForSearch() {
    const currentUserId = this.auth.currentUser?.uid;
    const alumniQuery = query(collection(this.firestore, 'users'));

    collectionData(alumniQuery, { idField: 'id' }).subscribe(
      (users: any[]) => {
        this.allAlumni = users.filter(user => user.id !== currentUserId && user.role === 'alumni');
        console.log('Alumni loaded for search:', this.allAlumni.length);
      },
      (error) => {
        console.error('Error loading alumni:', error.message);
      }
    );
  }

  /**   * Load suggested alumni to connect (random selection from all alumni)
   */
  loadSuggestedAlumni() {
    const currentUserId = this.auth.currentUser?.uid;
    const alumniQuery = query(
      collection(this.firestore, 'users'),
      where('role', '==', 'alumni')
    );

    collectionData(alumniQuery, { idField: 'id' }).subscribe((alumni: any[]) => {
      // Filter out current user and get random 5-8 alumni
      const filtered = alumni.filter(a => a.id !== currentUserId);
      const shuffled = filtered.sort(() => 0.5 - Math.random());
      this.suggestedAlumni = shuffled.slice(0, 6);
    });
  }

  /**   * Search alumni by name, course, year, department
   */
  searchAlumni(event: any) {
    this.searchQuery = event.target.value.toLowerCase().trim();

    if (this.searchQuery.length > 0) {
      this.isSearching = true;

      this.searchResults = this.allAlumni.filter(user => {
        const firstName = user.firstName?.toLowerCase() || '';
        const lastName = user.lastName?.toLowerCase() || '';
        const fullName = `${firstName} ${lastName}`;
        const email = user.email?.toLowerCase() || '';
        const course = user.course?.toLowerCase() || '';
        const degreeProgram = user.degreeProgram?.toLowerCase() || '';
        const department = (user.schoolDepartment || user.department || '').toLowerCase();
        const yearGraduated = user.yearGraduated?.toString().toLowerCase() || '';

        return (
          fullName.includes(this.searchQuery) ||
          firstName.includes(this.searchQuery) ||
          lastName.includes(this.searchQuery) ||
          email.includes(this.searchQuery) ||
          course.includes(this.searchQuery) ||
          degreeProgram.includes(this.searchQuery) ||
          department.includes(this.searchQuery) ||
          yearGraduated.includes(this.searchQuery)
        );
      });

      console.log(`Search results: ${this.searchResults.length} matches`);
    } else {
      this.isSearching = false;
      this.searchResults = [];
    }
  }

  /**
   * Clear search
   */
  clearSearch() {
    this.searchQuery = '';
    this.isSearching = false;
    this.searchResults = [];
  }

  /**
   * Navigate to alumni profile
   */
  goToAlumniProfile(alumniId: string) {
    this.router.navigate(['/profile', alumniId]);
  }

  /**
   * Load current user profile for avatar
   */
  loadCurrentUserProfile() {
    console.log('Loading current user profile');
    
    onAuthStateChanged(this.auth, (user) => {
      console.log('Auth state changed - User UID:', user?.uid);
      
      if (!user) {
        const currentUser = this.auth.currentUser;
        console.log('No user in onAuthStateChanged, trying currentUser:', currentUser?.uid);
        if (!currentUser) return;
        this.loadProfileData(currentUser.uid);
      } else {
        console.log('User authenticated:', user.uid);
        this.loadProfileData(user.uid);
      }
    });
  }

  /**
   * Load profile data from Firestore
   */
  private loadProfileData(uid: string) {
    console.log('Loading profile data for UID:', uid);
    
    docData(doc(this.firestore, `users/${uid}`)).subscribe(
      (profile: any) => {
        console.log('Profile loaded:', profile);
        console.log('Photo URL:', profile?.photoDataUrl);
        this.userProfile = profile;
      },
      (error) => {
        console.error('Error loading profile:', error);
      }
    );
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
        posts
          .map(post => ({
            ...post,
            timestamp: this.convertTimestamp(post.timestamp),
          }))
          .filter(post => this.canViewPost(post))
      )
    ) as Observable<any[]>;
  }

  /**
   * Check if current user can view a post based on visibility settings
   */
  private canViewPost(post: any): boolean {
    // Own posts are always visible
    if (post.userId === this.currentUserId) {
      return true;
    }

    // Post visibility check
    const postVisibility = post.visibility || 'public';

    // Public posts are always visible
    if (postVisibility === 'public') {
      return true;
    }

    // Friends-only posts are visible if we're connected
    if (postVisibility === 'friends') {
      return this.currentUserConnections.includes(post.userId);
    }

    // Private posts (only me) are never visible to others
    if (postVisibility === 'onlyme') {
      return false;
    }

    return false;
  }

  /**
   * Load current user's connections
   */
  private loadCurrentUserConnections() {
    if (!this.currentUserId) return;
    
    docData(doc(this.firestore, `users/${this.currentUserId}`)).subscribe(
      (profile: any) => {
        this.currentUserConnections = profile?.connections || [];
      },
      (error) => {
        console.error('Error loading connections:', error);
        this.currentUserConnections = [];
      }
    );
  }

  /**
   * Load global events for home page
   */
  loadEvents() {
    this.loadingEvents = true;
    const eventsQuery = query(
      collection(this.firestore, 'events'),
      where('isGlobal', '==', true),
      orderBy('date', 'desc')
    );

    collectionData(eventsQuery, { idField: 'id' }).subscribe(
      (events: any[]) => {
        this.events = events;
        this.loadingEvents = false;
      },
      (error) => {
        console.error('Error loading events:', error);
        this.loadingEvents = false;
      }
    );
  }

  async viewEventDetails(event: any) {
    this.selectedEvent = event;
  }

  hasUserRegistered(event: any): boolean {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return false;
    return (event.attendees || []).includes(uid);
  }

  isEventFull(event: any): boolean {
    if (!event.capacity) return false;
    return (event.attendees?.length || 0) >= event.capacity;
  }

  async toggleEventRegistration(event: any) {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return;

    const alreadyRegistered = this.hasUserRegistered(event);
    if (!alreadyRegistered && this.isEventFull(event)) {
      await this.showAlert('Event Full', 'This event has reached its maximum capacity.');
      return;
    }

    try {
      await updateDoc(doc(this.firestore, `events/${event.id}`), {
        attendees: alreadyRegistered ? arrayRemove(uid) : arrayUnion(uid),
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to update registration', error);
      await this.showAlert('Error', 'Unable to update event registration. Please try again.');
    }
  }

  private async showAlert(header: string, message: string) {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
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

  /**
   * Like/React to a post
   */
  async likePost(post: any) {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return;

    try {
      // Toggle like
      const likes = post.likes || 0;
      const likedBy = post.likedBy || [];
      const userIndex = likedBy.indexOf(uid);
      
      let updatedLikes = likes;
      let updatedLikedBy = likedBy;

      if (userIndex > -1) {
        // Unlike
        updatedLikedBy.splice(userIndex, 1);
        updatedLikes = Math.max(0, likes - 1);
      } else {
        // Like
        updatedLikedBy.push(uid);
        updatedLikes = likes + 1;
      }

      await updateDoc(doc(this.firestore, `posts/${post.id}`), {
        likes: updatedLikes,
        likedBy: updatedLikedBy,
      });

      console.log('Post like updated:', updatedLikes);
    } catch (error) {
      console.error('Failed to like post', error);
    }
  }

  /**
   * Check if user has liked a post
   */
  hasUserLiked(post: any): boolean {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return false;
    return (post.likedBy || []).includes(uid);
  }

  /**
   * Open comment dialog
   */
  async openCommentDialog(post: any) {
    const alert = await this.alertCtrl.create({
      header: 'Add Comment',
      message: 'Share your thoughts on this post',
      inputs: [
        {
          name: 'comment',
          type: 'textarea',
          placeholder: 'Write a comment...',
          attributes: {
            rows: 4,
            maxlength: 500,
          }
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Post',
          handler: (data) => {
            if (data.comment && data.comment.trim().length > 0) {
              this.addComment(post, data.comment);
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Add comment to post
   */
  async addComment(post: any, commentText: string) {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return;

    try {
      // Get current user profile for comment display
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

      const newComment = {
        id: new Date().getTime().toString(),
        userId: uid,
        userName: this.auth.currentUser?.displayName || userDoc?.firstName + ' ' + userDoc?.lastName || 'Anonymous',
        userAvatar: userDoc?.photoDataUrl || '',
        text: commentText,
        timestamp: new Date().getTime(),
      };

      const comments = post.comments || [];
      const updatedComments = [...comments, newComment];

      await updateDoc(doc(this.firestore, `posts/${post.id}`), {
        comments: updatedComments,
        updatedAt: new Date().toISOString(),
      });

      console.log('Comment added successfully');
    } catch (error) {
      console.error('Failed to add comment', error);
    }
  }

  goToProfile() {
    this.router.navigateByUrl('/profile');
  }

  /**
   * Navigate to Notifications page
   */
  goToNotifications() {
    this.router.navigate(['/notifications']);
  }

  /**
   * Navigate to Messages/Activity page
   */
  goToMessages() {
    this.router.navigate(['/activity']);
  }

  /**
   * Handle scroll events to show/hide header and footer
   */
  async onScroll(event: any) {
    const scrollElement = await this.content.getScrollElement();
    const scrollTop = scrollElement.scrollTop;
    const scrollThreshold = 50; // Minimum scroll distance to trigger hide/show

    if (Math.abs(scrollTop - this.lastScrollTop) < scrollThreshold) {
      return; // Don't trigger for small scrolls
    }

    if (scrollTop > this.lastScrollTop && scrollTop > 100) {
      // Scrolling down - hide header and footer
      this.showHeader = false;
      this.showFooter = false;
    } else if (scrollTop < this.lastScrollTop) {
      // Scrolling up - show header and footer
      this.showHeader = true;
      this.showFooter = true;
    }

    this.lastScrollTop = scrollTop;
  }
}
