import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  writeBatch, 
  setDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { HistorialAsignacion, Victima } from '../types/jep';
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
  invitarUsuario: async (email: string, role: string) => {
    const userRef = doc(db, 'usuarios', email.toLowerCase());
    const nuevoUsuario: Partial<Usuario> = {
      correo: email.toLowerCase(),
      rol: role.toLowerCase() as RolUsuario,
      estado: 'Activo',
      fecha_creacion: new Date().toISOString()
    };
    await setDoc(userRef, nuevoUsuario, { merge: true });
  },

  // 5. Obtener estadísticas globales de la organización
  getGlobalStats: async () => {
    const snapshot = await getDocs(collection(db, 'victimas'));
    const allVictimas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Victima));
    
    return {
      totalVictimas: allVictimas.length,
      totalCaso01: allVictimas.filter(v => v.representacion.caso.includes('Caso 01')).length,
      totalCaso10: allVictimas.filter(v => v.representacion.caso.includes('Caso 10')).length,
      ultimasVictimas: allVictimas.sort((a, b) => b.fecha_registro.localeCompare(a.fecha_registro)).slice(0, 5)
    };
  },

  // 6. SUSTITUCIÓN MASIVA DE CASOS (Lógica de traspaso de procesos)
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
      
      // Actualizar asignación
      batch.update(victimaRef, {
        [campoFiltro]: profesionalNuevoId,
        'representacion.fecha_asignacion': new Date().toISOString().split('T')[0]
      });

      // Registrar en historial de la víctima
      const historialRef = doc(collection(db, `victimas/${victimaDoc.id}/historial_asignaciones`));
      const registroHistorial: Omit<HistorialAsignacion, 'id'> = {
        fecha_sustitucion: new Date().toISOString(),
        tipo_profesional: tipoProfesional,
        abogado_anterior_id: profesionalAnteriorId,
        abogado_nuevo_id: profesionalNuevoId,
        motivo: motivo,
        sustitucion_realizada_por_id: adminResponsableId,
        radicado_sustitucion_jep: radicadoJep || ''
      };
      
      batch.set(historialRef, registroHistorial);
      totalModificados++;
    });

    if (totalModificados > 0) {
      await batch.commit();
    }

    return totalModificados;
  },

  // 7. Listar profesionales para el formulario de asignación
  getProfesionales: async () => {
    const q = query(collection(db, 'usuarios'));
    const snapshot = await getDocs(q);
    const todos = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Usuario));
    return {
      abogados: todos.filter(u => u.rol === 'abogado' || u.rol === 'admin' || u.rol === 'superadmin'),
      psicosociales: todos.filter(u => u.rol === 'psicosocial')
    };
  }
};