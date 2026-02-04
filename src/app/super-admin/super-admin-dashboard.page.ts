import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { AdminService } from '../services/admin.service';
import { Observable, of, from, startWith } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';

@Component({
  selector: 'app-super-admin-dashboard',
  templateUrl: './super-admin-dashboard.page.html',
  styleUrls: ['./super-admin-dashboard.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class SuperAdminDashboardPage implements OnInit {
  analyticsData$: Observable<any>;
  today = new Date();
  selectedSection: string | null = null;

  managementItems = [
    { id: 'user-approvals', label: 'User Approvals', icon: 'checkmark-done-outline' },
    { id: 'department-heads', label: 'Department Heads', icon: 'people-outline' },
    { id: 'departments', label: 'Departments', icon: 'git-branch-outline' },
    { id: 'events-moderation', label: 'Events Moderation', icon: 'calendar-outline' },
    { id: 'analytics', label: 'Analytics', icon: 'bar-chart-outline' },
    { id: 'lock-accounts', label: 'Lock Accounts', icon: 'lock-closed-outline' },
    { id: 'security-rules', label: 'Security Rules', icon: 'shield-checkmark-outline' },
    { id: 'view-all-data', label: 'View All Data', icon: 'eye-outline' },
  ];

  constructor(
    private router: Router,
    private auth: Auth,
    private adminService: AdminService
  ) {
    this.analyticsData$ = of(null).pipe(
      switchMap(() => from(this.adminService.getAnalyticsSummary())),
      startWith({})
    );
  }

  ngOnInit() {
    this.loadAnalytics();
  }

  loadAnalytics() {
    this.analyticsData$ = of(null).pipe(
      switchMap(() => from(this.adminService.getAnalyticsSummary())),
      startWith({})
    );
  }

  selectSection(sectionId: string) {
    this.selectedSection = sectionId;
  }

  navigateTo(page: string) {
    this.router.navigate([`/super-admin/${page}`]);
  }

  goToPage(page: string) {
    this.router.navigate([`/super-admin/${page}`]);
  }

  async logout() {
    await this.auth.signOut();
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
