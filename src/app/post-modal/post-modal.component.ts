import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';

@Component({
  selector: 'app-post-modal',
  templateUrl: './post-modal.component.html',
  styleUrls: ['./post-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class PostModalComponent implements OnInit {
  postText = '';
  selectedImage: string | null = null;
  selectedVisibility: string = 'public';
  userName = 'User Name';
  userAvatar = '';

  constructor(private modalCtrl: ModalController) {}

  ngOnInit() {}

  dismiss() {
    this.modalCtrl.dismiss();
  }

  submitPost() {
    if (!this.postText.trim()) return;
    
    // TODO: Save post to Firestore
    const postData = {
      text: this.postText,
      image: this.selectedImage,
      visibility: this.selectedVisibility,
      timestamp: new Date().toISOString(),
    };
    
    console.log('Post data:', postData);
    this.modalCtrl.dismiss(postData);
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      this.selectedImage = typeof reader.result === 'string' ? reader.result : null;
    };
    reader.readAsDataURL(file);
  }

  removeImage() {
    this.selectedImage = null;
  }

  insertMention() {
    this.postText += '@';
  }

  insertHashtag() {
    this.postText += '#';
  }
}
