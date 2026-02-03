import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { AdminService } from '../services/admin.service';

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
    recentAnnouncements: 0
  };

  constructor(
    private router: Router,
    private adminService: AdminService
  ) {}

  async ngOnInit() {
    await this.loadStats();
  }

  async loadStats() {
    try {
      const alumni = await this.adminService.getApprovedUsers();
      
      this.stats.totalAlumni = alumni.length;
    } catch (error) {
      console.error('Error loading stats:', error);
    }
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

  logout() {
    this.router.navigate(['/login']);
  }
}
