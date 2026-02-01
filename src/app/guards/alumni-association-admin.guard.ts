import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';

export const alumniAssociationAdminGuard = async () => {
  const auth = inject(Auth);
  const firestore = inject(Firestore);
  const router = inject(Router);
  
  const user = auth.currentUser;
  
  if (!user) {
    return router.parseUrl('/login');
  }
  
  try {
    const userDoc = await getDoc(doc(firestore, 'users', user.uid));
    const userData = userDoc.data();
    
    if (userData?.['role'] === 'alumni_association_admin' || userData?.['role'] === 'super_admin') {
      return true;
    }
    
    return router.parseUrl('/home');
  } catch (error) {
    console.error('Error checking admin status:', error);
    return router.parseUrl('/home');
  }
};
