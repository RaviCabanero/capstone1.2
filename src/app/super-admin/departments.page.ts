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

@Component({
  selector: 'app-departments',
  templateUrl: './departments.page.html',
  styleUrls: ['./departments.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class DepartmentsPage implements OnInit {
  departments: Department[] = [];
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
