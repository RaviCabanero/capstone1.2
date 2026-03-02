import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController, AlertController, ToastController, ViewWillEnter } from '@ionic/angular';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, docData, updateDoc, collection, addDoc, query, where, orderBy, collectionData, getDoc } from '@angular/fire/firestore';
import { Observable, of, map, catchError, switchMap } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { ConnectionRequestService } from '../services/connection-request.service';
import { PostModalComponent } from '../post-modal/post-modal.component';
import { ExperienceModalComponent } from '../experience-modal/experience-modal.component';
import { SkillModalComponent } from '../skill-modal/skill-modal.component';
import { AccomplishmentModalComponent } from '../accomplishment-modal/accomplishment-modal.component';
import { ContactModalComponent } from '../contact-modal/contact-modal.component';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, RouterModule],
})
export class ProfilePage implements OnInit, ViewWillEnter {
  user$ = this.authService.user$;
  userProfile$: Observable<any> = of({});
  userPosts$: Observable<any[]> = of([]);
  idRequest$: Observable<any> = of(null);
  avatarPreview: string | null = null;
  summaryDraft = '';
  editingSummary = false;
  groupedExperiences: any[] = [];
  profileUrl = '';

  // Search Alumni (same behavior as Home)
  searchQuery: string = '';
  isSearching: boolean = false;
  searchResults: any[] = [];
  allAlumni: any[] = [];
  
  // Track if viewing own profile or other user's profile
  viewedUserId: string | null = null;
  currentUserId: string | null = null;
  isOwnProfile: boolean = true;
  
  // Track connections
  currentUserConnections: string[] = [];
  isConnectedWithViewed: boolean = false;
  isPendingRequest: boolean = false;

  // Scroll handling
  showHeader: boolean = true;
  showFooter: boolean = true;
  private lastScrollTop: number = 0;

