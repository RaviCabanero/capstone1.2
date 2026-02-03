import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Firestore, collection, query, where, getDocs, doc, updateDoc, getDoc } from '@angular/fire/firestore';
import { Auth, authState } from '@angular/fire/auth';
import { firstValueFrom, filter, take } from 'rxjs';
import { AlumniIdDetailsModalComponent } from './alumni-id-details-modal.component';

export interface AlumniIdRequest {
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
  selector: 'app-alumni-id-approval',
  templateUrl: './alumni-id-approval.page.html',
  styleUrls: ['./alumni-id-approval.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class AlumniIdApprovalPage implements OnInit {
  selectedSegment: 'pending' | 'approved' | 'rejected' = 'pending';
  requests: AlumniIdRequest[] = [];
  loading = false;

  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private modalController = inject(ModalController);
  private router = inject(Router);

  ngOnInit() {
    this.loadRequests();
  }

  /**
   * Load requests based on selected segment
   */
  async loadRequests() {
    this.loading = true;
    this.requests = [];

    try {
      const authUser = await firstValueFrom(
        authState(this.auth).pipe(
          filter((user): user is NonNullable<typeof user> => !!user),
          take(1)
        )
      );
      

      // Debug: Check current user
      const currentUser = authUser;
      console.log('Current User UID:', currentUser?.uid);
      console.log('Current User Email:', currentUser?.email);
      
      // Debug: Check user's role from Firestore
      if (currentUser) {
        const userDocRef = doc(this.firestore, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          console.log('User Role:', userDocSnap.data()['role']);
        } else {
          console.error('User document does not exist!');
        }
      }

      const idRequestsRef = collection(this.firestore, 'idRequests');
      const q = query(idRequestsRef, where('status', '==', this.selectedSegment));
      const querySnapshot = await getDocs(q);

      this.requests = querySnapshot.docs.map(doc => ({
        ...doc.data() as AlumniIdRequest,
      }));

      // Sort by requestedAt (newest first)
      this.requests.sort((a, b) => 
        new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
      );
    } catch (error) {
      console.error('Failed to load requests:', error);
    } finally {
      this.loading = false;
    }
  }

  /**
   * Handle segment change
   */
  onSegmentChange(event: any) {
    this.selectedSegment = event.detail.value;
    this.loadRequests();
  }

  /**
   * Open details modal
   */
  async openDetails(request: AlumniIdRequest) {
    const modal = await this.modalController.create({
      component: AlumniIdDetailsModalComponent,
      componentProps: { request }
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data?.reload) {
      this.loadRequests();
    }
  }

  /**
   * Approve request
   */
  async approveRequest(request: AlumniIdRequest) {
    try {
      // Update idRequests collection
      await updateDoc(doc(this.firestore, 'idRequests', request.userId), {
        status: 'approved'
      });

      // Update user profile
      await updateDoc(doc(this.firestore, 'users', request.userId), {
        digitalIdStatus: 'approved',
        digitalIdApprovedAt: new Date().toISOString()
      });

      this.loadRequests();
    } catch (error) {
      console.error('Failed to approve request:', error);
    }
  }

  /**
   * Reject request
   */
  async rejectRequest(request: AlumniIdRequest) {
    try {
      // Update idRequests collection
      await updateDoc(doc(this.firestore, 'idRequests', request.userId), {
        status: 'rejected'
      });

      // Update user profile
      await updateDoc(doc(this.firestore, 'users', request.userId), {
        digitalIdStatus: 'rejected',
        digitalIdRejectedAt: new Date().toISOString()
      });

      this.loadRequests();
    } catch (error) {
      console.error('Failed to reject request:', error);
    }
  }

  /**
   * Go back to dashboard
   */
  goBack() {
    this.router.navigate(['/alumni-admin']);
  }
}
