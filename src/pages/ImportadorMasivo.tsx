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

  const processSheet = (sheet: XLSX.WorkSheet, sheetName: string): Victima[] => {
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
    let headerRowIndex = -1;
    let headers: string[] = [];

    // Busca automáticamente en qué fila están los títulos (cualquiera que diga 'NOMBRE')
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row && row.some(cell => typeof cell === 'string' && cell.toUpperCase().includes('NOMBRE'))) {
        headerRowIndex = i;
        headers = row.map(h => h ? String(h).trim().toUpperCase() : '');
        break;
      }
    }

    if (headerRowIndex === -1) return [];

    const parsedVictimas: Victima[] = [];
    
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const rowData = rows[i];
      if (!rowData || rowData.length === 0) continue;

      const row: Record<string, any> = {};
      headers.forEach((h, idx) => {
        if (h) row[h] = rowData[idx];
      });

      // Diccionario inteligente de búsqueda de columnas (Sinónimos)
      const getVal = (aliases: string[]) => {
        for (let alias of aliases) {
          const foundKey = Object.keys(row).find(k => k.includes(alias));
          if (foundKey && row[foundKey] !== undefined) return row[foundKey];
        }
        return '';
      };

      const nombre = getVal(['NOMBRE']);
      if (!nombre || String(nombre).trim() === '' || String(nombre).includes('Solicitar al despacho')) continue;

      let estadoAcreditacion: any = 'No está acreditada';
      const rowAcred = String(getVal(['ESTADO ACRED', 'ACREDITACIÓN'])).toLowerCase();
      if (rowAcred.includes('acreditad')) estadoAcreditacion = 'Acreditada';
      else if (rowAcred.includes('trámite') || rowAcred.includes('tramite')) estadoAcreditacion = 'En trámite (despacho no ha resuelto)';

      let estadoPJ = 'Sin PJ (no se ha recibido poder)';
      if (String(getVal(['ESTADO REC', 'PJ'])).toLowerCase().includes('con pj')) {
        estadoPJ = 'Con PJ';
      }

      // Infiere el caso según la hoja, de lo contrario lo deja por definir
      let casoMacro = 'Por definir';
      if (sheetName.includes('10')) casoMacro = 'Caso 10';
      else if (sheetName.includes('01')) casoMacro = 'Caso 01';

      let primerContactoStr = String(getVal(['SENTIDO', 'PRIMER CONTACTO', 'LLAMADA'])).toLowerCase();
      const primerContacto = primerContactoStr.includes('realizada') || primerContactoStr.includes('contactado') || primerContactoStr.includes('si');
      
      let poderStr = String(getVal(['PODER'])).toLowerCase();
      const firmaPoder = poderStr.includes('si') || poderStr.includes('enviado') || poderStr.includes('recibido');

      const victima: Omit<Victima, 'id'> = {
        nombre_completo: String(nombre).trim(),
        tipo_documento: getVal(['TIPO DOC']) || 'CC',
        identificacion: String(getVal(['NUMERO DOC', 'NÚMERO DOC', 'IDENTIFICACIÓN', 'IDENTIFICACION'])).replace(/\./g, '') || `ID-${Math.floor(Math.random()*100000)}`,
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
          caso: [casoMacro],
          bloque: getVal(['BLOQUE']) ? [String(getVal(['BLOQUE'])).trim()] : [],
          calidad_victima: getVal(['DIRECTA', 'CALIDAD']) || 'No definida',
          hechos_victimizantes: getVal(['DELITO', 'HECHO']) ? String(getVal(['DELITO', 'HECHO'])).split('/').map(s => s.trim()) : [],
          juridico_asignado_id: findEmail(String(getVal(['JURÍDICO', 'JURIDICO']))),
          psicosocial_asignado_id: findEmail(String(getVal(['PSICOSOCIAL']))),
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
          sol_desasignacion: String(getVal(['DESASIG'])).toLowerCase().includes('si')
        }
      };
      parsedVictimas.push(victima as Victima);
    }
    return parsedVictimas;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });

        let todasLasVictimas: Victima[] = [];

        // Ahora procesa TODAS las pestañas que encuentre dentro del Excel
        workbook.SheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          const victimas = processSheet(sheet, sheetName);
          if (victimas.length > 0) {
            todasLasVictimas = [...todasLasVictimas, ...victimas];
          }
        });

        if (todasLasVictimas.length === 0) {
          alert("No se encontraron víctimas válidas en este archivo. Asegúrate de que el Excel contenga columnas con nombres de víctimas.");
        } else {
          setPreviewData(todasLasVictimas);
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
        Migración Masiva Inteligente
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Sube cualquier archivo Excel (.xlsx). El sistema escaneará automáticamente TODAS las pestañas buscando tablas de víctimas y mapeará los datos a los correos de los profesionales.
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12 }}>
          <Paper elevation={0} sx={{ p: 4, textAlign: 'center', border: '1px dashed', borderColor: 'primary.main', borderRadius: 3, bgcolor: '#f0f4f8' }}>
            <Button component="label" variant="contained" size="large" startIcon={<CloudUploadIcon />} sx={{ mb: 2 }}>
              Cargar Archivo Excel (.xlsx)
              <input type="file" hidden accept=".xlsx, .xls" onChange={handleFileUpload} />
            </Button>
            <Typography variant="body2" color="text.secondary">Sube "INSUMOS CONSOLIDADOS" o "MATRIZ DE SEGUIMIENTO". El sistema leerá todas las pestañas posibles.</Typography>
          </Paper>
        </Grid>
      </Grid>

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          ¡Los datos fueron migrados exitosamente a Firestore! Ya puedes verlos en el Dashboard.
        </Alert>
      )}

      {previewData.length > 0 && (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">Vista Previa ({previewData.length} registros extraídos)</Typography>
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
                <TableCell sx={{ fontWeight: 'bold' }}>Nombre</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>CC</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Macrocaso</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Bloque</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Abogado (Email/ID)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {previewData.slice(0, 10).map((v, i) => (
                <TableRow key={i}>
                  <TableCell>{v.nombre_completo}</TableCell>
                  <TableCell>{v.identificacion}</TableCell>
                  <TableCell><Chip label={v.representacion.caso[0]} size="small" color="primary" variant="outlined" /></TableCell>
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
            Mostrando solo los primeros 10 registros. Al hacer clic en Migrar se subirán los {previewData.length} a tu base de datos.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default ImportadorMasivo;