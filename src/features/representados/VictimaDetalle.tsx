import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Paper, Grid, Divider, Button, CircularProgress, 
  Chip, List, ListItem, Dialog, DialogTitle, FormGroup, FormControlLabel, Checkbox,
  DialogContent, DialogActions, TextField, MenuItem, IconButton, ListItemText,
  Tabs, Tab, Table, TableHead, TableRow, TableCell, TableBody, Alert,
  FormControl, InputLabel, Select, OutlinedInput
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddCommentIcon from '@mui/icons-material/AddComment';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DeleteIcon from '@mui/icons-material/Delete';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import InfoIcon from '@mui/icons-material/Info';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import GavelIcon from '@mui/icons-material/Gavel';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import EditIcon from '@mui/icons-material/Edit';
import HistoryIcon from '@mui/icons-material/History';

import { jepService } from './jepService';
import { storageService, ArchivoJEP } from '../../core/services/storageService';
import { adminService } from '../admin/adminService';
import { audienciaService } from '../agenda/audienciaService';
import { radicadoService } from '../agenda/radicadoService';
import { Victima, Interaccion } from '../../core/types/jep';
import { Usuario } from '../../core/types/user';
import { Audiencia } from '../../core/types/audiencia';
import { Radicado } from '../../core/types/radicado';
import { useAuth } from '../../core/context/AuthContext';
import { useModal } from '../../core/context/ModalContext';
import { doc, updateDoc, collection, addDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../core/config/firebase';

const TIPOS_INTERACCION = ['Llamada de sentido del proceso', 'Asesoría jurídica', 'Acompañamiento psicosocial', 'Gestión de acreditación', 'Otra'];

const CASOS_JEP = ['Caso 01', 'Caso 10'];
const BLOQUES_JEP = ['BNOR', 'BSUR', 'BORI', 'BCAR', 'BCC', 'BMM', 'BOCC']; 
const CALIDADES = ['Directa', 'Indirecta', 'Directa (Vocera)', 'Indirecta (Vocera)', 'Indirecta (No Vocera)', 'Ambas'];
const HECHOS = ['Desaparición', 'Desplazamiento', 'Homicidio', 'Secuestro', 'Ataque contra la población civil', 'Violencia Sexual', 'Otro'];
const GENEROS = ['Mujer', 'Hombre', 'No binario', 'Otro', 'Prefiero no decirlo'];
const ORIENTACIONES = ['Heterosexual', 'Lesbiana', 'Gay', 'Bisexual', 'Pansexual', 'Otro'];
const ETNICOS = ['Ninguno', 'Indígena', 'Afrodescendiente/Negro/Mulato', 'Rrom/Gitano', 'Palenquero', 'Raizal'];
const ETAREOS = ['Infancia (0-11)', 'Adolescencia (12-18)', 'Joven (18-28)', 'Adulto (28-60)', 'Adulto Mayor (60+)'];
const DISCAPACIDADES = ['Ninguna', 'Física', 'Auditiva', 'Visual', 'Sordoceguera', 'Intelectual', 'Psicosocial (Mental)', 'Múltiple'];
const DEPARTAMENTOS = ['Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bolívar', 'Boyacá', 'Caldas', 'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba', 'Cundinamarca', 'Guainía', 'Guaviare', 'Huila', 'La Guajira', 'Magdalena', 'Meta', 'Nariño', 'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda', 'San Andrés y Providencia', 'Santander', 'Sucre', 'Tolima', 'Valle del Cauca', 'Vaupés', 'Vichada', 'Bogotá D.C.'];

const traducirCampo = (campo: string) => {
  const mapa: Record<string, string> = {
    'nombre_completo': 'Nombre Completo',
    'tipo_documento': 'Tipo de Documento',
    'identificacion': 'Número de Identificación',
    'datos_demograficos.genero': 'Género',
    'datos_demograficos.orientacion_sexual': 'Orientación Sexual',
    'datos_demograficos.grupo_etnico': 'Grupo Étnico',
    'datos_demograficos.etareo': 'Ciclo Vital / Etáreo',
    'datos_demograficos.discapacidad': 'Discapacidad',
    'datos_contacto.telefono': 'Teléfono de Contacto',
    'datos_contacto.correo': 'Correo Electrónico',
    'datos_contacto.departamento': 'Departamento',
    'datos_contacto.direccion': 'Dirección',
    'representacion.caso': 'Macrocaso(s) JEP',
    'representacion.bloque': 'Bloque(s)',
    'representacion.hechos_victimizantes': 'Delitos / Hechos',
    'representacion.calidad_victima': 'Calidad de Víctima',
    'estado_jep.estado_acreditacion': 'Estado de Acreditación',
    'estado_jep.estado_reconocimiento_pj': 'Reconocimiento Personería Jurídica',
    'estado_jep.auto_acreditacion': 'Auto de Acreditación',
    'estado_jep.auto_reconocimiento': 'Auto de Reconocimiento',
  };
  return mapa[campo] || campo;
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

const VictimaDetalle = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, role } = useAuth();
  const { showModal } = useModal();
  
  const [victima, setVictima] = useState<Victima | null>(null);
  const [interacciones, setInteracciones] = useState<Interaccion[]>([]);
  const [poderes, setPoderes] = useState<ArchivoJEP[]>([]);
  const [listaProfesionales, setListaProfesionales] = useState<{ abogados: Usuario[], psicosociales: Usuario[] }>({ abogados: [], psicosociales: [] });
  const [historialCambios, setHistorialCambios] = useState<any[]>([]);
  
  const [audiencias, setAudiencias] = useState<Audiencia[]>([]);
  const [radicados, setRadicados] = useState<Radicado[]>([]);
  const [tabIndex, setTabIndex] = useState(0);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [openNoteModal, setOpenNoteModal] = useState(false);
  const [newNote, setNewNote] = useState<Partial<Interaccion>>({ tipo: 'Llamada de sentido del proceso', estado_contacto: 'Contactado', observaciones: '', compromisos: '' });

  const [openReasignarModal, setOpenReasignarModal] = useState(false);
  const [reasignarData, setReasignarData] = useState({ juridico_nuevo_id: '', psicosocial_nuevo_id: '', motivo: '' });

  const [openEditModal, setOpenEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState<any>(null);

  const isAdmin = role === 'admin' || role === 'superadmin';
  const isLector = role === 'lector';
  const canDelete = isAdmin; 
  const canEdit = !isLector;

  const obtenerCambios = (anterior: any, nuevo: any, prefijo = '') => {
    let diferencias: any[] = [];
    for (const llave in nuevo) {
      const ruta = prefijo ? `${prefijo}.${llave}` : llave;
      const valAnt = anterior ? anterior[llave] : undefined;
      const valNue = nuevo[llave];

      if (valNue !== null && typeof valNue === 'object' && !Array.isArray(valNue)) {
        diferencias = diferencias.concat(obtenerCambios(valAnt, valNue, ruta));
      } else if (Array.isArray(valNue)) {
        const strAnt = JSON.stringify([...(valAnt || [])].sort());
        const strNue = JSON.stringify([...valNue].sort());
        if (strAnt !== strNue) {
          diferencias.push({
            campo: ruta,
            valor_anterior: valAnt && valAnt.length > 0 ? valAnt.join(', ') : 'Ninguno',
            valor_nuevo: valNue.length > 0 ? valNue.join(', ') : 'Ninguno'
          });
        }
      } else {
        if (valAnt !== valNue) {
          diferencias.push({
            campo: ruta,
            valor_anterior: valAnt === undefined || valAnt === '' ? 'No registra' : String(valAnt),
            valor_nuevo: valNue === '' ? 'Vacío' : String(valNue)
          });
        }
      }
    }
    return diferencias;
  };

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [victimaData, notasData, archivosData, profsData, allAudiencias, allRadicados] = await Promise.all([
        jepService.getVictimaById(id),
        jepService.getInteraccionesRecientes(id),
        storageService.getFiles(id, 'poderes'),
        adminService.getProfesionales(),
        audienciaService.getAudiencias(),
        radicadoService.getRadicados()
      ]);
      setVictima(victimaData);
      setInteracciones(notasData);
      setPoderes(archivosData);
      setListaProfesionales(profsData);

      const historialRef = collection(db, `victimas/${id}/historial_cambios`);
      const snapHistorial = await getDocs(query(historialRef, orderBy('fecha', 'desc')));
      setHistorialCambios(snapHistorial.docs.map(d => ({ id: d.id, ...d.data() })));

      if (victimaData) {
        const audienciasFiltradas = allAudiencias.filter(a => 
          a.observaciones.toLowerCase().includes(victimaData.nombre_completo.toLowerCase()) || 
          a.titulo_diligencia.toLowerCase().includes(victimaData.nombre_completo.toLowerCase()) ||
          a.observaciones.includes(victimaData.identificacion)
        );
        setAudiencias(audienciasFiltradas);

        const radicadosFiltrados = allRadicados.filter(r => 
          r.observaciones.toLowerCase().includes(victimaData.nombre_completo.toLowerCase()) || 
          r.asunto.toLowerCase().includes(victimaData.nombre_completo.toLowerCase()) ||
          r.observaciones.includes(victimaData.identificacion)
        );
        setRadicados(radicadosFiltrados);
      }
    } catch (error) {
      console.error(error);
      showModal('Error', 'No se pudo cargar la información.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [id]);

  const handleOpenEdit = () => {
    if (!victima) return;
    setEditFormData({
      nombre_completo: victima.nombre_completo || '',
      tipo_documento: victima.tipo_documento || 'CC',
      identificacion: victima.identificacion || '',
      datos_demograficos: {
        genero: victima.datos_demograficos?.genero || '',
        orientacion_sexual: victima.datos_demograficos?.orientacion_sexual || '',
        grupo_etnico: victima.datos_demograficos?.grupo_etnico || 'Ninguno',
        etareo: victima.datos_demograficos?.etareo || 'Adulto',
        discapacidad: victima.datos_demograficos?.discapacidad || 'Ninguna'
      },
      datos_contacto: {
        telefono: victima.datos_contacto?.telefono || '',
        correo: victima.datos_contacto?.correo || '',
        direccion: victima.datos_contacto?.direccion || '',
        departamento: victima.datos_contacto?.departamento || ''
      },
      representacion: {
        caso: victima.representacion?.caso || [],
        bloque: victima.representacion?.bloque || [],
        hechos_victimizantes: victima.representacion?.hechos_victimizantes || [],
        calidad_victima: victima.representacion?.calidad_victima || '',
        juridico_asignado_id: victima.representacion?.juridico_asignado_id || '',
        psicosocial_asignado_id: victima.representacion?.psicosocial_asignado_id || '',
        estado: victima.representacion?.estado || 'Activo',
        fecha_asignacion: victima.representacion?.fecha_asignacion || ''
      },
      estado_jep: {
        estado_acreditacion: victima.estado_jep?.estado_acreditacion || 'No está acreditada',
        estado_reconocimiento_pj: victima.estado_jep?.estado_reconocimiento_pj || 'Sin PJ (no se ha recibido poder)',
        auto_acreditacion: victima.estado_jep?.auto_acreditacion || '',
        auto_reconocimiento: victima.estado_jep?.auto_reconocimiento || ''
      }
    });
    setOpenEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !canEdit || !victima) return;

    const diferencias = obtenerCambios(victima, editFormData);

    if (diferencias.length === 0) {
      showModal('Sin modificaciones', 'No se detectaron cambios en los campos de la ficha.', 'info');
      setOpenEditModal(false);
      return;
    }

    try {
      const docRef = doc(db, 'victimas', id);
      await updateDoc(docRef, editFormData);
      
      const historialRef = collection(db, `victimas/${id}/historial_cambios`);
      await addDoc(historialRef, {
        fecha: new Date().toISOString(),
        usuario_email: currentUser?.email || 'sistema',
        cambios: diferencias
      });

      showModal('Éxito', 'Ficha actualizada e historial de auditoría registrado correctamente.', 'success');
      setOpenEditModal(false);
      await loadData();
    } catch (error) {
      console.error(error);
      showModal('Error', 'No se pudieron guardar los cambios.', 'error');
    }
  };

  const handleSaveNote = async () => {
    if (!id || !currentUser || !newNote.observaciones || !canEdit) return;
    try {
      const interaccionToSave: Omit<Interaccion, 'id'> = {
        fecha: new Date().toISOString(),
        tipo: newNote.tipo || 'Otra',
        responsable_id: currentUser.uid,
        rol_responsable: role === 'psicosocial' ? 'Psicosocial' : 'Jurídico',
        estado_contacto: newNote.estado_contacto as any,
        observaciones: newNote.observaciones,
        compromisos: newNote.compromisos || ''
      };
      await jepService.addInteraccion(id, interaccionToSave);
      showModal('Éxito', 'Interacción guardada.', 'success');
      setOpenNoteModal(false);
      setNewNote({ tipo: 'Llamada de sentido del proceso', estado_contacto: 'Contactado', observaciones: '', compromisos: '' });
      await loadData();
    } catch (error) {
      showModal('Error', 'No se pudo guardar la nota.', 'error');
    }
  };

  const handleReasignar = async () => {
    if (!id || !currentUser || !victima || !isAdmin) return;
    if (!reasignarData.motivo) {
      showModal('Falta Información', 'Debe justificar el motivo del cambio.', 'error');
      return;
    }
    if (!reasignarData.juridico_nuevo_id && !reasignarData.psicosocial_nuevo_id) {
      showModal('Operación Inválida', 'El caso debe conservar al menos un responsable técnico asignado.', 'error');
      return;
    }
    try {
      setLoading(true);
      await adminService.reasignarVictimaIndividual(id, currentUser.uid, reasignarData);
      showModal('Éxito', 'Caso reasignado correctamente.', 'success');
      setOpenReasignarModal(false);
      await loadData();
    } catch (error) {
      showModal('Error', 'Error en la reasignación.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !id || !canEdit) return;
    try {
      setUploading(true);
      await storageService.uploadFile(id, file, 'poderes');
      showModal('Éxito', 'Archivo cargado.', 'success');
      await loadData();
    } catch (error) {
      showModal('Error', 'No se pudo subir.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fullPath: string) => {
    if (!canDelete) return;
    showModal('¿Eliminar?', 'Esta acción no se puede deshacer y solo puede ser realizada por coordinación.', 'confirm', async () => {
      try {
        await storageService.deleteFile(fullPath);
        showModal('Eliminado', 'Archivo borrado del servidor.', 'success');
        await loadData();
      } catch (error) {
        showModal('Error', 'No se pudo borrar el archivo.', 'error');
      }
    });
  };

  const handleToggleChecklist = async (campo: string, valor: boolean) => {
    if (!id || !victima || !canEdit) return;
    try {
      const docRef = doc(db, 'victimas', id);
      await updateDoc(docRef, {
        [`seguimiento_vista.${campo}`]: valor
      });
      setVictima({
        ...victima,
        seguimiento_vista: {
          ...(victima.seguimiento_vista || { primer_contacto: false, firma_poder: false, demandas_verdad: false, sol_desasignacion: false }),
          [campo]: valor
        }
      });
    } catch (error) {
      showModal('Error', 'No se pudo actualizar el checklist.', 'error');
    }
  };

  const getNombreAbo = (correoId: string) => {
    if (!correoId || correoId === '') return 'Sin asignar';
    return listaProfesionales.abogados.find(u => u.correo.toLowerCase() === correoId.toLowerCase())?.nombre_completo || correoId;
  };
  const getNombrePsi = (correoId: string) => {
    if (!correoId || correoId === '') return 'Sin asignar';
    return listaProfesionales.psicosociales.find(u => u.correo.toLowerCase() === correoId.toLowerCase())?.nombre_completo || correoId;
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;
  if (!victima) return <Box sx={{ p: 4 }}><Typography>Víctima no encontrada</Typography></Box>;

  const sv = victima.seguimiento_vista || { primer_contacto: false, firma_poder: false, demandas_verdad: false, sol_desasignacion: false };
  const isDesasignado = victima.representacion.estado === 'Desasignado';

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>Volver</Button>
        {canEdit && (
          <Button variant="contained" color="primary" startIcon={<EditIcon />} onClick={handleOpenEdit} sx={{ fontWeight: 'bold' }}>
            Editar Ficha Completa
          </Button>
        )}
      </Box>

      {isDesasignado && (
        <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 3, borderRadius: 2 }}>
          <strong>Esta víctima se encuentra inactiva.</strong> <br/>
          Motivo registrado: {victima.representacion.motivo_desasignacion || 'No especificado'}. <br/>
          Fecha de desasignación: {victima.representacion.fecha_desasignacion || 'No registrada'}.
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}>
        <Tabs value={tabIndex} onChange={(e, val) => setTabIndex(val)} variant="scrollable" scrollButtons="auto">
          <Tab icon={<InfoIcon />} label="Vista General" iconPosition="start" />
          <Tab icon={<GavelIcon />} label={`Actuaciones Judiciales (${audiencias.length})`} iconPosition="start" />
          <Tab icon={<FolderSpecialIcon />} label={`Expediente Documental (${radicados.length})`} iconPosition="start" />
          <Tab icon={<HistoryIcon />} label={`Historial de Cambios (${historialCambios.length})`} iconPosition="start" />
        </Tabs>
      </Box>

      <TabPanel value={tabIndex} index={0}>
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, lg: 7 }}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: '1px solid #e2e8f0', mb: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main' }}>{victima.nombre_completo}</Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>{victima.tipo_documento}: {victima.identificacion}</Typography>
                </Box>
                <Chip label={victima.estado_jep?.estado_acreditacion || 'No está acreditada'} color="primary" variant="outlined" sx={{ fontWeight: 600 }} />
              </Box>

              <Divider sx={{ my: 3 }} />

              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, fontWeight: 700 }}>Información Demográfica</Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 6, md: 4 }}><Typography variant="caption">Género</Typography><Typography variant="body2" sx={{ fontWeight: 600 }}>{victima.datos_demograficos?.genero}</Typography></Grid>
                <Grid size={{ xs: 6, md: 4 }}><Typography variant="caption">Orientación</Typography><Typography variant="body2" sx={{ fontWeight: 600 }}>{victima.datos_demograficos?.orientacion_sexual || 'No registra'}</Typography></Grid>
                <Grid size={{ xs: 6, md: 4 }}><Typography variant="caption">Etnia</Typography><Typography variant="body2" sx={{ fontWeight: 600 }}>{victima.datos_demograficos?.grupo_etnico}</Typography></Grid>
                <Grid size={{ xs: 6, md: 4 }}><Typography variant="caption">Ciclo Vital</Typography><Typography variant="body2" sx={{ fontWeight: 600 }}>{victima.datos_demograficos?.etareo}</Typography></Grid>
                <Grid size={{ xs: 6, md: 4 }}><Typography variant="caption">Discapacidad</Typography><Typography variant="body2" sx={{ fontWeight: 600 }}>{victima.datos_demograficos?.discapacidad}</Typography></Grid>
              </Grid>

              {victima.familiar_desaparecido && (
                <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                  <strong>Familiar Desaparecido:</strong> {victima.familiar_desaparecido.nombre_completo}
                </Alert>
              )}

              <Divider sx={{ my: 3 }} />

              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, fontWeight: 700 }}>Datos de Contacto</Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 6 }}><Typography variant="caption">Teléfono</Typography><Typography variant="body2" sx={{ fontWeight: 600 }}>{victima.datos_contacto?.telefono || 'No registra'}</Typography></Grid>
                <Grid size={{ xs: 6 }}><Typography variant="caption">Correo</Typography><Typography variant="body2" sx={{ fontWeight: 600 }}>{victima.datos_contacto?.correo || 'No registra'}</Typography></Grid>
                <Grid size={{ xs: 12 }}><Typography variant="caption">Ubicación</Typography><Typography variant="body2" sx={{ fontWeight: 600 }}>{victima.datos_contacto?.departamento} - {victima.datos_contacto?.direccion}</Typography></Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main' }}>Asignación IIRESODH</Typography>
                {isAdmin && (
                  <Button size="small" variant="contained" color="secondary" startIcon={<SwapHorizIcon />} onClick={() => {
                    setReasignarData({ 
                      juridico_nuevo_id: victima.representacion.juridico_asignado_id || '', 
                      psicosocial_nuevo_id: victima.representacion.psicosocial_asignado_id || '', 
                      motivo: '' 
                    });
                    setOpenReasignarModal(true);
                  }}>Reasignar Caso</Button>
                )}
              </Box>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption">Abogado/a Responsable</Typography><Typography variant="body2" sx={{ fontWeight: 600 }}>{getNombreAbo(victima.representacion?.juridico_asignado_id)}</Typography></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Typography variant="caption">Psicosocial Responsable</Typography><Typography variant="body2" sx={{ fontWeight: 600 }}>{getNombrePsi(victima.representacion?.psicosocial_asignado_id)}</Typography></Grid>
              </Grid>

              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, fontWeight: 700 }}>Información Jurídica (JEP)</Typography>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">Macrocasos</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>{(victima.representacion?.caso || []).map((c: string) => <Chip key={c} label={c} size="small" sx={{ bgcolor: '#e0e7ff', color: '#3730a3' }} />)}</Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">Bloques</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>{(victima.representacion?.bloque || []).map((b: string) => <Chip key={b} label={b} size="small" variant="outlined" />)}</Box>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary">Hechos Victimizantes (Delitos)</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>{(victima.representacion?.hechos_victimizantes || []).map((h: string) => <Chip key={h} label={h} size="small" color="default" />)}</Box>
                </Grid>
              </Grid>
            </Paper>

            <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: '1px solid #e2e8f0', mb: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main' }}>Documentación y Poderes</Typography>
                {canEdit && (
                  <Button component="label" variant="outlined" startIcon={<CloudUploadIcon />} disabled={uploading}>
                    {uploading ? 'Subiendo...' : 'Subir PDF'}
                    <input type="file" hidden accept=".pdf" onChange={handleFileUpload} />
                  </Button>
                )}
              </Box>
              <List>
                {poderes.map((archivo, index) => (
                  <ListItem key={index} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, mb: 1 }}>
                    <PictureAsPdfIcon color="error" sx={{ mr: 2 }} />
                    <ListItemText primary={archivo.name} />
                    {canDelete && (
                      <IconButton color="error" onClick={() => handleDeleteFile(archivo.fullPath)}>
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, lg: 5 }}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'primary.light', bgcolor: '#f0f4f8', mb: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: 'primary.main' }}>Actuaciones Vista (Checklist)</Typography>
              <FormGroup>
                <FormControlLabel control={<Checkbox checked={sv.primer_contacto} disabled={!canEdit} onChange={(e) => handleToggleChecklist('primer_contacto', e.target.checked)} color="primary" />} label="Primer Contacto Realizado" />
                <FormControlLabel control={<Checkbox checked={sv.firma_poder} disabled={!canEdit} onChange={(e) => handleToggleChecklist('firma_poder', e.target.checked)} color="primary" />} label="Firma de Poder Recibida" />
                <FormControlLabel control={<Checkbox checked={sv.demandas_verdad} disabled={!canEdit} onChange={(e) => handleToggleChecklist('demandas_verdad', e.target.checked)} color="primary" />} label="Demandas de Verdad Presentadas" />
                <FormControlLabel control={<Checkbox checked={sv.sol_desasignacion} disabled={!canEdit} onChange={(e) => handleToggleChecklist('sol_desasignacion', e.target.checked)} color="error" />} label="Solicitud de Desasignación" />
              </FormGroup>
            </Paper>

            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: 'background.paper', height: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Historial de Notas</Typography>
                {canEdit && (
                  <Button startIcon={<AddCommentIcon />} variant="contained" size="small" color="primary" onClick={() => setOpenNoteModal(true)}>
                    Nueva Nota
                  </Button>
                )}
              </Box>
              <List>
                {interacciones.map((nota) => (
                  <Paper key={nota.id} elevation={0} sx={{ p: 2, mb: 2, border: '1px solid #e2e8f0' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Chip label={nota.tipo} size="small" variant="outlined" color="primary" />
                      <Typography variant="caption">{new Date(nota.fecha).toLocaleDateString()}</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ mt: 1 }}>{nota.observaciones}</Typography>
                    {nota.compromisos && (
                      <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'secondary.main', fontWeight: 600 }}>
                        Compromiso: {nota.compromisos}
                      </Typography>
                    )}
                  </Paper>
                ))}
              </List>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabIndex} index={1}>
        <Paper elevation={0} sx={{ p: 3, border: '1px solid #e2e8f0', borderRadius: 3 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Tipo / Despacho</TableCell>
                <TableCell>Diligencia</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {audiencias.length === 0 ? (
                <TableRow><TableCell colSpan={3} align="center" sx={{ py: 3 }}>No se encontraron actuaciones judiciales relacionadas.</TableCell></TableRow>
              ) : (
                audiencias.map((aud, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell>{new Date(aud.fecha).toLocaleDateString()}</TableCell>
                    <TableCell>{aud.tipo} <br/><Typography variant="caption" color="text.secondary">{aud.despacho}</Typography></TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{aud.titulo_diligencia}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Paper>
      </TabPanel>

      <TabPanel value={tabIndex} index={2}>
        <Paper elevation={0} sx={{ p: 3, border: '1px solid #e2e8f0', borderRadius: 3 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Radicado / Auto</TableCell>
                <TableCell>Asunto</TableCell>
                <TableCell>Emisor</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {radicados.length === 0 ? (
                <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3 }}>No se encontraron documentos relacionados.</TableCell></TableRow>
              ) : (
                radicados.map((rad, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell>{new Date(rad.fecha_radicado).toLocaleDateString()}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: '#003366' }}>{rad.numero_radicado}</TableCell>
                    <TableCell>{rad.asunto}</TableCell>
                    <TableCell>{rad.emisor}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Paper>
      </TabPanel>

      <TabPanel value={tabIndex} index={3}>
        <Paper elevation={0} sx={{ p: 3, border: '1px solid #e2e8f0', borderRadius: 3 }}>
          {historialCambios.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
              No se registran modificaciones de campos en este expediente (Ficha original).
            </Box>
          ) : (
            historialCambios.map((log) => (
              <Box key={log.id} sx={{ mb: 4, p: 3, border: '1px solid #e2e8f0', borderRadius: 2, bgcolor: '#f8fafc' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    Modificado por: {log.usuario_email}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(log.fecha).toLocaleString()}
                  </Typography>
                </Box>
                <Table size="small" sx={{ bgcolor: 'white', border: '1px solid #e2e8f0', borderRadius: 1 }}>
                  <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Campo Modificado</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: 'error.main' }}>Valor Anterior</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: 'success.main' }}>Valor Nuevo</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {log.cambios?.map((c: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell sx={{ fontWeight: 600 }}>{traducirCampo(c.campo)}</TableCell>
                        <TableCell sx={{ color: 'error.dark', bgcolor: '#fff5f5' }}>{c.valor_anterior}</TableCell>
                        <TableCell sx={{ color: 'success.dark', bgcolor: '#f0fdf4' }}>{c.valor_nuevo}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            ))
          )}
        </Paper>
      </TabPanel>

      {/* DIALOG DE EDICIÓN DE FICHA COMPLETA */}
      <Dialog open={openEditModal} onClose={() => setOpenEditModal(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', color: 'primary.main' }}>Editar Ficha de la Víctima</DialogTitle>
        <Box component="form" onSubmit={handleSaveEdit}>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}><Divider textAlign="left"><Typography variant="subtitle2" color="text.secondary">Identificación</Typography></Divider></Grid>
              <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth size="small" label="Nombre Completo" required value={editFormData?.nombre_completo || ''} onChange={(e) => setEditFormData({ ...editFormData, nombre_completo: e.target.value })} /></Grid>
              <Grid size={{ xs: 12, md: 3 }}><TextField select fullWidth size="small" label="Tipo Doc." value={editFormData?.tipo_documento || 'CC'} onChange={(e) => setEditFormData({ ...editFormData, tipo_documento: e.target.value })}><MenuItem value="CC">CC</MenuItem><MenuItem value="TI">TI</MenuItem><MenuItem value="CE">CE</MenuItem></TextField></Grid>
              <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth size="small" label="Número de Identificación" required value={editFormData?.identificacion || ''} onChange={(e) => setEditFormData({ ...editFormData, identificacion: e.target.value })} /></Grid>

              <Grid size={{ xs: 12 }}><Divider textAlign="left"><Typography variant="subtitle2" color="text.secondary">Datos Demográficos</Typography></Divider></Grid>
              <Grid size={{ xs: 12, md: 4 }}><TextField select fullWidth size="small" label="Género" required value={editFormData?.datos_demograficos?.genero || ''} onChange={(e) => setEditFormData({ ...editFormData, datos_demograficos: { ...editFormData.datos_demograficos, genero: e.target.value } })}>{GENEROS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}</TextField></Grid>
              <Grid size={{ xs: 12, md: 4 }}><TextField select fullWidth size="small" label="Orientación Sexual" value={editFormData?.datos_demograficos?.orientacion_sexual || ''} onChange={(e) => setEditFormData({ ...editFormData, datos_demograficos: { ...editFormData.datos_demograficos, orientacion_sexual: e.target.value } })}>{ORIENTACIONES.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}</TextField></Grid>
              <Grid size={{ xs: 12, md: 4 }}><TextField select fullWidth size="small" label="Grupo Étnico" value={editFormData?.datos_demograficos?.grupo_etnico || 'Ninguno'} onChange={(e) => setEditFormData({ ...editFormData, datos_demograficos: { ...editFormData.datos_demograficos, grupo_etnico: e.target.value } })}>{ETNICOS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}</TextField></Grid>
              <Grid size={{ xs: 12, md: 6 }}><TextField select fullWidth size="small" label="Ciclo Vital" value={editFormData?.datos_demograficos?.etareo || 'Adulto'} onChange={(e) => setEditFormData({ ...editFormData, datos_demograficos: { ...editFormData.datos_demograficos, etareo: e.target.value } })}>{ETAREOS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}</TextField></Grid>
              <Grid size={{ xs: 12, md: 6 }}><TextField select fullWidth size="small" label="Discapacidad" value={editFormData?.datos_demograficos?.discapacidad || 'Ninguna'} onChange={(e) => setEditFormData({ ...editFormData, datos_demograficos: { ...editFormData.datos_demograficos, discapacidad: e.target.value } })}>{DISCAPACIDADES.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}</TextField></Grid>

              <Grid size={{ xs: 12 }}><Divider textAlign="left"><Typography variant="subtitle2" color="text.secondary">Información de Contacto</Typography></Divider></Grid>
              <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth size="small" label="Teléfono" value={editFormData?.datos_contacto?.telefono || ''} onChange={(e) => setEditFormData({ ...editFormData, datos_contacto: { ...editFormData.datos_contacto, telefono: e.target.value } })} /></Grid>
              <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth size="small" label="Correo Electrónico" value={editFormData?.datos_contacto?.correo || ''} onChange={(e) => setEditFormData({ ...editFormData, datos_contacto: { ...editFormData.datos_contacto, correo: e.target.value } })} /></Grid>
              <Grid size={{ xs: 12, md: 4 }}><TextField select fullWidth size="small" label="Departamento" value={editFormData?.datos_contacto?.departamento || ''} onChange={(e) => setEditFormData({ ...editFormData, datos_contacto: { ...editFormData.datos_contacto, departamento: e.target.value } })}>{DEPARTAMENTOS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}</TextField></Grid>
              <Grid size={{ xs: 12 }}><TextField fullWidth size="small" label="Dirección de Residencia" value={editFormData?.datos_contacto?.direccion || ''} onChange={(e) => setEditFormData({ ...editFormData, datos_contacto: { ...editFormData.datos_contacto, direccion: e.target.value } })} /></Grid>

              <Grid size={{ xs: 12 }}><Divider textAlign="left"><Typography variant="subtitle2" color="text.secondary">Proceso y Cobertura JEP</Typography></Divider></Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Macrocaso(s)</InputLabel>
                  <Select 
                    multiple value={editFormData?.representacion?.caso || []} input={<OutlinedInput label="Macrocaso(s)" />} 
                    onChange={(e) => setEditFormData({ ...editFormData, representacion: { ...editFormData.representacion, caso: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value } })} 
                    renderValue={(selected) => <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{(selected as string[]).map((val) => <Chip key={val} label={val} size="small" color="primary" />)}</Box>}
                  >
                    {CASOS_JEP.map(caso => <MenuItem key={caso} value={caso}>{caso}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Bloque(s)</InputLabel>
                  <Select 
                    multiple value={editFormData?.representacion?.bloque || []} input={<OutlinedInput label="Bloque(s)" />} 
                    onChange={(e) => setEditFormData({ ...editFormData, representacion: { ...editFormData.representacion, bloque: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value } })} 
                    renderValue={(selected) => <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{(selected as string[]).map((val) => <Chip key={val} label={val} size="small" variant="outlined" />)}</Box>}
                  >
                    {BLOQUES_JEP.map(bloque => <MenuItem key={bloque} value={bloque}>{bloque}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Delitos (Hechos)</InputLabel>
                  <Select 
                    multiple value={editFormData?.representacion?.hechos_victimizantes || []} input={<OutlinedInput label="Delitos (Hechos)" />} 
                    onChange={(e) => setEditFormData({ ...editFormData, representacion: { ...editFormData.representacion, hechos_victimizantes: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value } })} 
                    renderValue={(selected) => <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{(selected as string[]).map((val) => <Chip key={val} label={val} size="small" />)}</Box>}
                  >
                    {HECHOS.map(hecho => <MenuItem key={hecho} value={hecho}>{hecho}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField select fullWidth size="small" label="Calidad de Víctima" required value={editFormData?.representacion?.calidad_victima || ''} onChange={(e) => setEditFormData({ ...editFormData, representacion: { ...editFormData.representacion, calidad_victima: e.target.value } })}>{CALIDADES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}</TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField select fullWidth size="small" label="Estado Acreditación" value={editFormData?.estado_jep?.estado_acreditacion || 'No está acreditada'} onChange={(e) => setEditFormData({ ...editFormData, estado_jep: { ...editFormData.estado_jep, estado_acreditacion: e.target.value } })}><MenuItem value="No está acreditada">No está acreditada</MenuItem><MenuItem value="Acreditada">Acreditada</MenuItem><MenuItem value="En trámite (despacho no ha resuelto)">En trámite (despacho no ha resuelto)</MenuItem></TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField select fullWidth size="small" label="Reconocimiento PJ" value={editFormData?.estado_jep?.estado_reconocimiento_pj || 'Sin PJ (no se ha recibido poder)'} onChange={(e) => setEditFormData({ ...editFormData, estado_jep: { ...editFormData.estado_jep, estado_reconocimiento_pj: e.target.value } })}><MenuItem value="Sin PJ (no se ha recibido poder)">Sin PJ</MenuItem><MenuItem value="Con PJ (poder recibido)">Con PJ</MenuItem></TextField>
              </Grid>
              
              {/* CORRECCIÓN: Estructuración limpia en múltiples líneas para evitar colisiones del parser de TSX */}
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField 
                  fullWidth 
                  size="small" 
                  label="Auto de Acreditación" 
                  value={editFormData?.estado_jep?.auto_acreditacion || ''} 
                  onChange={(e) => setEditFormData({ ...editFormData, estado_jep: { ...editFormData.estado_jep, auto_acreditacion: e.target.value } })} 
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField 
                  fullWidth 
                  size="small" 
                  label="Auto de Reconocimiento" 
                  value={editFormData?.estado_jep?.auto_reconocimiento || ''} 
                  onChange={(e) => setEditFormData({ ...editFormData, estado_jep: { ...editFormData.estado_jep, auto_reconocimiento: e.target.value } })} 
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenEditModal(false)} color="secondary">Cancelar</Button>
            <Button type="submit" variant="contained" color="primary">Guardar Cambios</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={openNoteModal} onClose={() => setOpenNoteModal(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 'bold' }}>Registrar Interacción</DialogTitle>
        <DialogContent dividers>
          <TextField select fullWidth size="small" label="Tipo de Interacción" sx={{ mb: 2, mt: 1 }} value={newNote.tipo} onChange={(e) => setNewNote({ ...newNote, tipo: e.target.value })}>
            {TIPOS_INTERACCION.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>
          <TextField fullWidth multiline rows={4} label="Observaciones" value={newNote.observaciones} onChange={(e) => setNewNote({ ...newNote, observaciones: e.target.value })} />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenNoteModal(false)} color="secondary">Cancelar</Button>
          <Button onClick={handleSaveNote} variant="contained" color="primary">Guardar Nota</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openReasignarModal} onClose={() => setOpenReasignarModal(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 'bold' }}>Reasignar Responsables del Caso</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select fullWidth label="Nuevo Abogado" value={reasignarData.juridico_nuevo_id} onChange={(e) => setReasignarData({ ...reasignarData, juridico_nuevo_id: e.target.value })}>
                <MenuItem value=""><em>Quitar asignación / Dejar vacío</em></MenuItem>
                {listaProfesionales.abogados.map(u => <MenuItem key={u.uid} value={u.correo}>{u.nombre_completo || u.correo}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select fullWidth label="Nuevo Psicosocial" value={reasignarData.psicosocial_nuevo_id} onChange={(e) => setReasignarData({ ...reasignarData, psicosocial_nuevo_id: e.target.value })}>
                <MenuItem value=""><em>Quitar asignación / Dejar vacío</em></MenuItem>
                {listaProfesionales.psicosociales.map(u => <MenuItem key={u.uid} value={u.correo}>{u.nombre_completo || u.correo}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth multiline rows={3} label="Motivo de la reasignación" required value={reasignarData.motivo} onChange={(e) => setReasignarData({ ...reasignarData, motivo: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenReasignarModal(false)} color="secondary">Cancelar</Button>
          <Button onClick={handleReasignar} variant="contained" color="primary">Confirmar Cambio</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VictimaDetalle;