import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { ProfileService } from 'src/app/services/profile.service';
import { DepartmentService, Department } from 'src/app/services/department.service';
import { CourseService, Course } from 'src/app/services/course.service';
import { Observable, combineLatest } from 'rxjs';
import { map, shareReplay, startWith } from 'rxjs/operators';

@Component({
  selector: 'app-register-details',
  templateUrl: './register-details.page.html',
  styleUrls: ['./register-details.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
})
export class RegisterDetailsPage implements OnInit {
  departments$: Observable<Department[]>;
  courses$: Observable<Course[]>;
  filteredCourses$: Observable<Course[]>;

  detailsForm = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    birthdate: ['', [Validators.required]],
    sex: ['', [Validators.required]],
    address: ['', [Validators.required, Validators.minLength(5)]],
    province: ['', [Validators.required]],
    schoolDepartment: ['', [Validators.required]],
    course: ['', [Validators.required]],
    studentId: ['', [Validators.required]],
    yearGraduated: ['', [Validators.required, Validators.min(1950), Validators.max(2100)]],
    phone: ['', [Validators.required, Validators.pattern(/^\+63\d{10}$/)]],
    role: ['alumni', [Validators.required]], // Default to alumni, only alumni and dept_head allowed
  });

  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private toastCtrl: ToastController,
    private auth: Auth,
    private profileService: ProfileService,
    private deptService: DepartmentService,
    private courseService: CourseService
  ) {
    this.departments$ = this.deptService.getDepartments();
    this.courses$ = this.courseService.getCourses().pipe(shareReplay(1));

    const deptControl = this.detailsForm.get('schoolDepartment');
    this.filteredCourses$ = combineLatest([
      this.courses$,
      deptControl!.valueChanges.pipe(startWith(deptControl!.value))
    ]).pipe(
      map(([courses, dept]) => {
        console.log('Selected department:', dept);
        console.log('All courses:', courses);
        const filtered = dept ? courses.filter(c => {
          console.log(`Course: ${c.CourseName}, DeptName: ${c.DeptName}, matches: ${c.DeptName === dept}`);
          return c.DeptName === dept;
        }) : [];
        console.log('Filtered courses:', filtered);
        return filtered;
      })
    );
  }

  ngOnInit() {}

  async onSubmit() {
    if (this.detailsForm.invalid || this.isSubmitting) return;
    this.isSubmitting = true;

    try {
      const uid = this.auth.currentUser?.uid;
      if (!uid) {
        await this.showToast('Session expired. Please log in.');
        this.router.navigateByUrl('/login', { replaceUrl: true });
        return;
      }

      await this.profileService.updateProfile(uid, {
        firstName: this.firstName?.value ?? '',
        lastName: this.lastName?.value ?? '',
        birthdate: this.birthdate?.value ?? '',
        sex: this.sex?.value ?? '',
        address: this.address?.value ?? '',
        province: this.province?.value ?? '',
        schoolDepartment: this.schoolDepartment?.value ?? '',
        course: this.course?.value ?? '',
        studentId: this.studentId?.value ?? '',
        yearGraduated: this.yearGraduated?.value ?? '',
        phone: this.phone?.value ?? '',
        role: (this.role?.value as 'alumni' | 'dept_head') ?? 'alumni',
        status: 'pending', // New users start as pending until approved by super admin
      });

      await this.showToast('Details saved');
      this.router.navigateByUrl('/login', { replaceUrl: true });
    } catch (error: any) {
      await this.showToast('Failed to save details. Please try again.');
    } finally {
      this.isSubmitting = false;
    }
  }

  get firstName() { return this.detailsForm.get('firstName'); }
  get lastName() { return this.detailsForm.get('lastName'); }
  get birthdate() { return this.detailsForm.get('birthdate'); }
  get sex() { return this.detailsForm.get('sex'); }
  get address() { return this.detailsForm.get('address'); }
  get province() { return this.detailsForm.get('province'); }
  get schoolDepartment() { return this.detailsForm.get('schoolDepartment'); }
  get course() { return this.detailsForm.get('course'); }
  get studentId() { return this.detailsForm.get('studentId'); }
  get yearGraduated() { return this.detailsForm.get('yearGraduated'); }
  get phone() { return this.detailsForm.get('phone'); }
  get role() { return this.detailsForm.get('role'); }

  private async showToast(message: string) {
    const toast = await this.toastCtrl.create({ message, duration: 1500, position: 'bottom' });
    await toast.present();
  }
}
