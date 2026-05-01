import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  query, 
  serverTimestamp 
} from "firebase/firestore";
import { db } from "../config/firebase";
import { ExpedienteJEP, VictimaJEP } from "../types/jep";

export const jepService = {
  // Obtener un expediente por ID
  async getExpediente(id: string): Promise<ExpedienteJEP | null> {
    const docRef = doc(db, "expedientes", id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as ExpedienteJEP : null;
  },

  // Listar víctimas vinculadas a un expediente
  async getVictimas(expedienteId: string): Promise<VictimaJEP[]> {
    const victimasRef = collection(db, "expedientes", expedienteId, "victimas");
    const snapshot = await getDocs(victimasRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VictimaJEP));
  },

  // Registrar nueva víctima manualmente
  async addVictima(expedienteId: string, data: Omit<VictimaJEP, 'id' | 'expedienteId'>) {
    const victimasRef = collection(db, "expedientes", expedienteId, "victimas");
    return await addDoc(victimasRef, {
      ...data,
      expedienteId,
      fechaCreacion: serverTimestamp()
    });
  },

  // Crear un nuevo expediente (Macrocaso) - USADO POR ADMIN
  async crearExpediente(data: Omit<ExpedienteJEP, 'id'>) {
    try {
      const expedientesRef = collection(db, "expedientes");
      const docRef = await addDoc(expedientesRef, {
        ...data,
        fechaCreacion: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error("Error al crear expediente en Firestore:", error);
      throw error;
    }
  }
};