import React, { useState } from 'react';
import { 
  Box, Typography, Paper, Button, Alert, CircularProgress, 
  List, ListItem, ListItemText, Chip 
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
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

  const formatFechaArray = (val: any): string[] => {
    if (!val) return [new Date().toISOString().split('T')[0]];

    if (typeof val === 'number' || (!isNaN(Number(val)) && Number(val) > 20000)) {
      const serial = Number(val);
      const date = new Date((serial - 25569) * 86400 * 1000);
      const localDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
      return [localDate.toISOString().split('T')[0]];
    }

    const strVal = String(val).trim();
    const regex = /(\d{2})[/-](\d{2})[/-](\d{4}|\d{2})/g;
    let match;
    const fechasEncontradas: string[] = [];

    while ((match = regex.exec(strVal)) !== null) {
      const dia = parseInt(match[1], 10);
      const mes = parseInt(match[2], 10) - 1; 
      let anio = parseInt(match[3], 10);
      if (anio < 100) anio += 2000;

      const d = new Date(anio, mes, dia);
      if (!isNaN(d.getTime())) {
        fechasEncontradas.push(d.toISOString().split('T')[0]);
      }
    }

    if (fechasEncontradas.length > 0) return fechasEncontradas.slice(0, 2);

    const fallbackDate = new Date(strVal);
    if (!isNaN(fallbackDate.getTime())) {
      const iso = fallbackDate.toISOString().split('T')[0];
      if (!iso.startsWith('1969') && !iso.startsWith('1970')) return [iso];
    }

    return [new Date().toISOString().split('T')[0]];
  };

  const getVal = (row: any, ...possibleKeys: string[]) => {
    for (const key of Object.keys(row)) {
      const cleanKey = key.trim().toLowerCase();
      if (possibleKeys.some(pk => cleanKey.includes(pk.toLowerCase()))) {
        return row[key];
      }
    }
    return '';
  };

  const extractData = (sheet: XLSX.WorkSheet, keywords: string[]) => {
    const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    let headerRowIndex = 0;
    
    for (let i = 0; i < Math.min(10, rawData.length); i++) {
      const rowString = (rawData[i] || []).map(cell => String(cell).toLowerCase()).join(' ');
      if (keywords.some(kw => rowString.includes(kw.toLowerCase()))) {
        headerRowIndex = i;
        break;
      }
    }
    return XLSX.utils.sheet_to_json(sheet, { defval: '', range: headerRowIndex });
  };

  // ==========================================
  // MOTOR 1: VÍCTIMAS Y CRUCE INTELIGENTE
  // ==========================================
  const procesarVictimas = async (workbook: XLSX.WorkBook) => {
    addLog('info', '--- INICIANDO ESCANEO DE VÍCTIMAS ---');
    const victimasMap = new Map<string, Victima>();

    const hojasBase = ['Caso 01', 'Caso 10', 'NUEVA ASIGNACIÓN', 'ANTIGUA ASIGNACIÓN', 'CCC', 'BSUR', 'BOCC', 'BNOR', 'BCAR', 'BORI', 'BMM'];
    let encontroBase = false;

    const hojasVictimasEncontradas = workbook.SheetNames.filter(s => 
      hojasBase.some(h => s.toLowerCase().includes(h.toLowerCase()))
    );

    for (const nombreHoja of hojasVictimasEncontradas) {
      const sheet = workbook.Sheets[nombreHoja];
      if (!sheet) continue;
      encontroBase = true;
      const data: any[] = extractData(sheet, ['identificación', 'documento', 'cédula', 'nombre']);

      for (const row of data) {
        const rawId = String(getVal(row, 'NÚMERO DOCUMENTO (SIN PUNTOS)', 'NÚMERO DOCUMENTO', 'Identificación', 'Cédula')).replace(/\D/g, '');
        if (!rawId) continue;

        if (!victimasMap.has(rawId)) {
          const fechasAsignacion = formatFechaArray(getVal(row, 'FECHA ASIGNACIÓN / ASUNCIÓN', 'Fecha de asignación interna'));

          victimasMap.set(rawId, {
            identificacion: rawId,
            tipo_documento: String(getVal(row, 'TIPO DOCUMENTO') || 'CC'),
            nombre_completo: String(getVal(row, 'NOMBRE VÍCTIMA', 'Nombre de la víctima', 'Nombres')).trim(),
            fecha_registro: new Date().toISOString(),
            datos_demograficos: {
              genero: String(getVal(row, 'GÉNERO')),
              orientacion_sexual: String(getVal(row, 'ORIENTACIÓN SEXUAL')),
              grupo_etnico: String(getVal(row, 'GRUPO ÉTNICO')),
              etareo: String(getVal(row, 'ETÁREO')),
              discapacidad: String(getVal(row, 'DISCAPACIDAD')),
            },
            datos_contacto: {
              telefono: String(getVal(row, 'Teléfono', 'TELEFONO')),
              correo: String(getVal(row, 'Correo', 'CORREO ELECTRÓNICO')),
              direccion: String(getVal(row, 'Dirección', 'DIRECCION')),
              departamento: String(getVal(row, 'DEPARTAMENTO RESIDENCIA', 'DEPARTAMENTO')),
            },
            representacion: {
              caso: nombreHoja.includes('01') ? ['Caso 01'] : (nombreHoja.includes('10') ? ['Caso 10'] : []),
              bloque: [String(getVal(row, 'BLOQUE', 'Bloque'))],
              calidad_victima: String(getVal(row, 'DIRECTA O INDIRECTA', 'Calidad')),
              juridico_asignado_id: String(getVal(row, 'JURÍDICO', 'Juridico', 'Abogado')),
              psicosocial_asignado_id: String(getVal(row, 'PSICOSOCIAL', 'Psicosocial')),
              fecha_asignacion: fechasAsignacion[0],
              estado: 'Activo',
            },
            estado_jep: {
              estado_acreditacion: String(getVal(row, 'ESTADO ACREDITACIÓN')).includes('Acreditad') ? 'Acreditada' : (String(getVal(row, 'ESTADO ACREDITACIÓN')).includes('No está') ? 'No está acreditada' : 'En trámite (despacho no ha resuelto)'),
              auto_acreditacion: String(getVal(row, 'AUTO DE ACREDITACION', 'AUTO ACREDITACIÓN')),
              estado_reconocimiento_pj: String(getVal(row, 'ESTADO RECONOCIMIENTO PJ') || 'Sin PJ (no se ha recibido poder)'),
              auto_reconocimiento: String(getVal(row, 'AUTO RECONOCIMIENTO')),
            },
            seguimiento_vista: {
              primer_contacto: String(getVal(row, 'Llamada de sentido del proceso')).toLowerCase().includes('realizada'),
              firma_poder: false,
              demandas_verdad: false,
              sol_desasignacion: false
            }
          } as Victima);
        }
      }
    }

    if (!encontroBase) {
      addLog('warning', 'No se detectaron hojas maestras de víctimas en este archivo.');
      return;
    }
    addLog('success', `Base maestra cargada: ${victimasMap.size} fichas únicas detectadas.`);

    const nombreHojaDesap = workbook.SheetNames.find(s => s.toLowerCase().includes('desapari'));
    if (nombreHojaDesap) {
      let cruzados = 0;
      const dataDesap: any[] = extractData(workbook.Sheets[nombreHojaDesap], ['nombres', 'victima']);
      const nameMap = new Map<string, string>();
      victimasMap.forEach((v, id) => nameMap.set(v.nombre_completo.toLowerCase(), id));

      for (const row of dataDesap) {
        const nombreBusqueda = String(getVal(row, 'Nombres')).trim().toLowerCase();
        const idEncontrado = nameMap.get(nombreBusqueda);
        if (idEncontrado) {
          const v = victimasMap.get(idEncontrado)!;
          v.familiar_desaparecido = { nombre_completo: String(getVal(row, 'Victima Directa')).replace('Ficha_', '').replace(/([A-Z])/g, ' $1').trim(), parentesco: 'Familiar' };
          cruzados++;
        }
      }
      addLog('info', `Cruce Inteligente 1: ${cruzados} familiares desaparecidos vinculados.`);
    }

    const nombreHojaDesasig = workbook.SheetNames.find(s => s.toLowerCase().includes('desasig'));
    if (nombreHojaDesasig) {
      let cruzados = 0;
      const dataDesasig: any[] = extractData(workbook.Sheets[nombreHojaDesasig], ['identificación', 'cedula']);
      for (const row of dataDesasig) {
        const rawId = String(getVal(row, 'Identificación', 'Cedula')).replace(/\D/g, '');
        if (victimasMap.has(rawId)) {
          const v = victimasMap.get(rawId)!;
          const fechasDesasig = formatFechaArray(getVal(row, 'Fecha correo', 'Fecha'));
          v.representacion.estado = 'Desasignado';
          v.representacion.motivo_desasignacion = String(getVal(row, 'Respuesta', 'Motivo') || 'Sin motivo registrado');
          v.representacion.fecha_desasignacion = fechasDesasig[0];
          cruzados++;
        }
      }
      addLog('info', `Cruce Inteligente 2: ${cruzados} víctimas marcadas como retiradas/desasignadas.`);
    }

    addLog('info', 'Guardando Víctimas en la base de datos...');
    try {
      const batchArray = Array.from(victimasMap.values());
      let batch = writeBatch(db);
      let count = 0;
      let total = 0;

      for (const victima of batchArray) {
        const docRef = doc(collection(db, 'victimas'), victima.identificacion);
        batch.set(docRef, victima, { merge: true });
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
    }
  };

  // ==========================================
  // MOTOR 2: EVENTOS INSTITUCIONALES
  // ==========================================
  const procesarEventos = async (workbook: XLSX.WorkBook) => {
    addLog('info', '--- INICIANDO ESCANEO DE EVENTOS ---');
    let eventosGuardados = 0;

    const hojasEventosEncontradas = workbook.SheetNames.filter(nombre => 
      nombre.toLowerCase().includes('taller') || 
      nombre.toLowerCase().includes('reunion') || 
      nombre.toLowerCase().includes('reunión') || 
      nombre.toLowerCase().includes('capacita') || 
      nombre.toLowerCase().includes('actividad') || 
      nombre.toLowerCase().includes('divulga')
    );

    for (const nombreHoja of hojasEventosEncontradas) {
      const sheet = workbook.Sheets[nombreHoja];
      if (!sheet) continue;

      const data: any[] = extractData(sheet, ['fecha', 'tema', 'objetivo']);
      for (const row of data) {
        const fechaVal = getVal(row, 'FECHA', 'Fecha', 'Date');
        const temaVal = getVal(row, 'TEMA', 'Tema', 'OBJETIVO ESPECÍFICO');
        
        if (!fechaVal || !temaVal) continue;
        
        try {
          let tipoEvento: TipoEvento = 'Actividad';
          if (nombreHoja.toLowerCase().includes('taller')) tipoEvento = 'Taller';
          if (nombreHoja.toLowerCase().includes('reuni')) tipoEvento = 'Reunión';
          if (nombreHoja.toLowerCase().includes('capacita')) tipoEvento = 'Capacitación';
          if (nombreHoja.toLowerCase().includes('divulga')) tipoEvento = 'Jornada de Divulgación';

          const fechas = formatFechaArray(fechaVal);

          await eventoService.addEvento({
            tipo: tipoEvento,
            tema_titulo: String(temaVal),
            fecha: fechas[0],
            fecha_fin: fechas[1] || '',
            lugar: String(getVal(row, 'VIRTUAL / PRESENCIAL', 'LUGAR') || 'No especificado'),
            asistentes_total: Number(getVal(row, 'NÚMERO ASISTENTES', 'VÍCTIMAS ASISTENTES') || 0),
            observaciones: String(getVal(row, 'EXPLICACIÓN', 'CONCLUSIONES', 'RESULTADOS') || ''),
            creado_por_email: currentUser?.email || 'sistema',
            fecha_creacion: new Date().toISOString()
          } as any);
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
    
    const hojasAudienciasEncontradas = workbook.SheetNames.filter(nombre => 
      nombre.toLowerCase().includes('audiencia') || 
      nombre.toLowerCase().includes('diligencia')
    );

    if (hojasAudienciasEncontradas.length === 0) {
      addLog('warning', 'No se encontraron pestañas relacionadas con Audiencias o Diligencias.');
      return;
    }

    let audienciasGuardadas = 0;

    for (const nombreHoja of hojasAudienciasEncontradas) {
      const sheet = workbook.Sheets[nombreHoja];
      const data: any[] = extractData(sheet, ['fecha', 'tipo', 'sala', 'despacho']);

      for (const row of data) {
        const fechaVal = getVal(row, 'FECHA', 'Fecha');
        const tipoVal = getVal(row, 'TIPO', 'Tipo', 'Tipo Audiencia');

        if (!fechaVal || !tipoVal) continue;
        
        try {
          const fechas = formatFechaArray(fechaVal);

          await audienciaService.addAudiencia({
            macrocaso: [String(getVal(row, 'CASO', 'Caso', 'Macrocaso') || 'Institucional')],
            fecha: fechas[0],
            fecha_fin: fechas[1] || '',
            despacho: String(getVal(row, 'SALA', 'SECCIÓN', 'Despacho') || 'SRVR') as DespachoJEP,
            tipo: String(tipoVal) as TipoAudiencia,
            titulo_diligencia: String(getVal(row, 'EXPLICACIÓN', 'Explicacion', 'Asunto') || 'Diligencia Judicial'),
            observaciones: `Víctimas asistentes: ${getVal(row, 'VÍCTIMAS ASISTENTES', 'Víctimas') || 0}`,
            profesionales_asistentes: String(getVal(row, 'JURÍDICO', 'Profesional', 'Responsable')) + ' - ' + String(getVal(row, 'PSICOSOCIAL')),
            creado_por_email: currentUser?.email || 'sistema',
            fecha_creacion: new Date().toISOString()
          });
          audienciasGuardadas++;
        } catch (error) {}
      }
    }
    
    if (audienciasGuardadas > 0) {
      addLog('success', `Se importaron ${audienciasGuardadas} Actuaciones Judiciales.`);
    } else {
      addLog('warning', `Se encontraron las pestañas, pero las columnas no coinciden con los encabezados esperados.`);
    }
  };

  // ==========================================
  // MOTOR 4: RADICADOS DOCUMENTALES
  // ==========================================
  const procesarRadicados = async (workbook: XLSX.WorkBook) => {
    addLog('info', '--- INICIANDO ESCANEO DE RADICADOS ---');
    let radicadosGuardados = 0;

    const hojasRadicadosEncontradas = workbook.SheetNames.filter(nombre => 
      nombre.toLowerCase().includes('documento') || 
      nombre.toLowerCase().includes('radicado')
    );

    for (const nombreHoja of hojasRadicadosEncontradas) {
      const sheet = workbook.Sheets[nombreHoja];
      if (!sheet) continue;

      // Buscamos exactamente las palabras reveladas tras quitar el filtro
      const dataObjects: any[] = extractData(sheet, ['explicación', 'entidad', 'documentos#', 'fecha', 'víctima', 'abogadx']);
      
      for (const row of dataObjects) {
        const fechaVal = getVal(row, 'FECHA', 'Date'); 
        if (!fechaVal) continue;
        
        try {
          const fechas = formatFechaArray(fechaVal);

          let emisorExcel = String(getVal(row, 'ENTIDAD', 'Emisor') || 'IIRESODH').toUpperCase();
          let emisorTraducido: EmisorRadicado = 'Otro';
          
          if (emisorExcel.includes('SRVR')) emisorTraducido = 'JEP (SRVR)';
          else if (emisorExcel.includes('UIA')) emisorTraducido = 'JEP (UIA)';
          else if (emisorExcel.includes('AMNIST')) emisorTraducido = 'JEP (Sala de Amnistía)';
          else if (emisorExcel.includes('DEFINIC')) emisorTraducido = 'JEP (Sala de Definición)';
          else if (emisorExcel.includes('IIRESODH')) emisorTraducido = 'IIRESODH';
          else if (emisorExcel.includes('DEFENSA')) emisorTraducido = 'Defensa';
          else if (emisorExcel.includes('SAAD') || emisorExcel.includes('REPRESENTA') || emisorExcel.includes('VICTIMA')) emisorTraducido = 'Representación de Víctimas';

          // Combina el "Tipo de Documento" con la "Explicación Corta"
          const tipoDoc = String(getVal(row, 'TIPO DE DOCUMENTO', 'Auto') || '').trim();
          const expCorta = String(getVal(row, 'EXPLICACIÓN CORTA', 'Asunto') || '').trim();
          const asuntoFinal = tipoDoc ? `${tipoDoc} - ${expCorta}` : expCorta || 'Sin asunto';

          // Combina Víctimas implicadas con el Abogadx
          const obsVictimas = String(getVal(row, 'VÍCTIMA', 'Victimas') || '').trim();
          const obsAbogado = String(getVal(row, 'ABOGADX', 'Responsable') || '').trim();
          const observacionesFinales = `${obsVictimas} ${obsAbogado ? ` - Abogadx: ${obsAbogado}` : ''}`.trim();

          await radicadoService.addRadicado({
            numero_radicado: String(getVal(row, 'DOCUMENTOS#', 'Radicado', 'N°') || 'Sin Radicado'),
            fecha_radicado: fechas[0],
            asunto: asuntoFinal,
            emisor: emisorTraducido,
            receptor: 'JEP / Otra Entidad',
            macrocaso: [String(getVal(row, 'CASO', 'Macrocaso') || 'Institucional')],
            observaciones: observacionesFinales,
            creado_por_email: currentUser?.email || 'sistema',
            fecha_creacion: new Date().toISOString()
          });
          radicadosGuardados++;
        } catch (error) {}
      }
    }
    
    if (radicadosGuardados > 0) addLog('success', `Se importaron ${radicadosGuardados} Documentos Radicados.`);
    else addLog('warning', 'No se encontraron registros de Radicados válidos en las columnas de este archivo.');
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