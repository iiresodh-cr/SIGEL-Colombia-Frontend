import { db } from '../config/firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  setDoc,
  getDoc 
} from 'firebase/firestore';

export const adminService = {
  // Obtener todos los usuarios autorizados
  getAllUsers: async () => {
    const querySnapshot = await getDocs(collection(db, "users"));
    return querySnapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    }));
  },

  // Pre-autorizar un nuevo correo institucional
  invitarUsuario: async (email: string, role: string) => {
    const userRef = doc(db, "users", email.toLowerCase());
    await setDoc(userRef, {
      email: email.toLowerCase(),
      role: role,
      createdAt: new Date().toISOString()
    });
  },

  // Actualizar el rol de un usuario existente
  updateUserRole: async (email: string, newRole: string) => {
    const userRef = doc(db, "users", email.toLowerCase());
    await updateDoc(userRef, { role: newRole });
  },

  // NUEVA FUNCIÓN: Revocar acceso (Eliminar usuario)
  deleteUser: async (email: string) => {
    const userRef = doc(db, "users", email.toLowerCase());
    await deleteDoc(userRef);
  },

  // Obtener estadísticas globales para el dashboard
  getGlobalStats: async () => {
    const expedientesSnap = await getDocs(collection(db, "expedientes"));
    const docs = expedientesSnap.docs.map(d => d.data());
    
    return {
      totalCaso01: docs.filter(d => d.macrocaso === 'Caso 01 - Secuestro').length,
      totalCaso10: docs.filter(d => d.macrocaso === 'Caso 10 - Crímenes de guerra').length
    };
  }
};