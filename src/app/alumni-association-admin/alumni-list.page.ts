import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AdminService } from '../services/admin.service';

@Component({
  selector: 'app-alumni-list',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
  templateUrl: './alumni-list.page.html',
  styleUrls: ['./alumni-list.page.scss']
})
export class AlumniListPage implements OnInit {
  allAlumni: any[] = [];
  filteredAlumni: any[] = [];
  loading = true;
  searchTerm = '';
  isDeptHead = false;
  departments: string[] = [];
  showDepartmentModal = false;
  selectedDepartment = '';
  selectedAlumniForDept: any = null;

  constructor(private adminService: AdminService) {}

  async ngOnInit() {
    const role = await this.adminService.getUserRole();
    this.isDeptHead = role === 'dept_head';
    
    // Load departments
    try {
      this.departments = await this.adminService.getAllDepartments();
    } catch (error) {
      console.error('Error loading departments:', error);
    }
    
    await this.loadAlumni();
  }

  async loadAlumni() {
  try {
    this.loading = true;
    
    // Check if current user is department head
    const role = await this.adminService.getUserRole();
    const isDeptHead = role === 'dept_head';
    
    if (isDeptHead) {
      // Get department head's department
      const userDetails = await this.adminService.getCurrentUserDetails();
      const dept = (userDetails as any)?.['department'] || (userDetails as any)?.['schoolDepartment'];
      if (dept) {
        this.allAlumni = await this.adminService.getAlumniByDepartment(dept);
      }
    } else {
      // Show all alumni for association admin
      this.allAlumni = await this.adminService.getAllUsers();
    }
    
    this.filteredAlumni = [...this.allAlumni];
  } catch (error) {
    console.error('Error loading alumni:', error);
  } finally {
    this.loading = false;
  }
}

  searchAlumni() {
    const term = this.searchTerm.toLowerCase().trim();
    
    if (!term) {
      this.filteredAlumni = [...this.allAlumni];
      return;
    }

    this.filteredAlumni = this.allAlumni.filter(alumni => {
      const dept = (alumni as any)['department'] as string | undefined;
      const schoolDept = (alumni as any)['schoolDepartment'] as string | undefined;
      return (
        (alumni.firstName as string | undefined)?.toLowerCase().includes(term) ||
        (alumni.lastName as string | undefined)?.toLowerCase().includes(term) ||
        (alumni.displayName as string | undefined)?.toLowerCase().includes(term) ||
        (alumni.email as string | undefined)?.toLowerCase().includes(term) ||
        (alumni.phone as string | undefined)?.toLowerCase().includes(term) ||
        (dept)?.toLowerCase().includes(term) ||
        (schoolDept)?.toLowerCase().includes(term) ||
        (alumni.course as string | undefined)?.toLowerCase().includes(term) ||
        (alumni.address as string | undefined)?.toLowerCase().includes(term) ||
        (alumni.province as string | undefined)?.toLowerCase().includes(term) ||
        (alumni.studentId as string | undefined)?.toLowerCase().includes(term) ||
        (alumni.role as string | undefined)?.toLowerCase().includes(term) ||
        (alumni.status as string | undefined)?.toLowerCase().includes(term) ||
        String((alumni.yearGraduated as string | number | undefined) || '').toLowerCase().includes(term)
      );
    });
  }

  getDepartment(user: any): string {
    return (user && ((user as any)['department'] || (user as any)['schoolDepartment'])) || 'N/A';
  }

  getBatchYear(user: any): string {
    return user.graduationYear || user.batchYear || '—';
  }

  getDisplayName(user: any): string {
    if (user?.displayName) return user.displayName;
    const first = user?.firstName || user?.firstname || '';
    const last = user?.lastName || user?.lastname || '';
    const combined = `${first} ${last}`.trim();
    if (combined) return combined;
    if (user?.email) return user.email.split('@')[0];
    return 'No Name';
  }

  maskEmail(email?: string): string {
    if (!email) return 'N/A';
    const [local, domain] = email.split('@');
    if (!domain) return email;
    if (local.length <= 2) {
      return `${local[0] || '*'}*@${domain}`;
    }
    return `${local[0]}***${local[local.length - 1]}@${domain}`;
  }

  formatRole(role?: string): string {
    if (!role) return 'user';
    return role.replace(/_/g, ' ');
  }

  /**
   * Format date for display (MM/DD/YYYY)
   */
  formatDate(date?: string): string {
    if (!date) return 'N/A';
    try {
      const d = new Date(date);
      return d.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch (error) {
      return date;
    }
  }

  async assignRole(alumni: any, newRole: 'alumni' | 'dept_head') {
    if (!alumni?.uid || alumni?.role === newRole) return;
    // Verify current admin permissions before attempting write
    const myRole = await this.adminService.getUserRole();
    if (!myRole || (myRole !== 'alumni_association_admin' && myRole !== 'alumni_admin' && myRole !== 'super_admin')) {
      alert('You do not have permission to change user roles. Contact a super admin.');
      return;
    }

    // If assigning as department head, show department selection modal
    if (newRole === 'dept_head') {
      this.selectedAlumniForDept = alumni;
      this.selectedDepartment = alumni.schoolDepartment || '';
      this.showDepartmentModal = true;
      return;
    }

    // For alumni role, just update without department prompt
    try {
      await this.adminService.changeUserRole(alumni.uid, newRole);
      alumni.role = newRole;
    } catch (error) {
      console.error('Failed to assign role:', (error as any));
      alert(`Error assigning role: ${(error as any)?.message || JSON.stringify(error)}`);
    }
  }

  closeDepartmentModal() {
    this.showDepartmentModal = false;
    this.selectedAlumniForDept = null;
    this.selectedDepartment = '';
  }

  async confirmDepartmentHeadAssignment() {
    if (!this.selectedAlumniForDept?.uid || !this.selectedDepartment) {
      alert('Please select a department');
      return;
    }

    // Verify current admin permissions before attempting write
    const myRole = await this.adminService.getUserRole();
    if (!myRole || (myRole !== 'alumni_association_admin' && myRole !== 'alumni_admin' && myRole !== 'super_admin')) {
      alert('You do not have permission to assign department heads. Contact a super admin.');
      this.closeDepartmentModal();
      return;
    }

    try {
      const uid = this.selectedAlumniForDept.uid;
      // Update both role and department
      await this.adminService.changeUserRole(uid, 'dept_head');
      await this.adminService.assignDepartment(uid, this.selectedDepartment);
      
      // Update local data
      this.selectedAlumniForDept.role = 'dept_head';
      this.selectedAlumniForDept.schoolDepartment = this.selectedDepartment;
      
      alert(`✓ ${this.selectedAlumniForDept.firstName} is now Department Head of ${this.selectedDepartment}`);
      this.closeDepartmentModal();
    } catch (error) {
      console.error('Failed to assign department head:', error);
      alert(`Error: ${(error as any)?.message || 'Failed to assign'}`);
    }
  }
}
