import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { UserRole } from '../types/user';

interface AuthContextType {
  currentUser: User | null;
  role: UserRole | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const SUPER_ADMIN_EMAIL = 'webmaster@iiresodh.org';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = () => signOut(auth);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        // Bloqueo estricto de dominio
        if (!user.email?.endsWith('@iiresodh.org')) {
          await signOut(auth);
          alert("Acceso denegado: Solo cuentas institucionales @iiresodh.org");
          setCurrentUser(null);
          setRole(null);
          setLoading(false);
          return;
        }

        setCurrentUser(user);

        // Lógica de Roles
        if (user.email === SUPER_ADMIN_EMAIL) {
          setRole('SuperAdmin');
        } else {
          // Buscamos por email en minúsculas (ID del documento)
          const userDoc = await getDoc(doc(db, "users", user.email.toLowerCase()));
          if (userDoc.exists()) {
            setRole(userDoc.data().role as UserRole);
          } else {
            setRole('Invitado');
          }
        }
      } else {
        setCurrentUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, role, loading, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
};