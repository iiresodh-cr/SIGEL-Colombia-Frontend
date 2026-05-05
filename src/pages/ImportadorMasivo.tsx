import React, { useState } from 'react';
import { 
  Box, Typography, Paper, Button, Alert, CircularProgress, 
  List, ListItem, ListItemText, Chip 
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
  
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<{ tipo: 'success' | 'error' | 'info' | 'warning', mensaje: string }[]>([]);

  const addLog = (tipo: 'success' | 'error' | 'info' | 'warning', mensaje: string) => {
    setLogs(prev => [...prev, { tipo, mensaje }]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setLogs([{ tipo: 'info', mensaje: `Archivo "${e.target.files[0].name}" cargado y listo para escaneo total.` }]);
    }
  };

  // ==========================================
  // MOTOR 1: VÍCTIMAS Y CRUCE INTELIGENTE
  // ==========================================
  const procesarVictimas = async (workbook: XLSX.WorkBook) => {
    addLog('info', '--- INICIANDO ESCANEO DE VÍCTIMAS ---');
    const victimasMap = new Map<string, Victima>();

    // 1. Buscar hojas que actúan como Base Maestra (dependiendo de cuál de los 2 Excels subiste)
    const hojasBase = ['Víctimas Caso 01', 'Víctimas Caso 10', 'MATRIZ NUEVA ASIGNACIÓN', 'MATRIZ ANTIGUA ASIGNACIÓN', 'CCC', 'BSUR', 'BOCC', 'BNOR', 'BCAR', 'BORI', 'BMM'];
    let encontroBase = false;

    for (const hoja of hojasBase) {
      const sheet = workbook.Sheets[hoja];
      if (!sheet) continue;
      encontroBase = true;
      const data: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      for (const row of data) {
        const rawId = String(row['NÚMERO DOCUMENTO (SIN PUNTOS)'] || row['NÚMERO DOCUMENTO'] || row['Identificación'] || '').replace(/\D/g, '');
        if (!rawId) continue;

        if (!victimasMap.has(rawId)) {
          victimasMap.set(rawId, {
            identificacion: rawId,
            tipo_documento: String(row['TIPO DOCUMENTO'] || 'CC'),
            nombre_completo: String(row['NOMBRE VÍCTIMA'] || row['Nombre de la víctima'] || '').trim(),
            fecha_registro: new Date().toISOString(),
            datos_demograficos: {
              genero: String(row['GÉNERO'] || ''),
              orientacion_sexual: String(row['ORIENTACIÓN SEXUAL'] || ''),
              grupo_etnico: String(row['GRUPO ÉTNICO'] || ''),
              etareo: String(row['ETÁREO'] || ''),
              discapacidad: String(row['DISCAPACIDAD'] || ''),
            },
            datos_contacto: {
              telefono: String(row['Teléfono'] || ''),
              correo: String(row['Correo'] || ''),
              direccion: String(row['Dirección'] || ''),
              departamento: String(row['DEPARTAMENTO RESIDENCIA'] || ''),
            },
            representacion: {
              caso: hoja.includes('01') ? ['Caso 01'] : (hoja.includes('10') ? ['Caso 10'] : []),
              bloque: [String(row['BLOQUE'] || row['Bloque'] || '')],
              calidad_victima: String(row['DIRECTA O INDIRECTA'] || row['Calidad'] || ''),
              juridico_asignado_id: String(row['JURÍDICO'] || row['Juridico'] || ''),
              psicosocial_asignado_id: String(row['PSICOSOCIAL'] || row['Psicosocial'] || ''),
              fecha_asignacion: String(row['FECHA ASIGNACIÓN / ASUNCIÓN'] || row['Fecha de asignación interna'] || ''),
              estado: 'Activo',
            },
            estado_jep: {
              estado_acreditacion: String(row['ESTADO ACREDITACIÓN'] || '').includes('Acreditad') ? 'Acreditada' : (String(row['ESTADO ACREDITACIÓN'] || '').includes('No está') ? 'No está acreditada' : 'En trámite (despacho no ha resuelto)'),
              auto_acreditacion: String(row['AUTO DE ACREDITACION'] || row['AUTO ACREDITACIÓN'] || ''),
              estado_reconocimiento_pj: String(row['ESTADO RECONOCIMIENTO PJ'] || 'Sin PJ (no se ha recibido poder)'),
              auto_reconocimiento: String(row['AUTO RECONOCIMIENTO'] || ''),
            },
            seguimiento_vista: {
              primer_contacto: String(row['Llamada de sentido del proceso']).toLowerCase().includes('realizada'),
              firma_poder: false,
              demandas_verdad: false,
              sol_desasignacion: false
            }
          } as Victima);
        }
      }
    }

    if (!encontroBase) {
      addLog('warning', 'No se detectaron hojas maestras de víctimas en este archivo. Saltando módulo de víctimas.');
      return;
    }

    addLog('success', `Base maestra cargada: ${victimasMap.size} fichas únicas detectadas.`);

    // 2. CRUCE CON DESAPARICIÓN
    if (workbook.Sheets['DESAPARICIÓN']) {
      let cruzados = 0;
      const dataDesap: any[] = XLSX.utils.sheet_to_json(workbook.Sheets['DESAPARICIÓN'], { defval: '' });
      const nameMap = new Map<string, string>();
      victimasMap.forEach((v, id) => nameMap.set(v.nombre_completo.toLowerCase(), id));

      for (const row of dataDesap) {
        const nombreBusqueda = String(row['Nombres'] || '').trim().toLowerCase();
        const idEncontrado = nameMap.get(nombreBusqueda);
        if (idEncontrado) {
          const v = victimasMap.get(idEncontrado)!;
          v.familiar_desaparecido = { nombre_completo: String(row['Victima Directa'] || '').replace('Ficha_', '').replace(/([A-Z])/g, ' $1').trim(), parentesco: 'Familiar' };
          cruzados++;
        }
      }
      addLog('info', `Cruce Inteligente 1: ${cruzados} familiares desaparecidos vinculados.`);
    }

    // 3. CRUCE CON DESASIGNADAS
    if (workbook.Sheets['DESASIGNADAS']) {
      let cruzados = 0;
      const dataDesasig: any[] = XLSX.utils.sheet_to_json(workbook.Sheets['DESASIGNADAS'], { defval: '' });
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
      addLog('info', `Cruce Inteligente 2: ${cruzados} víctimas marcadas como retiradas/desasignadas.`);
    }

    // 4. GUARDADO EN LOTE EN FIREBASE
    addLog('info', 'Guardando Víctimas en la base de datos...');
    try {
      const batchArray = Array.from(victimasMap.values());
      let batch = writeBatch(db);
      let count = 0;
      let total = 0;

      for (const victima of batchArray) {
        const docRef = doc(collection(db, 'victimas'), victima.identificacion); // Forzamos que el ID de firebase sea la cédula para evitar duplicados en futuros imports
        batch.set(docRef, victima, { merge: true }); // Merge true actualiza si ya existe
        count++;
        total++;

        if (count === 490) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
      if (count > 0) await batch.commit();
      addLog('success', `Se migró un total de ${total} Fichas Únicas de Víctimas.`);
    } catch (error) {
      addLog('error', 'Error al guardar las víctimas en Firebase.');
      console.error(error);
    }
  };

  // ==========================================
  // MOTOR 2: EVENTOS INSTITUCIONALES
  // ==========================================
  const procesarEventos = async (workbook: XLSX.WorkBook) => {
    addLog('info', '--- INICIANDO ESCANEO DE EVENTOS ---');
    const hojasEventos = ['Talleres', 'Reuniones', 'Capacitaciones', 'Actividades', 'Jornadas Divulgación'];
    let eventosGuardados = 0;

    for (const nombreHoja of hojasEventos) {
      const sheet = workbook.Sheets[nombreHoja];
      if (!sheet) continue;

      const data: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
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
        } catch (error) {}
      }
    }
    if (eventosGuardados > 0) addLog('success', `Se importaron ${eventosGuardados} Eventos Institucionales.`);
    else addLog('warning', 'No se encontraron registros válidos de Eventos en este archivo.');
  };

  // ==========================================
  // MOTOR 3: AUDIENCIAS
  // ==========================================
  const procesarAudiencias = async (workbook: XLSX.WorkBook) => {
    addLog('info', '--- INICIANDO ESCANEO DE AUDIENCIAS ---');
    const sheet = workbook.Sheets['AudienciasDiligencias'];
    if (!sheet) {
      addLog('warning', 'No se encontró la pestaña "AudienciasDiligencias" en este archivo.');
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
      } catch (error) {}
    }
    addLog('success', `Se importaron ${audienciasGuardadas} Actuaciones Judiciales.`);
  };

  // ==========================================
  // MOTOR 4: RADICADOS DOCUMENTALES
  // ==========================================
  const procesarRadicados = async (workbook: XLSX.WorkBook) => {
    addLog('info', '--- INICIANDO ESCANEO DE RADICADOS ---');
    const hojasRadicados = ['Documentos', 'Radicados Jep'];
    let radicadosGuardados = 0;

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
        } catch (error) {}
      }
    }
    if (radicadosGuardados > 0) addLog('success', `Se importaron ${radicadosGuardados} Documentos Radicados.`);
    else addLog('warning', 'No se encontraron registros de Radicados en este archivo.');
  };

  // ==========================================
  // DISPARADOR MAESTRO
  // ==========================================
  const handleImportTotal = async () => {
    if (!file) return;
    setLoading(true);
    setLogs([]);
    addLog('info', 'Iniciando lectura estructural del archivo Excel...');

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });

      // Ejecución paralela controlada de los 4 motores
      await procesarVictimas(workbook);
      await procesarEventos(workbook);
      await procesarAudiencias(workbook);
      await procesarRadicados(workbook);

      addLog('success', '✅ PROCESO DE MIGRACIÓN GLOBAL COMPLETADO.');

    } catch (error) {
      console.error(error);
      addLog('error', 'Ocurrió un error crítico al procesar el archivo Excel. Verifique que el archivo no esté corrupto.');
      showModal('Error', 'No se pudo leer el archivo.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 800, color: '#003366', mb: 1 }}>Carga Estructural de Matrices</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Sube cualquiera de tus archivos (Insumos Consolidados o Matriz de Seguimiento). El sistema escaneará todas las hojas automáticamente y distribuirá la información a los módulos correspondientes.
      </Typography>

      <Paper elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: 3, border: '1px solid #e2e8f0', mb: 4 }}>
        <Box sx={{ border: '2px dashed #cbd5e1', borderRadius: 2, p: 5, bgcolor: '#f8fafc', mb: 3 }}>
          <CloudUploadIcon sx={{ fontSize: 60, color: '#94a3b8', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {file ? `Archivo Listo: ${file.name}` : 'Haz clic o arrastra tu archivo Excel aquí'}
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
          onClick={handleImportTotal}
          sx={{ py: 1.5, fontSize: '1.1rem', fontWeight: 'bold' }}
        >
          {loading ? <CircularProgress size={26} color="inherit" /> : 'PROCESAR MATRIZ COMPLETA'}
        </Button>
      </Paper>

      {/* PANEL DE REGISTROS (LOGS) */}
      {logs.length > 0 && (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#1e293b', color: 'white' }}>
          <Typography variant="h6" sx={{ mb: 2, borderBottom: '1px solid #334155', pb: 1 }}>Consola de Procesamiento del Sistema</Typography>
          <List dense>
            {logs.map((log, index) => (
              <ListItem key={index} sx={{ py: 0.5 }}>
                {log.tipo === 'info' && <Chip size="small" label="INFO" sx={{ bgcolor: '#3b82f6', color: 'white', mr: 2, minWidth: 70 }} />}
                {log.tipo === 'success' && <Chip size="small" label="ÉXITO" sx={{ bgcolor: '#22c55e', color: 'white', mr: 2, minWidth: 70 }} />}
                {log.tipo === 'warning' && <Chip size="small" label="OMITIDO" sx={{ bgcolor: '#f59e0b', color: 'white', mr: 2, minWidth: 70 }} />}
                {log.tipo === 'error' && <Chip size="small" label="ERROR" sx={{ bgcolor: '#ef4444', color: 'white', mr: 2, minWidth: 70 }} />}
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