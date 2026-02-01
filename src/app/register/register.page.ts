import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule, ValidatorFn, AbstractControl } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ProfileService } from '../services/profile.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule, RouterModule],
})
export class RegisterPage implements OnInit {
  private passwordsMatchValidator: ValidatorFn = (group: AbstractControl) => {
    const pass = group.get('password')?.value;
    const confirm = group.get('confirm')?.value;
    return pass === confirm ? null : { mismatch: true };
  };

  private usjrEmailValidator: ValidatorFn = (control: AbstractControl) => {
    const email = control.value;
    if (!email) return null;
    const isValid = email.endsWith('@usjr.edu.ph');
    return isValid ? null : { invalidDomain: true };
  };

  registerForm = this.fb.group(
    {
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirm: ['', [Validators.required]],
    },
    { validators: this.passwordsMatchValidator }
  );

  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private toastCtrl: ToastController,
    private auth: AuthService,
    private profileService: ProfileService
  ) {}

  ngOnInit() {}

  async onSubmit() {
    if (this.registerForm.invalid || this.isSubmitting) return;
    this.isSubmitting = true;

    try {
      const firstName = this.firstName?.value ?? '';
      const lastName = this.lastName?.value ?? '';
      const displayName = `${firstName} ${lastName}`.trim();
      const email = this.email?.value ?? '';
      const password = this.password?.value ?? '';

      const credential = await this.auth.register(email, password, displayName);
      const uid = credential.user?.uid;
      
      if (uid && credential.user) {
        // Send email verification
        await this.auth.sendEmailVerification(credential.user);
        
        // Save user profile with pending status
        try {
          await this.profileService.setProfile(uid, {
            firstName,
            lastName,
            email,
            role: 'alumni',
            status: 'pending',
            createdAt: new Date().toISOString()
          });
        } catch (err) {
          console.warn('Profile save failed, continuing:', err);
        }
      }
      
      this.isSubmitting = false;
      await this.showToast('Registration successful! Account pending admin approval. Please verify your email.');
      this.router.navigateByUrl('/register-success', { replaceUrl: true });
    } catch (error: any) {
      this.isSubmitting = false;
      await this.showToast(this.mapError(error));
    }
  }

  get firstName() {
    return this.registerForm.get('firstName');
  }

  get lastName() {
    return this.registerForm.get('lastName');
  }

  get email() {
    return this.registerForm.get('email');
  }

  get password() {
    return this.registerForm.get('password');
  }

  get confirm() {
    return this.registerForm.get('confirm');
  }

  private mapError(error: any): string {
    const code = error?.code as string | undefined;
    switch (code) {
      case 'auth/email-already-in-use':
        return 'Email is already registered.';
      case 'auth/invalid-email':
        return 'Enter a valid email address.';
      case 'auth/weak-password':
        return 'Password must be at least 6 characters.';
      default:
        return 'Sign up failed. Please try again.';
    }
  }

  getEmailError(): string {
    const emailControl = this.email;
    if (emailControl?.hasError('required')) return 'Email is required';
    if (emailControl?.hasError('email')) return 'Enter a valid email address';
    if (emailControl?.hasError('invalidDomain')) return 'Only @usjr.edu.ph emails are allowed';
    return '';
  }

  private async showToast(message: string) {
    const toast = await this.toastCtrl.create({ message, duration: 1500, position: 'bottom' });
    await toast.present();
  }
}
