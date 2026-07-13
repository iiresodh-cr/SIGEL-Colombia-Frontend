import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../core/config/firebase';
import { Radicado } from '../../core/types/radicado';

const COLLECTION_NAME = 'radicados';

export const radicadoService = {
  addRadicado: async (radicado: Omit<Radicado, 'id'>) => {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), radicado);
    return docRef.id;
  },

  getRadicados: async (): Promise<Radicado[]> => {
    const q = query(collection(db, COLLECTION_NAME), orderBy('fecha_radicado', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => ({ 
      id: docSnap.id, 
      ...docSnap.data() 
    } as Radicado));
  },

  deleteRadicado: async (id: string) => {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  }
};