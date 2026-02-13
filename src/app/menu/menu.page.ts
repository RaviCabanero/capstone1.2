import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { AlertController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.page.html',
  styleUrls: ['./menu.page.scss'],
  standalone: false,
})
export class MenuPage implements OnInit {
  userProfile: any;
  isAdmin: boolean = false;

  constructor(
    private router: Router,
    private auth: Auth,
    private authService: AuthService,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.loadUserProfile();
  }

  /**
   * Load current user profile
   */
  loadUserProfile() {
    this.authService.user$.subscribe((user: any) => {
      this.userProfile = user;
      this.isAdmin = user?.role === 'admin' || user?.role === 'super-admin';
    });
  }

  /**
   * Navigate to profile
   */
  goToProfile() {
    this.router.navigate(['/profile']);
  }

  /**
   * Navigate to home
   */
  goToHome() {
    this.router.navigate(['/home']);
  }

  /**
   * Navigate to alumni network
   */
  goToAlumniNetwork() {
    this.router.navigate(['/alumni-network']);
  }

  /**
   * Navigate to notifications
   */
  goToNotifications() {
    this.router.navigate(['/notifications']);
  }

  /**
   * Navigate to activity
   */
  goToActivity() {
    this.router.navigate(['/activity']);
  }

  /**
   * Navigate to create post
   */
  goToCreatePost() {
    this.router.navigate(['/create-post']);
  }

  /**
   * Navigate to messages
   */
  goToMessages() {
    this.router.navigate(['/messages']);
  }

  /**
   * Navigate to alumni ID request
   */
  goToAlumniIDRequest() {
    this.router.navigate(['/alumni-id-request']);
  }

  /**
   * Navigate to super admin dashboard
   */
  goToSuperAdminDashboard() {
    this.router.navigate(['/super-admin']);
  }

  /**
   * Navigate to alumni admin dashboard
   */
  goToAlumniAdminDashboard() {
    this.router.navigate(['/alumni-admin']);
  }

  /**
   * Settings
   */
  goToSettings() {
    this.router.navigate(['/settings']);
  }

  /**
   * Help & Support
   */
  goToHelpSupport() {
    this.alertController.create({
      header: 'Help Center',
      message: 'For support, please contact us at support@alumni.com',
      buttons: ['OK']
    }).then(alert => alert.present());
  }

  /**
   * Handle Sign In & Security
   */
  async handleSignInSecurity() {
    const alert = await this.alertController.create({
      header: 'Sign in & Security',
      message: 'Manage your account security settings.',
      buttons: ['OK']
    });
    await alert.present();
  }

  /**
   * Handle Visibility
   */
  async handleVisibility() {
    const alert = await this.alertController.create({
      header: 'Visibility',
      message: 'Control who can see your profile and posts.',
      buttons: ['OK']
    });
    await alert.present();
  }

  /**
   * Handle Data Privacy
   */
  async handleDataPrivacy() {
    const alert = await this.alertController.create({
      header: 'Data Privacy',
      message: 'Manage your data and privacy preferences.',
      buttons: ['OK']
    });
    await alert.present();
  }

  /**
   * Handle Privacy Policy
   */
  async handlePrivacyPolicy() {
    const alert = await this.alertController.create({
      header: 'Privacy Policy',
      message: 'View our privacy policy',
      buttons: ['OK']
    });
    await alert.present();
  }

  /**
   * Handle Accessibility
   */
  async handleAccessibility() {
    const alert = await this.alertController.create({
      header: 'Accessibility',
      message: 'Adjust accessibility settings.',
      buttons: ['OK']
    });
    await alert.present();
  }

  /**
   * Logout
   */
  async logout() {
    const alert = await this.alertController.create({
      header: 'Logout',
      message: 'Are you sure you want to logout?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Logout',
          handler: async () => {
            await this.auth.signOut();
            this.router.navigate(['/login']);
          },
        },
      ],
    });
    await alert.present();
  }
}
