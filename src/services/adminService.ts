import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  writeBatch 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { HistorialAsignacion, Victima } from '../types/jep';
import { Usuario } from '../types/user';

// Obtener todos los usuarios del sistema (Para llenar los selectores al asignar casos)
export const getAllUsuarios = async (): Promise<Usuario[]> => {
  const q = query(collection(db, 'usuarios'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Usuario));
};

// ==========================================
// SUSTITUCIÓN MASIVA DE CASOS (BATCH WRITE)
// ==========================================

/**
 * Reasigna masivamente todas las víctimas de un profesional a otro.
 * Ideal para cuando un abogado renuncia o cambia de bloque.
 */
export const reasignarCasosMasivamente = async (
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

  // 1. Buscar todas las víctimas activas del profesional anterior
  const q = query(
    collection(db, 'victimas'), 
    where(campoFiltro, '==', profesionalAnteriorId),
    where('representacion.estado', '==', 'Activo')
  );
  
  const snapshot = await getDocs(q);
  let totalModificados = 0;

  snapshot.forEach((victimaDoc) => {
    const victimaRef = doc(db, 'victimas', victimaDoc.id);
    
    // 2. Actualizar el ID del profesional asignado en la víctima
    batch.update(victimaRef, {
      [campoFiltro]: profesionalNuevoId,
      'representacion.fecha_asignacion': new Date().toISOString().split('T')[0] // Fecha de hoy
    });

    // 3. Crear el registro de auditoría en la subcolección historial_asignaciones
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

  // 4. Ejecutar todas las escrituras en lote (máximo 500 por lote en Firestore)
  if (totalModificados > 0) {
    await batch.commit();
  }

  return totalModificados; // Retorna cuántos casos se reasignaron con éxito
};