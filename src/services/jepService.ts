import { collection, doc, getDocs, getDoc, addDoc, updateDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Victima, Interaccion, Evento } from '../types/jep';

const VICTIMAS_COLLECTION = 'victimas';
const EVENTOS_COLLECTION = 'eventos';

export const jepService = {
  // ==========================================
  // MÉTODOS PARA NUEVA ARQUITECTURA (VÍCTIMAS)
  // ==========================================
  getVictimasAsignadas: async (usuarioId: string, rol: 'abogado' | 'psicosocial'): Promise<Victima[]> => {
    const campoAsignacion = rol === 'abogado' 
      ? 'representacion.juridico_asignado_id' 
      : 'representacion.psicosocial_asignado_id';
    const q = query(collection(db, VICTIMAS_COLLECTION), where(campoAsignacion, '==', usuarioId), where('representacion.estado', '==', 'Activo'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Victima));
  },

  getVictimaById: async (victimaId: string): Promise<Victima | null> => {
    const docRef = doc(db, VICTIMAS_COLLECTION, victimaId);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) return { id: snapshot.id, ...snapshot.data() } as Victima;
    return null;
  },

  createVictima: async (data: Omit<Victima, 'id' | 'fecha_registro'>): Promise<string> => {
    const payload = { ...data, fecha_registro: new Date().toISOString() };
    const docRef = await addDoc(collection(db, VICTIMAS_COLLECTION), payload);
    return docRef.id;
  },

  updateVictima: async (victimaId: string, data: Partial<Victima>): Promise<void> => {
    const docRef = doc(db, VICTIMAS_COLLECTION, victimaId);
    await updateDoc(docRef, data);
  },

  addInteraccion: async (victimaId: string, data: Omit<Interaccion, 'id'>): Promise<string> => {
    const interaccionesRef = collection(db, `${VICTIMAS_COLLECTION}/${victimaId}/interacciones`);
    const docRef = await addDoc(interaccionesRef, data);
    return docRef.id;
  },

  getInteraccionesRecientes: async (victimaId: string, limite: number = 20): Promise<Interaccion[]> => {
    const q = query(collection(db, `${VICTIMAS_COLLECTION}/${victimaId}/interacciones`), orderBy('fecha', 'desc'), limit(limite));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Interaccion));
  },

  // ==========================================
  // MÉTODOS PARA EVENTOS
  // ==========================================
  getEventosProximos: async (): Promise<Evento[]> => {
    const q = query(
      collection(db, EVENTOS_COLLECTION), 
      orderBy('fecha_inicio', 'desc'), 
      limit(20)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Evento));
  },

  createEvento: async (data: Omit<Evento, 'id'>): Promise<string> => {
    const docRef = await addDoc(collection(db, EVENTOS_COLLECTION), data);
    return docRef.id;
  },

  // ==========================================
  // MÉTODOS PUENTE (Compatibilidad con UI antigua)
  // ==========================================
  crearExpediente: async (data: any) => { console.log('Deprecated. Se usará createVictima', data); },
  getExpedientes: async () => { return []; },
  getExpedienteById: async (id: string) => { return { id, codigoExpediente: 'TRANSICIÓN', macrocaso: 'Caso 01' }; },
  getVictimas: async (expedienteId: string) => { return []; },
  addVictima: async (expedienteId: string, data: any) => { console.log('Deprecated.', data); }
};