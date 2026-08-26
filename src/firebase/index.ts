'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { getDatabase, ref, onValue, set as rtdbSet } from 'firebase/database';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot
} from 'firebase/firestore';
import { firebaseConfig } from './config';
import { useState, useEffect } from 'react';

// قائمة حسابات الإدارة الأساسية المحمية
const ADMIN_EMAILS = ['artiateech@gmail.com', 'artiatechstudio@gmail.com'];

// تهيئة Firebase مرة واحدة فقط كـ Singleton لضمان استقرار الجلسات وسرعة الاستجابة
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
const rtdb = getDatabase(app);

// تصدير الكائنات الجاهزة للاستخدام المباشر
export { app, auth, db, rtdb };

// تهيئة موفر خدمة Google بشكل مسبق لتسريع الفتح ومنع حظر الـ Popup
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export function useFirebase() {
  // للرجوع لنفس الكائنات دون إعادة تهيئة
  return { app, auth, db, rtdb };
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) {
        const userDocRef = doc(db, `users/${u.uid}`);
        const userSnap = await getDoc(userDocRef);
        
        if (!userSnap.exists()) {
          const isSuper = ADMIN_EMAILS.includes(u.email || '');
          const userData = {
            uid: u.uid,
            username: u.displayName || 'مبرمج_طموح',
            email: u.email,
            role: isSuper ? 'admin' : 'trainee',
            xp: 0,
            solved: 0,
            country: 'LY',
            badges: isSuper ? ['first_solve'] : [], 
            createdAt: new Date().toISOString(),
            lastActivity: new Date().toISOString()
          };
          
          await setDoc(userDocRef, userData);
          await rtdbSet(ref(rtdb, `users/${u.uid}`), userData);
        }
      }
      setUser(u);
      setLoading(false);
    });
  }, []);

  return { user, loading };
}

export function useAdmin() {
  const { user, loading: authLoading } = useUser();
  const [role, setRole] = useState<'admin' | 'problem_setter' | 'trainee'>('trainee');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    const userDocRef = doc(db, `users/${user.uid}`);
    return onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        setRole(snapshot.data().role || 'trainee');
      } else {
        const isSuper = ADMIN_EMAILS.includes(user.email || '');
        setRole(isSuper ? 'admin' : 'trainee');
      }
      setLoading(false);
    }, (err) => {
      console.error('Error fetching admin status:', err);
      setLoading(false);
    });
  }, [user, authLoading]);

  return { 
    role, 
    isAdmin: role === 'admin', 
    isProblemSetter: role === 'problem_setter' || role === 'admin',
    loading 
  };
}

export function useMaintenanceMode() {
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const maintenanceRef = ref(rtdb, 'settings/maintenanceMode');
    return onValue(maintenanceRef, (snapshot) => {
      setIsMaintenance(!!snapshot.val());
      setLoading(false);
    }, (err) => {
      console.error('Error fetching maintenance mode:', err);
      setIsMaintenance(false);
      setLoading(false);
    });
  }, []);

  return { isMaintenance, loading };
}

export const loginWithGoogle = async () => {
  // استدعاء مباشر وسريع لمنع حظر النافذة من المتصفح
  return signInWithPopup(auth, googleProvider);
};

export const logout = async () => {
  await signOut(auth);
};
