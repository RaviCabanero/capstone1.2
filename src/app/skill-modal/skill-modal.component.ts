import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController, AlertController } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-skill-modal',
  templateUrl: './skill-modal.component.html',
  styleUrls: ['./skill-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule],
})
export class SkillModalComponent implements OnInit {
  skillForm!: FormGroup;
  submitted = false;

  categories = [
    'Technical',
    'Programming',
    'Design',
    'Leadership',
    'Communication',
    'Data Analysis',
    'Project Management',
    'Other',
  ];

  proficiencies = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

  constructor(
    private fb: FormBuilder,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController
  ) {}

  ngOnInit() {
    this.skillForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      category: ['', [Validators.required]],
      proficiency: ['Intermediate', [Validators.required]],
      endorsements: [0],
    });
  }

  get name() {
    return this.skillForm.get('name');
  }

  get category() {
    return this.skillForm.get('category');
  }

  get proficiency() {
    return this.skillForm.get('proficiency');
  }

  async save() {
    this.submitted = true;

    if (this.skillForm.invalid) {
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Save Skill',
      message: 'Do you want to save this skill?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Save',
          handler: () => {
            const skill = {
              ...this.skillForm.value,
              id: new Date().getTime().toString(),
              createdAt: new Date().toISOString(),
            };

            this.modalCtrl.dismiss(skill, 'save');
          }
        }
      ]
    });

    await alert.present();
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
            this.modalCtrl.dismiss(null, 'cancel');
          }
        }
      ]
    });

    await alert.present();
  }
}
