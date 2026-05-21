export interface ExpedienteJEP {
  id?: string;
  codigoExpediente: string;
  macrocaso: 'Caso 01' | 'Caso 10';
  estadoProcesal: string;
  resumenHechos: string;
  fechaRegistro: string;
}

export interface VictimaJEP {
  id?: string;
  expedienteId: string;
  nombreCompleto: string;
  documentoIdentidad: string;
  telefono: string;
  direccion: string;
  municipio: string;
  departamento: string;
  estadoAcreditacion: 'Acreditada' | 'En proceso' | 'No acreditada';
  observacionesContacto: string;
}