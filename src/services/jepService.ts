import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  doc, 
  getDoc, 
  orderBy, 
  limit,
  updateDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Victima, Interaccion, Evento } from '../types/jep';

export const jepService = {
  // --- SECCIÓN VÍCTIMAS ---

  // 1. Crear una nueva víctima
  createVictima: async (data: Omit<Victima, 'id' | 'fecha_registro'>) => {
    const victimasRef = collection(db, 'victimas');
    const nuevaVictima = {
      ...data,
      fecha_registro: new Date().toISOString(),
      storage_folder_url: '' 
    };
    const docRef = await addDoc(victimasRef, nuevaVictima);
    return docRef.id;
  },

  // 2. Obtener víctimas asignadas (Búsqueda multipropósito para evitar desconexiones de ID)
  getVictimasAsignadas: async (usuario: any, tipo: 'abogado' | 'psicosocial') => {
    const campo = tipo === 'abogado' ? 'representacion.juridico_asignado_id' : 'representacion.psicosocial_asignado_id';
    
    // Obtenemos todas las posibles formas en las que se pudo haber guardado al usuario
    const email = usuario?.email || '';
    const uid = usuario?.uid || '';
    const username = email ? email.split('@')[0] : '';

    const victimasRef = collection(db, 'victimas');

    const queries = [
      getDocs(query(victimasRef, where(campo, '==', email), where('representacion.estado', '==', 'Activo')))
    ];

    if (uid) {
      queries.push(getDocs(query(victimasRef, where(campo, '==', uid), where('representacion.estado', '==', 'Activo'))));
    }
    if (username) {
      queries.push(getDocs(query(victimasRef, where(campo, '==', username), where('representacion.estado', '==', 'Activo'))));
    }

    const resultados = await Promise.all(queries);
    const map = new Map();

    resultados.forEach(snapshot => {
      snapshot.forEach(doc => {
        if (!map.has(doc.id)) {
          map.set(doc.id, { id: doc.id, ...doc.data() } as Victima);
        }
      });
    });

    return Array.from(map.values());
  },

  // 3. Obtener víctima por ID
  getVictimaById: async (id: string) => {
    const docRef = doc(db, 'victimas', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Victima;
    }
    throw new Error("Víctima no encontrada");
  },

  // 4. Obtener todas las víctimas
  getVictimas: async (expedienteId?: string) => {
    let q;
    if (expedienteId) {
      q = query(collection(db, 'victimas'), where('expedienteId', '==', expedienteId));
    } else {
      q = query(collection(db, 'victimas'));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Victima));
  },

  // 5. Vincular víctima a un expediente
  addVictima: async (expedienteId: string, data: any) => {
    const victimasRef = collection(db, 'victimas');
    await addDoc(victimasRef, {
      ...data,
      expedienteId,
      fecha_registro: new Date().toISOString()
    });
  },


  // --- SECCIÓN INTERACCIONES Y NOTAS ---

  // 6. Registrar interacción/nota
  addInteraccion: async (victimaId: string, data: Omit<Interaccion, 'id'>) => {
    const interaccionesRef = collection(db, `victimas/${victimaId}/interacciones`);
    await addDoc(interaccionesRef, data);
  },

  // 7. Obtener interacciones recientes
  getInteraccionesRecientes: async (victimaId: string) => {
    const interaccionesRef = collection(db, `victimas/${victimaId}/interacciones`);
    const q = query(interaccionesRef, orderBy('fecha', 'desc'), limit(10));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Interaccion));
  },


  // --- SECCIÓN EVENTOS Y TALLERES ---

  // 8. Obtener eventos próximos
  getEventosProximos: async () => {
    const eventosRef = collection(db, 'eventos');
    const q = query(eventosRef, orderBy('fecha', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Evento));
  },

  // 9. Crear un nuevo evento
  createEvento: async (data: Omit<Evento, 'id'>) => {
    const eventosRef = collection(db, 'eventos');
    const docRef = await addDoc(eventosRef, data);
    return docRef.id;
  },


  // --- SECCIÓN EXPEDIENTES ---

  // 10. Obtener listado de expedientes
  getExpedientes: async () => {
    const snapshot = await getDocs(collection(db, 'expedientes'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  // 11. Obtener expediente por ID
  getExpedienteById: async (id: string) => {
    const docRef = doc(db, 'expedientes', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  }
};