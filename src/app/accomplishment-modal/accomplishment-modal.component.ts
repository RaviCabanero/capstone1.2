import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-accomplishment-modal',
  templateUrl: './accomplishment-modal.component.html',
  styleUrls: ['./accomplishment-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule],
})
export class AccomplishmentModalComponent implements OnInit {
  accomplishmentForm!: FormGroup;
  submitted = false;
  imagePreview: string | null = null;

  constructor(
    private fb: FormBuilder,
    private modalCtrl: ModalController
  ) {}

  ngOnInit() {
    this.accomplishmentForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      issuer: ['', [Validators.required]],
      dateEarned: ['', [Validators.required]],
      description: [''],
      image: ['', [Validators.required]],
    });
  }

  get title() {
    return this.accomplishmentForm.get('title');
  }

  get issuer() {
    return this.accomplishmentForm.get('issuer');
  }

  get dateEarned() {
    return this.accomplishmentForm.get('dateEarned');
  }

  get image() {
    return this.accomplishmentForm.get('image');
  }

  /**
   * Handle image selection
   */
  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : null;
      if (dataUrl) {
        this.imagePreview = dataUrl;
        this.accomplishmentForm.patchValue({ image: dataUrl });
      }
    };
    reader.readAsDataURL(file);
  }

  /**
   * Remove selected image
   */
  removeImage() {
    this.imagePreview = null;
    this.accomplishmentForm.patchValue({ image: '' });
  }

  /**
   * Save accomplishment
   */
  save() {
    this.submitted = true;

    if (this.accomplishmentForm.invalid) {
      return;
    }

    const accomplishment = {
      ...this.accomplishmentForm.value,
      id: new Date().getTime().toString(),
      createdAt: new Date().toISOString(),
    };

    this.modalCtrl.dismiss(accomplishment, 'save');
  }

  /**
   * Cancel and close modal
   */
  cancel() {
    this.modalCtrl.dismiss(null, 'cancel');
  }
}