  private monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private authService: AuthService,
    private router: Router,
    private modalCtrl: ModalController,
    private activatedRoute: ActivatedRoute,
    private alertController: AlertController,
    private toastController: ToastController,
    private notificationService: NotificationService,
    private connectionRequestService: ConnectionRequestService
  ) {}

  ngOnInit() {
    const uid = this.auth.currentUser?.uid;
    this.currentUserId = uid || null;

    this.loadAllAlumniForSearch();

    // Load current user's connections
    if (uid) {
      this.loadCurrentUserConnections(uid);
    }

    // Check if viewing another user's profile from route params
    this.activatedRoute.params.subscribe(params => {
      if (params['id'] && params['id'] !== uid) {
        // Viewing another user's profile
        this.viewedUserId = params['id'];
        this.isOwnProfile = false;
        this.loadProfileData(params['id']);
      } else {
        // Viewing own profile
        if (uid) {
          this.viewedUserId = uid;
          this.isOwnProfile = true;
          this.loadProfileData(uid);
        } else {
          this.userProfile$ = of({});
          this.idRequest$ = of(null);
        }
      }
    });
  }

  /**
   * Refresh connection state when page comes back into view
   * This ensures the button updates to "Connected" after accepting a request
   */
  ionViewWillEnter() {
    if (this.viewedUserId && this.currentUserId && !this.isOwnProfile) {
      // Recheck if we're now connected with this user
      docData(doc(this.firestore, `users/${this.viewedUserId}`)).pipe(
        map((profile: any) => {
          if (profile?.connections && this.currentUserId) {
            this.isConnectedWithViewed = profile.connections.includes(this.currentUserId);
          }
          return profile;
        })
      ).subscribe();
      
      // Recheck pending request status
      this.checkPendingRequest(this.currentUserId, this.viewedUserId);
    }
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
      },
      (error) => {
        console.error('Error loading alumni:', error.message);
      }
    );
  }

  /**
   * Search alumni by name, course, year, department
   */
  searchAlumni(event: any) {
    this.searchQuery = (event.target.value || '').toLowerCase().trim();

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
    } else {
      this.clearSearch();
    }
  }

  clearSearch() {
    this.searchQuery = '';
    this.isSearching = false;
    this.searchResults = [];
  }

  goToAlumniProfile(alumniId: string) {
    this.router.navigate(['/profile', alumniId]);
    this.clearSearch();
  }

  loadProfileData(uid: string) {
    this.profileUrl = `${window.location.origin}/profile/${uid}`;
    this.userProfile$ = docData(doc(this.firestore, `users/${uid}`)).pipe(
      map((profile: any) => {
        if (profile?.experiences) {
          this.groupedExperiences = this.groupAndSortExperiences(profile.experiences);
        }
        // Check if we're connected with this user
        if (profile?.connections && this.currentUserId) {
          this.isConnectedWithViewed = profile.connections.includes(this.currentUserId);
        }
        // Check if there's a pending connection request
        if (!this.isOwnProfile && this.currentUserId) {
          this.checkPendingRequest(this.currentUserId, uid);
        }
        return profile;
      })
    ) as Observable<any>;
    
    this.idRequest$ = docData(doc(this.firestore, `idRequests/${uid}`)).pipe(
      catchError(() => of(null))
    ) as Observable<any>;
    
    this.loadUserPosts(uid);
  }

  /**
   * Check if there's a pending connection request to this user
   */
  private async checkPendingRequest(fromUserId: string, toUserId: string) {
    try {
      const existingRequest = await this.connectionRequestService.getExistingRequest(fromUserId, toUserId);
      this.isPendingRequest = existingRequest !== null && existingRequest?.status === 'pending';
    } catch (error) {
      console.error('Error checking pending request:', error);
      this.isPendingRequest = false;
    }
  }

  loadUserPosts(uid: string) {
    const postsQuery = query(
      collection(this.firestore, 'posts'),
      where('userId', '==', uid),
      orderBy('timestamp', 'desc')
    );
    this.userPosts$ = collectionData(postsQuery, { idField: 'id' }).pipe(
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

        // Filter posts based on visibility and connection status
        return postsWithUserData.filter(post => this.canViewPost(post));
      })
    ) as Observable<any[]>;
  }

  /**
   * Check if current user can view a post based on visibility settings
   */
  private canViewPost(post: any): boolean {
    // Own posts are always visible
    if (this.isOwnProfile) {
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
      return this.isConnectedWithViewed;
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
  private loadCurrentUserConnections(uid: string) {
    docData(doc(this.firestore, `users/${uid}`)).subscribe(
      (profile: any) => {
        this.currentUserConnections = profile?.connections || [];
      },
      (error) => {
        console.error('Error loading connections:', error);
        this.currentUserConnections = [];
      }
    );
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

  async logout() {
    await this.authService.logoutAndRedirect('/login');
  }

  goToProfile() {
    // Navigate to own profile
    if (this.currentUserId) {
      this.router.navigate(['/profile', this.currentUserId]);
    } else {
      this.router.navigate(['/profile']);
    }
  }

  onAvatarSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.avatarPreview = typeof reader.result === 'string' ? reader.result : null;
    };
    reader.readAsDataURL(file);

    // Persist a compressed data URL to Firestore (no Storage needed)
    this.saveAvatarToFirestore(file).catch(err => console.error('Avatar save failed', err));
  }

  startEditSummary(profile: any) {
    this.summaryDraft = profile?.summary || '';
    this.editingSummary = true;
  }

  async cancelEditSummary() {
    const alert = await this.alertController.create({
      header: 'Cancel Changes',
      message: 'Are you sure you want to cancel? All changes will be lost.',
      buttons: [
        {
          text: 'Continue Editing',
          role: 'cancel'
        },
        {
          text: 'Discard',
          role: 'destructive',
          handler: () => {
            this.editingSummary = false;
          }
        }
      ]
    });

    await alert.present();
  }

  async saveSummary() {
    const alert = await this.alertController.create({
      header: 'Save Summary',
      message: 'Do you want to save your profile summary?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Save',
          handler: async () => {
            const uid = this.currentUserId;
            if (!uid || !this.isOwnProfile) return;
            await updateDoc(doc(this.firestore, `users/${uid}`), {
              summary: this.summaryDraft,
              updatedAt: new Date().toISOString(),
            });
            this.editingSummary = false;
          }
        }
      ]
    });

    await alert.present();
  }

  async openPostModal() {
    const currentProfile = await this.userProfile$.pipe(
      map(profile => profile)
    ).toPromise();
    
    const modal = await this.modalCtrl.create({
      component: PostModalComponent,
      componentProps: {
        userName: currentProfile?.firstName && currentProfile?.lastName 
          ? `${currentProfile.firstName} ${currentProfile.lastName}` 
          : this.auth.currentUser?.displayName || 'User',
        userAvatar: currentProfile?.photoDataUrl || ''
      }
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data) {
      await this.savePost(data);
    }
  }

  goToActivity() {
    this.router.navigate(['/activity']);
  }

  /**
   * Send a connection request to another alumni
   */
  async connectWithAlumni(alumniId: string | null) {
    // Get current user ID from Firebase Auth (more reliable than property)
    const currentUserId = this.auth.currentUser?.uid;
    
    if (!alumniId || !currentUserId) {
      console.error('Invalid user IDs:', { alumniId, currentUserId });
      const toast = await this.toastController.create({
        message: 'Error: Please log in and try again',
        duration: 2000,
        position: 'bottom',
        color: 'danger'
      });
      await toast.present();
      return;
    }

    const alert = await this.alertController.create({
      header: 'Send Connection Request',
      message: 'Would you like to send a connection request to this alumni?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Send Request',
          handler: async () => {
            try {
              // Send connection request using the service
              await this.connectionRequestService.sendConnectionRequest(alumniId);

              // Update the pending request status
              this.isPendingRequest = true;

              // Show success toast
              const toast = await this.toastController.create({
                message: 'Connection request sent!',
                duration: 2000,
                position: 'bottom',
                color: 'success'
              });
              await toast.present();

              console.log('Connection request sent successfully');
            } catch (error) {
              console.error('Error sending connection request:', error);
              const toast = await this.toastController.create({
                message: 'Failed to send connection request',
                duration: 2000,
                position: 'bottom',
                color: 'danger'
              });
              await toast.present();
            }
          },
        },
      ],
    });

    await alert.present();
  }

  async openExperienceModal(existingExperience?: any) {
    const modal = await this.modalCtrl.create({
      component: ExperienceModalComponent,
      componentProps: {
        existingExperience: existingExperience || null,
      },
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data) {
      if (existingExperience) {
        await this.updateExperience(existingExperience, data);
      } else {
        await this.addExperience(data);
      }
    }
  }

  async addExperience(experience: any) {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return;

    try {
      // Get current user profile
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

      // Add experience to experiences array
      const experiences = userDoc?.experiences || [];
      const updatedExperiences = [
        ...experiences,
        {
          ...experience,
          id: new Date().getTime().toString(),
          createdAt: new Date().toISOString(),
        },
      ];

      await updateDoc(doc(this.firestore, `users/${uid}`), {
        experiences: updatedExperiences,
        updatedAt: new Date().toISOString(),
      });

      console.log('Experience added successfully');
    } catch (error) {
      console.error('Failed to add experience', error);
    }
  }

  async updateExperience(originalExperience: any, updatedExperience: any) {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return;

    try {
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

      const experiences = userDoc?.experiences || [];
      const updatedExperiences = experiences.map((exp: any) => {
        const sameById = !!originalExperience?.id && exp?.id === originalExperience.id;
        const sameByFields =
          !originalExperience?.id &&
          exp?.company === originalExperience?.company &&
          exp?.title === originalExperience?.title &&
          exp?.startMonth === originalExperience?.startMonth &&
          exp?.startYear === originalExperience?.startYear;

        if (sameById || sameByFields) {
          return {
            ...exp,
            ...updatedExperience,
            id: exp?.id || updatedExperience?.id || new Date().getTime().toString(),
            createdAt: exp?.createdAt || updatedExperience?.createdAt || new Date().toISOString(),
          };
        }

        return exp;
      });

      await updateDoc(doc(this.firestore, `users/${uid}`), {
        experiences: updatedExperiences,
        updatedAt: new Date().toISOString(),
      });

      console.log('Experience updated successfully');
    } catch (error) {
      console.error('Failed to update experience', error);
    }
  }

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
        userName: this.auth.currentUser?.displayName || 'User',
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

  private async saveAvatarToFirestore(file: File) {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return;

    const dataUrl = await this.fileToDataUrl(file);
    const compressed = await this.downscaleDataUrl(dataUrl, 256);

    await updateDoc(doc(this.firestore, `users/${uid}`), {
      photoDataUrl: compressed,
      updatedAt: new Date().toISOString(),
    });

    this.avatarPreview = compressed;
  }

  private fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') resolve(reader.result);
        else reject(new Error('Failed to read file'));
      };
      reader.onerror = () => reject(reader.error || new Error('File read error'));
      reader.readAsDataURL(file);
    });
  }

  private downscaleDataUrl(dataUrl: string, maxSize: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas not supported'));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = err => reject(err);
      img.src = dataUrl;
    });
  }

  /**
   * Group experiences by company and sort roles in reverse chronological order
   */
  private groupAndSortExperiences(experiences: any[]): any[] {
    if (!experiences || experiences.length === 0) return [];

    // Group by company
    const companiesMap = new Map<string, any[]>();
    experiences.forEach(exp => {
      const company = exp.company || 'Unknown Company';
      if (!companiesMap.has(company)) {
        companiesMap.set(company, []);
      }
      companiesMap.get(company)!.push(exp);
    });

    // Process each company's roles and calculate totals
    const grouped = Array.from(companiesMap.entries()).map(([company, roles]) => {
      // Sort roles by end date in reverse chronological order (newest first)
      const sortedRoles = roles.sort((a, b) => {
        const aEndYear = a.currentlyWorking ? new Date().getFullYear() : a.endYear || 0;
        const aEndMonth = a.currentlyWorking ? new Date().getMonth() + 1 : a.endMonth || 1;
        const bEndYear = b.currentlyWorking ? new Date().getFullYear() : b.endYear || 0;
        const bEndMonth = b.currentlyWorking ? new Date().getMonth() + 1 : b.endMonth || 1;

        if (aEndYear !== bEndYear) {
          return bEndYear - aEndYear;
        }
        return bEndMonth - aEndMonth;
      });

      return {
        name: company,
        totalDuration: this.calculateCompanyDuration(sortedRoles),
        roles: sortedRoles,
      };
    });

    // Sort companies by most recent role (company with newest end date first)
    return grouped.sort((a, b) => {
      const aLatestRole = a.roles[0];
      const bLatestRole = b.roles[0];

      const aYear = aLatestRole.currentlyWorking ? new Date().getFullYear() : aLatestRole.endYear || 0;
      const bYear = bLatestRole.currentlyWorking ? new Date().getFullYear() : bLatestRole.endYear || 0;
      const aMonth = aLatestRole.currentlyWorking ? new Date().getMonth() + 1 : aLatestRole.endMonth || 1;
      const bMonth = bLatestRole.currentlyWorking ? new Date().getMonth() + 1 : bLatestRole.endMonth || 1;

      if (aYear !== bYear) {
        return bYear - aYear;
      }
      return bMonth - aMonth;
    });
  }

  /**
   * Calculate total duration across all roles for a company
   */
  private calculateCompanyDuration(roles: any[]): string {
    let totalMonths = 0;

    roles.forEach(role => {
      const startDate = new Date(role.startYear || 0, (role.startMonth || 1) - 1, 1);
      const endDate = role.currentlyWorking
        ? new Date()
        : new Date(role.endYear || 0, (role.endMonth || 1) - 1, 1);

      const monthDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
        (endDate.getMonth() - startDate.getMonth());
      totalMonths += Math.max(0, monthDiff);
    });

    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;

    if (years === 0) {
      return months === 1 ? '1 mo' : `${months} mos`;
    } else if (months === 0) {
      return years === 1 ? '1 yr' : `${years} yrs`;
    } else {
      const yearText = years === 1 ? '1 yr' : `${years} yrs`;
      const monthText = months === 1 ? '1 mo' : `${months} mos`;
      return `${yearText} ${monthText}`;
    }
  }

  /**
   * Format date for display (e.g., "May 2025")
   */
  formatDate(year: number | null, month: number | null): string {
    if (!year) return 'Date not set';
    if (!month) return year.toString();
    return `${this.monthNames[Math.max(0, Math.min(month - 1, 11))]} ${year}`;
  }

  /**
   * Calculate duration for a single role (e.g., "9 mos")
   */
  calculateDuration(role: any): string {
    const startDate = new Date(role.startYear || 0, (role.startMonth || 1) - 1, 1);
    const endDate = role.currentlyWorking
      ? new Date()
      : new Date(role.endYear || 0, (role.endMonth || 1) - 1, 1);

    const monthDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      (endDate.getMonth() - startDate.getMonth());
    const months = Math.max(0, monthDiff);

    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;

    if (years === 0) {
      return remainingMonths === 1 ? '1 mo' : `${remainingMonths} mos`;
    } else if (remainingMonths === 0) {
      return years === 1 ? '1 yr' : `${years} yrs`;
    } else {
      const yearText = years === 1 ? '1 yr' : `${years} yrs`;
      const monthText = remainingMonths === 1 ? '1 mo' : `${remainingMonths} mos`;
      return `${yearText} ${monthText}`;
    }
  }

  /**
   * Truncate description to 150 characters
   */
  truncateDescription(description: string): string {
    if (!description) return '';
    if (description.length <= 150) return description;
    return description.substring(0, 150).trim();
  }

  /**
   * Open skill modal for adding new skill
   */
  async openSkillModal(skill?: any) {
    const modal = await this.modalCtrl.create({
      component: SkillModalComponent,
      componentProps: {
        skill: skill || null,
      },
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data) {
      if (skill) {
        // Editing existing skill
        await this.updateSkill(skill, data);
      } else {
        // Adding new skill
        await this.addSkill(data);
      }
    }
  }

  /**
   * Add skill to user profile
   */
  async addSkill(skill: any) {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return;

    try {
      // Get current user profile
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

      // Add skill to skills array
      const skills = userDoc?.skills || [];
      const updatedSkills = [
        ...skills,
        {
          ...skill,
          createdAt: new Date().toISOString(),
        },
      ];

      await updateDoc(doc(this.firestore, `users/${uid}`), {
        skills: updatedSkills,
        updatedAt: new Date().toISOString(),
      });

      console.log('Skill added successfully');
    } catch (error) {
      console.error('Failed to add skill', error);
    }
  }

  /**
   * Update existing skill
   */
  async updateSkill(oldSkill: any, updatedSkill: any) {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return;

    try {
      // Get current user profile
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

      // Find and update the skill
      const skills = userDoc?.skills || [];
      const updatedSkills = skills.map((skill: any) =>
        skill.name === oldSkill.name ? { ...updatedSkill, updatedAt: new Date().toISOString() } : skill
      );

      await updateDoc(doc(this.firestore, `users/${uid}`), {
        skills: updatedSkills,
        updatedAt: new Date().toISOString(),
      });

      console.log('Skill updated successfully');
    } catch (error) {
      console.error('Failed to update skill', error);
    }
  }

  /**
   * Delete skill from user profile
   */
  async deleteSkill(skillToDelete: any) {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return;

    try {
      // Get current user profile
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

      // Remove skill from skills array
      const skills = userDoc?.skills || [];
      const updatedSkills = skills.filter(
        (s: any) => s.id !== skillToDelete.id || s.name !== skillToDelete.name
      );

      await updateDoc(doc(this.firestore, `users/${uid}`), {
        skills: updatedSkills,
        updatedAt: new Date().toISOString(),
      });

      console.log('Skill deleted successfully');
    } catch (error) {
      console.error('Failed to delete skill', error);
    }
  }

  /**
   * Open accomplishment modal for adding new accomplishment
   */
  async openAccomplishmentModal() {
    const modal = await this.modalCtrl.create({
      component: AccomplishmentModalComponent,
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data) {
      await this.addAccomplishment(data);
    }
  }

  /**
   * Add accomplishment to user profile
   */
  async addAccomplishment(accomplishment: any) {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return;

    try {
      // Get current user profile
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

      // Add accomplishment to accomplishments array
      const accomplishments = userDoc?.accomplishments || [];
      const updatedAccomplishments = [
        ...accomplishments,
        {
          ...accomplishment,
          createdAt: new Date().toISOString(),
        },
      ];

      await updateDoc(doc(this.firestore, `users/${uid}`), {
        accomplishments: updatedAccomplishments,
        updatedAt: new Date().toISOString(),
      });

      console.log('Accomplishment added successfully');
    } catch (error) {
      console.error('Failed to add accomplishment', error);
    }
  }

  /**
   * Delete accomplishment from user profile
   */
  async deleteAccomplishment(accToDelete: any) {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return;

    try {
      // Get current user profile
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

      // Remove accomplishment from accomplishments array
      const accomplishments = userDoc?.accomplishments || [];
      const updatedAccomplishments = accomplishments.filter(
        (a: any) => a.id !== accToDelete.id || a.title !== accToDelete.title
      );

      await updateDoc(doc(this.firestore, `users/${uid}`), {
        accomplishments: updatedAccomplishments,
        updatedAt: new Date().toISOString(),
      });

      console.log('Accomplishment deleted successfully');
    } catch (error) {
      console.error('Failed to delete accomplishment', error);
    }
  }

  /**
   * Open contact modal for editing contact information
   */
  async openContactModal() {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return;

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

    const modal = await this.modalCtrl.create({
      component: ContactModalComponent,
      componentProps: {
        currentContact: {
          email: userDoc?.email || '',
          phone: userDoc?.phone || '',
          website: userDoc?.website || '',
        },
        userId: uid,
      },
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data) {
      await this.updateContactInfo(data);
    }
  }

  /**
   * Update contact information
   */
  async updateContactInfo(contactInfo: any) {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return;

    try {
      await updateDoc(doc(this.firestore, `users/${uid}`), {
        email: contactInfo.email,
        phone: contactInfo.phone,
        website: contactInfo.website,
        updatedAt: new Date().toISOString(),
      });

      console.log('Contact info updated successfully');
    } catch (error) {
      console.error('Failed to update contact info', error);
    }
  }

  /**
   * Copy profile URL to clipboard
   */
  async copyProfileUrl() {
    try {
      await navigator.clipboard.writeText(this.profileUrl);
      console.log('Profile URL copied to clipboard');
    } catch (error) {
      console.error('Failed to copy URL', error);
    }
  }

  /**
   * Navigate to alumni ID request form
   */
  openAlumniIdRequest() {
    this.router.navigate(['/alumni-id-request']);
  }

  /**
   * Navigate to home page
   */
  goToHome() {
    this.router.navigate(['/home']);
  }

  /**
   * Navigate to alumni network page
   */
  goToAlumniNetwork() {
    this.router.navigate(['/alumni-network']);
  }

  /**
   * Navigate to notifications page
   */
  goToNotifications() {
    this.router.navigate(['/notifications']);
  }

  /**
   * Handle scroll event to show/hide header and footer
   */
  onScroll(event: any) {
    const scrollTop = event.detail.scrollTop;
    
    if (scrollTop > this.lastScrollTop) {
      // Scrolling down
      this.showHeader = false;
      this.showFooter = false;
    } else {
      // Scrolling up
      this.showHeader = true;
      this.showFooter = true;
    }
    
    this.lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
  }
}
