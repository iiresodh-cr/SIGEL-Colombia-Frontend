import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Audiencia } from '../types/audiencia';

const COLLECTION_NAME = 'audiencias';

export const audienciaService = {
  addAudiencia: async (audiencia: Omit<Audiencia, 'id'>) => {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), audiencia);
    return docRef.id;
  },

  getAudiencias: async (): Promise<Audiencia[]> => {
    const q = query(collection(db, COLLECTION_NAME), orderBy('fecha', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(docSnap => ({ 
      id: docSnap.id, 
      ...docSnap.data() 
    } as Audiencia));
  },

  deleteAudiencia: async (id: string) => {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  }
};