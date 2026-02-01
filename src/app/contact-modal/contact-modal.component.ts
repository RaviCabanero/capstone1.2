import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-contact-modal',
  templateUrl: './contact-modal.component.html',
  styleUrls: ['./contact-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule],
})
export class ContactModalComponent implements OnInit {
  @Input() currentContact: any;
  @Input() userId: string = '';

  contactForm!: FormGroup;
  submitted = false;
  profileUrl = '';

  constructor(
    private fb: FormBuilder,
    private modalCtrl: ModalController
  ) {}

  ngOnInit() {
    this.profileUrl = `${window.location.origin}/profile/${this.userId}`;

    this.contactForm = this.fb.group({
      email: [
        this.currentContact?.email || '',
        [Validators.required, Validators.email],
      ],
      phone: [this.currentContact?.phone || '', []],
      website: [
        this.currentContact?.website || '',
        [this.websiteValidator.bind(this)],
      ],
    });
  }

  get email() {
    return this.contactForm.get('email');
  }

  get phone() {
    return this.contactForm.get('phone');
  }

  get website() {
    return this.contactForm.get('website');
  }

  /**
   * Custom validator for website URL
   */
  private websiteValidator(control: any) {
    if (!control.value) return null;

    const urlPattern =
      /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/;

    if (!urlPattern.test(control.value)) {
      return { invalidUrl: true };
    }
    return null;
  }

  /**
   * Save contact info
   */
  save() {
    this.submitted = true;

    if (this.contactForm.invalid) {
      return;
    }

    const contact = {
      email: this.contactForm.value.email,
      phone: this.contactForm.value.phone,
      website: this.contactForm.value.website,
    };

    this.modalCtrl.dismiss(contact, 'save');
  }

  /**
   * Cancel and close modal
   */
  cancel() {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  /**
   * Copy profile URL to clipboard
   */
  async copyProfileUrl() {
    try {
      await navigator.clipboard.writeText(this.profileUrl);
      console.log('Profile URL copied to clipboard');
    } catch (error) {
      console.error('Failed to copy URL', error);
    }
  }
}
