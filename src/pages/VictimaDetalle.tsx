import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Paper, Grid, Divider, Button, CircularProgress, 
  Chip, List, ListItem, Dialog, DialogTitle, 
  DialogContent, DialogActions, TextField, MenuItem, IconButton, ListItemText
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddCommentIcon from '@mui/icons-material/AddComment';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DeleteIcon from '@mui/icons-material/Delete';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { jepService } from '../services/jepService';
import { storageService, ArchivoJEP } from '../services/storageService';
import { adminService } from '../services/adminService';
import { Victima, Interaccion } from '../types/jep';
import { Usuario } from '../types/user';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';

const TIPOS_INTERACCION = [
  'Llamada de sentido del proceso',
  'Asesoría jurídica',
  'Acompañamiento psicosocial',
  'Gestión de acreditación',
  'Otra'
];

const VictimaDetalle = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, role } = useAuth();
  const { showModal } = useModal();
  
  const [victima, setVictima] = useState<Victima | null>(null);
  const [interacciones, setInteracciones] = useState<Interaccion[]>([]);
  const [poderes, setPoderes] = useState<ArchivoJEP[]>([]);
  const [listaProfesionales, setListaProfesionales] = useState<{ abogados: Usuario[], psicosociales: Usuario[] }>({ abogados: [], psicosociales: [] });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [openNoteModal, setOpenNoteModal] = useState(false);
  const [newNote, setNewNote] = useState<Partial<Interaccion>>({
    tipo: 'Llamada de sentido del proceso', estado_contacto: 'Contactado', observaciones: '', compromisos: ''
  });

  const [openReasignarModal, setOpenReasignarModal] = useState(false);
  const [reasignarData, setReasignarData] = useState({ juridico_nuevo_id: '', psicosocial_nuevo_id: '', motivo: '' });

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [victimaData, notasData, archivosData, profsData] = await Promise.all([
        jepService.getVictimaById(id),
        jepService.getInteraccionesRecientes(id),
        storageService.getFiles(id, 'poderes'),
        adminService.getProfesionales()
      ]);
      setVictima(victimaData);
      setInteracciones(notasData);
      setPoderes(archivosData);
      setListaProfesionales(profsData);
    } catch (error) {
      console.error(error);
      showModal('Error', 'No se pudo cargar la información.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [id]);

  const handleSaveNote = async () => {
    if (!id || !currentUser || !newNote.observaciones) return;
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
      showModal('Éxito', 'Interacción guardada correctamente.', 'success');
      setOpenNoteModal(false);
      setNewNote({ tipo: 'Llamada de sentido del proceso', estado_contacto: 'Contactado', observaciones: '', compromisos: '' });
      await loadData();
    } catch (error) {
      showModal('Error', 'No se pudo guardar la nota.', 'error');
    }
  };

  const handleReasignar = async () => {
    if (!id || !currentUser || !victima) return;
    if (!reasignarData.motivo) {
      showModal('Falta Información', 'Debe justificar el motivo del cambio.', 'error');
      return;
    }
    try {
      setLoading(true);
      await adminService.reasignarVictimaIndividual(id, currentUser.uid, reasignarData);
      showModal('Éxito', 'El caso ha sido reasignado y el historial actualizado.', 'success');
      setOpenReasignarModal(false);
      await loadData(); // Recarga vital para ver el cambio de nombre
    } catch (error) {
      showModal('Error', 'No se pudo procesar la reasignación.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !id) return;
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
    showModal('¿Eliminar?', 'Esta acción no se puede deshacer.', 'confirm', async () => {
      try {
        await storageService.deleteFile(fullPath);
        showModal('Eliminado', 'Archivo borrado.', 'success');
        await loadData();
      } catch (error) {
        showModal('Error', 'No se pudo borrar.', 'error');
      }
    });
  };

  const getNombreAbo = (uid: string) => {
    if (!uid) return 'Sin asignar';
    return listaProfesionales.abogados.find(u => u.uid === uid)?.nombre_completo || 'Sin asignar';
  };
  const getNombrePsi = (uid: string) => {
    if (!uid) return 'Sin asignar';
    return listaProfesionales.psicosociales.find(u => u.uid === uid)?.nombre_completo || 'Sin asignar';
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;
  if (!victima) return <Box sx={{ p: 4 }}><Typography>Víctima no encontrada</Typography></Box>;

  const isAdmin = role === 'admin' || role === 'superadmin';

  return (
    <Box sx={{ p: 4 }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 3 }}>Volver</Button>

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: '1px solid #e2e8f0', mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#003366' }}>{victima.nombre_completo}</Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>CC: {victima.identificacion}</Typography>
              </Box>
              <Chip label={victima.estado_jep.estado_acreditacion} color="primary" variant="outlined" sx={{ fontWeight: 600 }} />
            </Box>

            <Divider sx={{ my: 3 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#003366' }}>Asignación IIRESODH</Typography>
              {isAdmin && (
                <Button size="small" variant="contained" color="warning" startIcon={<SwapHorizIcon />} onClick={() => {
                  setReasignarData({ 
                    juridico_nuevo_id: victima.representacion.juridico_asignado_id || '', 
                    psicosocial_nuevo_id: victima.representacion.psicosocial_asignado_id || '', 
                    motivo: '' 
                  });
                  setOpenReasignarModal(true);
                }}>Reasignar Caso</Button>
              )}
            </Box>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary">Abogado/a Responsable</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{getNombreAbo(victima.representacion.juridico_asignado_id)}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary">Psicosocial Responsable</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{getNombrePsi(victima.representacion.psicosocial_asignado_id)}</Typography>
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary">Macrocasos</Typography>
                <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>{victima.representacion.caso.map(c => <Chip key={c} label={c} size="small" sx={{ bgcolor: '#e0e7ff', color: '#3730a3' }} />)}</Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary">Bloques</Typography>
                <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>{victima.representacion.bloque.map(b => <Chip key={b} label={b} size="small" variant="outlined" />)}</Box>
              </Grid>
            </Grid>
          </Paper>

          {/* DOCUMENTOS */}
          <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: '1px solid #e2e8f0' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#003366' }}>Documentación</Typography>
              <Button component="label" variant="outlined" startIcon={<CloudUploadIcon />}>
                Subir PDF
                <input type="file" hidden accept=".pdf" onChange={handleFileUpload} />
              </Button>
            </Box>
            <List>
              {poderes.map((archivo, index) => (
                <ListItem key={index} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, mb: 1 }}>
                  <PictureAsPdfIcon color="error" sx={{ mr: 2 }} />
                  <ListItemText primary={archivo.name} />
                  <IconButton color="error" onClick={() => handleDeleteFile(archivo.fullPath)}><DeleteIcon /></IconButton>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* COLUMNA DERECHA: HISTORIAL */}
        <Grid size={{ xs: 12, lg: 5 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#f8fafc', height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Historial de Notas</Typography>
              <Button startIcon={<AddCommentIcon />} variant="contained" size="small" sx={{ bgcolor: '#003366' }} onClick={() => setOpenNoteModal(true)}>Nota</Button>
            </Box>
            <List>
              {interacciones.map((nota) => (
                <Paper key={nota.id} elevation={0} sx={{ p: 2, mb: 2, border: '1px solid #e2e8f0' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Chip label={nota.tipo} size="small" variant="outlined" color="primary" />
                    <Typography variant="caption" color="text.secondary">{new Date(nota.fecha).toLocaleDateString()}</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ mt: 1 }}>{nota.observaciones}</Typography>
                </Paper>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>

      {/* MODAL REASIGNACIÓN */}
      <Dialog open={openReasignarModal} onClose={() => setOpenReasignarModal(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 'bold' }}>Reasignar Responsables</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select fullWidth label="Nuevo Abogado" value={reasignarData.juridico_nuevo_id} onChange={(e) => setReasignarData({ ...reasignarData, juridico_nuevo_id: e.target.value })}>
                {listaProfesionales.abogados.map(u => <MenuItem key={u.uid} value={u.uid}>{u.nombre_completo || u.correo}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select fullWidth label="Nuevo Psicosocial" value={reasignarData.psicosocial_nuevo_id} onChange={(e) => setReasignarData({ ...reasignarData, psicosocial_nuevo_id: e.target.value })}>
                {listaProfesionales.psicosociales.map(u => <MenuItem key={u.uid} value={u.uid}>{u.nombre_completo || u.correo}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth multiline rows={3} label="Motivo" required value={reasignarData.motivo} onChange={(e) => setReasignarData({ ...reasignarData, motivo: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenReasignarModal(false)}>Cancelar</Button>
          <Button onClick={handleReasignar} variant="contained" color="warning">Confirmar Cambio</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VictimaDetalle;