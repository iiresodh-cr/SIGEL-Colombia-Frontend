import { db } from '../config/firebase';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  setDoc,
  orderBy,
  query
} from 'firebase/firestore';

// Interfaz corregida según tu captura de Firebase
interface Expediente {
  id: string;
  codigoExpediente?: string;
  macrocaso?: string;
  estadoProcesal?: string;
  fechaRegistro?: string;
  resumenHechos?: string;
}

export const adminService = {
  getAllUsers: async () => {
    const querySnapshot = await getDocs(collection(db, "users"));
    return querySnapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    }));
  },

  invitarUsuario: async (email: string, role: string) => {
    const userRef = doc(db, "users", email.toLowerCase());
    await setDoc(userRef, {
      email: email.toLowerCase(),
      role: role,
      createdAt: new Date().toISOString()
    });
  },

  updateUserRole: async (email: string, newRole: string) => {
    const userRef = doc(db, "users", email.toLowerCase());
    await updateDoc(userRef, { role: newRole });
  },

  deleteUser: async (email: string) => {
    const userRef = doc(db, "users", email.toLowerCase());
    await deleteDoc(userRef);
  },

  getGlobalStats: async () => {
    const expedientesRef = collection(db, "expedientes");
    // CORRECCIÓN: Ordenamos por 'fechaRegistro', que es el campo que existe en tu DB
    const q = query(expedientesRef, orderBy("fechaRegistro", "desc"));
    const snapshot = await getDocs(q);
    
    const docs = snapshot.docs.map(d => ({ 
      id: d.id, 
      ...d.data() 
    } as Expediente));
    
    return {
      allExpedientes: docs,
      totalCaso01: docs.filter(d => 
        String(d.macrocaso || "").includes('01')
      ).length,
      totalCaso10: docs.filter(d => 
        String(d.macrocaso || "").includes('10')
      ).length
    };
  }
};