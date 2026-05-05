import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Evento } from '../types/evento';

const COLLECTION_NAME = 'eventos';

export const eventoService = {
  addEvento: async (evento: Omit<Evento, 'id'>) => {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), evento);
    return docRef.id;
  },

  getEventos: async (): Promise<Evento[]> => {
    const q = query(collection(db, COLLECTION_NAME), orderBy('fecha', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => ({ 
      id: docSnap.id, 
      ...docSnap.data() 
    } as Evento));
  },

  deleteEvento: async (id: string) => {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  }
};