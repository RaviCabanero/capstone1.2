import { Injectable, NgZone } from '@angular/core';
import { Firestore, doc, setDoc, updateDoc } from '@angular/fire/firestore';

export interface UserProfile {
  firstName?: string;
  lastName?: string;
  email?: string;
  address?: string;
  province?: string;
  schoolDepartment?: string;
  course?: string;
  studentId?: string;
  yearGraduated?: string;
  phone?: string;
  photoDataUrl?: string;
  summary?: string;
  role?: 'alumni' | 'dept_head'; // Only alumni and dept_head allowed in app
  status?: 'pending' | 'approved' | 'rejected';
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  constructor(private firestore: Firestore, private ngZone: NgZone) {}

  private userDoc(uid: string) {
    return doc(this.firestore, `users/${uid}`);
  }

  async setProfile(uid: string, data: UserProfile): Promise<void> {
    const timestamp = new Date().toISOString();
    await this.ngZone.run(() =>
      setDoc(this.userDoc(uid), { ...data, createdAt: timestamp, updatedAt: timestamp }, { merge: true })
    );
  }

  async updateProfile(uid: string, data: UserProfile): Promise<void> {
    const timestamp = new Date().toISOString();
    await this.ngZone.run(() =>
      updateDoc(this.userDoc(uid), { ...data, updatedAt: timestamp })
    );
  }
}
