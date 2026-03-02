import { Injectable, EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { Firestore, collection, query, where, getDocs, getDoc, updateDoc, doc, collectionData, orderBy, limit, addDoc, Query } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Observable, from, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(
    private firestore: Firestore,
    private functions: Functions,
    private auth: Auth,
    private injector: EnvironmentInjector
  ) {}

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
    await this.logAdminAction('approve_user', uid, { status: 'approved' });
  }

  /**
   * Reject a user registration
   */
  async rejectUser(uid: string) {
    await updateDoc(doc(this.firestore, `users/${uid}`), {
      status: 'rejected',
      updatedAt: new Date().toISOString(),
    });
    await this.logAdminAction('reject_user', uid, { status: 'rejected' });
  }

  /**
   * Change user role (only to alumni or dept_head)
   */
  async changeUserRole(uid: string, newRole: 'alumni' | 'dept_head') {
    await updateDoc(doc(this.firestore, `users/${uid}`), {
      role: newRole,
      isDepartmentHead: newRole === 'dept_head',
      updatedAt: new Date().toISOString(),
    });
    await this.logAdminAction('change_user_role', uid, { role: newRole });
  }

  /**
   * Assign department to user
   */
  async assignDepartment(uid: string, department: string) {
    await updateDoc(doc(this.firestore, `users/${uid}`), {
      schoolDepartment: department,
      updatedAt: new Date().toISOString(),
    });
    await this.logAdminAction('assign_department', uid, { schoolDepartment: department });
  }

  /**
   * Get latest logs for super admin tracking
   */
  async getLogsTracking(maxItems: number = 200) {
    const logsRef = collection(this.firestore, 'logsTracking');
    const q = query(logsRef, orderBy('createdAt', 'desc'), limit(maxItems));
    const snapshot = await this.runFirestoreCall(() => getDocs(q));
    return snapshot.docs.map((logDoc) => ({
      id: logDoc.id,
      ...logDoc.data()
    }));
  }

  /**
   * Create a tracking log entry (for page/system events)
   */
  async createTrackingLog(action: string, details: Record<string, any> = {}, targetUserId?: string) {
    const currentUid = this.auth.currentUser?.uid || 'unknown';
    await this.logAdminAction(action, targetUserId || currentUid, details);
  }

  /**
   * Write a log entry for admin actions
   */
  private async logAdminAction(action: string, targetUserId: string, details: Record<string, any> = {}) {
    try {
      const actor = this.auth.currentUser;
      const actorUid = actor?.uid || null;

      let actorName = actor?.email || 'Unknown Admin';
      if (actorUid) {
        const actorDoc = await this.runFirestoreCall(() => getDoc(doc(this.firestore, `users/${actorUid}`)));
        if (actorDoc.exists()) {
          const actorData = actorDoc.data() as { firstName?: string; lastName?: string; email?: string };
          const fullName = `${actorData.firstName || ''} ${actorData.lastName || ''}`.trim();
          actorName = fullName || actorData.email || actorName;
        }
      }

      await this.runFirestoreCall(() => addDoc(collection(this.firestore, 'logsTracking'), {
        action,
        actorUid,
        actorName,
        targetUserId,
        details,
        createdAt: new Date().toISOString(),
      }));
    } catch (error) {
      console.error('Failed to write logs tracking entry:', error);
    }
  }

  private runFirestoreCall<T>(operation: () => Promise<T>): Promise<T> {
    return runInInjectionContext(this.injector, operation);
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

  /**
   * Get current user's information including department
   */
  async getCurrentUserDetails() {
    const user = this.auth.currentUser;
    if (!user) return null;
    
    const userDoc = await getDoc(doc(this.firestore, 'users', user.uid));
    return userDoc.exists() ? userDoc.data() : null;
  }

  /**
   * Get alumni by specific department
   */
  async getAlumniByDepartment(department: string) {
    try {
      const usersRef = collection(this.firestore, 'users');
      const q = query(
        usersRef,
        where('status', '==', 'approved'),
        where('department', '==', department)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching department alumni:', error);
      throw error;
    }
  }

  /**
   * Get user role
   */
  async getUserRole(uid?: string): Promise<string | null> {
    const userId = uid || this.auth.currentUser?.uid;
    if (!userId) return null;
    
    const userDoc = await getDoc(doc(this.firestore, 'users', userId));
    return userDoc.exists() ? userDoc.data()['role'] : null;
  }

  /**
   * Check if user is department head
   */
  async isDepartmentHead(): Promise<boolean> {
    const role = await this.getUserRole();
    return role === 'dept_head';
  }

  /**
   * Get active events (stub implementation)
   */
  async getActiveEvents() {
    // TODO: Replace with actual Firestore query for events
    // Example: return await getDocs(query(collection(this.firestore, 'events'), where('status', '==', 'active')));
    return [];
  }

  /**
   * Get recent announcements (stub implementation)
   */
  async getRecentAnnouncements() {
    // TODO: Replace with actual Firestore query for announcements
    // Example: return await getDocs(query(collection(this.firestore, 'announcements'), orderBy('createdAt', 'desc'), limit(5)));
    return [];
  }
}
