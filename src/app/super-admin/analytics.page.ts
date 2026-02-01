import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { AdminService } from '../services/admin.service';
import { Observable, of, from, startWith } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-analytics',
  templateUrl: './analytics.page.html',
  styleUrls: ['./analytics.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class AnalyticsPage implements OnInit {
  analyticsData$: Observable<any>;
  deptSummary$: Observable<any[]>;

  constructor(private adminService: AdminService) {
    this.analyticsData$ = of(null).pipe(
      switchMap(() => from(this.adminService.getAnalyticsSummary())),
      startWith({})
    );

    this.deptSummary$ = of(null).pipe(
      switchMap(() => from(this.adminService.getDepartmentSummary())),
      startWith([])
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

    this.deptSummary$ = of(null).pipe(
      switchMap(() => from(this.adminService.getDepartmentSummary())),
      startWith([])
    );
  }
}
