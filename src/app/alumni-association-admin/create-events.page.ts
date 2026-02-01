import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { Firestore, collection, addDoc, getDocs, query, where, orderBy } from '@angular/fire/firestore';

@Component({
  selector: 'app-create-events',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
  templateUrl: './create-events.page.html',
  styleUrls: ['./create-events.page.scss']
})
export class CreateEventsPage implements OnInit {
  events: any[] = [];
  loading = true;
  showForm = false;
  
  newEvent = {
    title: '',
    description: '',
    date: '',
    location: '',
    capacity: null as number | null
  };

  constructor(
    private firestore: Firestore,
    private toastController: ToastController
  ) {}

  async ngOnInit() {
    await this.loadEvents();
  }

  async loadEvents() {
    try {
      this.loading = true;
      const q = query(
        collection(this.firestore, 'events'),
        where('isGlobal', '==', true),
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
      date: '',
      location: '',
      capacity: null
    };
  }

  async createEvent() {
    if (!this.newEvent.title.trim() || !this.newEvent.description.trim() || 
        !this.newEvent.date || !this.newEvent.location.trim()) {
      await this.showToast('Please fill in all required fields', 'warning');
      return;
    }

    try {
      await addDoc(collection(this.firestore, 'events'), {
        title: this.newEvent.title,
        description: this.newEvent.description,
        date: this.newEvent.date,
        location: this.newEvent.location,
        capacity: this.newEvent.capacity || null,
        isGlobal: true,
        createdBy: 'alumni_association_admin',
        createdAt: new Date(),
        attendees: []
      });

      await this.showToast('Global event created successfully!', 'success');
      this.resetForm();
      this.showForm = false;
      await this.loadEvents();
    } catch (error) {
      console.error('Error creating event:', error);
      await this.showToast('Failed to create event', 'danger');
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
