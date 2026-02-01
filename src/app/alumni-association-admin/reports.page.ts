import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { AdminService } from '../services/admin.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './reports.page.html',
  styleUrls: ['./reports.page.scss']
})
export class ReportsPage implements OnInit {
  loading = true;
  
  analytics = {
    totalAlumni: 0,
    pendingApprovals: 0,
    departmentBreakdown: [] as any[]
  };

  constructor(private adminService: AdminService) {}

  async ngOnInit() {
    await this.loadReports();
  }

  async loadReports() {
    try {
      this.loading = true;
      
      // Get total alumni
      const approvedUsers = await this.adminService.getApprovedUsers();
      this.analytics.totalAlumni = approvedUsers.length;
      
      // Get pending approvals
      const pendingUsers = await this.adminService.getPendingUsers();
      this.analytics.pendingApprovals = pendingUsers.length;
      
      // Calculate department breakdown
      const deptMap = new Map<string, number>();
      approvedUsers.forEach((user: any) => {
        const dept = user.department || 'Not Specified';
        deptMap.set(dept, (deptMap.get(dept) || 0) + 1);
      });
      
      this.analytics.departmentBreakdown = Array.from(deptMap.entries())
        .map(([department, count]) => ({ department, count }))
        .sort((a, b) => b.count - a.count);
      
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      this.loading = false;
    }
  }

  async downloadReport() {
    // Generate a CSV report
    let csv = 'Alumni Association Report\n\n';
    csv += `Generated: ${new Date().toLocaleString()}\n\n`;
    csv += `Total Alumni: ${this.analytics.totalAlumni}\n`;
    csv += `Pending Approvals: ${this.analytics.pendingApprovals}\n\n`;
    csv += 'Department Breakdown:\n';
    csv += 'Department,Count\n';
    
    this.analytics.departmentBreakdown.forEach(item => {
      csv += `${item.department},${item.count}\n`;
    });
    
    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alumni-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}
