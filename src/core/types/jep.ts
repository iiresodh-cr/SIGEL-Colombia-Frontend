// ==========================================
// INTERFACES SECUNDARIAS (Propiedades de Víctima)
// ==========================================

export interface DatosDemograficos {
  genero: string;
  orientacion_sexual: string;
  grupo_etnico: string;
  etareo: string; 
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
  caso: string[]; 
  bloque: string[]; 
  hechos_victimizantes?: string[]; // Propiedad agregada para el manejo de delitos
  calidad_victima: string; 
  delito?: string;
  juridico_asignado_id: string; 
  psicosocial_asignado_id: string; 
  fecha_asignacion: string;
  estado: 'Activo' | 'Desasignado' | 'En Sustitución' | 'Fallecido';
  referencia_llegada?: string; 
  // NUEVO: Campos para registrar el historial de la pestaña DESASIGNADAS
  motivo_desasignacion?: string;
  fecha_desasignacion?: string;
}

export interface SeguimientoVista {
  primer_contacto: boolean;
  firma_poder: boolean;
  demandas_verdad: boolean;
  sol_desasignacion: boolean;
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

// NUEVO: Estructura para la pestaña DESAPARICIÓN
export interface FamiliarDesaparecido {
  nombre_completo: string;
  parentesco: string;
}

// ==========================================
// COLECCIONES PRINCIPALES
// ==========================================

export interface Victima {
  id?: string;
  identificacion: string;
  tipo_documento: string;
  nombre_completo: string;
  datos_demograficos: DatosDemograficos;
  datos_contacto: DatosContacto;
  representacion: Representacion;
  estado_jep: EstadoJEP;
  seguimiento_vista?: SeguimientoVista; // Checklist de Actuaciones añadido
  storage_folder_url?: string;
  fecha_registro: string;
  // NUEVO: Campo opcional para vincular al familiar en casos de desaparición
  familiar_desaparecido?: FamiliarDesaparecido;
}

export interface Evento {
  id?: string;
  tipo: 'Taller' | 'Audiencia' | 'Jornada Divulgación' | 'Capacitación' | 'Reunión' | 'Otro';
  titulo: string;
  fecha_inicio: string;
  fecha_fin?: string;
  modalidad: string; 
  casos: string[];
  bloques: string[];
  funcionarios_juridicos: string[]; 
  funcionarios_psicosociales: string[]; 
  explicacion_conclusiones: string;
  numero_asistentes?: number;
  asistencia_victimas?: string[]; 
}

export interface RadicadoInstitucional {
  id?: string;
  fecha_solicitud: string;
  fecha_radicado: string;
  numero_radicado: string;
  asunto: string;
  entidad_destino: string; 
  victimas_involucradas?: string[]; 
  abogado_responsable_id: string; 
}

// ==========================================
// SUBCOLECCIONES
// ==========================================

export interface Interaccion {
  id?: string;
  fecha: string;
  tipo: string; 
  responsable_id: string; 
  rol_responsable: 'Jurídico' | 'Psicosocial';
  estado_contacto: 'Contactado' | 'No contactado' | 'Contacto fallido';
  observaciones: string;
  compromisos?: string;
}

export interface HistorialAsignacion {
  id?: string;
  fecha_sustitucion: string;
  tipo_profesional: 'Jurídico' | 'Psicosocial';
  abogado_anterior_id: string;
  abogado_nuevo_id: string;
  motivo: string;
  sustitucion_realizada_por_id: string; 
  radicado_sustitucion_jep?: string;
}
