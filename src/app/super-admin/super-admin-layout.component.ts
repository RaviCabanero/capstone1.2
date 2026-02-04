import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-super-admin-layout',
  templateUrl: './super-admin-layout.component.html',
  styleUrls: ['./super-admin-layout.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterOutlet],
})
export class SuperAdminLayoutComponent implements OnInit {
  menuOpen = false;
  currentPage = '';

  menuItems = [
    { icon: 'home-outline', label: 'Dashboard', path: '/super-admin' },
    { icon: 'checkmark-done-outline', label: 'User Approvals', path: '/super-admin/user-approvals' },
    { icon: 'person-outline', label: 'Department Heads', path: '/super-admin/department-heads' },
    { icon: 'git-branch-outline', label: 'Departments', path: '/super-admin/departments' },
    { icon: 'lock-closed-outline', label: 'Lock Accounts', path: '/super-admin/lock-accounts' },
    { icon: 'eye-outline', label: 'View All Data', path: '/super-admin/view-all-data' },
    { icon: 'shield-checkmark-outline', label: 'Security Rules', path: '/super-admin/security-rules' },
    { icon: 'calendar-outline', label: 'Events Moderation', path: '/super-admin/events-moderation' },
    { icon: 'analytics-outline', label: 'Analytics', path: '/super-admin/analytics' },
  ];

  constructor() {}

  ngOnInit() {}

  logout() {
    // Handle logout logic
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  navigate(path: string) {
    this.currentPage = path;
    this.menuOpen = false;
  }
}
