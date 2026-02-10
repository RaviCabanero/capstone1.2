import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { AdminService } from '../services/admin.service';
import { Observable, of, from, startWith } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-super-admin-dashboard',
  templateUrl: './super-admin-dashboard.page.html',
  styleUrls: ['./super-admin-dashboard.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
})
export class SuperAdminDashboardPage implements OnInit {
  analyticsData$: Observable<any>;

  constructor(private adminService: AdminService) {
    this.analyticsData$ = of(null).pipe(
      switchMap(() => from(this.adminService.getAnalyticsSummary())),
      startWith({})
    );
  }

  ngOnInit(): void {
    this.loadAnalytics();
  }

  /**
   * Load analytics data for dashboard statistics
   */
  loadAnalytics(): void {
    this.analyticsData$ = of(null).pipe(
      switchMap(() => from(this.adminService.getAnalyticsSummary())),
      startWith({})
    );
  }
}
