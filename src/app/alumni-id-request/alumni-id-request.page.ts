import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, docData, updateDoc, getDoc, setDoc } from '@angular/fire/firestore';
import { DepartmentService, Department } from 'src/app/services/department.service';
import { CourseService, Course } from 'src/app/services/course.service';
import { Observable, combineLatest } from 'rxjs';
import { map, shareReplay, startWith } from 'rxjs/operators';

@Component({
  selector: 'app-alumni-id-request',
  templateUrl: './alumni-id-request.page.html',
  styleUrls: ['./alumni-id-request.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule],
})
export class AlumniIdRequestPage implements OnInit {
  alumniForm!: FormGroup;
  submitted = false;
  imagePreview: string | null = null;
  departments$: Observable<Department[]>;
  courses$: Observable<Course[]>;
  filteredCourses$!: Observable<Course[]>;

  educationLevels = [
    'Senior High School',
    'Bachelor\'s Degree',
    'Master\'s Degree',
    'Doctoral Degree',
    'Certificate Program',
  ];

  yearOptions: number[] = [];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private auth: Auth,
    private firestore: Firestore,
    private toastController: ToastController,
    private deptService: DepartmentService,
    private courseService: CourseService
  ) {
    this.departments$ = this.deptService.getDepartments();
    this.courses$ = this.courseService.getCourses().pipe(shareReplay(1));
  }

  ngOnInit() {
    this.initializeForm();
    this.setupCourseFiltering();
    this.generateYearOptions();
  }

  private generateYearOptions() {
    const currentYear = new Date().getFullYear();
    const startYear = 1950;
    for (let year = currentYear; year >= startYear; year--) {
      this.yearOptions.push(year);
    }
  }

  /**
   * Initialize form with validation
   */
  private initializeForm() {
    this.alumniForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      studentId: [''],
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      middleName: [''],
      suffix: [''],
      maidenName: [''],
      educationLevel: ['', [Validators.required]],
      schoolDepartment: ['', [Validators.required]],
      degreeProgram: ['', [Validators.required]],
      yearGraduated: ['', [Validators.required]],
      permanentAddress: ['', [Validators.required]],
    });
  }

  private setupCourseFiltering() {
    const deptControl = this.alumniForm.get('schoolDepartment');
    this.filteredCourses$ = combineLatest([
      this.courses$,
      deptControl!.valueChanges.pipe(startWith(deptControl!.value))
    ]).pipe(
      map(([courses, dept]) => {
        // Reset course selection when department changes
        if (dept) {
          this.alumniForm.patchValue({ degreeProgram: '' }, { emitEvent: false });
        }
        return dept ? courses.filter(c => c.DeptName === dept) : [];
      })
    );
  }

  /**
   * Get form controls for easy access
   */
  get email() {
    return this.alumniForm.get('email');
  }

  get firstName() {
    return this.alumniForm.get('firstName');
  }

  get lastName() {
    return this.alumniForm.get('lastName');
  }

  get educationLevel() {
    return this.alumniForm.get('educationLevel');
  }

  get schoolDepartment() {
    return this.alumniForm.get('schoolDepartment');
  }

  get degreeProgram() {
    return this.alumniForm.get('degreeProgram');
  }

  get yearGraduated() {
    return this.alumniForm.get('yearGraduated');
  }

  get permanentAddress() {
    return this.alumniForm.get('permanentAddress');
  }

  get idPhoto() {
    return this.alumniForm.get('idPhoto');
  }

  /**
   * Handle image selection
   */
  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      console.error('Invalid file type. Only JPG and PNG are allowed.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : null;
      if (dataUrl) {
        this.imagePreview = dataUrl;
        this.alumniForm.patchValue({ idPhoto: dataUrl });
      }
    };
    reader.readAsDataURL(file);
  }

  /**
   * Remove selected image
   */
  removeImage() {
    this.imagePreview = null;
    this.alumniForm.patchValue({ idPhoto: '' });
  }

  /**
   * Submit alumni ID request
   */
  async submit() {
    this.submitted = true;

    if (this.alumniForm.invalid) {
      console.log('Form is invalid');
      return;
    }

    const uid = this.auth.currentUser?.uid;
    if (!uid) {
      console.error('User not authenticated');
      return;
    }

    try {
      // Get user profile for additional info
      const userDoc = await getDoc(doc(this.firestore, `users/${uid}`));
      const userData = userDoc.data();

      const alumniData = {
        ...this.alumniForm.value,
        userId: uid,
        requestedAt: new Date().toISOString(),
        status: 'pending',
        course: userData?.['course'] || '',
        department: userData?.['department'] || '',
      };

      // Save to idRequests collection for admin queries
      await setDoc(doc(this.firestore, `idRequests/${uid}`), alumniData);

      // Save to user profile for easy reference
      await updateDoc(doc(this.firestore, `users/${uid}`), {
        alumniIdRequest: alumniData,
        updatedAt: new Date().toISOString(),
      });

      console.log('Alumni ID request submitted successfully');
      
      // Navigate back to profile with success
      this.router.navigate(['/profile'], {
        queryParams: { alumniSuccess: true },
      });
    } catch (error) {
      console.error('Failed to submit alumni ID request', error);
    }
  }

  /**
   * Cancel and go back
   */
  cancel() {
    this.router.navigate(['/profile']);
  }
}
