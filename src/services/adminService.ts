import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  writeBatch, 
  setDoc, 
  deleteDoc,
  updateDoc,
  getCountFromServer,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Victima } from '../types/jep';
import { Usuario, RolUsuario } from '../types/user';

export const adminService = {
  // 1. Obtener todos los usuarios autorizados
  getAllUsers: async (): Promise<Usuario[]> => {
    const q = query(collection(db, 'usuarios'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Usuario));
  },

  // 2. Actualizar rol de un usuario
  updateUserRole: async (email: string, role: string) => {
    const userRef = doc(db, 'usuarios', email.toLowerCase());
    await setDoc(userRef, { rol: role.toLowerCase() }, { merge: true });
  },

  // 3. Revocar acceso (Eliminar usuario)
  deleteUser: async (email: string) => {
    const userRef = doc(db, 'usuarios', email.toLowerCase());
    await deleteDoc(userRef);
  },

  // 4. Pre-autorizar un nuevo correo institucional
  invitarUsuario: async (email: string, role: string, nombre: string = '') => {
    const userRef = doc(db, 'usuarios', email.toLowerCase());
    const nuevoUsuario: Partial<Usuario> = {
      correo: email.toLowerCase(),
      rol: role.toLowerCase() as RolUsuario,
      nombre_completo: nombre,
      estado: 'Activo',
      fecha_creacion: new Date().toISOString()
    };
    await setDoc(userRef, nuevoUsuario, { merge: true });
  },

  // 5. Obtener estadísticas globales de la organización (Agregaciones en servidor)
  getGlobalStats: async () => {
    const victimasRef = collection(db, 'victimas');
    
    const qTotal = query(victimasRef);
    const qCaso01 = query(victimasRef, where('representacion.caso', 'array-contains', 'Caso 01'));
    const qCaso10 = query(victimasRef, where('representacion.caso', 'array-contains', 'Caso 10'));
    const qAcreditadas = query(victimasRef, where('estado_jep.estado_acreditacion', '==', 'Acreditada'));
    const qUltimas = query(victimasRef, orderBy('fecha_registro', 'desc'), limit(5));

    const [snapTotal, snapCaso01, snapCaso10, snapAcreditadas, snapUltimas] = await Promise.all([
      getCountFromServer(qTotal),
      getCountFromServer(qCaso01),
      getCountFromServer(qCaso10),
      getCountFromServer(qAcreditadas),
      getDocs(qUltimas)
    ]);
    
    return {
      totalVictimas: snapTotal.data().count,
      totalCaso01: snapCaso01.data().count,
      totalCaso10: snapCaso10.data().count,
      totalAcreditadas: snapAcreditadas.data().count,
      ultimasVictimas: snapUltimas.docs.map(doc => ({ id: doc.id, ...doc.data() } as Victima))
    };
  },

  // 6. SUSTITUCIÓN MASIVA DE CASOS
  reasignarCasosMasivamente: async (
    profesionalAnteriorId: string,
    profesionalNuevoId: string,
    adminResponsableId: string,
    tipoProfesional: 'Jurídico' | 'Psicosocial',
    motivo: string,
    radicadoJep?: string
  ): Promise<number> => {
    const batch = writeBatch(db);
    const campoFiltro = tipoProfesional === 'Jurídico' 
      ? 'representacion.juridico_asignado_id' 
      : 'representacion.psicosocial_asignado_id';

    const q = query(
      collection(db, 'victimas'), 
      where(campoFiltro, '==', profesionalAnteriorId),
      where('representacion.estado', '==', 'Activo')
    );
    
    const snapshot = await getDocs(q);
    let totalModificados = 0;

    snapshot.forEach((victimaDoc) => {
      const victimaRef = doc(db, 'victimas', victimaDoc.id);
      batch.update(victimaRef, {
        [campoFiltro]: profesionalNuevoId,
        'representacion.fecha_asignacion': new Date().toISOString().split('T')[0]
      });

      const historialRef = doc(collection(db, `victimas/${victimaDoc.id}/historial_asignaciones`));
      batch.set(historialRef, {
        fecha_sustitucion: new Date().toISOString(),
        tipo_profesional: tipoProfesional,
        abogado_anterior_id: profesionalAnteriorId,
        abogado_nuevo_id: profesionalNuevoId,
        motivo: motivo,
        sustitucion_realizada_por_id: adminResponsableId,
        radicado_sustitucion_jep: radicadoJep || ''
      });
      totalModificados++;
    });

    if (totalModificados > 0) {
      await batch.commit();
    }
    return totalModificados;
  },

  // 7. LISTAR PROFESIONALES OPERATIVOS
  getProfesionales: async () => {
    const q = query(collection(db, 'usuarios'));
    const snapshot = await getDocs(q);
    const todos = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Usuario));
    return {
      abogados: todos.filter(u => u.rol === 'abogado' || u.rol === 'admin' || u.rol === 'superadmin'),
      // CORRECCIÓN: Los roles directivos ahora también indexan como referencia psicosocial válida
      psicosociales: todos.filter(u => u.rol === 'psicosocial' || u.rol === 'admin' || u.rol === 'superadmin')
    };
  },

  // 8. REASIGNACIÓN INDIVIDUAL
  reasignarVictimaIndividual: async (
    victimaId: string,
    adminResponsableId: string,
    changes: {
      juridico_nuevo_id: string;
      psicosocial_nuevo_id: string;
      motivo: string;
    }
  ): Promise<void> => {
    const victimaRef = doc(db, 'victimas', victimaId);
    const fechaCompleta = new Date().toISOString();
    const updates: any = {};
    updates['representacion.juridico_asignado_id'] = changes.juridico_nuevo_id;
    updates['representacion.psicosocial_asignado_id'] = changes.psicosocial_nuevo_id;
    updates['representacion.fecha_asignacion'] = fechaCompleta.split('T')[0];

    await updateDoc(victimaRef, updates);

    const historialRef = doc(collection(db, `victimas/${victimaId}/historial_asignaciones`));
    await setDoc(historialRef, {
      fecha_sustitucion: fechaCompleta,
      juridico_nuevo_id: changes.juridico_nuevo_id,
      psicosocial_nuevo_id: changes.psicosocial_nuevo_id,
      motivo: changes.motivo,
      sustitucion_realizada_por_id: adminResponsableId
    });
  },

  // 9. OBTENER VÍCTIMAS POR PROFESIONAL
  getVictimasPorProfesional: async (usuario: Usuario) => {
    const victimasRef = collection(db, 'victimas');
    const correoOficial = usuario.correo.toLowerCase().trim();
    
    const queries = [
      getDocs(query(victimasRef, where('representacion.juridico_asignado_id', '==', correoOficial))),
      getDocs(query(victimasRef, where('representacion.psicosocial_asignado_id', '==', correoOficial)))
    ];

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
  }
};