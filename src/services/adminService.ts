import { collection, query, where, getDocs, doc, writeBatch, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { HistorialAsignacion } from '../types/jep';
import { Usuario, RolUsuario } from '../types/user';

export const adminService = {
  // 1. Obtener todos los usuarios del sistema
  getAllUsers: async (): Promise<Usuario[]> => {
    const q = query(collection(db, 'usuarios'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Usuario));
  },

  // 2. Actualizar rol
  updateUserRole: async (email: string, role: string) => {
    const userRef = doc(db, 'usuarios', email.toLowerCase());
    await setDoc(userRef, { rol: role.toLowerCase() }, { merge: true });
  },

  // 3. Borrar / Revocar acceso
  deleteUser: async (email: string) => {
    const userRef = doc(db, 'usuarios', email.toLowerCase());
    await deleteDoc(userRef); // En el futuro lo pasaremos a estado "Inactivo"
  },

  // 4. Invitar Usuario
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

  // 5. Estadísticas globales (Temporal para UI vieja)
  getGlobalStats: async () => {
    return { allExpedientes: [], totalCaso01: 0, totalCaso10: 0 };
  },

  // 6. SUSTITUCIÓN MASIVA DE CASOS (Nueva Arquitectura)
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
  }
};