import { Injectable } from '@angular/core';
import { Firestore, collection, query, where, getDocs, updateDoc, doc, collectionData, orderBy, Query } from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Observable, from, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private firestore: Firestore, private functions: Functions) {}

  /**
   * Get all pending user approvals
   */
  async getPendingUsers() {
    const q = query(
      collection(this.firestore, 'users'),
      where('status', '==', 'pending')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    }));
  }

  /**
   * Get all approved users
   */
  async getApprovedUsers() {
    const q = query(
      collection(this.firestore, 'users'),
      where('status', '==', 'approved')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    }));
  }

  /**
   * Get all department heads
   */
  async getDepartmentHeads() {
    const q = query(
      collection(this.firestore, 'users'),
      where('role', '==', 'dept_head')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    }));
  }

  /**
   * Approve a user registration
   */
  async approveUser(uid: string) {
    await updateDoc(doc(this.firestore, `users/${uid}`), {
      status: 'approved',
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Reject a user registration
   */
  async rejectUser(uid: string) {
    await updateDoc(doc(this.firestore, `users/${uid}`), {
      status: 'rejected',
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Change user role (only to alumni or dept_head)
   */
  async changeUserRole(uid: string, newRole: 'alumni' | 'dept_head') {
    await updateDoc(doc(this.firestore, `users/${uid}`), {
      role: newRole,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Assign department to user
   */
  async assignDepartment(uid: string, department: string) {
    await updateDoc(doc(this.firestore, `users/${uid}`), {
      schoolDepartment: department,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Get total user count
   */
  async getTotalUserCount(): Promise<number> {
    const q = query(collection(this.firestore, 'users'));
    const snapshot = await getDocs(q);
    return snapshot.size;
  }

  /**
   * Get all registered users
   */
  async getAllUsers() {
    const q = query(collection(this.firestore, 'users'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    }));
  }

  /**
   * Get user count by status
   */
  async getUserCountByStatus(status: 'pending' | 'approved' | 'rejected'): Promise<number> {
    const q = query(
      collection(this.firestore, 'users'),
      where('status', '==', status)
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  }

  /**
   * Get user count by role
   */
  async getUserCountByRole(role: 'alumni' | 'dept_head'): Promise<number> {
    const q = query(
      collection(this.firestore, 'users'),
      where('role', '==', role)
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  }

  /**
   * Get users by department
   */
  async getUsersByDepartment(department: string) {
    const q = query(
      collection(this.firestore, 'users'),
      where('schoolDepartment', '==', department)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    }));
  }

  /**
   * Get all departments from courses collection (unique)
   */
  async getAllDepartments(): Promise<string[]> {
    const coursesCollection = collection(this.firestore, 'courses');
    const snapshot = await getDocs(coursesCollection);
    const departments = new Set<string>();
    snapshot.docs.forEach(doc => {
      const deptName = (doc.data() as any).DeptName;
      if (deptName) departments.add(deptName);
    });
    return Array.from(departments);
  }

  /**
   * Get analytics summary
   */
  async getAnalyticsSummary(): Promise<any> {
    const totalUsers = await this.getTotalUserCount();
    const pendingUsers = await this.getUserCountByStatus('pending');
    const approvedUsers = await this.getUserCountByStatus('approved');
    const rejectedUsers = await this.getUserCountByStatus('rejected');
    const alumniCount = await this.getUserCountByRole('alumni');
    const deptHeadCount = await this.getUserCountByRole('dept_head');

    return {
      totalUsers,
      pendingUsers,
      approvedUsers,
      rejectedUsers,
      alumniCount,
      deptHeadCount,
      approvalRate: totalUsers > 0 ? Math.round((approvedUsers / totalUsers) * 100) : 0,
    };
  }

  /**
   * Get users by department summary
   */
  async getDepartmentSummary(): Promise<any[]> {
    const departments = await this.getAllDepartments();
    const summary = [];

    for (const dept of departments) {
      const users = await this.getUsersByDepartment(dept);
      summary.push({
        department: dept,
        userCount: users.length,
      });
    }

    return summary.sort((a, b) => b.userCount - a.userCount);
  }

  /**
   * Send approval email notification
   */
  async sendApprovalEmail(uid: string, email: string, firstName: string, lastName: string) {
    try {
      const sendApprovalEmail = httpsCallable(this.functions, 'sendApprovalEmail');
      await sendApprovalEmail({ uid, email, firstName, lastName });
    } catch (error) {
      console.error('Error sending approval email:', error);
      // Don't throw - email failure shouldn't block approval
    }
  }

  /**
   * Send rejection email notification
   */
  async sendRejectionEmail(uid: string, email: string, firstName: string, lastName: string, reason?: string) {
    try {
      const sendRejectionEmail = httpsCallable(this.functions, 'sendRejectionEmail');
      await sendRejectionEmail({ uid, email, firstName, lastName, reason });
    } catch (error) {
      console.error('Error sending rejection email:', error);
      // Don't throw - email failure shouldn't block rejection
    }
  }
}
