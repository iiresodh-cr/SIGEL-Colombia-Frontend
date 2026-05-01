import { db } from '../config/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  getDoc, 
  query, 
  orderBy 
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
  // Crear expediente (Usado por Admin)
  crearExpediente: async (data: Omit<Expediente, 'id' | 'fechaRegistro'>) => {
    return await addDoc(collection(db, "expedientes"), {
      ...data,
      fechaRegistro: new Date().toISOString(),
      fechaCreacion: new Date() // Para compatibilidad de consola
    });
  },

  // Obtener todos para el listado (Usado por Usuarios)
  getExpedientes: async () => {
    const q = query(collection(db, "expedientes"), orderBy("fechaRegistro", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ 
      id: d.id, 
      ...d.data() 
    } as Expediente));
  },

  // Obtener detalle de uno solo
  getExpedienteById: async (id: string) => {
    const docRef = doc(db, "expedientes", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Expediente;
    }
    throw new Error("Expediente no encontrado");
  }
};