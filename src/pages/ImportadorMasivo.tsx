import React, { useState } from 'react';
import { 
  Box, Typography, Paper, Button, Tabs, Tab, Alert, CircularProgress, 
  Divider, List, ListItem, ListItemText, Chip 
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import * as XLSX from 'xlsx';
import { writeBatch, doc, collection } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';

import { eventoService } from '../services/eventoService';
import { audienciaService } from '../services/audienciaService';
import { radicadoService } from '../services/radicadoService';
import { TipoEvento } from '../types/evento';
import { TipoAudiencia, DespachoJEP } from '../types/audiencia';
import { EmisorRadicado } from '../types/radicado';
import { Victima } from '../types/jep';

const ImportadorMasivo = () => {
  const { currentUser } = useAuth();
  const { showModal } = useModal();
  
  const [tabIndex, setTabIndex] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<{ tipo: 'success' | 'error' | 'info', mensaje: string }[]>([]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
    setFile(null);
    setLogs([]);
  };

  const addLog = (tipo: 'success' | 'error' | 'info', mensaje: string) => {
    setLogs(prev => [...prev, { tipo, mensaje }]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setLogs([{ tipo: 'info', mensaje: `Archivo "${e.target.files[0].name}" cargado y listo para procesar.` }]);
    }
  };

  // ==========================================
  // PESTAÑA 1: MOTOR DE CRUCE DE VÍCTIMAS
  // ==========================================

  const procesarVictimas = async (workbook: XLSX.WorkBook) => {
    addLog('info', 'Iniciando cruce inteligente de bases de datos de Víctimas...');
    const victimasMap = new Map<string, Victima>();

    // 1. CARGAR BASE MAESTRA
    const hojasBase = ['Víctimas Caso 01', 'Víctimas Caso 10'];
    for (const hoja of hojasBase) {
      const sheet = workbook.Sheets[hoja];
      if (!sheet) continue;
      const data: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      for (const row of data) {
        const rawId = String(row['NÚMERO DOCUMENTO (SIN PUNTOS)'] || row['NÚMERO DOCUMENTO'] || '').replace(/\D/g, '');
        if (!rawId) continue;

        if (!victimasMap.has(rawId)) {
          victimasMap.set(rawId, {
            identificacion: rawId,
            tipo_documento: String(row['TIPO DOCUMENTO'] || 'CC'),
            nombre_completo: String(row['NOMBRE VÍCTIMA'] || '').trim(),
            fecha_registro: new Date().toISOString(),
            datos_demograficos: {
              genero: String(row['GÉNERO'] || ''),
              orientacion_sexual: String(row['ORIENTACIÓN SEXUAL'] || ''),
              grupo_etnico: String(row['GRUPO ÉTNICO'] || ''),
              etareo: String(row['ETÁREO'] || ''),
              discapacidad: String(row['DISCAPACIDAD'] || ''),
            },
            datos_contacto: {
              telefono: '',
              correo: '',
              direccion: '',
              departamento: String(row['DEPARTAMENTO RESIDENCIA'] || ''),
            },
            representacion: {
              caso: hoja === 'Víctimas Caso 01' ? ['Caso 01'] : ['Caso 10'],
              bloque: [String(row['BLOQUE'] || '')],
              calidad_victima: String(row['DIRECTA O INDIRECTA'] || ''),
              juridico_asignado_id: String(row['JURÍDICO'] || ''),
              psicosocial_asignado_id: String(row['PSICOSOCIAL'] || ''),
              fecha_asignacion: String(row['FECHA ASIGNACIÓN / ASUNCIÓN'] || ''),
              estado: 'Activo',
            },
            estado_jep: {
              estado_acreditacion: String(row['ESTADO ACREDITACIÓN'] || '').includes('Acreditad') ? 'Acreditada' : (String(row['ESTADO ACREDITACIÓN'] || '').includes('No está') ? 'No está acreditada' : 'En trámite (despacho no ha resuelto)'),
              auto_acreditacion: String(row['AUTO DE ACREDITACION'] || row['AUTO ACREDITACIÓN'] || ''),
              estado_reconocimiento_pj: String(row['ESTADO RECONOCIMIENTO PJ'] || 'Sin PJ (no se ha recibido poder)'),
              auto_reconocimiento: String(row['AUTO RECONOCIMIENTO'] || ''),
            }
          } as Victima);
        }
      }
    }
    addLog('success', `Base maestra cargada: ${victimasMap.size} fichas únicas creadas.`);

    // 2. CRUCE CON DESAPARICIÓN (Búsqueda por Nombre)
    const sheetDesaparicion = workbook.Sheets['DESAPARICIÓN'];
    if (sheetDesaparicion) {
      let cruzados = 0;
      const dataDesap: any[] = XLSX.utils.sheet_to_json(sheetDesaparicion, { defval: '' });
      const nameMap = new Map<string, string>();
      victimasMap.forEach((v, id) => nameMap.set(v.nombre_completo.toLowerCase(), id));

      for (const row of dataDesap) {
        const nombreBusqueda = String(row['Nombres'] || '').trim().toLowerCase();
        const idEncontrado = nameMap.get(nombreBusqueda);
        if (idEncontrado) {
          const v = victimasMap.get(idEncontrado)!;
          v.familiar_desaparecido = {
            nombre_completo: String(row['Victima Directa'] || '').replace('Ficha_', '').replace(/([A-Z])/g, ' $1').trim(),
            parentesco: 'Familiar' 
          };
          cruzados++;
        }
      }
      addLog('info', `Cruce Inteligente 1: ${cruzados} familiares de desaparecidos vinculados correctamente.`);
    }

    // 3. CRUCE CON DESASIGNADAS (Búsqueda por Cédula)
    const sheetDesasignadas = workbook.Sheets['DESASIGNADAS'];
    if (sheetDesasignadas) {
      let cruzados = 0;
      const dataDesasig: any[] = XLSX.utils.sheet_to_json(sheetDesasignadas, { defval: '' });
      for (const row of dataDesasig) {
        const rawId = String(row['Identificación'] || '').replace(/\D/g, '');
        if (victimasMap.has(rawId)) {
          const v = victimasMap.get(rawId)!;
          v.representacion.estado = 'Desasignado';
          v.representacion.motivo_desasignacion = String(row['Respuesta'] || 'Sin motivo registrado');
          v.representacion.fecha_desasignacion = String(row['Fecha correo'] || row['Fecha'] || '');
          cruzados++;
        }
      }
      addLog('info', `Cruce Inteligente 2: ${cruzados} víctimas marcadas como desasignadas con sus motivos.`);
    }

    // 4. CRUCE CON MATRIZ NUEVA ASIGNACIÓN (Búsqueda por Cédula)
    const sheetNuevaAsignacion = workbook.Sheets['MATRIZ NUEVA ASIGNACIÓN'];
    if (sheetNuevaAsignacion) {
      let cruzados = 0;
      const dataNueva: any[] = XLSX.utils.sheet_to_json(sheetNuevaAsignacion, { defval: '' });
      for (const row of dataNueva) {
        const rawId = String(row['Identificación'] || '').replace(/\D/g, '');
        if (victimasMap.has(rawId)) {
          const v = victimasMap.get(rawId)!;
          if (row['Teléfono']) v.datos_contacto.telefono = String(row['Teléfono']);
          if (row['Correo']) v.datos_contacto.correo = String(row['Correo']);
          if (row['Dirección']) v.datos_contacto.direccion = String(row['Dirección']);
          
          if (String(row['Llamada de sentido del proceso']).toLowerCase().includes('realizada')) {
            if(!v.seguimiento_vista) v.seguimiento_vista = { primer_contacto: false, firma_poder: false, demandas_verdad: false, sol_desasignacion: false };
            v.seguimiento_vista.primer_contacto = true;
          }
          cruzados++;
        }
      }
      addLog('info', `Cruce Inteligente 3: ${cruzados} fichas actualizadas con datos de contacto recientes.`);
    }

    // 5. GUARDADO EN LOTE EN FIREBASE
    addLog('info', 'Guardando Fichas Únicas en la base de datos (Batch Processing)...');
    try {
      const batchArray = Array.from(victimasMap.values());
      let batch = writeBatch(db);
      let count = 0;
      let total = 0;

      for (const victima of batchArray) {
        const docRef = doc(collection(db, 'victimas'));
        batch.set(docRef, victima);
        count++;
        total++;

        if (count === 490) { // Límite de Firebase por transacción
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
      if (count > 0) {
        await batch.commit();
      }
      addLog('success', `¡Éxito Total! Se migró una base de datos impecable de ${total} Fichas Únicas cruzadas.`);
    } catch (error) {
      addLog('error', 'Error crítico al escribir en la base de datos.');
      console.error(error);
    }
  };

  // ==========================================
  // PESTAÑAS 2, 3 y 4: EVENTOS, AUDIENCIAS Y RADICADOS
  // ==========================================

  const procesarEventos = async (workbook: XLSX.WorkBook) => {
    addLog('info', 'Iniciando escaneo de pestañas de Eventos (Talleres, Reuniones, Capacitaciones)...');
    let eventosGuardados = 0;

    const hojasEventos = ['Talleres', 'Reuniones', 'Capacitaciones', 'Actividades', 'Jornadas Divulgación'];
    
    for (const nombreHoja of hojasEventos) {
      const sheet = workbook.Sheets[nombreHoja];
      if (!sheet) continue;

      const data: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      addLog('info', `Procesando "${nombreHoja}"...`);

      for (const row of data) {
        if (!row['FECHA'] || (!row['TEMA'] && !row['OBJETIVO ESPECÍFICO'])) continue;

        try {
          let tipoEvento: TipoEvento = 'Actividad';
          if (nombreHoja === 'Talleres') tipoEvento = 'Taller';
          if (nombreHoja === 'Reuniones') tipoEvento = 'Reunión';
          if (nombreHoja === 'Capacitaciones') tipoEvento = 'Capacitación';
          if (nombreHoja === 'Jornadas Divulgación') tipoEvento = 'Jornada de Divulgación';

          await eventoService.addEvento({
            tipo: tipoEvento,
            tema_titulo: String(row['TEMA'] || row['OBJETIVO ESPECÍFICO'] || 'Sin título'),
            fecha: new Date(row['FECHA']).toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
            lugar: String(row['VIRTUAL / PRESENCIAL (LUGAR)'] || row['LUGAR'] || 'No especificado'),
            asistentes_total: Number(row['NÚMERO ASISTENTES'] || row['VÍCTIMAS ASISTENTES'] || 0),
            observaciones: String(row['EXPLICACIÓN (SI LO REQUIERE)'] || row['CONCLUSIONES / RESULTADOS'] || ''),
            creado_por_email: currentUser?.email || 'sistema',
            fecha_creacion: new Date().toISOString()
          });
          eventosGuardados++;
        } catch (error) {
          addLog('error', `Error guardando evento de la fila: ${row['FECHA']}`);
        }
      }
    }
    addLog('success', `¡Proceso finalizado! Se importaron ${eventosGuardados} eventos exitosamente.`);
  };

  const procesarAudiencias = async (workbook: XLSX.WorkBook) => {
    addLog('info', 'Iniciando escaneo de Audiencias y Diligencias...');
    const sheet = workbook.Sheets['AudienciasDiligencias'];
    
    if (!sheet) {
      addLog('error', 'No se encontró la pestaña "AudienciasDiligencias".');
      return;
    }

    const data: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    let audienciasGuardadas = 0;

    for (const row of data) {
      if (!row['FECHA'] || !row['TIPO']) continue;

      try {
        await audienciaService.addAudiencia({
          macrocaso: [String(row['CASO'] || 'Institucional')],
          fecha: new Date(row['FECHA']).toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
          despacho: String(row['SALA/SECCIÓN'] || 'SRVR') as DespachoJEP,
          tipo: String(row['TIPO']) as TipoAudiencia,
          titulo_diligencia: String(row['EXPLICACIÓN (SI LO REQUIERE)'] || 'Diligencia Judicial'),
          observaciones: `Víctimas asistentes: ${row['VÍCTIMAS ASISTENTES'] || 0}`,
          profesionales_asistentes: String(row['JURÍDICO(S)'] || '') + ' - ' + String(row['PSICOSOCIAL'] || ''),
          creado_por_email: currentUser?.email || 'sistema',
          fecha_creacion: new Date().toISOString()
        });
        audienciasGuardadas++;
      } catch (error) {
        addLog('error', `Error guardando audiencia: ${row['TIPO']}`);
      }
    }
    addLog('success', `¡Proceso finalizado! Se importaron ${audienciasGuardadas} actuaciones judiciales.`);
  };

  const procesarRadicados = async (workbook: XLSX.WorkBook) => {
    addLog('info', 'Iniciando escaneo de Control Documental y Radicados...');
    let radicadosGuardados = 0;

    const hojasRadicados = ['Documentos', 'Radicados Jep'];
    
    for (const nombreHoja of hojasRadicados) {
      const sheet = workbook.Sheets[nombreHoja];
      if (!sheet) continue;

      const data: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      for (const row of data) {
        if (!row['FECHA'] && !row['Fecha de radicado']) continue;

        try {
          await radicadoService.addRadicado({
            numero_radicado: String(row['No. Radicado'] || row['TIPO DE DOCUMENTO'] || 'Sin Radicado'),
            fecha_radicado: new Date(row['Fecha de radicado'] || row['FECHA']).toISOString().split('T')[0],
            asunto: String(row['Asunto del correo'] || row['EXPLICACIÓN CORTA'] || 'Sin asunto'),
            emisor: String(row['ENTIDAD '] || 'IIRESODH') as EmisorRadicado,
            receptor: String(row['Destinatario'] || 'JEP / Otra Entidad'),
            macrocaso: [String(row['CASO'] || 'Institucional')],
            observaciones: String(row['VÍCTIMA(S)'] || ''),
            creado_por_email: currentUser?.email || 'sistema',
            fecha_creacion: new Date().toISOString()
          });
          radicadosGuardados++;
        } catch (error) {
          addLog('error', `Error guardando radicado.`);
        }
      }
    }
    addLog('success', `¡Proceso finalizado! Se importaron ${radicadosGuardados} radicados documentales.`);
  };

  // ==========================================
  // DISPARADOR PRINCIPAL
  // ==========================================

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    addLog('info', 'Leyendo archivo Excel...');

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });

      if (tabIndex === 0) await procesarVictimas(workbook);
      if (tabIndex === 1) await procesarEventos(workbook);
      if (tabIndex === 2) await procesarAudiencias(workbook);
      if (tabIndex === 3) await procesarRadicados(workbook);

    } catch (error) {
      console.error(error);
      addLog('error', 'Ocurrió un error crítico al leer el archivo Excel. Verifica el formato.');
      showModal('Error', 'No se pudo leer el archivo.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 800, color: '#003366', mb: 1 }}>Centro de Importación Inteligente</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Sube tu Matriz de Seguimiento o Insumos Consolidados. El sistema extraerá y cruzará la información según la categoría que elijas.
      </Typography>

      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden', mb: 4 }}>
        <Tabs 
          value={tabIndex} 
          onChange={handleTabChange} 
          variant="fullWidth" 
          sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#f8fafc' }}
        >
          <Tab label="1. Personas (Ficha Única)" sx={{ fontWeight: 'bold' }} />
          <Tab label="2. Eventos Institucionales" sx={{ fontWeight: 'bold' }} />
          <Tab label="3. Audiencias JEP" sx={{ fontWeight: 'bold' }} />
          <Tab label="4. Control Documental" sx={{ fontWeight: 'bold' }} />
        </Tabs>

        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Box sx={{ border: '2px dashed #cbd5e1', borderRadius: 2, p: 5, bgcolor: '#f1f5f9', mb: 3 }}>
            <CloudUploadIcon sx={{ fontSize: 60, color: '#94a3b8', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {file ? `Archivo Seleccionado: ${file.name}` : 'Haz clic o arrastra tu archivo Excel aquí'}
            </Typography>
            <Button variant="contained" component="label" sx={{ mt: 1, bgcolor: '#003366' }}>
              Seleccionar Archivo
              <input type="file" hidden accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
            </Button>
          </Box>

          <Button 
            variant="contained" 
            color="success" 
            size="large" 
            fullWidth 
            disabled={!file || loading} 
            onClick={handleImport}
            sx={{ py: 1.5, fontSize: '1.1rem', fontWeight: 'bold' }}
          >
            {loading ? <CircularProgress size={26} color="inherit" /> : 'COMENZAR MIGRACIÓN Y CRUCE DE DATOS'}
          </Button>
        </Box>
      </Paper>

      {/* PANEL DE REGISTROS (LOGS) */}
      {logs.length > 0 && (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#1e293b', color: 'white' }}>
          <Typography variant="h6" sx={{ mb: 2, borderBottom: '1px solid #334155', pb: 1 }}>Consola de Procesamiento</Typography>
          <List dense>
            {logs.map((log, index) => (
              <ListItem key={index} sx={{ py: 0.5 }}>
                {log.tipo === 'info' && <Chip size="small" label="INFO" sx={{ bgcolor: '#3b82f6', color: 'white', mr: 2 }} />}
                {log.tipo === 'success' && <CheckCircleIcon sx={{ color: '#22c55e', mr: 2, fontSize: 20 }} />}
                {log.tipo === 'error' && <ErrorIcon sx={{ color: '#ef4444', mr: 2, fontSize: 20 }} />}
                <ListItemText primary={log.mensaje} sx={{ '& span': { fontFamily: 'monospace', fontSize: '0.9rem' } }} />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default ImportadorMasivo;