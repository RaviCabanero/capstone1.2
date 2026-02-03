import { Component, Input, inject, Injector, runInInjectionContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { Firestore, doc, updateDoc } from '@angular/fire/firestore';

interface AlumniIdRequest {
  userId: string;
  email: string;
  studentId?: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  suffix?: string;
  maidenName?: string;
  educationLevel: string;
  degreeProgram: string;
  yearGraduated: string;
  permanentAddress: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

@Component({
  selector: 'app-alumni-id-details-modal',
  template: `
    <ion-header>
      <ion-toolbar color="danger">
        <ion-title>Alumni ID Request Details</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">
            <ion-icon name="close"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="details-container" *ngIf="request">
        <!-- Status Badge -->
        <div class="status-section">
          <ion-badge [color]="request.status === 'approved' ? 'success' : request.status === 'rejected' ? 'danger' : 'warning'">
            {{ request.status | titlecase }}
          </ion-badge>
        </div>

        <!-- Personal Information -->
        <div class="section">
          <h3>Personal Information</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Full Name:</span>
              <span class="value">{{ request.firstName }} {{ request.middleName }} {{ request.lastName }} {{ request.suffix }}</span>
            </div>
            <div class="info-item" *ngIf="request.maidenName">
              <span class="label">Maiden Name:</span>
              <span class="value">{{ request.maidenName }}</span>
            </div>
            <div class="info-item">
              <span class="label">Email:</span>
              <span class="value">{{ request.email }}</span>
            </div>
            <div class="info-item" *ngIf="request.studentId">
              <span class="label">Student ID:</span>
              <span class="value">{{ request.studentId }}</span>
            </div>
          </div>
        </div>

        <!-- Educational Information -->
        <div class="section">
          <h3>Educational Information</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Education Level:</span>
              <span class="value">{{ request.educationLevel }}</span>
            </div>
            <div class="info-item">
              <span class="label">Degree Program:</span>
              <span class="value">{{ request.degreeProgram }}</span>
            </div>
            <div class="info-item">
              <span class="label">Year Graduated:</span>
              <span class="value">{{ request.yearGraduated }}</span>
            </div>
          </div>
        </div>

        <!-- Address Information -->
        <div class="section">
          <h3>Address Information</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Permanent Address:</span>
              <span class="value">{{ request.permanentAddress }}</span>
            </div>
          </div>
        </div>

        <!-- Request Information -->
        <div class="section">
          <h3>Request Information</h3>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Requested At:</span>
              <span class="value">{{ request.requestedAt | date:'full' }}</span>
            </div>
          </div>
        </div>

        <!-- Actions (only for pending requests) -->
        <div class="actions-section" *ngIf="request.status === 'pending'">
          <ion-button expand="block" color="success" (click)="approve()">
            <ion-icon name="checkmark-circle" slot="start"></ion-icon>
            Approve Request
          </ion-button>
          <ion-button expand="block" color="danger" (click)="reject()">
            <ion-icon name="close-circle" slot="start"></ion-icon>
            Reject Request
          </ion-button>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .details-container {
      max-width: 600px;
      margin: 0 auto;
    }

    .status-section {
      text-align: center;
      margin-bottom: 24px;

      ion-badge {
        font-size: 16px;
        padding: 8px 16px;
        text-transform: capitalize;
      }
    }

    .section {
      margin-bottom: 24px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--ion-color-light);

      &:last-child {
        border-bottom: none;
      }

      h3 {
        margin: 0 0 16px 0;
        color: var(--ion-color-dark);
        font-size: 18px;
        font-weight: 600;
      }
    }

    .info-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;

      .label {
        font-size: 14px;
        color: var(--ion-color-medium);
        font-weight: 500;
      }

      .value {
        font-size: 16px;
        color: var(--ion-color-dark);
      }
    }

    .actions-section {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 2px solid var(--ion-color-light);

      ion-button {
        margin-bottom: 12px;
      }
    }
  `],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class AlumniIdDetailsModalComponent {
  @Input() request!: AlumniIdRequest;

  private modalController = inject(ModalController);
  private firestore = inject(Firestore);
  private injector = inject(Injector);

  async approve() {
    try {
      await updateDoc(doc(this.firestore, 'idRequests', this.request.userId), {
        status: 'approved'
      });

      await updateDoc(doc(this.firestore, 'users', this.request.userId), {
        digitalIdStatus: 'approved',
        digitalIdApprovedAt: new Date().toISOString()
      });

      this.dismiss(true);
    } catch (error) {
      console.error('Failed to approve:', error);
    }
  }

  async reject() {
    try {
      await updateDoc(doc(this.firestore, 'idRequests', this.request.userId), {
        status: 'rejected'
      });

      await updateDoc(doc(this.firestore, 'users', this.request.userId), {
        digitalIdStatus: 'rejected',
        digitalIdRejectedAt: new Date().toISOString()
      });

      this.dismiss(true);
    } catch (error) {
      console.error('Failed to reject:', error);
    }
  }

  dismiss(reload = false) {
    this.modalController.dismiss({ reload });
  }
}
