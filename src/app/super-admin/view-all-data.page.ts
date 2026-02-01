import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '../services/admin.service';
import { ToastController } from '@ionic/angular';

interface UserData {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
  schoolDepartment?: string;
  createdAt?: string;
}

@Component({
  selector: 'app-view-all-data',
  templateUrl: './view-all-data.page.html',
  styleUrls: ['./view-all-data.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
})
export class ViewAllDataPage implements OnInit {
  allUsers: UserData[] = [];
  filteredUsers: UserData[] = [];
  isLoading = true;
  searchTerm = '';
  filterRole = 'all';
  filterStatus = 'all';
  dataTab = 'users';
  exportFormat = 'json';

  constructor(
    private adminService: AdminService,
    private toastController: ToastController,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadAllData();
  }

  async loadAllData() {
    try {
      this.isLoading = true;
      const users = await this.adminService.getAllUsers();
      this.allUsers = users.map((user: any) => ({
        uid: user.uid,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        role: user.role || 'alumni',
        status: user.status || 'pending',
        schoolDepartment: user.schoolDepartment || undefined,
        createdAt: user.createdAt || undefined
      }));
      this.filterUsers();
    } catch (error) {
      console.error('Error loading data:', error);
      this.showToast('Error loading data', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  filterUsers() {
    this.filteredUsers = this.allUsers.filter(user => {
      const matchesSearch =
        user.firstName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        user.lastName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesRole = this.filterRole === 'all' || user.role === this.filterRole;
      const matchesStatus =
        this.filterStatus === 'all' || user.status === this.filterStatus;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }

  onSearchChange() {
    this.filterUsers();
  }

  onFilterChange() {
    this.filterUsers();
  }

  exportData() {
    try {
      let dataStr: string;
      let filename: string;

      if (this.exportFormat === 'json') {
        dataStr = JSON.stringify(this.filteredUsers, null, 2);
        filename = 'user_data.json';
      } else {
        // CSV format
        dataStr = this.convertToCSV(this.filteredUsers);
        filename = 'user_data.csv';
      }

      const element = document.createElement('a');
      element.setAttribute(
        'href',
        `data:text/plain;charset=utf-8,${encodeURIComponent(dataStr)}`
      );
      element.setAttribute('download', filename);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

      this.showToast(`Data exported as ${this.exportFormat.toUpperCase()}`, 'success');
    } catch (error) {
      console.error('Error exporting data:', error);
      this.showToast('Error exporting data', 'danger');
    }
  }

  private convertToCSV(users: UserData[]): string {
    const headers = ['UID', 'First Name', 'Last Name', 'Email', 'Role', 'Status', 'Department', 'Created At'];
    const rows = users.map(user => [
      user.uid,
      user.firstName,
      user.lastName,
      user.email,
      user.role,
      user.status,
      user.schoolDepartment || 'N/A',
      user.createdAt || 'N/A',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
  }

  getRoleBadgeColor(role: string): string {
    switch (role) {
      case 'admin':
        return 'danger';
      case 'dept_head':
        return 'primary';
      case 'alumni':
        return 'success';
      default:
        return 'medium';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'approved':
        return 'success';
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'danger';
      default:
        return 'medium';
    }
  }

  async refreshData() {
    this.showToast('Refreshing data...', 'primary');
    await this.loadAllData();
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
