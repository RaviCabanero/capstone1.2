import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { Firestore, collection, addDoc, getDocs, query, where, orderBy } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { AdminService } from '../services/admin.service';

@Component({
  selector: 'app-department-events',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
  templateUrl: './department-events.page.html',
  styleUrls: ['./department-events.page.scss']
})
export class DepartmentEventsPage implements OnInit {
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private adminService = inject(AdminService);
  private toastController = inject(ToastController);
  private router = inject(Router);

  events: any[] = [];
  loading = true;
  showForm = false;
  userDepartment = '';
  
  newEvent = {
    title: '',
    description: '',
    date: new Date().toISOString(),
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    location: '',
    capacity: null as number | null
  };

  eventColors = [
    '#16a34a', '#3b82f6', '#f59e0b', '#ef4444', 
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
  ];
  selectedColor = this.eventColors[0];

  ngOnInit() {
    this.loadDepartmentInfo();
  }

  async loadDepartmentInfo() {
    try {
      const userDetails = await this.adminService.getCurrentUserDetails();
      this.userDepartment = (userDetails as any)?.['department'] || (userDetails as any)?.['schoolDepartment'] || 'Unknown';
      await this.loadEvents();
    } catch (error) {
      console.error('Error loading department info:', error);
      await this.showToast('Failed to load department information', 'danger');
    }
  }

  async loadEvents() {
    try {
      this.loading = true;
      const q = query(
        collection(this.firestore, 'departmentEvents'),
        where('department', '==', this.userDepartment),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      this.events = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      this.loading = false;
    }
  }

  toggleForm() {
    this.showForm = !this.showForm;
    if (!this.showForm) {
      this.resetForm();
    }
  }

  resetForm() {
    this.newEvent = {
      title: '',
      description: '',
      date: new Date().toISOString(),
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      location: '',
      capacity: null
    };
    this.selectedColor = this.eventColors[0];
  }

  async createEvent() {
    if (!this.newEvent.title.trim() || !this.newEvent.description.trim()) {
      await this.showToast('Please fill in all required fields', 'warning');
      return;
    }

    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        await this.showToast('User not authenticated', 'danger');
        return;
      }

      await addDoc(collection(this.firestore, 'departmentEvents'), {
        title: this.newEvent.title,
        description: this.newEvent.description,
        date: this.newEvent.date,
        startTime: this.newEvent.startTime,
        endTime: this.newEvent.endTime,
        location: this.newEvent.location,
        capacity: this.newEvent.capacity,
        department: this.userDepartment,
        color: this.selectedColor,
        createdBy: currentUser.uid,
        createdAt: new Date().toISOString(),
        type: 'department_event'
      });

      await this.showToast('Event created successfully!', 'success');
      this.resetForm();
      this.showForm = false;
      await this.loadEvents();
    } catch (error) {
      console.error('Error creating event:', error);
      await this.showToast('Failed to create event', 'danger');
    }
  }

  selectColor(color: string) {
    this.selectedColor = color;
  }

  goBack() {
    this.router.navigate(['/alumni-admin']);
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