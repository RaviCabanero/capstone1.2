import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController, AlertController } from '@ionic/angular';
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
    private modalCtrl: ModalController,
    private alertCtrl: AlertController
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
  async save() {
    this.submitted = true;

    if (this.contactForm.invalid) {
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Save Contact Info',
      message: 'Do you want to save this contact information?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Save',
          handler: () => {
            const contact = {
              email: this.contactForm.value.email,
              phone: this.contactForm.value.phone,
              website: this.contactForm.value.website,
            };

            this.modalCtrl.dismiss(contact, 'save');
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Cancel and close modal
   */
  async cancel() {
    const alert = await this.alertCtrl.create({
      header: 'Cancel Changes',
      message: 'Are you sure you want to cancel? All changes will be lost.',
      buttons: [
        {
          text: 'Continue Editing',
          role: 'cancel'
        },
        {
          text: 'Discard',
          role: 'destructive',
          handler: () => {
            this.modalCtrl.dismiss(null, 'cancel');
          }
        }
      ]
    });

    await alert.present();
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
