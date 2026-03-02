import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import { AdminService } from '../services/admin.service';

interface TrackingLog {
  id: string;
  action?: string;
  actorName?: string;
  actorUid?: string;
  targetUserId?: string;
  createdAt?: string;
  details?: Record<string, any>;
}

@Component({
  selector: 'app-logs-tracking',
  templateUrl: './logs-tracking.page.html',
  styleUrls: ['./logs-tracking.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class LogsTrackingPage implements OnInit {
  logs: TrackingLog[] = [];
  isLoading = true;
  private initializedEmptyLog = false;

  constructor(
    private adminService: AdminService,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.loadLogs();
  }

  async loadLogs(event?: any) {
    try {
      this.isLoading = true;
      const items = await this.adminService.getLogsTracking();
      this.logs = items as TrackingLog[];

      if (this.logs.length === 0 && !this.initializedEmptyLog) {
        this.initializedEmptyLog = true;
        await this.adminService.createTrackingLog('logs_tracking_initialized', {
          source: 'super-admin/logs-tracking',
          message: 'Initial log created automatically'
        });

        const refreshedItems = await this.adminService.getLogsTracking();
        this.logs = refreshedItems as TrackingLog[];
      }
    } catch (error) {
      console.error('Error loading logs tracking:', error);
      await this.showToast('Failed to load logs tracking', 'danger');
    } finally {
      this.isLoading = false;
      event?.target?.complete?.();
    }
  }

  formatAction(action?: string): string {
    if (!action) return 'Unknown action';
    return action.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }

  formatDate(value?: string): string {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString();
  }

  stringifyDetails(details?: Record<string, any>): string {
    if (!details || Object.keys(details).length === 0) return '—';
    return Object.entries(details)
      .map(([key, val]) => `${key}: ${typeof val === 'object' ? JSON.stringify(val) : val}`)
      .join(', ');
  }

  private async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'top',
    });
    await toast.present();
  }
}
