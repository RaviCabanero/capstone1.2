import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ModalController, ToastController } from '@ionic/angular';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { Firestore, doc, docData, collection, query, where, collectionData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-alumni-network',
  templateUrl: './alumni-network.page.html',
  styleUrls: ['./alumni-network.page.scss'],
  standalone: false,
})
export class AlumniNetworkPage implements OnInit {
  // User Profile
  userProfile: any;
  userDepartment: string = '';

  // Invite Section
  inviteAvatars: any[] = [];

  // Network Overview Stats
  inviteSent: number = 0;
  connections: number = 0;
  following: number = 0;

  // Department Filter
  selectedDepartment: string = 'School of Education';
  selectedDepartmentFilter: string = 'my'; // 'my', 'all', or specific department name

  // Suggested Alumni
  suggestedAlumni: any[] = [];
  allAlumni: any[] = [];
  allSearchAlumni: any[] = [];
  notificationCount: number = 3;
  isSearching: boolean = false;
  searchQuery: string = '';

  constructor(
    private router: Router,
    private alertController: AlertController,
    private modalController: ModalController,
    private toastController: ToastController,
    private auth: Auth,
    private firestore: Firestore
  ) {}

  ngOnInit() {
    console.log('Alumni Network Page Initializing...');
    
    // Initialize invite avatars with placeholders
    this.inviteAvatars = [
      { firstName: 'User', lastName: '1', photoDataUrl: 'assets/icon/favicon.png' },
      { firstName: 'User', lastName: '2', photoDataUrl: 'assets/icon/favicon.png' },
      { firstName: 'User', lastName: '3', photoDataUrl: 'assets/icon/favicon.png' },
    ];
    
    this.loadUserProfile();
    this.loadNetworkStats();
    this.loadAlumniDirectly();
  }

  /**
   * Load alumni directly without waiting for profile
   */
  loadAlumniDirectly() {
    // Wait for auth state to be ready
    onAuthStateChanged(this.auth, (user) => {
      if (!user) {
        console.log('No authenticated user');
        return;
      }

      console.log('👤 Auth ready - User UID:', user.uid);
      this.loadAllUsers(user.uid);
    });
  }

  /**
   * Load all users from Firestore
   */
  private loadAllUsers(currentUserId: string) {
    console.log('Loading all users from Firestore...');
    const alumniQuery = query(collection(this.firestore, 'users'));

    collectionData(alumniQuery, { idField: 'id' }).subscribe(
      (users: any[]) => {
        console.log('Total users in database:', users.length);
        
        if (users.length === 0) {
          console.warn('No users found in database');
          this.suggestedAlumni = [];
          return;
        }
        
        // Filter out current user
        const filteredUsers = users.filter(user => user.id !== currentUserId);
        console.log('Users after filtering (excluding current):', filteredUsers.length);
        console.log('User details:', filteredUsers);
        
        // Update arrays
        this.allAlumni = filteredUsers;
        this.allSearchAlumni = filteredUsers;
        this.suggestedAlumni = filteredUsers;
        this.populateInviteAvatars(filteredUsers);
        
        console.log('Alumni loaded and displayed successfully');
      },
      (error) => {
        console.error('Error loading alumni from Firestore:', error);
      }
    );
  }

  /**
   * Load current user profile
   */
  loadUserProfile() {
    console.log('Starting profile load with auth state check...');
    
    onAuthStateChanged(this.auth, (user) => {
      if (!user) {
        console.log('No authenticated user in loadUserProfile');
        return;
      }

      console.log('Auth state ready, User UID:', user.uid);
      this.loadProfileData(user.uid);
    });
  }

  /**
   * Load profile data from Firestore
   */
  private loadProfileData(uid: string) {
    console.log('Loading profile data for UID:', uid);
    
    docData(doc(this.firestore, `users/${uid}`)).subscribe(
      (profile: any) => {
        console.log('Profile data received:', profile);
        console.log('Photo URL:', profile?.photoDataUrl);
        
        this.userProfile = profile;
        this.userDepartment = profile?.schoolDepartment || profile?.department || 'School of Education';
        
        console.log('User Department:', this.userDepartment);
        console.log('Full profile object:', this.userProfile);
        
        this.selectedDepartmentFilter = 'all';
        this.selectedDepartment = 'All Departments';
        this.loadSuggestedAlumni();
        this.loadAllAlumni();
      },
      (error) => {
        console.error(' Profile load error:', error);
      }
    );
  }

