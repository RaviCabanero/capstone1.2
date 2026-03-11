import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ModalController, ToastController } from '@ionic/angular';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { Firestore, doc, docData, collection, query, where, collectionData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { ConnectionRequestService } from '../services/connection-request.service';

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

  // Network Lists (for modals)
  outgoingRequests: any[] = [];
  acceptedConnections: any[] = [];
  showInviteListModal: boolean = false;
  showConnectionListModal: boolean = false;

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
    private firestore: Firestore,
    private connectionRequestService: ConnectionRequestService
  ) {}

  ngOnInit() {
    console.log('Alumni Network Page Initializing...');
    
    // Initialize invite avatars with placeholders
    this.inviteAvatars = [
      { firstName: 'User', lastName: '1', photoDataUrl: null },
      { firstName: 'User', lastName: '2', photoDataUrl: null },
      { firstName: 'User', lastName: '3', photoDataUrl: null },
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

        // Normalize photo URLs so that placeholder assets don't show as “real” avatars
        const normalizedUsers = filteredUsers.map((user) => ({
          ...user,
          photoDataUrl: user.photoDataUrl && !user.photoDataUrl.includes('assets/icon') ? user.photoDataUrl : null,
        }));

        console.log('Users after filtering (excluding current):', normalizedUsers.length);
        console.log('User details:', normalizedUsers);
        
        // Update arrays
        this.allAlumni = normalizedUsers;
        this.allSearchAlumni = normalizedUsers;
        this.suggestedAlumni = normalizedUsers;
        this.populateInviteAvatars(normalizedUsers);
        
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
    // Wait for auth state to be ready
    onAuthStateChanged(this.auth, (user) => {
      if (!user) {
        console.log('No authenticated user for stats');
        return;
      }

      const uid = user.uid;
      console.log('Loading network stats for user:', uid);

      // Load outgoing connection requests count
      this.connectionRequestService.getOutgoingRequests(uid).subscribe({
        next: (requests: any[]) => {
          this.inviteSent = requests.length;
          console.log('✅ Outgoing requests count:', this.inviteSent, 'Requests:', requests);
        },
        error: (error) => {
          console.error('❌ Error loading outgoing requests count:', error);
          this.inviteSent = 0;
        }
      });

      // Load accepted connections count from user profile
      docData(doc(this.firestore, `users/${uid}`)).subscribe((profile: any) => {
        this.connections = Array.isArray(profile?.connections) ? profile.connections.length : 0;
        this.following = Array.isArray(profile?.following) ? profile.following.length : 0;
        
        console.log('✅ Network Stats loaded:', {
          inviteSent: this.inviteSent,
          connections: this.connections,
          following: this.following,
          profileConnections: profile?.connections
        });
      });
    });
  }

  /**
   * Load outgoing connection requests
   */
  loadOutgoingRequests() {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return;

    this.connectionRequestService.getOutgoingRequests(uid).subscribe({
      next: (requests: any[]) => {
        // Enrich with user data for display
        this.outgoingRequests = requests.map((req: any) => {
          const userData = this.allAlumni.find(a => a.id === req.toUserId);
          return { ...req, toUser: userData || { id: req.toUserId, firstName: 'Alumni' } };
        });

        console.log('Outgoing requests loaded:', this.outgoingRequests);
      },
      error: (error) => {
        console.error('Error loading outgoing requests:', error);
      }
    });
  }

  /**
   * Load accepted connections
   */
  loadAcceptedConnections() {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return;

    try {
      const connectionIds = this.userProfile?.connections || [];
      
      // Fetch user data for each connected user ID
      this.acceptedConnections = connectionIds.map((userId: string) => {
        const userData = this.allAlumni.find(a => a.id === userId);
        return userData || { id: userId, firstName: 'Alumni' };
      });

      console.log('Accepted connections loaded:', this.acceptedConnections);
    } catch (error) {
      console.error('Error loading accepted connections:', error);
    }
  }

  /**
   * Show invite sent list
   */
  showInviteSentList() {
    this.loadOutgoingRequests();
    this.showInviteListModal = true;
  }

  /**
   * Show connections list
   */
  showConnectionsList() {
    this.loadAcceptedConnections();
    this.showConnectionListModal = true;
  }

  /**
   * Close modals
   */
  closeInviteModal() {
    this.showInviteListModal = false;
  }

  closeConnectionModal() {
    this.showConnectionListModal = false;
  }

  /**
   * Navigate to user profile from modal
   */
  goToUserProfile(userId: string) {
    this.router.navigate(['/profile', userId]);
    this.closeInviteModal();
    this.closeConnectionModal();
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
    this.router.navigate(['/chat']);
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
          text: 'Send Request',
          handler: async () => {
            const currentUserId = this.auth.currentUser?.uid;
            if (currentUserId) {
              try {
                // Send connection request using the service
                await this.connectionRequestService.sendConnectionRequest(alumniId);

                // Show success toast
                const toast = await this.toastController.create({
                  message: 'Connection request sent!',
                  duration: 2000,
                  position: 'bottom',
                  color: 'success',
                });
                await toast.present();

                // Remove from suggested alumni list
                const index = this.suggestedAlumni.findIndex(user => user.id === alumniId);
                if (index > -1) {
                  this.suggestedAlumni.splice(index, 1);
                }
              } catch (error) {
                console.error('Error sending connection request:', error);
                const errorToast = await this.toastController.create({
                  message: 'Failed to send connection request',
                  duration: 2000,
                  position: 'bottom',
                  color: 'danger',
                });
                await errorToast.present();
              }
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


