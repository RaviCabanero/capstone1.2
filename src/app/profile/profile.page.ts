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

  searchQuery: string = '';
  isSearching: boolean = false;
  searchResults: any[] = [];
  allAlumni: any[] = [];
  
  viewedUserId: string | null = null;
  currentUserId: string | null = null;
  isOwnProfile: boolean = true;
  
  currentUserConnections: string[] = [];
  isConnectedWithViewed: boolean = false;
  isPendingRequest: boolean = false;

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

    if (uid) {
      this.loadCurrentUserConnections(uid);
    }

    this.activatedRoute.params.subscribe(params => {
      if (params['id'] && params['id'] !== uid) {
        this.viewedUserId = params['id'];
        this.isOwnProfile = false;
        this.loadProfileData(params['id']);
      } else {
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

  
  ionViewWillEnter() {
    if (this.viewedUserId && this.currentUserId && !this.isOwnProfile) {
      docData(doc(this.firestore, `users/${this.viewedUserId}`)).pipe(
        map((profile: any) => {
          if (profile?.connections && this.currentUserId) {
            this.isConnectedWithViewed = profile.connections.includes(this.currentUserId);
          }
          return profile;
        })
      ).subscribe();
      
      this.checkPendingRequest(this.currentUserId, this.viewedUserId);
    }
  }

  
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
        if (profile?.connections && this.currentUserId) {
          this.isConnectedWithViewed = profile.connections.includes(this.currentUserId);
        }
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
        const postsWithUserData = await Promise.all(
          posts.map(async (post) => {
            const processedPost = {
              ...post,
              timestamp: this.convertTimestamp(post.timestamp),
            };

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
    if (this.isOwnProfile) {
      return true;
    }

    const postVisibility = post.visibility || 'public';

    if (postVisibility === 'public') {
      return true;
    }

    if (postVisibility === 'friends') {
      return this.isConnectedWithViewed;
    }

    if (postVisibility === 'onlyme') {
      return false;
    }

    return false;
  }

 
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
    if (timestamp && typeof timestamp.toMillis === 'function') {
      return timestamp.toMillis();
    }
    if (typeof timestamp === 'number') {
      return timestamp;
    }
    return new Date().getTime();
  }

  async logout() {
    await this.authService.logoutAndRedirect('/login');
  }

  goToProfile() {
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

  
  async connectWithAlumni(alumniId: string | null) {
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
              await this.connectionRequestService.sendConnectionRequest(alumniId);

              this.isPendingRequest = true;

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

  
  private groupAndSortExperiences(experiences: any[]): any[] {
    if (!experiences || experiences.length === 0) return [];

    const companiesMap = new Map<string, any[]>();
    experiences.forEach(exp => {
      const company = exp.company || 'Unknown Company';
      if (!companiesMap.has(company)) {
        companiesMap.set(company, []);
      }
      companiesMap.get(company)!.push(exp);
    });

    const grouped = Array.from(companiesMap.entries()).map(([company, roles]) => {
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

 
  formatDate(year: number | null, month: number | null): string {
    if (!year) return 'Date not set';
    if (!month) return year.toString();
    return `${this.monthNames[Math.max(0, Math.min(month - 1, 11))]} ${year}`;
  }

  
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

  truncateDescription(description: string): string {
    if (!description) return '';
    if (description.length <= 150) return description;
    return description.substring(0, 150).trim();
  }

  
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
        await this.updateSkill(skill, data);
      } else {
        await this.addSkill(data);
      }
    }
  }

  
  async addSkill(skill: any) {
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

  
  async updateSkill(oldSkill: any, updatedSkill: any) {
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

  async deleteSkill(skillToDelete: any) {
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

  
  async addAccomplishment(accomplishment: any) {
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

  
  async deleteAccomplishment(accToDelete: any) {
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

 
  async copyProfileUrl() {
    try {
      await navigator.clipboard.writeText(this.profileUrl);
      console.log('Profile URL copied to clipboard');
    } catch (error) {
      console.error('Failed to copy URL', error);
    }
  }

  
  openAlumniIdRequest() {
    this.router.navigate(['/alumni-id-request']);
  }

  
  goToHome() {
    this.router.navigate(['/home']);
  }

  
  goToAlumniNetwork() {
    this.router.navigate(['/alumni-network']);
  }

  
  goToNotifications() {
    this.router.navigate(['/notifications']);
  }

  onScroll(event: any) {
    const scrollTop = event.detail.scrollTop;
    
    if (scrollTop > this.lastScrollTop) {
      this.showHeader = false;
      this.showFooter = false;
    } else {
      this.showHeader = true;
      this.showFooter = true;
    }
    
    this.lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
  }
}
