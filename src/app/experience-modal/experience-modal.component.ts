import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController, AlertController } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-experience-modal',
  templateUrl: './experience-modal.component.html',
  styleUrls: ['./experience-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule],
})
export class ExperienceModalComponent implements OnInit {
  @Input() existingExperience: any = null;
  experienceForm!: FormGroup;
  submitted = false;
  currentlyWorking = false;

  months = [
    { name: 'January', value: 1 },
    { name: 'February', value: 2 },
    { name: 'March', value: 3 },
    { name: 'April', value: 4 },
    { name: 'May', value: 5 },
    { name: 'June', value: 6 },
    { name: 'July', value: 7 },
    { name: 'August', value: 8 },
    { name: 'September', value: 9 },
    { name: 'October', value: 10 },
    { name: 'November', value: 11 },
    { name: 'December', value: 12 },
  ];

  years: number[] = [];

  get isEditMode(): boolean {
    return !!this.existingExperience;
  }

  constructor(
    private fb: FormBuilder,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController
  ) {
    this.generateYears();
  }

  ngOnInit() {
    this.experienceForm = this.fb.group({
      company: ['', [Validators.required]],
      title: ['', [Validators.required]],
      location: [''],
      description: [''],
      fromMonth: [''],
      fromYear: [''],
      toMonth: [''],
      toYear: [''],
      currentlyWorking: [false],
      shareWithNetwork: [true],
    });

    this.experienceForm.get('currentlyWorking')?.valueChanges.subscribe((value) => {
      this.currentlyWorking = value;
      const toMonthControl = this.experienceForm.get('toMonth');
      const toYearControl = this.experienceForm.get('toYear');
      if (value) {
        toMonthControl?.clearValidators();
        toYearControl?.clearValidators();
      } else {
        toMonthControl?.setValidators(Validators.required);
        toYearControl?.setValidators(Validators.required);
      }
      toMonthControl?.updateValueAndValidity();
      toYearControl?.updateValueAndValidity();
    });

    if (this.existingExperience) {
      this.currentlyWorking = !!this.existingExperience.currentlyWorking;
      this.experienceForm.patchValue({
        company: this.existingExperience.company || '',
        title: this.existingExperience.title || '',
        location: this.existingExperience.location || '',
        description: this.existingExperience.description || '',
        fromMonth: this.existingExperience.startMonth || '',
        fromYear: this.existingExperience.startYear || '',
        toMonth: this.existingExperience.endMonth || '',
        toYear: this.existingExperience.endYear || '',
        currentlyWorking: !!this.existingExperience.currentlyWorking,
        shareWithNetwork: this.existingExperience.shareWithNetwork ?? true,
      });
    }
  }

  generateYears() {
    const currentYear = new Date().getFullYear();
    for (let i = currentYear; i >= 1950; i--) {
      this.years.push(i);
    }
  }

  get company() {
    return this.experienceForm.get('company');
  }

  get title() {
    return this.experienceForm.get('title');
  }

  get location() {
    return this.experienceForm.get('location');
  }

  get description() {
    return this.experienceForm.get('description');
  }

  get fromMonth() {
    return this.experienceForm.get('fromMonth');
  }

  get fromYear() {
    return this.experienceForm.get('fromYear');
  }

  get toMonth() {
    return this.experienceForm.get('toMonth');
  }

  get toYear() {
    return this.experienceForm.get('toYear');
  }

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
            this.modalCtrl.dismiss();
          }
        }
      ]
    });

    await alert.present();
  }

  async save() {
    this.submitted = true;

    if (this.experienceForm.invalid) {
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Save Experience',
      message: 'Do you want to save this experience?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Save',
          handler: () => {
            const formValue = this.experienceForm.value;
            const experience = {
              company: formValue.company,
              title: formValue.title,
              location: formValue.location,
              description: formValue.description,
              startMonth: formValue.fromMonth,
              startYear: formValue.fromYear,
              endMonth: formValue.toMonth,
              endYear: formValue.toYear,
              currentlyWorking: formValue.currentlyWorking,
              shareWithNetwork: formValue.shareWithNetwork,
            };

            this.modalCtrl.dismiss({
              ...experience,
              id: this.existingExperience?.id,
              createdAt: this.existingExperience?.createdAt,
            });
          }
        }
      ]
    });

    await alert.present();
  }
}
