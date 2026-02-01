import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '../services/admin.service';
import { AlertController, ToastController } from '@ionic/angular';

interface UserAccount {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  isLocked?: boolean;
}

@Component({
  selector: 'app-lock-accounts',
  templateUrl: './lock-accounts.page.html',
  styleUrls: ['./lock-accounts.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
})
export class LockAccountsPage implements OnInit {
  users: UserAccount[] = [];
  filteredUsers: UserAccount[] = [];
  isLoading = true;
  searchTerm = '';
  filterStatus = 'all';

  constructor(
    private adminService: AdminService,
    private alertController: AlertController,
    private toastController: ToastController,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadUsers();
  }

  async loadUsers() {
    try {
      this.isLoading = true;
      const allUsers = await this.adminService.getAllUsers();
      this.users = allUsers.map((user: any) => ({
        uid: user.uid,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        status: user.status || '',
        isLocked: user.isLocked || false
      }));
      this.filterUsers();
    } catch (error) {
      console.error('Error loading users:', error);
      this.showToast('Error loading users', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  filterUsers() {
    this.filteredUsers = this.users.filter(user => {
      const matchesSearch = 
        user.firstName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        user.lastName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesStatus = this.filterStatus === 'all' || 
        (this.filterStatus === 'locked' ? user.isLocked : !user.isLocked);

      return matchesSearch && matchesStatus;
    });
  }

  onSearchChange() {
    this.filterUsers();
  }

  onFilterChange() {
    this.filterUsers();
  }

  async toggleLockAccount(user: UserAccount) {
    const action = user.isLocked ? 'unlock' : 'lock';
    const alert = await this.alertController.create({
      header: `${action.charAt(0).toUpperCase() + action.slice(1)} Account`,
      message: `Are you sure you want to ${action} ${user.firstName} ${user.lastName}'s account?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: action.charAt(0).toUpperCase() + action.slice(1),
          handler: async () => {
            await this.performLockToggle(user);
          },
        },
      ],
    });
    await alert.present();
  }

  private async performLockToggle(user: UserAccount) {
    try {
      user.isLocked = !user.isLocked;
      
      // Here you would call a service method to update the user's locked status
      // For now, we'll simulate it
      await this.updateUserLockStatus(user.uid, user.isLocked);
      
      const action = user.isLocked ? 'locked' : 'unlocked';
      this.showToast(`Account ${action} successfully`, 'success');
      this.filterUsers();
    } catch (error) {
      console.error('Error updating account status:', error);
      this.showToast('Error updating account status', 'danger');
      // Revert the change
      user.isLocked = !user.isLocked;
    }
  }

  private async updateUserLockStatus(uid: string, isLocked: boolean) {
    // This would be added to AdminService
    // For now, we'll create a placeholder
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`User ${uid} lock status updated to: ${isLocked}`);
        resolve(true);
      }, 500);
    });
  }

  private async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'top',
    });
    await toast.present();
  }
}
