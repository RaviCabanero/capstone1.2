import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface Course {
  id?: string;
  CourseName: string;
  DeptName?: string;
}

@Injectable({ providedIn: 'root' })
export class CourseService {
  constructor(private firestore: Firestore) {}

  getCourses(): Observable<Course[]> {
    const courseCollection = collection(this.firestore, 'courses');
    return collectionData(courseCollection, { idField: 'id' }) as Observable<Course[]>;
  }
}
