import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule],
})
export class LoginPage implements OnInit {

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private auth: AuthService,
    private firebaseAuth: Auth,
    private firestore: Firestore
  ) {}

  ngOnInit() {}

  async onSubmit() {
    if (this.loginForm.invalid || this.isSubmitting) return;
    this.isSubmitting = true;

    try {
      const email = this.email?.value ?? '';
      const password = this.password?.value ?? '';
      await this.auth.login(email, password);
      
      // Check user role and status from Firestore
      const uid = this.firebaseAuth.currentUser?.uid;
      if (uid) {
        const userDoc = await new Promise<any>((resolve, reject) => {
          const unsubscribe = docData(doc(this.firestore, `users/${uid}`)).subscribe(
            data => {
              unsubscribe.unsubscribe();
              resolve(data);
            },
            err => {
              unsubscribe.unsubscribe();
              reject(err);
            }
          );
        });

        // Check if user is approved (skip for admin accounts)
        const isAdminAccount = userDoc?.role === 'super_admin' || userDoc?.role === 'alumni_association_admin';
        if (userDoc?.status !== 'approved' && !isAdminAccount) {
          await this.auth.logout();
          await this.showPendingApprovalAlert();
          this.isSubmitting = false;
          return;
        }

        await this.showToast('Logged in!');
        
        // Redirect based on role
        if (userDoc?.role === 'super_admin') {
          this.router.navigateByUrl('/super-admin', { replaceUrl: true });
        } else if (userDoc?.role === 'alumni_association_admin') {
          this.router.navigateByUrl('/alumni-admin', { replaceUrl: true });
        } else {
          this.router.navigateByUrl('/home', { replaceUrl: true });
        }
      } else {
        await this.showToast('Login successful');
        this.router.navigateByUrl('/home', { replaceUrl: true });
      }
    } catch (error: any) {
      await this.showToast(this.mapError(error));
    } finally {
      this.isSubmitting = false;
    }
  }

  goToRegister() {
    this.router.navigateByUrl('/register');
  }

  get email() {
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }

  private mapError(error: any): string {
    const code = error?.code as string | undefined;
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/invalid-login-credentials':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Invalid email or password.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please try again later.';
      default:
        return 'Login failed. Please try again.';
    }
  }

  private async showToast(message: string) {
    const toast = await this.toastCtrl.create({ message, duration: 1500, position: 'bottom' });
    await toast.present();
  }

  private async showPendingApprovalAlert() {
    const alert = await this.alertCtrl.create({
      header: 'Account Pending Approval',
      message: 'Your account is awaiting admin approval. You will be notified once your account is approved.',
      buttons: ['OK']
    });
    await alert.present();
  }

}
