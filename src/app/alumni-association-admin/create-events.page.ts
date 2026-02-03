import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { Firestore, collection, addDoc, getDocs, query, where, orderBy, updateDoc, deleteDoc, doc, collectionData } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-create-events',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
  templateUrl: './create-events.page.html',
  styleUrls: ['./create-events.page.scss']
})
export class CreateEventsPage implements OnInit {
  events$: Observable<any[]> | null = null;
  events: any[] = [];
  loading = true;
  showForm = false;
  editingEventId: string | null = null;
  currentUserId: string | null = null;
  
  newEvent = {
    title: '',
    description: '',
    date: new Date().toISOString(),
    location: '',
    capacity: null as number | null
  };

  constructor(
    private firestore: Firestore,
    private toastController: ToastController,
    private alertController: AlertController,
    private auth: Auth
  ) {}

  ngOnInit() {
    // Get current user ID
    if (this.auth.currentUser) {
      this.currentUserId = this.auth.currentUser.uid;
    }
    this.loadEvents();
  }

  loadEvents() {
    try {
      this.loading = true;
      const q = query(
        collection(this.firestore, 'events')
      );
      
      this.events$ = collectionData(q, { idField: 'id' });
      
      // Subscribe to get events array for template or other uses
      this.events$.subscribe(
        (events) => {
          console.log('✅ Events loaded:', events);
          this.events = events;
          this.loading = false;
        },
        (error) => {
          console.error('❌ Error loading events:', error);
          this.loading = false;
        }
      );
    } catch (error) {
      console.error('Error setting up events listener:', error);
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
      location: '',
      capacity: null
    };
    this.editingEventId = null;
  }

  async createEvent() {
    if (!this.newEvent.title.trim() || !this.newEvent.description.trim() || 
        !this.newEvent.date || !this.newEvent.location.trim()) {
      await this.showToast('Please fill in all required fields', 'warning');
      return;
    }

    try {
      console.log('📝 Current User ID:', this.currentUserId);
      console.log('📝 Auth State:', this.auth.currentUser?.uid, this.auth.currentUser?.email);
      console.log('📝 Creating event:', this.newEvent);
      
      if (this.editingEventId) {
        console.log('✏️ Updating existing event:', this.editingEventId);
        await updateDoc(doc(this.firestore, `events/${this.editingEventId}`), {
          title: this.newEvent.title,
          description: this.newEvent.description,
          date: this.newEvent.date,
          location: this.newEvent.location,
          capacity: this.newEvent.capacity || null,
          updatedAt: new Date()
        });
        await this.showToast('Event updated successfully!', 'success');
      } else {
        console.log('➕ Attempting to add event to Firestore collection');
        console.log('🔐 About to write to path: events/', 'with data:', this.newEvent);
        
        const eventRef = await addDoc(collection(this.firestore, 'events'), {
          title: this.newEvent.title,
          description: this.newEvent.description,
          date: this.newEvent.date,
          location: this.newEvent.location,
          capacity: this.newEvent.capacity || null,
          isGlobal: true,
          createdBy: this.currentUserId,
          createdAt: new Date(),
          attendees: []
        });
        console.log('✅ Event created with ID:', eventRef.id);

        console.log('➕ Adding notification');
        await addDoc(collection(this.firestore, 'notifications'), {
          type: 'event',
          title: 'New Event Announcement',
          message: `${this.newEvent.title} is scheduled on ${new Date(this.newEvent.date).toLocaleString()}`,
          eventId: eventRef.id,
          target: 'all',
          createdAt: new Date()
        });
        console.log('✅ Notification created');

        await this.showToast('Global event created successfully!', 'success');
      }

      this.resetForm();
      this.showForm = false;
      this.loadEvents();
    } catch (error: any) {
      console.error('❌ Error creating event:', error);
      console.error('💥 Error code:', error.code);
      console.error('💥 Error message:', error.message);
      await this.showToast('Failed to create event: ' + error.message, 'danger');
    }
  }

  editEvent(event: any) {
    this.showForm = true;
    this.editingEventId = event.id;
    this.newEvent = {
      title: event.title || '',
      description: event.description || '',
      date: event.date || '',
      location: event.location || '',
      capacity: event.capacity ?? null
    };
  }

  async confirmDelete(event: any) {
    const alert = await this.alertController.create({
      header: 'Delete Event',
      message: `Are you sure you want to delete "${event.title}"?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Delete', role: 'destructive', handler: () => this.deleteEvent(event) }
      ]
    });

    await alert.present();
  }

  async deleteEvent(event: any) {
    try {
      await deleteDoc(doc(this.firestore, `events/${event.id}`));
      await this.showToast('Event deleted successfully', 'success');
      this.loadEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      await this.showToast('Failed to delete event', 'danger');
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
