import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { Firestore, collection, query, where, orderBy, collectionData, doc, docData, deleteDoc, addDoc, updateDoc, arrayUnion, arrayRemove, getDoc } from '@angular/fire/firestore';
import { Observable, of, map, switchMap, forkJoin, from } from 'rxjs';
import { ModalController, ActionSheetController, AlertController, IonContent } from '@ionic/angular';
import { PostModalComponent } from '../post-modal/post-modal.component';
import { EventService } from '../services/event.service';

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

  
  events: any[] = [];
  loadingEvents = true;

  
  searchQuery: string = '';
  isSearching: boolean = false;
  searchResults: any[] = [];
  allAlumni: any[] = [];
  suggestedAlumni: any[] = [];
  suggestedAlumniStartIndex = 0;
  readonly suggestedAlumniPerView = 2;

  
  private lastScrollTop = 0;
  showHeader = true;
  showFooter = true;
  currentUserId: string | null = null;
  currentUserConnections: string[] = [];
  readonly initialCommentsToShow = 1;
  private expandedComments = new Set<string>();

  constructor(
    private router: Router,
    private auth: Auth,
    private firestore: Firestore,
    private modalCtrl: ModalController,
    private actionSheetCtrl: ActionSheetController,
    private alertCtrl: AlertController,
    private eventService: EventService
  ) {}

  ngOnInit() {
    this.currentUserId = this.auth.currentUser?.uid || null;
    this.loadCurrentUserConnections();
    this.loadAllPosts();
    this.loadCurrentUserProfile();
    this.loadAllAlumniForSearch();
    this.loadEvents();
    this.loadSuggestedAlumni();

    // Subscribe to selected event from notification
    this.eventService.selectedEvent$.subscribe((event: any) => {
      if (event) {
        this.selectedEvent = event;
      }
    });
  }

  
  goToAlumniNetwork() {
    this.router.navigate(['/alumni-network']);
  }

  
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
      this.suggestedAlumniStartIndex = 0;
    });
  }

  get visibleSuggestedAlumni(): any[] {
    return this.suggestedAlumni.slice(
      this.suggestedAlumniStartIndex,
      this.suggestedAlumniStartIndex + this.suggestedAlumniPerView
    );
  }

  get canGoToPreviousSuggestions(): boolean {
    return this.suggestedAlumniStartIndex > 0;
  }

  get canGoToNextSuggestions(): boolean {
    return this.suggestedAlumniStartIndex + this.suggestedAlumniPerView < this.suggestedAlumni.length;
  }

  showPreviousSuggestions() {
    if (!this.canGoToPreviousSuggestions) {
      return;
    }

    this.suggestedAlumniStartIndex = Math.max(
      this.suggestedAlumniStartIndex - this.suggestedAlumniPerView,
      0
    );
  }

  showNextSuggestions() {
    if (!this.canGoToNextSuggestions) {
      return;
    }

    this.suggestedAlumniStartIndex = Math.min(
      this.suggestedAlumniStartIndex + this.suggestedAlumniPerView,
      Math.max(this.suggestedAlumni.length - this.suggestedAlumniPerView, 0)
    );
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
      switchMap(async (posts: any[]) => {
        // Process posts and fetch missing user data
        const postsWithUserData = await Promise.all(
          posts.map(async (post) => {
            const processedPost = {
              ...post,
              timestamp: this.convertTimestamp(post.timestamp),
            };

            // If userName or userAvatar is missing, fetch from user document
            if (!processedPost.userName || !processedPost.userAvatar) {
              try {
                const userDocRef = doc(this.firestore, `users/${post.userId}`);
                const userSnapshot = await getDoc(userDocRef);
                
                if (userSnapshot.exists()) {
                  const userData = userSnapshot.data();
                  processedPost.userName = processedPost.userName || 
                    `${userData['firstName'] || ''} ${userData['lastName'] || ''}`.trim() || 
                    'Unknown User';
                  processedPost.userAvatar = processedPost.userAvatar || userData['photoDataUrl'] || '';
                }
              } catch (error) {
                console.error('Error fetching user data for post:', error);
                processedPost.userName = processedPost.userName || 'Unknown User';
                processedPost.userAvatar = processedPost.userAvatar || '';
              }
            }

            return processedPost;
          })
        );

        
        return postsWithUserData.filter(post => this.canViewPost(post));
      })
    ) as Observable<any[]>;
  }

  
  private canViewPost(post: any): boolean {
   
    if (post.userId === this.currentUserId) {
      return true;
    }

   
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
      componentProps: {
        userName: this.userProfile?.firstName && this.userProfile?.lastName 
          ? `${this.userProfile.firstName} ${this.userProfile.lastName}` 
          : this.auth.currentUser?.displayName || 'User',
        userAvatar: this.userProfile?.photoDataUrl || ''
      }
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
      const userSnap = await getDoc(doc(this.firestore, `users/${uid}`));
      const userDoc = userSnap.exists()
        ? (userSnap.data() as { firstName?: string; lastName?: string; photoDataUrl?: string })
        : null;

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

  isCommentsExpanded(post: any): boolean {
    return this.expandedComments.has(post?.id);
  }

  toggleComments(post: any) {
    if (!post?.id) return;
    if (this.expandedComments.has(post.id)) {
      this.expandedComments.delete(post.id);
    } else {
      this.expandedComments.add(post.id);
    }
  }

  getVisibleComments(post: any): any[] {
    const comments = post?.comments || [];
    if (this.isCommentsExpanded(post)) {
      return comments;
    }
    return comments.slice(0, this.initialCommentsToShow);
  }

  canManageComment(comment: any): boolean {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return false;
    return comment?.userId === uid || this.userProfile?.role === 'super_admin';
  }

  async openCommentMenu(post: any, comment: any) {
    if (!this.canManageComment(comment)) return;

    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Comment Options',
      buttons: [
        {
          text: 'Edit',
          icon: 'create-outline',
          handler: () => this.openEditCommentDialog(post, comment)
        },
        {
          text: 'Delete',
          icon: 'trash-outline',
          role: 'destructive',
          handler: () => this.confirmDeleteComment(post, comment)
        },
        {
          text: 'Cancel',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });

    await actionSheet.present();
  }

  private async openEditCommentDialog(post: any, comment: any) {
    const alert = await this.alertCtrl.create({
      header: 'Edit Comment',
      inputs: [
        {
          name: 'comment',
          type: 'textarea',
          value: comment?.text || '',
          placeholder: 'Update your comment...',
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
          text: 'Save',
          handler: (data) => {
            const nextText = (data?.comment || '').trim();
            if (nextText.length > 0) {
              this.updateComment(post, comment, nextText);
            }
          }
        }
      ]
    });

    await alert.present();
  }

  private async confirmDeleteComment(post: any, comment: any) {
    const alert = await this.alertCtrl.create({
      header: 'Delete Comment',
      message: 'Are you sure you want to delete this comment?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => this.deleteComment(post, comment)
        }
      ]
    });

    await alert.present();
  }

  private async updateComment(post: any, comment: any, nextText: string) {
    try {
      const updatedComments = (post.comments || []).map((item: any) => {
        if (item.id === comment.id) {
          return {
            ...item,
            text: nextText,
            editedAt: new Date().getTime(),
          };
        }
        return item;
      });

      await updateDoc(doc(this.firestore, `posts/${post.id}`), {
        comments: updatedComments,
        updatedAt: new Date().toISOString(),
      });

      console.log('Comment updated successfully');
    } catch (error) {
      console.error('Failed to update comment', error);
    }
  }

  private async deleteComment(post: any, comment: any) {
    try {
      const updatedComments = (post.comments || []).filter((item: any) => item.id !== comment.id);

      await updateDoc(doc(this.firestore, `posts/${post.id}`), {
        comments: updatedComments,
        updatedAt: new Date().toISOString(),
      });

      console.log('Comment deleted successfully');
    } catch (error) {
      console.error('Failed to delete comment', error);
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
    this.router.navigate(['/chat']);
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
