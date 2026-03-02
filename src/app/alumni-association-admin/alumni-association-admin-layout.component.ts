import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

interface MenuItem {
  icon: string;
  label: string;
  path: string;
}

@Component({
  selector: 'app-alumni-association-admin-layout',
  templateUrl: './alumni-association-admin-layout.component.html',
  styleUrls: ['./alumni-association-admin-layout.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
})
export class AlumniAssociationAdminLayoutComponent implements OnInit {
  menuOpen = false;

  menuItems: MenuItem[] = [
    {
      icon: 'grid-outline',
      label: 'Dashboard',
      path: '/alumni-admin',
    },
    {
      icon: 'megaphone-outline',
      label: 'Post Announcements',
      path: '/alumni-admin/announcements',
    },
    {
      icon: 'calendar-outline',
      label: 'Create Global Events',
      path: '/alumni-admin/create-events',
    },
    {
      icon: 'people-outline',
      label: 'View Alumni List',
      path: '/alumni-admin/alumni-list',
    },
    {
      icon: 'stats-chart-outline',
      label: 'Generate Reports',
      path: '/alumni-admin/reports',
    },
    {
      icon: 'card-outline',
      label: 'Digital ID Approval',
      path: '/alumni-admin/alumni-id-approval',
    },
  ];

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {}

  isActive(path: string): boolean {
    return this.router.url === path || this.router.url.startsWith(path + '/');
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMobileMenu(): void {
    this.menuOpen = false;
  }

  logout(): void {
    this.authService.logout().then(() => {
      this.router.navigate(['/login']);
    });
  }
}
