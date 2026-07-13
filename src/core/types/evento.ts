export type TipoEvento = 'Taller' | 'Capacitación' | 'Jornada de Divulgación' | 'Actividad' | 'Reunión';

export interface Evento {
  id?: string;
  tipo: TipoEvento;
  tema_titulo: string;
  fecha: string;
  lugar: string;
  asistentes_total: number;
  observaciones: string;
  creado_por_email: string;
  fecha_creacion: string;
}   