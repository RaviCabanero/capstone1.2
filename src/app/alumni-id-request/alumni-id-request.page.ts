import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, docData, updateDoc } from '@angular/fire/firestore';

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

  educationLevels = [
    'Senior High School',
    'Bachelor\'s Degree',
    'Master\'s Degree',
    'Doctoral Degree',
    'Certificate Program',
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private auth: Auth,
    private firestore: Firestore
  ) {}

  ngOnInit() {
    this.initializeForm();
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
      degreeProgram: ['', [Validators.required]],
      yearGraduated: ['', [Validators.required]],
      permanentAddress: ['', [Validators.required]],
      idPhoto: ['', [Validators.required]],
    });
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
      const alumniData = {
        ...this.alumniForm.value,
        userId: uid,
        requestedAt: new Date().toISOString(),
        status: 'pending',
      };

      // Save to user profile
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
