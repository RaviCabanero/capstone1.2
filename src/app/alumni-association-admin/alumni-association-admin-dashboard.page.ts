import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { AdminService } from '../services/admin.service';
import { Firestore, collection, query, where, getDocs } from '@angular/fire/firestore';

@Component({
  selector: 'app-alumni-association-admin-dashboard',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './alumni-association-admin-dashboard.page.html',
  styleUrls: ['./alumni-association-admin-dashboard.page.scss']
})
export class AlumniAssociationAdminDashboardPage implements OnInit {
  stats = {
    totalAlumni: 0,
    activeEvents: 0,
    recentAnnouncements: 0,
    totalDepartments: 0
  };

  recentUsers: any[] = [];
  loadingRegistrations = false;
  isDepartmentHead = false;
  pendingUsersCount = 0;

  constructor(
    private router: Router,
    private adminService: AdminService,
    private firestore: Firestore
  ) {}

  async ngOnInit() {
    try {
      const role = await this.adminService.getUserRole();
      this.isDepartmentHead = role === 'dept_head';
    } catch (error) {
      console.error('Error getting user role:', error);
      this.isDepartmentHead = false;
    }

    await this.loadStats();
    await this.loadRecentRegistrations();
    await this.checkPendingUsers();
    await this.loadDepartmentsCount();
  }

  async loadStats() {
    try {
      // Total Alumni
      const alumni = await this.adminService.getApprovedUsers();
      this.stats.totalAlumni = alumni.length;

      // Active Events
      if (typeof this.adminService.getActiveEvents === 'function') {
        const events = await this.adminService.getActiveEvents();
        this.stats.activeEvents = Array.isArray(events) ? events.length : 0;
      } else {
        this.stats.activeEvents = 0;
      }

      // Recent Announcements
      if (typeof this.adminService.getRecentAnnouncements === 'function') {
        const announcements = await this.adminService.getRecentAnnouncements();
        this.stats.recentAnnouncements = Array.isArray(announcements) ? announcements.length : 0;
      } else {
        this.stats.recentAnnouncements = 0;
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  async loadDepartmentsCount() {
    try {
      const departmentsCollection = collection(this.firestore, 'departments');
      const snapshot = await getDocs(departmentsCollection);
      this.stats.totalDepartments = snapshot.docs.length;
      console.log('Total departments:', this.stats.totalDepartments);
    } catch (error) {
      console.error('Error loading departments count:', error);
      this.stats.totalDepartments = 0;
    }
  }

  async loadRecentRegistrations() {
    try {
      this.loadingRegistrations = true;
      const users = await this.adminService.getApprovedUsers();
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

      // Sort by updatedAt (most recent approval) and filter for last 5 days
      this.recentUsers = (users as any[])
        .map(user => {
          // Convert updatedAt ISO string to Date
          let sortDate = new Date(0);
          if (user.updatedAt) {
            if (typeof user.updatedAt === 'string') {
              sortDate = new Date(user.updatedAt);
            } else if (user.updatedAt.toDate) {
              sortDate = user.updatedAt.toDate();
            }
          }
          return { ...user, sortDate };
        })
        .filter(user => user.sortDate >= fiveDaysAgo) // Only show users approved in last 5 days
        .sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime())
        .map(({ sortDate, ...user }) => user) // Remove the temporary sortDate field
        .slice(0, 5); // Show only 5 recent users
      
      console.log('Recent users loaded (last 5 days):', this.recentUsers.length, this.recentUsers);
    } catch (error) {
      console.error('Error loading recent registrations:', error);
      this.recentUsers = [];
    } finally {
      this.loadingRegistrations = false;
    }
  }

  async refreshRecentRegistrations() {
    await this.loadRecentRegistrations();
    await this.checkPendingUsers();
  }

  async checkPendingUsers() {
    try {
      // Check for pending/unreviewed users
      const q = query(
        collection(this.firestore, 'users'),
        where('status', 'in', ['pending', 'unreviewed'])
      );
      const snapshot = await getDocs(q);
      this.pendingUsersCount = snapshot.docs.length;
    } catch (error) {
      console.error('Error checking pending users:', error);
      this.pendingUsersCount = 0;
    }
  }

  // Safe date conversion method
  getDateFromField(field: any): Date | null {
    if (!field) return null;
    // If it's already a Date, return it
    if (field instanceof Date) return field;
    // If it's an ISO string, parse it
    if (typeof field === 'string') {
      try {
        return new Date(field);
      } catch (e) {
        console.warn('Error parsing ISO date string:', e);
        return null;
      }
    }
    // If it's a Firestore Timestamp, convert it
    if (typeof field.toDate === 'function') {
      try {
        return field.toDate();
      } catch (e) {
        console.warn('Error converting Firestore timestamp:', e);
        return null;
      }
    }
    return null;
  }

  // Format date for display
  formatDate(date: Date | null): string {
    if (!date) return 'N/A';
    try {
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return 'N/A';
    }
  }

  navigateToDashboard() {
    this.router.navigate(['/alumni-admin']);
  }

  navigateToAnnouncements() {
    this.router.navigate(['/alumni-admin/announcements']);
  }

  navigateToEvents() {
    this.router.navigate(['/alumni-admin/create-events']);
  }

  navigateToAlumniList() {
    this.router.navigate(['/alumni-admin/alumni-list']);
  }

  navigateToReports() {
    this.router.navigate(['/alumni-admin/reports']);
  }

  navigateToIdApprovals() {
    this.router.navigate(['/alumni-admin/alumni-id-approval']);
  }

  navigateToDepartmentEvents() {
    this.router.navigate(['/department-events']);
  }

  isActiveTab(path: string): boolean {
    return this.router.url === path;
  }

  logout() {
    this.router.navigate(['/login']);
  }

  async getUserRole() {
    try {
      const role = await this.adminService.getUserRole();
      return role;
    } catch (error) {
      console.error('Error getting user role:', error);
      return null;
    }
  }
}
