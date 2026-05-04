import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc,
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Victima, Interaccion, Evento } from '../types/jep';

const VICTIMAS_COLLECTION = 'victimas';
const EVENTOS_COLLECTION = 'eventos';

// ==========================================
// MÉTODOS PARA VÍCTIMAS
// ==========================================

// Obtener las víctimas asignadas a un abogado o psicosocial específico
export const getVictimasAsignadas = async (usuarioId: string, rol: 'abogado' | 'psicosocial'): Promise<Victima[]> => {
  const campoAsignacion = rol === 'abogado' 
    ? 'representacion.juridico_asignado_id' 
    : 'representacion.psicosocial_asignado_id';

  const q = query(
    collection(db, VICTIMAS_COLLECTION),
    where(campoAsignacion, '==', usuarioId),
    where('representacion.estado', '==', 'Activo') // Solo traer los activos por defecto
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Victima));
};

// Obtener una víctima por su ID
export const getVictimaById = async (victimaId: string): Promise<Victima | null> => {
  const docRef = doc(db, VICTIMAS_COLLECTION, victimaId);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() } as Victima;
  }
  return null;
};

// Crear una nueva víctima en el sistema
export const createVictima = async (data: Omit<Victima, 'id' | 'fecha_registro'>): Promise<string> => {
  const payload = {
    ...data,
    fecha_registro: new Date().toISOString()
  };
  const docRef = await addDoc(collection(db, VICTIMAS_COLLECTION), payload);
  return docRef.id;
};

// Actualizar datos de una víctima existente
export const updateVictima = async (victimaId: string, data: Partial<Victima>): Promise<void> => {
  const docRef = doc(db, VICTIMAS_COLLECTION, victimaId);
  await updateDoc(docRef, data);
};

// ==========================================
// MÉTODOS PARA SUBCOLECCIÓN: INTERACCIONES
// ==========================================

// Agregar una nota, llamada o interacción al historial de la víctima
export const addInteraccion = async (victimaId: string, data: Omit<Interaccion, 'id'>): Promise<string> => {
  const interaccionesRef = collection(db, `${VICTIMAS_COLLECTION}/${victimaId}/interacciones`);
  const docRef = await addDoc(interaccionesRef, data);
  return docRef.id;
};

// Obtener el historial reciente de interacciones (Paginado a las últimas 20 para eficiencia)
export const getInteraccionesRecientes = async (victimaId: string, limite: number = 20): Promise<Interaccion[]> => {
  const q = query(
    collection(db, `${VICTIMAS_COLLECTION}/${victimaId}/interacciones`),
    orderBy('fecha', 'desc'),
    limit(limite)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Interaccion));
};

// ==========================================
// MÉTODOS PARA EVENTOS
// ==========================================

export const getEventosProximos = async (): Promise<Evento[]> => {
  const hoy = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
  const q = query(
    collection(db, EVENTOS_COLLECTION),
    where('fecha_inicio', '>=', hoy),
    orderBy('fecha_inicio', 'asc'),
    limit(10)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Evento));
};