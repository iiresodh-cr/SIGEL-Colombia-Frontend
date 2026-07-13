export type TipoAudiencia = 
  | 'Versión Voluntaria' 
  | 'Audiencia de Observaciones' 
  | 'Audiencia de Reconocimiento' 
  | 'Diligencia de Testimonio' 
  | 'Mesa de Trabajo JEP'
  | 'Otra';

export type DespachoJEP = 'SRVR' | 'Sala de Amnistía' | 'Sala de Definición' | 'Sección de Primera Instancia' | 'Sección de Apelación' | 'UIA';

export interface Audiencia {
  id?: string;
  macrocaso: string[]; // Ej: ['Caso 01', 'Caso 10']
  fecha: string;
  fecha_fin?: string; // Nuevo campo opcional para rangos de fechas
  despacho: DespachoJEP | string;
  tipo: TipoAudiencia;
  titulo_diligencia: string; // Ej: "Versión Voluntaria de Alias X"
  observaciones: string;
  profesionales_asistentes: string; // Nombres de los abogados/psicosociales del IIRESODH que asistieron
  creado_por_email: string;
  fecha_creacion: string;
}