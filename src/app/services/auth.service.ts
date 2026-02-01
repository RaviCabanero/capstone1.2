import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Auth, authState, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile, UserCredential, sendEmailVerification as firebaseSendEmailVerification, User } from '@angular/fire/auth';
import { map, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly user$ = authState(this.auth);
  readonly isLoggedIn$: Observable<boolean> = this.user$.pipe(map(user => !!user));

  constructor(private auth: Auth, private router: Router) {}

  login(email: string, password: string): Promise<UserCredential> {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  async register(email: string, password: string, displayName: string): Promise<UserCredential> {
    const credential = await createUserWithEmailAndPassword(this.auth, email, password);
    if (credential.user && displayName) {
      await updateProfile(credential.user, { displayName });
    }
    return credential;
  }

  sendEmailVerification(user: User): Promise<void> {
    return firebaseSendEmailVerification(user);
  }

  logout(): Promise<void> {
    return signOut(this.auth);
  }

  async logoutAndRedirect(url = '/login'): Promise<void> {
    await this.logout();
    await this.router.navigateByUrl(url, { replaceUrl: true });
  }
}