  /**
   * Load network statistics
   */
  loadNetworkStats() {
    const uid = this.auth.currentUser?.uid;
    if (uid) {
      docData(doc(this.firestore, `users/${uid}`)).subscribe((profile: any) => {
        // Handle both number counts and array-based data
        this.inviteSent = Array.isArray(profile?.inviteSent) ? profile.inviteSent.length : (profile?.inviteSent || 0);
        this.connections = Array.isArray(profile?.connections) ? profile.connections.length : (profile?.connections || 0);
        this.following = Array.isArray(profile?.following) ? profile.following.length : (profile?.following || 0);
        
        console.log('Network Stats loaded:', {
          inviteSent: this.inviteSent,
          connections: this.connections,
          following: this.following
        });
      });
    }
  }

  /**
   * Load suggested alumni based on selected department filter
   */
  loadSuggestedAlumni() {
    const currentUserId = this.auth.currentUser?.uid;

    console.log(' Loading users...');
    // Load all users first
    const alumniQuery = query(collection(this.firestore, 'users'));

    collectionData(alumniQuery, { idField: 'id' }).subscribe(
      (users: any[]) => {
        console.log(' Total users in database:', users.length);
        console.log(' All users:', users);
        
        // Filter only current user out
        let filteredUsers = users.filter(user => user.id !== currentUserId);
        console.log(' Users excluding current:', filteredUsers.length);

        // Apply department filter if one is selected
        const filterDept = this.getFilterDepartment();
        if (filterDept !== 'all') {
          const deptLower = filterDept.toLowerCase();
          filteredUsers = filteredUsers.filter(u => ((u.schoolDepartment || u.department || '')).toLowerCase() === deptLower);
          console.log(` Applied department filter (${filterDept}): ${filteredUsers.length} users`);
        }

        console.log(` Final filtered users: ${filteredUsers.length}`);
        this.allAlumni = filteredUsers;
        this.suggestedAlumni = filteredUsers;

        // Populate invite avatars with random users
        this.populateInviteAvatars(filteredUsers);
      },
      (error) => {
        console.error(' Error loading users:', error);
      }
    );
  }



  /**
   * Load all alumni for search based on selected department filter
   */
  loadAllAlumni() {
    const currentUserId = this.auth.currentUser?.uid;

    console.log(' Loading all alumni for search...');
    const alumniQuery = query(collection(this.firestore, 'users'));

    collectionData(alumniQuery, { idField: 'id' }).subscribe(
      (users: any[]) => {
        let filteredUsers = users.filter(user => user.id !== currentUserId);

            // Apply department filter to search cache as well
            const filterDept = this.getFilterDepartment();
            if (filterDept !== 'all') {
              const deptLower = filterDept.toLowerCase();
              filteredUsers = filteredUsers.filter(u => ((u.schoolDepartment || u.department || '')).toLowerCase() === deptLower);
            }

            this.allSearchAlumni = filteredUsers;
            console.log(' Search cache loaded:', this.allSearchAlumni.length, 'users');

            // Populate invite avatars with 3 random users
            this.populateInviteAvatars(filteredUsers);
      },
      (error) => {
        console.error(' Search cache error:', error);
      }
    );
  }

  /**
   * Populate invite avatars with 3 random users
   */
  private populateInviteAvatars(users: any[]) {
    if (users.length === 0) {
      this.inviteAvatars = [];
      return;
    }

    // Get 3 random unique users
    const randomUsers: any[] = [];
    const usersCopy = [...users];
    
    for (let i = 0; i < Math.min(3, usersCopy.length); i++) {
      const randomIndex = Math.floor(Math.random() * usersCopy.length);
      randomUsers.push(usersCopy[randomIndex]);
      usersCopy.splice(randomIndex, 1);
    }

    this.inviteAvatars = randomUsers;
    console.log(' Invite avatars populated with 3 random users:', this.inviteAvatars);
  }

  /**
   * Show toast message
   */
  private showToast(message: string) {
    this.toastController.create({
      message: message,
      duration: 2000,
      position: 'bottom',
      color: 'success',
    }).then(toast => toast.present());
  }

