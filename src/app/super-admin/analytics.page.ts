import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { AdminService } from '../services/admin.service';
import { Observable, of, from, startWith, switchMap, map } from 'rxjs';

interface DepartmentSummary {
  department: string;
  userCount: number;
  percentage?: number;
}

@Component({
  selector: 'app-analytics',
  templateUrl: './analytics.page.html',
  styleUrls: ['./analytics.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class AnalyticsPage implements OnInit {
  analyticsData$: Observable<any>;
  deptSummary$: Observable<DepartmentSummary[]>;

  constructor(private adminService: AdminService) {
    this.analyticsData$ = of(null).pipe(
      switchMap(() => from(this.adminService.getAnalyticsSummary())),
      startWith({})
    );

    // Calculate percentage for each department based on total users
    this.deptSummary$ = this.analyticsData$.pipe(
      switchMap(stats => {
        const totalUsers = stats?.totalUsers || 1;
        return from(this.adminService.getDepartmentSummary()).pipe(
          map((departments: any[]) =>
            departments.map(dept => ({
              ...dept,
              percentage: Math.round((dept.userCount / totalUsers) * 100)
            }))
          ),
          startWith([])
        );
      })
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

    this.deptSummary$ = this.analyticsData$.pipe(
      switchMap(stats => {
        const totalUsers = stats?.totalUsers || 1;
        return from(this.adminService.getDepartmentSummary()).pipe(
          map((departments: any[]) =>
            departments.map(dept => ({
              ...dept,
              percentage: Math.round((dept.userCount / totalUsers) * 100)
            }))
          ),
          startWith([])
        );
      })
    );
  }
}
