import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AdminService } from '../services/admin.service';

@Injectable({ providedIn: 'root' })
export class DeptHeadGuard implements CanActivate {
  constructor(private adminService: AdminService, private router: Router) {}

  async canActivate(): Promise<boolean | UrlTree> {
    try {
      const role = await this.adminService.getUserRole();
      if (role === 'dept_head') return true;
      return this.router.parseUrl('/alumni-admin');
    } catch (error) {
      return this.router.parseUrl('/login');
    }
  }
}
