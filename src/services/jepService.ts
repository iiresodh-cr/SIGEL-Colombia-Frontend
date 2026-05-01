import { db } from '../config/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  getDoc, 
  query, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';

interface Expediente {
  id?: string;
  codigoExpediente: string;
  macrocaso: string;
  estadoProcesal: string;
  resumenHechos: string;
  fechaRegistro: string;
}

export const jepService = {
  // Crear expediente
  crearExpediente: async (data: Omit<Expediente, 'id' | 'fechaRegistro'>) => {
    return await addDoc(collection(db, "expedientes"), {
      ...data,
      fechaRegistro: new Date().toISOString(),
      serverTimestamp: Timestamp.now()
    });
  },

  // Obtener todos para el listado
  getExpedientes: async () => {
    const q = query(collection(db, "expedientes"), orderBy("fechaRegistro", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ 
      id: d.id, 
      ...d.data() 
    } as Expediente));
  },

  // Obtener detalle de uno solo (Sincronizado con la página)
  getExpedienteById: async (id: string) => {
    const docRef = doc(db, "expedientes", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Expediente;
    }
    throw new Error("Expediente no encontrado");
  },

  // Gestión de Víctimas (Subcolección interna)
  getVictimas: async (expedienteId: string) => {
    const victimasRef = collection(db, "expedientes", expedienteId, "victimas");
    const snapshot = await getDocs(victimasRef);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  addVictima: async (expedienteId: string, data: any) => {
    const victimasRef = collection(db, "expedientes", expedienteId, "victimas");
    return await addDoc(victimasRef, {
      ...data,
      fechaRegistro: new Date().toISOString()
    });
  }
};