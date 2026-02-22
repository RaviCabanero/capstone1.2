import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

interface MenuItem {
  icon: string;
  label: string;
  path: string;
  badge?: {
    type: string;
    count: number;
  };
}

@Component({
  selector: 'app-super-admin-layout',
  templateUrl: './super-admin-layout.component.html',
  styleUrls: ['./super-admin-layout.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
})
export class SuperAdminLayoutComponent implements OnInit {
  menuOpen = false;

  menuItems: MenuItem[] = [
    {
      icon: 'home-outline',
      label: 'Dashboard',
      path: '/super-admin',
    },
    {
      icon: 'checkmark-done-outline',
      label: 'User Approvals',
      path: '/super-admin/user-approvals',
      badge: { type: 'warning', count: 5 },
    },
    {
      icon: 'person-outline',
      label: 'Department Heads',
      path: '/super-admin/department-heads',
    },
    {
      icon: 'git-branch-outline',
      label: 'Departments',
      path: '/super-admin/departments',
    },
    {
      icon: 'lock-closed-outline',
      label: 'Lock Accounts',
      path: '/super-admin/lock-accounts',
      badge: { type: 'danger', count: 2 },
    },
    {
      icon: 'eye-outline',
      label: 'View All Data',
      path: '/super-admin/view-all-data',
    },
    {
      icon: 'shield-checkmark-outline',
      label: 'Security Rules',
      path: '/super-admin/security-rules',
    },
    {
      icon: 'calendar-outline',
      label: 'Events Moderation',
      path: '/super-admin/events-moderation',
    },
    {
      icon: 'analytics-outline',
      label: 'Analytics',
      path: '/super-admin/analytics',
    },
  ];

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    
  }

  
  isActive(path: string): boolean {
    return this.router.url.includes(path);
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMobileMenu(): void {
    
    if (window.innerWidth < 768) {
      this.menuOpen = false;
    }
  }

  
  navigateTo(path: string): void {
    this.router.navigate([path]);
    this.closeMobileMenu();
  }

  
  async logout(): Promise<void> {
    await this.authService.logoutAndRedirect('/login');
  }
}
