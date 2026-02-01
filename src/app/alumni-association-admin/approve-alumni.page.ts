import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import { AdminService } from '../services/admin.service';

@Component({
  selector: 'app-approve-alumni',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './approve-alumni.page.html',
  styleUrls: ['./approve-alumni.page.scss']
})
export class ApproveAlumniPage implements OnInit {
  pendingUsers: any[] = [];
  loading = true;

  constructor(
    private adminService: AdminService,
    private toastController: ToastController
  ) {}

  async ngOnInit() {
    await this.loadPendingUsers();
  }

  async loadPendingUsers() {
    try {
      this.loading = true;
      this.pendingUsers = await this.adminService.getPendingUsers();
    } catch (error) {
      console.error('Error loading pending users:', error);
      await this.showToast('Failed to load pending users', 'danger');
    } finally {
      this.loading = false;
    }
  }

  async approveUser(uid: string) {
    try {
      await this.adminService.approveUser(uid);
      await this.showToast('User approved successfully', 'success');
      await this.loadPendingUsers();
    } catch (error) {
      console.error('Error approving user:', error);
      await this.showToast('Failed to approve user', 'danger');
    }
  }

  async rejectUser(uid: string) {
    try {
      await this.adminService.rejectUser(uid);
      await this.showToast('User rejected', 'warning');
      await this.loadPendingUsers();
    } catch (error) {
      console.error('Error rejecting user:', error);
      await this.showToast('Failed to reject user', 'danger');
    }
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'top'
    });
    await toast.present();
  }
}
