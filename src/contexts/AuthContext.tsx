import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, signInWithGoogle, logout } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection } from 'firebase/firestore';
import { UserProfile, Role } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  loginWithGoogle: (role?: Role) => Promise<void>;
  logoutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          // Auto-upgrade to admin if email matches
          if (user.email === 'altamedia7@gmail.com' && data.role !== 'admin') {
            try {
              await updateDoc(docRef, { role: 'admin' });
              data.role = 'admin';
            } catch (err) {
              console.error("Failed to auto-upgrade admin", err);
            }
          }
          setUserProfile(data);
        } else {
          // If profile doesn't exist, we might need to create it.
          // But usually we do this during registration.
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const loginWithGoogle = async (role: Role = 'buyer') => {
    try {
      const user = await signInWithGoogle();
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        
        let finalRole = role;
        if (user.email === 'altamedia7@gmail.com') {
          finalRole = 'admin';
        }

        if (!docSnap.exists()) {
          // Create new user profile
          const newProfile: UserProfile = {
            uid: user.uid,
            name: user.displayName || 'User',
            email: user.email || '',
            role: finalRole,
            createdAt: serverTimestamp(),
          };
          await setDoc(docRef, newProfile);
          setUserProfile(newProfile);

          // Send welcome notification
          try {
            const notifRef = doc(collection(db, 'notifications'));
            await setDoc(notifRef, {
              id: notifRef.id,
              userId: user.uid,
              title: 'Selamat Datang di DesaMart!',
              message: 'Terima kasih telah bergabung. Mulai jelajahi produk-produk desa terbaik kami.',
              isRead: false,
              createdAt: serverTimestamp()
            });
          } catch (err) {
            console.error("Failed to send welcome notification", err);
          }
        } else {
          const data = docSnap.data() as UserProfile;
          if (user.email === 'altamedia7@gmail.com' && data.role !== 'admin') {
            try {
              await updateDoc(docRef, { role: 'admin' });
              data.role = 'admin';
            } catch (err) {
              console.error("Failed to auto-upgrade admin", err);
            }
          }
          setUserProfile(data);
        }
      }
    } catch (error) {
      console.error("Login failed", error);
      throw error;
    }
  };

  const logoutUser = async () => {
    await logout();
    setCurrentUser(null);
    setUserProfile(null);
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    loginWithGoogle,
    logoutUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
