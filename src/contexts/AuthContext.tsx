import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, signInWithGoogle, logout } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, onSnapshot } from 'firebase/firestore';
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
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        
        // Use onSnapshot for real-time profile updates
        unsubscribeProfile = onSnapshot(docRef, async (docSnap) => {
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
            setUserProfile(null);
          }
          setLoading(false);
        }, (error) => {
          console.error("Profile listener error", error);
          // Don't use handleFirestoreError here to avoid infinite loop if it's a permission error on the user's own profile
          // but we should still set loading to false so the app can render (maybe showing a login screen)
          setLoading(false);
        });
      } else {
        setUserProfile(null);
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
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