  /**
   * Navigate to profile
   */
  goToProfile() {
    this.router.navigate(['/profile']);
  }

  /**
   * Navigate to messages
   */
  goToMessages() {
    this.router.navigate(['/messages']);
  }

  /**
   * Search alumni to invite
   */
  searchAlumniToInvite() {
    this.router.navigate(['/alumni-search']);
  }

  /**
   * Dismiss alumnus from suggestions
   */
  dismissAlumnus(index: number) {
    this.suggestedAlumni.splice(index, 1);
  }

  /**
   * Connect with alumnus
   */
  async connectWithAlumnus(alumniId: string) {
    const alert = await this.alertController.create({
      header: 'Send Connection Request',
      message: 'Send a connection request to this alumnus?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Connect',
          handler: async () => {
            // Update connection in database
            const currentUserId = this.auth.currentUser?.uid;
            if (currentUserId) {
              // Add to connections list (implement based on your DB structure)
              const toast = await this.toastController.create({
                message: 'Connection request sent!',
                duration: 2000,
                position: 'bottom',
              });
              await toast.present();
            }
          },
        },
      ],
    });

    await alert.present();
  }

  /**
   * Navigate to alumni profile
   */
  goToAlumniProfile(alumniId: string) {
    this.router.navigate(['/profile', alumniId]);
  }

  /**
   * Search alumni across all departments
   */
  searchAlumni(event: any) {
    this.searchQuery = event.target.value.toLowerCase().trim();
    
    console.log(`Searching for: "${this.searchQuery}" in ${this.allSearchAlumni.length} users`);
    const sourceUsers = this.allSearchAlumni.length > 0 ? this.allSearchAlumni : this.allAlumni;
    
    if (this.searchQuery.length > 0) {
      this.isSearching = true;
      
      // Filter all users based on search query - check multiple fields
      this.suggestedAlumni = sourceUsers.filter(user => {
        const firstName = user.firstName?.toLowerCase() || '';
        const lastName = user.lastName?.toLowerCase() || '';
        const fullName = `${firstName} ${lastName}`;
        const email = user.email?.toLowerCase() || '';
        const department = (user.schoolDepartment || user.department || '').toLowerCase();

        return (
          fullName.includes(this.searchQuery) ||
          firstName.includes(this.searchQuery) ||
          lastName.includes(this.searchQuery) ||
          email.includes(this.searchQuery) ||
          department.includes(this.searchQuery)
        );
      });
      
      console.log(`Search results: ${this.suggestedAlumni.length} matches`, this.suggestedAlumni);
    } else {
      this.isSearching = false;
      // Reset to department alumni
      this.suggestedAlumni = this.allAlumni;
    }
  }

  /**
   * Clear search
   */
  clearSearch() {
    this.searchQuery = '';
    this.isSearching = false;
    this.suggestedAlumni = this.allAlumni;
  }

  /**
   * Show all alumni
   */
  showAllAlumni() {
    // Navigate to a full alumni list page or expand the view
    this.router.navigate(['/alumni-search']);
  }

  /**
   * Get the department to filter by based on selected filter
   */
  getFilterDepartment(): string {
    if (this.selectedDepartmentFilter === 'my') {
      return this.userDepartment;
    } else if (this.selectedDepartmentFilter === 'all') {
      return 'all';
    } else {
      return this.selectedDepartmentFilter;
    }
  }

  /**
   * Handle department filter change
   */
  onDepartmentChange() {
    const filterDept = this.getFilterDepartment();
    
    if (this.selectedDepartmentFilter === 'all' || filterDept === 'all') {
      this.selectedDepartment = 'All Departments';
    } else if (this.selectedDepartmentFilter === 'my') {
      this.selectedDepartment = `My Department (${this.userDepartment})`;
    } else {
      this.selectedDepartment = filterDept;
    }

    // Reload lists applying the chosen department filter
    this.loadSuggestedAlumni();
    this.loadAllAlumni();
  }

  /**
   * Open post modal
   */
  async openPostModal() {
    this.router.navigate(['/create-post']);
  }

  /**
   * Open menu
   */
  openMenu() {
    // Handle menu opening
    this.router.navigate(['/menu']);
  }
}


