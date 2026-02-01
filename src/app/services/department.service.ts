import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';

export interface Department {
  id?: string;
  DeptName: string;
}

@Injectable({ providedIn: 'root' })
export class DepartmentService {
  constructor(private firestore: Firestore) {}

  getDepartments(): Observable<Department[]> {
    const deptCollection = collection(this.firestore, 'departments');
    return collectionData(deptCollection, { idField: 'id' }) as Observable<Department[]>;
  }
}
