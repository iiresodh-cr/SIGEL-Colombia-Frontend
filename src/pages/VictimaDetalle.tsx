import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Paper, Grid, Divider, Button, CircularProgress, 
  Chip, List, ListItem, Dialog, DialogTitle, FormGroup, FormControlLabel, Checkbox,
  DialogContent, DialogActions, TextField, MenuItem, IconButton, ListItemText,
  Tabs, Tab, Table, TableHead, TableRow, TableCell, TableBody, Alert
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

import { jepService } from '../services/jepService';
import { storageService, ArchivoJEP } from '../services/storageService';
import { adminService } from '../services/adminService';
import { audienciaService } from '../services/audienciaService';
import { radicadoService } from '../services/radicadoService';
import { Victima, Interaccion } from '../types/jep';
import { Usuario } from '../types/user';
import { Audiencia } from '../types/audiencia';
import { Radicado } from '../types/radicado';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const TIPOS_INTERACCION = ['Llamada de sentido del proceso', 'Asesoría jurídica', 'Acompañamiento psicosocial', 'Gestión de acreditación', 'Otra'];

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
  
  const [audiencias, setAudiencias] = useState<Audiencia[]>([]);
  const [radicados, setRadicados] = useState<Radicado[]>([]);
  const [tabIndex, setTabIndex] = useState(0);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [openNoteModal, setOpenNoteModal] = useState(false);
  const [newNote, setNewNote] = useState<Partial<Interaccion>>({ tipo: 'Llamada de sentido del proceso', estado_contacto: 'Contactado', observaciones: '', compromisos: '' });

  const [openReasignarModal, setOpenReasignarModal] = useState(false);
  const [reasignarData, setReasignarData] = useState({ juridico_nuevo_id: '', psicosocial_nuevo_id: '', motivo: '' });

  const isAdmin = role === 'admin' || role === 'superadmin';
  const isLector = role === 'lector';
  const canDelete = isAdmin; 
  const canEdit = !isLector; 

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

    // VALIDACIÓN: Evitar desasignar ambos y dejar el caso huerfano de forma accidental
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
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 3 }}>Volver</Button>

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

            <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: '1px solid #e2e8f0' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main' }}>Documentación y Poderes</Typography>
                {canEdit && (
                  <Button component="label" variant="outlined" startIcon={<CloudUploadIcon />}>
                    Subir PDF
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