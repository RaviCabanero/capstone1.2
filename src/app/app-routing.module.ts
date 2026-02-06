import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { ActivityPage } from './activity/activity.page';
import { AlumniIdRequestPage } from './alumni-id-request/alumni-id-request.page';
import { SuperAdminLayoutComponent } from './super-admin/super-admin-layout.component';
import { SuperAdminDashboardPage } from './super-admin/super-admin-dashboard.page';
import { UserApprovalsPage } from './super-admin/user-approvals.page';
import { AnalyticsPage } from './super-admin/analytics.page';
import { DepartmentHeadsPage } from './super-admin/department-heads.page';
import { DepartmentsPage } from './super-admin/departments.page';
import { EventsModerationPage } from './super-admin/events-moderation.page';
import { LockAccountsPage } from './super-admin/lock-accounts.page';
import { SecurityRulesPage } from './super-admin/security-rules.page';
import { ViewAllDataPage } from './super-admin/view-all-data.page';
import { alumniAssociationAdminGuard } from './guards/alumni-association-admin.guard';
import { AlumniAssociationAdminDashboardPage } from './alumni-association-admin/alumni-association-admin-dashboard.page';
import { ApproveAlumniPage } from './alumni-association-admin/approve-alumni.page';
import { AnnouncementsPage } from './alumni-association-admin/announcements.page';
import { CreateEventsPage } from './alumni-association-admin/create-events.page';
import { AlumniListPage } from './alumni-association-admin/alumni-list.page';
import { ReportsPage } from './alumni-association-admin/reports.page';
import { AlumniIdApprovalPage } from './alumni-association-admin/alumni-id-approval.page';

const routes: Routes = [
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then( m => m.HomePageModule)
  },
    {
    path: 'login',
    loadChildren: () => import('./login/login.module').then( m => m.LoginPageModule)
  },
  {
    path: 'register',
    loadChildren: () => import('./register/register.module').then( m => m.RegisterPageModule)
  },
  {
    path: 'register-success',
    loadChildren: () => import('./register-success/register-success.module').then(m => m.RegisterSuccessPageModule)
  },
  {
    path: 'register-details',
    loadChildren: () => import('./register-details/register-details.module').then(m => m.RegisterDetailsPageModule)
  },
  {
    path: 'profile',
    loadChildren: () => import('./profile/profile.module').then(m => m.ProfilePageModule)
  },
  {
    path: 'profile/:id',
    loadChildren: () => import('./profile/profile.module').then(m => m.ProfilePageModule)
  },
  {
    path: 'profile-edit',
    loadChildren: () => import('./profile-edit/profile-edit.module').then(m => m.ProfileEditPageModule)
  },
  {
    path: 'alumni-network',
    loadChildren: () => import('./alumni-network/alumni-network.module').then(m => m.AlumniNetworkPageModule)
  },
  {
    path: 'activity',
    component: ActivityPage
  },
  {
    path: 'notifications',
    loadChildren: () => import('./notifications/notifications.module').then(m => m.NotificationsPageModule)
  },
  {
    path: 'alumni-id-request',
    component: AlumniIdRequestPage
  },
  {
    path: 'super-admin',
    component: SuperAdminLayoutComponent,
    children: [
      {
        path: '',
        component: SuperAdminDashboardPage
      },
      {
        path: 'user-approvals',
        component: UserApprovalsPage
      },
      {
        path: 'department-heads',
        component: DepartmentHeadsPage
      },
      {
        path: 'departments',
        component: DepartmentsPage
      },
      {
        path: 'events-moderation',
        component: EventsModerationPage
      },
      {
        path: 'analytics',
        component: AnalyticsPage
      },
      {
        path: 'lock-accounts',
        component: LockAccountsPage
      },
      {
        path: 'security-rules',
        component: SecurityRulesPage
      },
      {
        path: 'view-all-data',
        component: ViewAllDataPage
      }
    ]
  },
  {
    path: 'alumni-admin',
    component: AlumniAssociationAdminDashboardPage,
    canActivate: [alumniAssociationAdminGuard]
  },
  {
    path: 'alumni-admin/approve-alumni',
    component: ApproveAlumniPage,
    canActivate: [alumniAssociationAdminGuard]
  },
  {
    path: 'alumni-admin/announcements',
    component: AnnouncementsPage,
    canActivate: [alumniAssociationAdminGuard]
  },
  {
    path: 'alumni-admin/create-events',
    component: CreateEventsPage,
    canActivate: [alumniAssociationAdminGuard]
  },
  {
    path: 'alumni-admin/alumni-list',
    component: AlumniListPage,
    canActivate: [alumniAssociationAdminGuard]
  },
  {
    path: 'alumni-admin/reports',
    component: ReportsPage,
    canActivate: [alumniAssociationAdminGuard]
  },
  {
    path: 'alumni-admin/alumni-id-approval',
    component: AlumniIdApprovalPage,
    canActivate: [alumniAssociationAdminGuard]
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },

];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
