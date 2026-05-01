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
  
  // Estado para controlar el Modal de Acceso Denegado
  const [errorModal, setErrorModal] = useState({ show: false, title: '', message: '' });

  const logout = () => signOut(auth);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);

      if (user) {
        try {
          // 1. Bloqueo estricto por dominio
          if (!user.email?.endsWith('@iiresodh.org')) {
            await signOut(auth);
            setErrorModal({ 
              show: true, 
              title: "Dominio no permitido", 
              message: "El sistema SIGEL es de uso exclusivo para personal con cuentas institucionales (@iiresodh.org). Por favor, cambia de cuenta." 
            });
            setCurrentUser(null);
            setRole(null);
            setLoading(false);
            return;
          }

          // 2. Lógica de Roles y Pre-autorización
          if (user.email === SUPER_ADMIN_EMAIL) {
            setRole('SuperAdmin');
            setCurrentUser(user);
          } else {
            // Buscamos si el usuario fue creado previamente en el panel Admin
            const userDocRef = doc(db, "users", user.email.toLowerCase());
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
              setRole(userDoc.data().role as UserRole);
              setCurrentUser(user);
            } else {
              // 3. Existe el dominio, pero NO está autorizado en la Base de Datos
              await signOut(auth);
              setErrorModal({ 
                show: true, 
                title: "Acceso Restringido", 
                message: "Tu cuenta pertenece al IIRESODH, pero no tienes permisos asignados en el sistema SIGEL. Por favor, solicita acceso al administrador." 
              });
              setCurrentUser(null);
              setRole(null);
            }
          }
        } catch (error) {
          console.error("Error durante la validación de seguridad:", error);
          await signOut(auth);
          setErrorModal({ 
            show: true, 
            title: "Error de Conexión", 
            message: "No pudimos verificar tus credenciales en este momento. Inténtalo nuevamente o contacta a soporte técnico." 
          });
          setCurrentUser(null);
          setRole(null);
        }
      } else {
        // Usuario no autenticado
        setCurrentUser(null);
        setRole(null);
      }
      
      // Siempre liberamos el estado de carga al terminar
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, role, loading, logout }}>
      {/* Solo renderizamos la app si ya terminó de validar la sesión */}
      {!loading && children}

      {/* Modal Profesional para Accesos Denegados */}
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