import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private selectedEventSubject = new BehaviorSubject<any>(null);
  selectedEvent$ = this.selectedEventSubject.asObservable();

  constructor() { }

  setSelectedEvent(event: any) {
    this.selectedEventSubject.next(event);
  }

  clearSelectedEvent() {
    this.selectedEventSubject.next(null);
  }
}
