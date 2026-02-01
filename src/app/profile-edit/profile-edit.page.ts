import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { ProfileService } from '../services/profile.service';
import { DepartmentService, Department } from '../services/department.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-profile-edit',
  templateUrl: './profile-edit.page.html',
  styleUrls: ['./profile-edit.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule, RouterModule],
})
export class ProfileEditPage implements OnInit {
  departments$: Observable<Department[]>;

  editForm = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    address: ['', [Validators.required, Validators.minLength(5)]],
    province: ['', [Validators.required]],
    schoolDepartment: ['', [Validators.required]],
    phone: ['', [Validators.required, Validators.pattern(/^\+63\d{10}$/)]],
  });

  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private toastCtrl: ToastController,
    private auth: Auth,
    private firestore: Firestore,
    private profileService: ProfileService,
    private deptService: DepartmentService
  ) {
    this.departments$ = this.deptService.getDepartments();
  }

  ngOnInit() {
    if (this.auth.currentUser?.uid) {
      const uid = this.auth.currentUser.uid;
      docData(doc(this.firestore, `users/${uid}`)).subscribe((profile: any) => {
        if (profile) {
          this.editForm.patchValue({
            firstName: profile.firstName,
            lastName: profile.lastName,
            address: profile.address,
            province: profile.province,
            schoolDepartment: profile.schoolDepartment,
            phone: profile.phone,
          });
        }
      });
    }
  }

  async onSubmit() {
    if (this.editForm.invalid || this.isSubmitting) return;
    this.isSubmitting = true;

    try {
      const uid = this.auth.currentUser?.uid;
      if (!uid) {
        await this.showToast('Session expired.');
        this.router.navigateByUrl('/login', { replaceUrl: true });
        return;
      }

      await this.profileService.updateProfile(uid, {
        firstName: this.firstName?.value ?? '',
        lastName: this.lastName?.value ?? '',
        address: this.address?.value ?? '',
        province: this.province?.value ?? '',
        schoolDepartment: this.schoolDepartment?.value ?? '',
        phone: this.phone?.value ?? '',
      });

      await this.showToast('Profile updated');
      this.router.navigateByUrl('/profile', { replaceUrl: true });
    } catch (error: any) {
      await this.showToast('Failed to update. Please try again.');
    } finally {
      this.isSubmitting = false;
    }
  }

  get firstName() { return this.editForm.get('firstName'); }
  get lastName() { return this.editForm.get('lastName'); }
  get address() { return this.editForm.get('address'); }
  get province() { return this.editForm.get('province'); }
  get schoolDepartment() { return this.editForm.get('schoolDepartment'); }
  get phone() { return this.editForm.get('phone'); }

  private async showToast(message: string) {
    const toast = await this.toastCtrl.create({ message, duration: 1500, position: 'bottom' });
    await toast.present();
  }
}
