import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Button, CircularProgress, Alert, Chip,
  Table, TableBody, TableCell, TableHead, TableRow, Grid 
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { collection, writeBatch, doc } from 'firebase/firestore';
import Papa from 'papaparse';
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
        
        // Mapeamos los nombres a correos para cumplir la regla estricta de asignación
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, casoMacro: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedVictimas: Victima[] = results.data.map((row: any) => {
          const findEmail = (name: string) => {
            if (!name || name.trim() === '') return '';
            const n = name.toLowerCase().trim();
            for (let [key, email] of profMap.entries()) {
              if (key.includes(n) || n.includes(key)) return email;
            }
            return name.trim(); // Si no lo encuentra, lo deja como string para ser corregido en UI
          };

          // Determinación estricta de estados
          let estadoAcreditacion: any = 'No está acreditada';
          const rowAcreditacion = (row['ESTADO ACREDITACIÓN'] || '').toLowerCase();
          if (rowAcreditacion.includes('acreditado')) estadoAcreditacion = 'Acreditada';
          else if (rowAcreditacion.includes('trámite')) estadoAcreditacion = 'En trámite (despacho no ha resuelto)';

          let estadoPJ = 'Sin PJ (no se ha recibido poder)';
          if ((row['ESTADO RECONOCIMIENTO PJ'] || '').toLowerCase().includes('con pj')) {
            estadoPJ = 'Con PJ';
          }

          const victima: Omit<Victima, 'id'> = {
            nombre_completo: row['NOMBRE VÍCTIMA'] || 'Desconocido',
            tipo_documento: row['TIPO DOCUMENTO'] || 'CC',
            identificacion: row['NÚMERO DOCUMENTO (SIN PUNTOS)']?.toString().replace(/\./g, '') || `ID-${Math.floor(Math.random()*100000)}`,
            fecha_registro: new Date().toISOString(),
            datos_demograficos: {
              genero: row['GÉNERO'] || 'No registra',
              orientacion_sexual: row['ORIENTACIÓN SEXUAL'] || 'No registra',
              grupo_etnico: row['GRUPO ÉTNICO'] || 'Ninguno',
              etareo: row['ETÁREO'] || 'Adulto',
              discapacidad: row['DISCAPACIDAD'] || 'Ninguna',
            },
            datos_contacto: {
              telefono: '',
              correo: '',
              direccion: '',
              departamento: row['DEPARTAMENTO RESIDENCIA'] || 'No registra'
            },
            representacion: {
              caso: [casoMacro],
              bloque: row['BLOQUE'] ? [row['BLOQUE'].trim()] : [],
              calidad_victima: row['DIRECTA O INDIRECTA'] || 'No definida',
              hechos_victimizantes: row['DELITO'] ? row['DELITO'].split('/').map((s: string) => s.trim()) : [],
              juridico_asignado_id: findEmail(row['JURÍDICO']),
              psicosocial_asignado_id: findEmail(row['PSICOSOCIAL']),
              fecha_asignacion: row['FECHA ASIGNACIÓN / ASUNCIÓN'] || new Date().toISOString().split('T')[0],
              estado: (row['ESTADO'] || '').toLowerCase().includes('desasignado') ? 'Desasignado' : 'Activo',
              referencia_llegada: row['REFERENCIA'] || ''
            },
            estado_jep: {
              estado_acreditacion: estadoAcreditacion,
              auto_acreditacion: row['AUTO DE ACREDITACION'] || '',
              estado_reconocimiento_pj: estadoPJ,
              auto_reconocimiento: row['AUTO RECONOCIMIENTO'] || ''
            },
            seguimiento_vista: {
              primer_contacto: false,
              firma_poder: false,
              demandas_verdad: false,
              sol_desasignacion: false
            }
          };
          return victima as Victima;
        });

        setPreviewData(parsedVictimas);
        setSuccess(false);
      }
    });
  };

  const handleMigrate = async () => {
    if (previewData.length === 0) return;
    setUploading(true);
    
    try {
      const victimasRef = collection(db, 'victimas');
      
      // Firestore permite máximo 500 escrituras por Batch. Dividimos en chunks de 400.
      const chunkSize = 400;
      for (let i = 0; i < previewData.length; i += chunkSize) {
        const chunk = previewData.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        
        chunk.forEach((v) => {
          const docRef = doc(victimasRef); // Genera un ID automático
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
        Migración Masiva de Datos
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Sube los archivos "Víctimas Caso 01.csv" o "Víctimas Caso 10.csv". El sistema mapeará automáticamente a los abogados/psicosociales hacia sus correos institucionales.
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={0} sx={{ p: 4, textAlign: 'center', border: '1px dashed', borderColor: 'primary.main', borderRadius: 3, bgcolor: '#f0f4f8' }}>
            <Button component="label" variant="contained" startIcon={<CloudUploadIcon />} sx={{ mb: 2 }}>
              Cargar CSV (Caso 01)
              <input type="file" hidden accept=".csv" onChange={(e) => handleFileUpload(e, 'Caso 01')} />
            </Button>
            <Typography variant="body2" color="text.secondary">Formato esperado: INSUMOS_CONSOLIDADOS</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper elevation={0} sx={{ p: 4, textAlign: 'center', border: '1px dashed', borderColor: 'warning.main', borderRadius: 3, bgcolor: '#fffbeb' }}>
            <Button component="label" variant="contained" color="warning" startIcon={<CloudUploadIcon />} sx={{ mb: 2 }}>
              Cargar CSV (Caso 10)
              <input type="file" hidden accept=".csv" onChange={(e) => handleFileUpload(e, 'Caso 10')} />
            </Button>
            <Typography variant="body2" color="text.secondary">Formato esperado: INSUMOS_CONSOLIDADOS</Typography>
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
            <Typography variant="h6">Vista Previa ({previewData.length} registros listos)</Typography>
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
            Mostrando solo los primeros 10 registros. Al hacer clic en Migrar se subirán los {previewData.length}.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default ImportadorMasivo;