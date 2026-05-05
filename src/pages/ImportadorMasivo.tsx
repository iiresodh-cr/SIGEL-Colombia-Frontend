import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Button, CircularProgress, Alert, Chip,
  Table, TableBody, TableCell, TableHead, TableRow, Grid 
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { collection, writeBatch, doc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { db } from '../config/firebase';
import { adminService } from '../services/adminService';
import { Victima } from '../types/jep';

const ImportadorMasivo = () => {
  const [profMap, setProfMap] = useState<Map<string, string>>(new Map());
  const [previewData, setPreviewData] = useState<Victima[]>([]);
  const [loadingProfs, setLoadingProfs] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const loadProfs = async () => {
      try {
        const data = await adminService.getProfesionales();
        const map = new Map<string, string>();
        
        data.abogados.forEach(a => {
          if (a.nombre_completo) map.set(a.nombre_completo.toLowerCase().trim(), a.correo);
        });
        data.psicosociales.forEach(p => {
          if (p.nombre_completo) map.set(p.nombre_completo.toLowerCase().trim(), p.correo);
        });
        
        setProfMap(map);
      } catch (e) {
        console.error("Error cargando profesionales", e);
      } finally {
        setLoadingProfs(false);
      }
    };
    loadProfs();
  }, []);

  const findEmail = (name: string) => {
    if (!name || name.trim() === '') return '';
    const n = name.toLowerCase().trim();
    for (let [key, email] of profMap.entries()) {
      if (key.includes(n) || n.includes(key)) return email;
    }
    return name.trim(); 
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });

        const globalVictimas = new Map<string, Victima>();

        workbook.SheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          // Usamos raw: false para leer tal cual el texto en Excel y defval para no saltar celdas vacías
          const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: false, defval: '' });
          
          let headerRowIndex = -1;
          let nameColIndex = -1;
          let idColIndex = -1;

          // 1. UBICACIÓN EXACTA Y ESTRICTA DE LA CABECERA
          for (let i = 0; i < rows.length; i++) {
            const rowArr = rows[i];
            if (!Array.isArray(rowArr)) continue;
            
            let tempNameIdx = -1;
            let tempIdIdx = -1;

            rowArr.forEach((cell, idx) => {
                const c = String(cell).trim().toUpperCase();
                if (['NOMBRE VÍCTIMA', 'NOMBRE DE LA VÍCTIMA', 'NOMBRES', 'NOMBRE COMPLETO', 'NOMBRE'].includes(c)) {
                    tempNameIdx = idx;
                }
                if (['NUMERO DOC', 'NÚMERO DOC', 'IDENTIFICACIÓN', 'IDENTIFICACION', 'DOCUMENTO', 'C.C.', 'CC'].includes(c)) {
                    tempIdIdx = idx;
                }
            });

            // Para que sea una tabla válida, DEBE tener una columna de Nombre reconocida
            if (tempNameIdx !== -1) {
                headerRowIndex = i;
                nameColIndex = tempNameIdx;
                idColIndex = tempIdIdx;
                break;
            }
          }

          if (headerRowIndex === -1) return;

          const headers = rows[headerRowIndex].map(h => String(h).trim().toUpperCase());

          // 2. EXTRACCIÓN PROTEGIDA Y A PRUEBA DE BALAS
          for (let i = headerRowIndex + 1; i < rows.length; i++) {
            const rowArr = rows[i];
            if (!Array.isArray(rowArr) || rowArr.length === 0) continue;

            const nombreStr = String(rowArr[nameColIndex] || '').trim();
            
            // --- INICIA FILTRO DE BASURA ---
            if (!nombreStr || nombreStr.length < 4) continue; // Ignorar vacíos o muy cortos
            if (['NOMBRE VÍCTIMA', 'NOMBRE DE LA VÍCTIMA', 'NOMBRES', 'NOMBRE COMPLETO', 'NOMBRE', 'NO.'].includes(nombreStr.toUpperCase())) continue; // Ignorar encabezados repetidos
            if (/\d/.test(nombreStr)) continue; // REGLA DE ORO: Ningún nombre real tiene números. Bloquea Oficios y Fechas infiltradas.
            if (nombreStr.toLowerCase().includes('total') || nombreStr.toLowerCase().includes('solicitar')) continue; // Ignorar filas de sumatorias
            
            // Bloquear si el nombre en realidad es el de un abogado/psicosocial (Ej. Dalila Henao)
            let isProf = false;
            for (let [key] of profMap.entries()) {
                if (nombreStr.toLowerCase().includes(key)) {
                    isProf = true; break;
                }
            }
            if (isProf) continue;
            // --- FIN FILTRO DE BASURA ---

            const getVal = (aliases: string[]) => {
                for (let alias of aliases) {
                    const idx = headers.findIndex(h => h.includes(alias));
                    if (idx !== -1 && rowArr[idx] !== undefined) return String(rowArr[idx]).trim();
                }
                return '';
            };

            let idStr = idColIndex !== -1 ? String(rowArr[idColIndex]).replace(/\./g, '').trim() : '';
            if (!idStr || idStr.toLowerCase() === 'na' || idStr.toLowerCase() === 'undefined') idStr = '';

            const dedupeKey = idStr ? idStr : nombreStr.toLowerCase().replace(/\s+/g, '');

            let casoMacro = 'Por definir';
            if (sheetName.includes('10')) casoMacro = 'Caso 10';
            else if (sheetName.includes('01')) casoMacro = 'Caso 01';

            let primerContactoStr = String(getVal(['SENTIDO', 'PRIMER CONTACTO', 'LLAMADA'])).toLowerCase();
            const primerContacto = primerContactoStr.includes('realizada') || primerContactoStr.includes('contactado') || primerContactoStr.includes('si');
            
            let poderStr = String(getVal(['PODER'])).toLowerCase();
            const firmaPoder = poderStr.includes('si') || poderStr.includes('enviado') || poderStr.includes('recibido');
            const solDesasig = String(getVal(['DESASIG'])).toLowerCase().includes('si');

            let estadoAcreditacion: any = 'No está acreditada';
            const rowAcred = String(getVal(['ESTADO ACRED', 'ACREDITACIÓN'])).toLowerCase();
            if (rowAcred.includes('acreditad')) estadoAcreditacion = 'Acreditada';
            else if (rowAcred.includes('trámite') || rowAcred.includes('tramite')) estadoAcreditacion = 'En trámite (despacho no ha resuelto)';

            let estadoPJ = 'Sin PJ (no se ha recibido poder)';
            if (String(getVal(['ESTADO REC', 'PJ'])).toLowerCase().includes('con pj')) estadoPJ = 'Con PJ';

            const juridico = findEmail(String(getVal(['JURÍDICO', 'JURIDICO'])));
            const psicosocial = findEmail(String(getVal(['PSICOSOCIAL'])));
            const bloqueVal = getVal(['BLOQUE']);

            // 3. FUSIÓN DE DATOS (DEDUPLICADOR)
            const existing = globalVictimas.get(dedupeKey);

            if (existing) {
                if (!existing.identificacion || existing.identificacion.startsWith('ID-')) existing.identificacion = idStr || existing.identificacion;
                if (casoMacro !== 'Por definir' && !existing.representacion.caso.includes(casoMacro)) existing.representacion.caso.push(casoMacro);
                if (bloqueVal && !existing.representacion.bloque.includes(bloqueVal)) existing.representacion.bloque.push(bloqueVal);
                if (juridico) existing.representacion.juridico_asignado_id = juridico;
                if (psicosocial) existing.representacion.psicosocial_asignado_id = psicosocial;
                if (primerContacto) existing.seguimiento_vista!.primer_contacto = true;
                if (firmaPoder) existing.seguimiento_vista!.firma_poder = true;
                if (solDesasig) existing.seguimiento_vista!.sol_desasignacion = true;
                if (estadoAcreditacion !== 'No está acreditada') existing.estado_jep.estado_acreditacion = estadoAcreditacion;
                
                globalVictimas.set(dedupeKey, existing);
            } else {
                const victima: Omit<Victima, 'id'> = {
                    nombre_completo: nombreStr,
                    tipo_documento: getVal(['TIPO DOC']) || 'CC',
                    identificacion: idStr || `ID-${Math.floor(Math.random()*100000)}`,
                    fecha_registro: new Date().toISOString(),
                    datos_demograficos: {
                      genero: getVal(['GÉNERO', 'GENERO']) || 'No registra',
                      orientacion_sexual: getVal(['ORIENTACIÓN', 'ORIENTACION']) || 'No registra',
                      grupo_etnico: getVal(['ETNI', 'ÉTNICO']) || 'Ninguno',
                      etareo: getVal(['ETÁREO', 'ETAREO']) || 'Adulto',
                      discapacidad: getVal(['DISCAPACIDAD']) || 'Ninguna',
                    },
                    datos_contacto: {
                      telefono: String(getVal(['TELÉFONO', 'TELEFONO'])),
                      correo: String(getVal(['CORREO'])),
                      direccion: String(getVal(['DIRECCIÓN', 'DIRECCION'])),
                      departamento: getVal(['DEPARTAMENTO', 'RESIDENCIA']) || 'No registra'
                    },
                    representacion: {
                      caso: casoMacro !== 'Por definir' ? [casoMacro] : [],
                      bloque: bloqueVal ? [bloqueVal] : [],
                      calidad_victima: getVal(['DIRECTA', 'CALIDAD']) || 'No definida',
                      hechos_victimizantes: getVal(['DELITO', 'HECHO']) ? String(getVal(['DELITO', 'HECHO'])).split('/').map(s => s.trim()) : [],
                      juridico_asignado_id: juridico,
                      psicosocial_asignado_id: psicosocial,
                      fecha_asignacion: getVal(['FECHA ASIG', 'ASIGNACIÓN']) || new Date().toISOString().split('T')[0],
                      estado: String(getVal(['ESTADO'])).toLowerCase().includes('desasignado') ? 'Desasignado' : 'Activo',
                      referencia_llegada: getVal(['REFERENCIA']) || ''
                    },
                    estado_jep: {
                      estado_acreditacion: estadoAcreditacion,
                      auto_acreditacion: String(getVal(['AUTO DE ACRED', 'AUTO ACRED'])),
                      estado_reconocimiento_pj: estadoPJ,
                      auto_reconocimiento: String(getVal(['AUTO REC']))
                    },
                    seguimiento_vista: {
                      primer_contacto: primerContacto,
                      firma_poder: firmaPoder,
                      demandas_verdad: false,
                      sol_desasignacion: solDesasig
                    }
                };
                globalVictimas.set(dedupeKey, victima as Victima);
            }
          }
        });

        const arrVictimas = Array.from(globalVictimas.values());
        if (arrVictimas.length === 0) {
          alert("No se encontraron víctimas válidas. Asegúrate de que el Excel no esté vacío.");
        } else {
          setPreviewData(arrVictimas);
          setSuccess(false);
        }
      } catch (error) {
        console.error("Error leyendo Excel", error);
        alert("Hubo un error al leer el archivo Excel.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleMigrate = async () => {
    if (previewData.length === 0) return;
    setUploading(true);
    
    try {
      const victimasRef = collection(db, 'victimas');
      
      const chunkSize = 400;
      for (let i = 0; i < previewData.length; i += chunkSize) {
        const chunk = previewData.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        
        chunk.forEach((v) => {
          const docRef = doc(victimasRef);
          batch.set(docRef, v);
        });
        
        await batch.commit();
      }
      
      setSuccess(true);
      setPreviewData([]);
    } catch (error) {
      console.error("Error en migración:", error);
      alert('Hubo un error al migrar los datos a Firestore. Revisa la consola.');
    } finally {
      setUploading(false);
    }
  };

  if (loadingProfs) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main', mb: 1 }}>
        Migración Masiva Inteligente (Ultra-Estricta)
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Sube el archivo Excel (.xlsx). Los filtros anti-basura bloquearán oficios, fechas, nombres de profesionales y encabezados repetidos, extrayendo únicamente víctimas reales.
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12 }}>
          <Paper elevation={0} sx={{ p: 4, textAlign: 'center', border: '1px dashed', borderColor: 'primary.main', borderRadius: 3, bgcolor: '#f0f4f8' }}>
            <Button component="label" variant="contained" size="large" startIcon={<CloudUploadIcon />} sx={{ mb: 2 }}>
              Cargar Archivo Excel (.xlsx)
              <input type="file" hidden accept=".xlsx, .xls" onChange={handleFileUpload} />
            </Button>
            <Typography variant="body2" color="text.secondary">Filtro de integridad de datos activado.</Typography>
          </Paper>
        </Grid>
      </Grid>

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          ¡Los datos fueron migrados exitosamente a Firestore!
        </Alert>
      )}

      {previewData.length > 0 && (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">Vista Previa ({previewData.length} víctimas reales validadas)</Typography>
            <Button 
              variant="contained" 
              color="success" 
              startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
              onClick={handleMigrate}
              disabled={uploading}
            >
              {uploading ? 'Migrando...' : 'Migrar a Firestore'}
            </Button>
          </Box>

          <Table size="small">
            <TableHead sx={{ bgcolor: 'background.default' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Nombre Validad</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>CC</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Macrocaso</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Bloque</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Abogado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {previewData.slice(0, 10).map((v, i) => (
                <TableRow key={i}>
                  <TableCell>{v.nombre_completo}</TableCell>
                  <TableCell>{v.identificacion}</TableCell>
                  <TableCell>
                    {v.representacion.caso.map(c => <Chip key={c} label={c} size="small" color="primary" variant="outlined" sx={{ mr: 0.5 }} />)}
                  </TableCell>
                  <TableCell>{v.representacion.bloque.join(', ')}</TableCell>
                  <TableCell>
                    <Chip 
                      label={v.representacion.juridico_asignado_id} 
                      size="small" 
                      color={v.representacion.juridico_asignado_id.includes('@') ? 'success' : 'default'} 
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
            Mostrando solo los primeros 10 registros.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default ImportadorMasivo;