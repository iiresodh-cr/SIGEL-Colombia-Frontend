import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { UserRole } from '../types/user';
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';

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
  const [errorModal, setErrorModal] = useState({ show: false, title: '', message: '' });

  const logout = () => signOut(auth);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);

      if (user) {
        try {
          if (!user.email?.endsWith('@iiresodh.org')) {
            await signOut(auth);
            setErrorModal({ 
              show: true, 
              title: "Dominio no permitido", 
              message: "Acceso exclusivo para personal con cuentas institucionales (@iiresodh.org)." 
            });
            setCurrentUser(null);
            setRole(null);
            setLoading(false);
            return;
          }

          // REGLA ESTRICTA: El Superadministrador siempre tiene acceso supremo
          if (user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
            setRole('superadmin');
            setCurrentUser(user);
          } else {
            // Cambiado a colección 'usuarios' para coincidir con Fase 1
            const userDocRef = doc(db, "usuarios", user.email.toLowerCase());
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
              setRole(userDoc.data().rol as UserRole); // Traemos 'rol' en vez de 'role'
              setCurrentUser(user);
            } else {
              await signOut(auth);
              setErrorModal({ 
                show: true, 
                title: "Acceso Restringido", 
                message: "Tu cuenta no tiene permisos asignados en el sistema SIGEL. Contacta al administrador." 
              });
              setCurrentUser(null);
              setRole(null);
            }
          }
        } catch (error) {
          console.error("Validación de seguridad fallida:", error);
          await signOut(auth);
          setErrorModal({ 
            show: true, 
            title: "Error de Validación", 
            message: "No pudimos verificar tus permisos. Revisa tu conexión o las reglas de la base de datos." 
          });
          setCurrentUser(null);
          setRole(null);
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

      <Dialog open={errorModal.show}>
        <DialogTitle sx={{ color: 'error.main', fontWeight: 'bold' }}>
          {errorModal.title}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'text.primary', mt: 1 }}>
            {errorModal.message}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button 
            onClick={() => setErrorModal({ show: false, title: '', message: '' })} 
            color="primary" 
            variant="contained"
            disableElevation
          >
            Entendido
          </Button>
        </DialogActions>
      </Dialog>
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
};