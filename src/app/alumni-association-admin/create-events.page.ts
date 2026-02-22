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
  minDate = new Date().toISOString();
  
  // Event form model
  newEvent = {
    title: '',
    description: '',
    date: new Date().toISOString(),
    location: '',
    capacity: null as number | null,
    duration: '2',
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    color: '#16a34a',
    availability: 'available',
    visibility: 'public'
  };

  // Color options for events
  eventColors = [
    '#16a34a', 
    '#3b82f6', 
    '#f59e0b', 
    '#ef4444', 
    '#8b5cf6', 
    '#ec4899', 
    '#06b6d4', 
    '#84cc16'  
  ];

  // Guest management
  guestEmail = '';
  guests = [
    { name: 'Abdul Hamid', email: 'abdul@example.com', initials: 'AH', color: '#3b82f6' },
    { name: 'Khalessi', email: 'khalessi@example.com', initials: 'KH', color: '#ec4899' },
    { name: 'Johnny Depp', email: 'johnny@example.com', initials: 'JD', color: '#8b5cf6' }
  ];

  // Attached file
  attachedFile: string | null = null;

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
  }

  selectColor(color: string) {
    this.newEvent.color = color;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('image/')) {
      this.showToast('Please select an image file', 'warning');
      return;
    }

    // Check file size (limit to 500KB for Firestore)
    if (file.size > 500000) {
      this.showToast('Image size must be less than 500KB', 'warning');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = () => {
      this.attachedFile = reader.result as string;
      this.showToast('Image attached successfully', 'success');
    };
    reader.readAsDataURL(file);
  }

  removeImage() {
    this.attachedFile = null;
    this.showToast('Image removed', 'success');
  }

  addGuest() {
    if (!this.guestEmail.trim()) {
      this.showToast('Please enter a guest email', 'warning');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.guestEmail)) {
      this.showToast('Please enter a valid email address', 'warning');
      return;
    }

    // Generate initials and random color
    const name = this.guestEmail.split('@')[0];
    const initials = name.substring(0, 2).toUpperCase();
    const colors = ['#3b82f6', '#ec4899', '#8b5cf6', '#f59e0b', '#06b6d4'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    this.guests.push({
      name: name,
      email: this.guestEmail,
      initials: initials,
      color: randomColor
    });

    this.guestEmail = '';
    this.showToast('Guest added', 'success');
  }

  removeGuest(guest: any) {
    const index = this.guests.indexOf(guest);
    if (index > -1) {
      this.guests.splice(index, 1);
      this.showToast('Guest removed', 'success');
    }
  }

  cancel() {
    this.resetForm();
    // Navigate back or close modal
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
      capacity: null,
      duration: '2',
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      color: '#16a34a',
      availability: 'available',
      visibility: 'public'
    };
    this.guests = [];
    this.guestEmail = '';
    this.attachedFile = null;
    this.editingEventId = null;
  }

  async createEvent() {
    // Validate required fields
    if (!this.newEvent.title.trim()) {
      await this.showToast('Event name is required', 'warning');
      return;
    }

    if (!this.newEvent.date) {
      await this.showToast('Event date is required', 'warning');
      return;
    }

    if (!this.newEvent.location.trim()) {
      await this.showToast('Location is required', 'warning');
      return;
    }

    if (!this.newEvent.description.trim()) {
      await this.showToast('Event description is required', 'warning');
      return;
    }

    // Calculate end time based on duration
    const startTime = new Date(this.newEvent.startTime);
    const durationHours = parseInt(this.newEvent.duration);
    const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);
    this.newEvent.endTime = endTime.toISOString();

    try {
      console.log('Current User ID:', this.currentUserId);
      console.log('Auth State:', this.auth.currentUser?.uid, this.auth.currentUser?.email);
      console.log('Creating event:', this.newEvent);
      
      if (this.editingEventId) {
        console.log(' Updating existing event:', this.editingEventId);
        await updateDoc(doc(this.firestore, `events/${this.editingEventId}`), {
          title: this.newEvent.title,
          description: this.newEvent.description,
          date: this.newEvent.date,
          location: this.newEvent.location,
          capacity: this.newEvent.capacity || null,
          duration: this.newEvent.duration,
          startTime: this.newEvent.startTime,
          endTime: this.newEvent.endTime,
          color: this.newEvent.color,
          availability: this.newEvent.availability,
          visibility: this.newEvent.visibility,
          guests: this.guests.map(g => ({ name: g.name, email: g.email })),
          attachedFile: this.attachedFile,
          updatedAt: new Date()
        });
        await this.showToast('Event updated successfully!', 'success');
      } else {
        console.log(' Attempting to add event to Firestore collection');
        console.log(' About to write to path: events/', 'with data:', this.newEvent);
        
        const eventRef = await addDoc(collection(this.firestore, 'events'), {
          title: this.newEvent.title,
          description: this.newEvent.description,
          date: this.newEvent.date,
          location: this.newEvent.location,
          capacity: this.newEvent.capacity || null,
          duration: this.newEvent.duration,
          startTime: this.newEvent.startTime,
          endTime: this.newEvent.endTime,
          color: this.newEvent.color,
          availability: this.newEvent.availability,
          visibility: this.newEvent.visibility,
          guests: this.guests.map(g => ({ name: g.name, email: g.email })),
          attachedFile: this.attachedFile,
          isGlobal: true,
          createdBy: this.currentUserId,
          createdAt: new Date(),
          attendees: []
        });
        console.log('Event created with ID:', eventRef.id);

        console.log('Adding notification');
        await addDoc(collection(this.firestore, 'notifications'), {
          type: 'event',
          title: 'New Event Announcement',
          message: `${this.newEvent.title} is scheduled on ${new Date(this.newEvent.date).toLocaleString()}`,
          eventId: eventRef.id,
          target: 'all',
          createdAt: new Date()
        });
        console.log(' Notification created');

        await this.showToast('Global event created successfully!', 'success');
      }

      this.resetForm();
      this.showForm = false;
      this.loadEvents();
    } catch (error: any) {
      console.error('Error creating event:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
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
      capacity: event.capacity ?? null,
      duration: event.duration || '2',
      startTime: event.startTime || new Date().toISOString(),
      endTime: event.endTime || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      color: event.color || '#16a34a',
      availability: event.availability || 'available',
      visibility: event.visibility || 'public'
    };
    // Load guests if available
    if (event.guests && Array.isArray(event.guests)) {
      this.guests = event.guests.map((g: any) => ({
        name: g.name,
        email: g.email,
        initials: g.name.substring(0, 2).toUpperCase(),
        color: '#' + Math.floor(Math.random()*16777215).toString(16)
      }));
    }
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
