export type EmisorRadicado = 
  | 'JEP (SRVR)' 
  | 'JEP (Sala de Amnistía)' 
  | 'JEP (Sala de Definición)' 
  | 'JEP (UIA)'
  | 'IIRESODH' 
  | 'Representación de Víctimas' 
  | 'Defensa' 
  | 'Otro';

export interface Radicado {
  id?: string;
  numero_radicado: string;
  fecha_radicado: string;
  asunto: string;
  emisor: EmisorRadicado | string;
  receptor: string;
  macrocaso: string[];
  observaciones: string;
  creado_por_email: string;
  fecha_creacion: string;
}