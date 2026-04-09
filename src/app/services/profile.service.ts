import { Injectable, NgZone } from '@angular/core';
import { Firestore, doc, setDoc, updateDoc } from '@angular/fire/firestore';

export interface UserProfile {
  firstName?: string;
  lastName?: string;
  birthdate?: string;
  sex?: string;
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
  role?: 'alumni' | 'dept_head'; 
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
    await this.ngZone.run(async () => {
      await setDoc(this.userDoc(uid), { ...data, createdAt: timestamp, updatedAt: timestamp }, { merge: true });
      await this.ensureUserSubcollections(uid);
    });
  }

  async updateProfile(uid: string, data: UserProfile): Promise<void> {
    const timestamp = new Date().toISOString();
    await this.ngZone.run(async () => {
      await updateDoc(this.userDoc(uid), { ...data, updatedAt: timestamp });
      await this.ensureUserSubcollections(uid);
    });
  }

  private async ensureUserSubcollections(uid: string): Promise<void> {
    const subcollections = ['Chats', 'ConnectionRequest', 'IdRequest', 'Notifications', 'Post'];
    const initData = {
      initialized: true,
      createdAt: new Date().toISOString(),
      userId: uid,
    };

    await Promise.all(
      subcollections.map((name) =>
        setDoc(doc(this.firestore, 'users', uid, name, 'init'), initData, { merge: true })
      )
    );
  }
}
