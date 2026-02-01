import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { Firestore, collection, addDoc, getDocs, query, orderBy } from '@angular/fire/firestore';

@Component({
  selector: 'app-announcements',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
  templateUrl: './announcements.page.html',
  styleUrls: ['./announcements.page.scss']
})
export class AnnouncementsPage implements OnInit {
  announcements: any[] = [];
  loading = true;
  showForm = false;
  
  newAnnouncement = {
    title: '',
    content: ''
  };

  constructor(
    private firestore: Firestore,
    private toastController: ToastController
  ) {}

  async ngOnInit() {
    await this.loadAnnouncements();
  }

  async loadAnnouncements() {
    try {
      this.loading = true;
      const q = query(
        collection(this.firestore, 'announcements'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      this.announcements = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error loading announcements:', error);
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
    this.newAnnouncement = {
      title: '',
      content: ''
    };
  }

  async createAnnouncement() {
    if (!this.newAnnouncement.title.trim() || !this.newAnnouncement.content.trim()) {
      await this.showToast('Please fill in all fields', 'warning');
      return;
    }

    try {
      await addDoc(collection(this.firestore, 'announcements'), {
        title: this.newAnnouncement.title,
        content: this.newAnnouncement.content,
        date: new Date().toISOString(),
        createdAt: new Date(),
        type: 'alumni_association'
      });

      await this.showToast('Announcement posted successfully!', 'success');
      this.resetForm();
      this.showForm = false;
      await this.loadAnnouncements();
    } catch (error) {
      console.error('Error creating announcement:', error);
      await this.showToast('Failed to post announcement', 'danger');
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
