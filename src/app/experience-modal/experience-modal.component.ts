import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-experience-modal',
  templateUrl: './experience-modal.component.html',
  styleUrls: ['./experience-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule],
})
export class ExperienceModalComponent implements OnInit {
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

  constructor(
    private fb: FormBuilder,
    private modalCtrl: ModalController
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

  cancel() {
    this.modalCtrl.dismiss();
  }

  save() {
    this.submitted = true;

    if (this.experienceForm.invalid) {
      return;
    }

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

    this.modalCtrl.dismiss(experience);
  }
}
