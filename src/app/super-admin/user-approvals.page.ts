import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { AdminService } from '../services/admin.service';
import { Observable, from, of, startWith } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';

@Component({
  selector: 'app-user-approvals',
  templateUrl: './user-approvals.page.html',
  styleUrls: ['./user-approvals.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class UserApprovalsPage implements OnInit {
  pendingUsers: any[] = [];
  approvedUsers: any[] = [];
  pendingUsers$: Observable<any[]>;
  approvedUsers$: Observable<any[]>;
  approvingUid: string | null = null;
  rejectingUid: string | null = null;
  refreshTrigger$ = new Observable<void>();
  private refreshSubject: any = null;

  constructor(
    private adminService: AdminService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {
    // Initialize observables with proper switchMap pattern
    this.pendingUsers$ = of(null).pipe(
      switchMap(() => from(this.adminService.getPendingUsers())),
      tap(users => this.pendingUsers = users),
      startWith([])
    );

    this.approvedUsers$ = of(null).pipe(
      switchMap(() => from(this.adminService.getApprovedUsers())),
      tap(users => this.approvedUsers = users),
      startWith([])
    );
  }

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.pendingUsers$ = of(null).pipe(
      switchMap(() => from(this.adminService.getPendingUsers())),
      tap(users => this.pendingUsers = users),
      startWith([])
    );

    this.approvedUsers$ = of(null).pipe(
      switchMap(() => from(this.adminService.getApprovedUsers())),
      tap(users => this.approvedUsers = users),
      startWith([])
    );
  }

  async approveUser(uid: string) {
    this.approvingUid = uid;
    try {
      // Find the user to get their email and name
      const user = this.pendingUsers.find(u => u.uid === uid);
      
      await this.adminService.approveUser(uid);
      
      // Send approval email
      if (user && user.email) {
        await this.adminService.sendApprovalEmail(
          uid,
          user.email,
          user.firstName || 'User',
          user.lastName || ''
        );
      }
      
      await this.showToast('User approved successfully! Notification email sent.', 'success');
      this.loadUsers();
    } catch (error) {
      console.error('Failed to approve user', error);
      await this.showToast('Failed to approve user', 'danger');
    } finally {
      this.approvingUid = null;
    }
  }

  async rejectUser(uid: string) {
    const alert = await this.alertCtrl.create({
      header: 'Reject User',
      message: 'Are you sure you want to reject this registration?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Reject',
          role: 'destructive',
          handler: async () => {
            this.rejectingUid = uid;
            try {
              // Find the user to get their email and name
              const user = this.pendingUsers.find(u => u.uid === uid);
              
              await this.adminService.rejectUser(uid);
              
              // Send rejection email
              if (user && user.email) {
                await this.adminService.sendRejectionEmail(
                  uid,
                  user.email,
                  user.firstName || 'User',
                  user.lastName || ''
                );
              }
              
              await this.showToast('User rejected. Notification email sent.', 'warning');
              this.loadUsers();
            } catch (error) {
              console.error('Failed to reject user', error);
              await this.showToast('Failed to reject user', 'danger');
            } finally {
              this.rejectingUid = null;
            }
          },
        },
      ],
    });

    await alert.present();
  }

  async rejectApprovedUser(uid: string) {
    const alert = await this.alertCtrl.create({
      header: 'Change Status',
      message: 'Change this user back to pending?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Change to Pending',
          handler: async () => {
            try {
              await this.adminService.rejectUser(uid);
              await this.showToast('User status updated', 'success');
              this.loadUsers();
            } catch (error) {
              console.error('Failed to update user', error);
              await this.showToast('Failed to update user', 'danger');
            }
          },
        },
      ],
    });

    await alert.present();
  }

  private async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      position: 'bottom',
      color,
    });
    await toast.present();
  }
}
