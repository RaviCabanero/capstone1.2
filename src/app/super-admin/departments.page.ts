import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { AdminService } from '../services/admin.service';
import { ToastController } from '@ionic/angular';

interface Department {
  id: string;
  name: string;
  description?: string;
  head?: string;
  email?: string;
  courseCount?: number;
}

interface DepartmentUser {
  uid: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  status?: string;
  schoolDepartment?: string;
  department?: string;
}

@Component({
  selector: 'app-departments',
  templateUrl: './departments.page.html',
  styleUrls: ['./departments.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class DepartmentsPage implements OnInit {
  departments: Department[] = [];
  allUsers: DepartmentUser[] = [];
  filteredUsers: DepartmentUser[] = [];
  selectedDepartment = '';
  isLoading = true;

  constructor(
    private adminService: AdminService,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.loadDepartments();
  }

  async loadDepartments() {
    try {
      this.isLoading = true;
      
      // Get all departments from Firebase (from courses collection)
      const deptNames = await this.adminService.getAllDepartments();
      const users = await this.adminService.getApprovedUsers();
      this.allUsers = users as DepartmentUser[];
      
      // Transform into Department objects
      this.departments = deptNames.map((name, index) => ({
        id: `dept-${index}`,
        name: name,
        description: undefined, // You can add this to Firebase if needed
        head: undefined, // You can fetch this from department heads with matching role
        email: undefined
      }));

      // Optional: Fetch additional details like department heads
      // You could call another service method here to get the head of each department
      
      if (this.departments.length === 0) {
        this.showToast('No departments found', 'warning');
      }
    } catch (error) {
      console.error('Error loading departments:', error);
      this.showToast('Error loading departments', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  onDepartmentChange(department: string) {
    this.selectedDepartment = department;
    this.applyDepartmentFilter();
  }

  private applyDepartmentFilter() {
    const selected = this.normalizeValue(this.selectedDepartment);

    if (!selected) {
      this.filteredUsers = [];
      return;
    }

    this.filteredUsers = this.allUsers
      .filter((user) => {
        const userDepartment = this.normalizeValue(user.schoolDepartment || user.department || '');
        return userDepartment === selected;
      })
      .sort((a, b) => this.getUserDisplayName(a).localeCompare(this.getUserDisplayName(b)));
  }

  getUserDisplayName(user: DepartmentUser): string {
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    if (fullName) {
      return fullName;
    }

    return user.email || 'Unnamed User';
  }

  getDepartmentColorClass(departmentName: string): string {
    const value = this.normalizeValue(departmentName);

    if (value.includes('computer')) return 'dept-color-computer';
    if (value.includes('engineering')) return 'dept-color-engineering';
    if (value.includes('arts')) return 'dept-color-arts';
    if (value.includes('law')) return 'dept-color-law';
    if (value.includes('allied') || value.includes('medical')) return 'dept-color-allied-medical';
    if (value.includes('business')) return 'dept-color-business';
    if (value.includes('education')) return 'dept-color-education';

    return 'dept-color-default';
  }

  private normalizeValue(value: string): string {
    return (value || '').trim().toLowerCase();
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
