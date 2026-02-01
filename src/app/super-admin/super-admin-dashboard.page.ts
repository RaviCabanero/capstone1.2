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

  goToPage(page: string) {
    this.router.navigate([`/super-admin/${page}`]);
  }

  async logout() {
    await this.auth.signOut();
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
