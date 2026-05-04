// ==========================================
// INTERFACES SECUNDARIAS (Propiedades de Víctima)
// ==========================================

export interface DatosDemograficos {
  genero: string;
  orientacion_sexual: string;
  grupo_etnico: string;
  etareo: string; // Ej: Adulto, Adulto mayor, etc.
  discapacidad: string;
  fecha_nacimiento?: string;
}

export interface DatosContacto {
  telefono: string;
  correo: string;
  direccion: string;
  municipio?: string;
  departamento: string;
}

export interface Representacion {
  caso: string[]; // Ej: ['Caso 01', 'Caso 10']
  bloque: string[]; // Ej: ['BSUR', 'BORI', 'BNOR']
  calidad_victima: string; // Ej: 'Directa', 'Indirecta (Vocera)', etc.
  delito?: string;
  juridico_asignado_id: string; // UID del abogado
  psicosocial_asignado_id: string; // UID del profesional psicosocial
  fecha_asignacion: string;
  estado: 'Activo' | 'Desasignado' | 'En Sustitución' | 'Fallecido';
  referencia_llegada?: string; // Ej: 'Asignación SAAD', 'Llegó al IIRESODH'
}

export interface EstadoSistemaVista {
  acreditacion: boolean;
  asignacion: boolean;
  primer_contacto: boolean;
  poder_cargado: boolean;
  demandas_verdad: boolean;
  solicitud_desasignacion: boolean;
}

export interface EstadoJEP {
  estado_acreditacion: 'Acreditada' | 'En trámite (despacho no ha resuelto)' | 'No está acreditada';
  auto_acreditacion?: string;
  estado_reconocimiento_pj: 'Con PJ' | 'Sin PJ (no se ha recibido poder)' | string;
  auto_reconocimiento?: string;
  estado_sistema_vista?: EstadoSistemaVista;
}

// ==========================================
// COLECCIONES PRINCIPALES
// ==========================================

// 1. Colección: /victimas
export interface Victima {
  id?: string;
  identificacion: string;
  tipo_documento: string;
  nombre_completo: string;
  datos_demograficos: DatosDemograficos;
  datos_contacto: DatosContacto;
  representacion: Representacion;
  estado_jep: EstadoJEP;
  storage_folder_url?: string;
  fecha_registro: string;
}

// 2. Colección: /eventos (Talleres, Capacitaciones, Audiencias)
export interface Evento {
  id?: string;
  tipo: 'Taller' | 'Audiencia' | 'Jornada Divulgación' | 'Capacitación' | 'Reunión' | 'Otro';
  titulo: string;
  fecha_inicio: string;
  fecha_fin?: string;
  modalidad: string; // Ej: 'Presencial - Bogotá', 'Virtual'
  casos: string[];
  bloques: string[];
  funcionarios_juridicos: string[]; // Arreglo de nombres o IDs
  funcionarios_psicosociales: string[]; // Arreglo de nombres o IDs
  explicacion_conclusiones: string;
  numero_asistentes?: number;
  asistencia_victimas?: string[]; // IDs de víctimas (opcional)
}

// 3. Colección: /radicados_institucionales (Documentos y Memoriales)
export interface RadicadoInstitucional {
  id?: string;
  fecha_solicitud: string;
  fecha_radicado: string;
  numero_radicado: string;
  asunto: string;
  entidad_destino: string; // Ej: info@jep.gov.co
  victimas_involucradas?: string[]; // IDs de víctimas relacionadas
  abogado_responsable_id: string; // UID del abogado
}

// ==========================================
// SUBCOLECCIONES (Dentro de /victimas/{id})
// ==========================================

// Subcolección: /victimas/{id}/interacciones
export interface Interaccion {
  id?: string;
  fecha: string;
  tipo: string; // Ej: 'Llamada de sentido del proceso', 'Asesoría jurídica'
  responsable_id: string; // UID de quien hizo la interacción
  rol_responsable: 'Jurídico' | 'Psicosocial';
  estado_contacto: 'Contactado' | 'No contactado' | 'Contacto fallido';
  observaciones: string;
  compromisos?: string;
}

// Subcolección: /victimas/{id}/historial_asignaciones
export interface HistorialAsignacion {
  id?: string;
  fecha_sustitucion: string;
  tipo_profesional: 'Jurídico' | 'Psicosocial';
  abogado_anterior_id: string;
  abogado_nuevo_id: string;
  motivo: string;
  sustitucion_realizada_por_id: string; // UID del Admin que hizo el cambio
  radicado_sustitucion_jep?: string;
}