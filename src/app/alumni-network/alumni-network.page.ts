import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ModalController, ToastController } from '@ionic/angular';
import { Auth } from '@angular/fire/auth';
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
  inviteAvatars: string[] = [
    'assets/icon/favicon.png',
    'assets/icon/favicon.png',
    'assets/icon/favicon.png',
  ];

  // Network Overview Stats
  inviteSent: number = 0;
  connections: number = 0;
  following: number = 0;

  // Department
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
    console.log('🚀 Alumni Network Page Initializing...');
    this.loadUserProfile();
    this.loadNetworkStats();
  }

  /**
   * Load current user profile
   */
  loadUserProfile() {
    const uid = this.auth.currentUser?.uid;
    
    if (!uid) {
      console.log('❌ No authenticated user');
      return;
    }

    console.log('👤 Loading profile for user:', uid);
    docData(doc(this.firestore, `users/${uid}`)).subscribe(
      (profile: any) => {
        console.log('✅ Profile loaded:', profile);
        this.userProfile = profile;
        this.userDepartment = profile?.schoolDepartment || profile?.department || 'School of Education';
        this.selectedDepartmentFilter = 'my'; // Default to user's department
        this.selectedDepartment = `Josenian you may know in ${this.userDepartment}`;
        this.loadSuggestedAlumni();
        this.loadAllAlumni();
      },
      (error) => {
        console.error('❌ Profile load error:', error);
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
        this.inviteSent = profile?.inviteSent || 0;
        this.connections = profile?.connections || 0;
        this.following = profile?.following || 0;
      });
    }
  }

  /**
   * Load suggested alumni based on selected department filter
   */
  loadSuggestedAlumni() {
    const currentUserId = this.auth.currentUser?.uid;
    const filterDept = this.getFilterDepartment();

    let alumniQuery;
    if (filterDept === 'all') {
      console.log('🔄 Loading users from ALL departments');
      alumniQuery = query(collection(this.firestore, 'users'));
    } else {
      console.log('🔄 Loading users from:', filterDept);
      alumniQuery = query(
        collection(this.firestore, 'users'),
        where('schoolDepartment', '==', filterDept)
      );
    }

    collectionData(alumniQuery, { idField: 'id' }).subscribe(
      (users: any[]) => {
        this.allAlumni = users.filter(user => user.id !== currentUserId);
        this.suggestedAlumni = this.allAlumni;
        console.log('✅ Loaded users:', this.allAlumni.length, this.allAlumni);
      },
      (error) => {
        console.error('❌ Permission Error:', error.message);
      }
    );
  }



  /**
   * Load all alumni for search based on selected department filter
   */
  loadAllAlumni() {
    const currentUserId = this.auth.currentUser?.uid;
    const filterDept = this.getFilterDepartment();

    let alumniQuery;
    if (filterDept === 'all') {
      console.log('🔍 Loading search cache from ALL departments');
      alumniQuery = query(collection(this.firestore, 'users'));
    } else {
      console.log('🔍 Loading search cache from:', filterDept);
      alumniQuery = query(
        collection(this.firestore, 'users'),
        where('schoolDepartment', '==', filterDept)
      );
    }

    collectionData(alumniQuery, { idField: 'id' }).subscribe(
      (users: any[]) => {
        this.allSearchAlumni = users.filter(user => user.id !== currentUserId);
        console.log('✅ Search cache loaded:', this.allSearchAlumni.length, 'users');
      },
      (error) => {
        console.error('❌ Search cache error:', error.message);
      }
    );
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
        const major = user.major?.toLowerCase() || '';
        const department = (user.schoolDepartment || user.department || '').toLowerCase();

        return (
          fullName.includes(this.searchQuery) ||
          firstName.includes(this.searchQuery) ||
          lastName.includes(this.searchQuery) ||
          email.includes(this.searchQuery) ||
          major.includes(this.searchQuery) ||
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
    
    if (filterDept === 'all') {
      this.selectedDepartment = 'All Josenians';
    } else {
      this.selectedDepartment = `Josenian you may know in ${filterDept}`;
    }
    
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


