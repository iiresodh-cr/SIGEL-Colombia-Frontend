import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Paper, Grid, Divider, Button, CircularProgress, 
  Chip, List, ListItem, Dialog, DialogTitle, 
  DialogContent, DialogActions, TextField, MenuItem, IconButton
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

  // Estados para notas
  const [openNoteModal, setOpenNoteModal] = useState(false);
  const [newNote, setNewNote] = useState<Partial<Interaccion>>({
    tipo: 'Llamada de sentido del proceso', estado_contacto: 'Contactado', observaciones: '', compromisos: ''
  });

  // Estados para reasignación de caso (Solo Admins)
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
        adminService.getProfesionales() // Traemos los profesionales
      ]);
      setVictima(victimaData);
      setInteracciones(notasData);
      setPoderes(archivosData);
      setListaProfesionales(profsData);
    } catch (error) {
      console.error("Error cargando perfil:", error);
      showModal('Error', 'No se pudo cargar la información de la víctima.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

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
      setNewNote({ ...newNote, observaciones: '', compromisos: '' });
      await loadData();
    } catch (error) {
      showModal('Error', 'Hubo un problema al guardar la interacción.', 'error');
    }
  };

  const handleReasignar = async () => {
    if (!id || !currentUser || !victima) return;
    if (!reasignarData.motivo) {
      showModal('Falta Información', 'Debe justificar el motivo de la reasignación.', 'error');
      return;
    }
    try {
      setLoading(true);
      await adminService.reasignarVictimaIndividual(id, currentUser.uid, {
        juridico_anterior_id: victima.representacion.juridico_asignado_id,
        juridico_nuevo_id: reasignarData.juridico_nuevo_id,
        psicosocial_anterior_id: victima.representacion.psicosocial_asignado_id,
        psicosocial_nuevo_id: reasignarData.psicosocial_nuevo_id,
        motivo: reasignarData.motivo
      });
      showModal('Reasignación Exitosa', 'El caso ha sido actualizado y el cambio quedó registrado.', 'success');
      setOpenReasignarModal(false);
      await loadData();
    } catch (error) {
      console.error(error);
      showModal('Error', 'No se pudo reasignar el caso.', 'error');
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
      showModal('Archivo Subido', 'El poder ha sido cargado con éxito.', 'success');
      await loadData();
    } catch (error) {
      showModal('Error', 'No se pudo subir el archivo. Intenta de nuevo.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fullPath: string) => {
    showModal('¿Eliminar Archivo?', 'Esta acción no se puede deshacer.', 'confirm', async () => {
      try {
        await storageService.deleteFile(fullPath);
        showModal('Eliminado', 'El archivo fue borrado.', 'success');
        await loadData();
      } catch (error) {
        showModal('Error', 'No se pudo borrar el archivo.', 'error');
      }
    });
  };

  const getNombreAbo = (uid: string) => listaProfesionales.abogados.find(u => u.uid === uid)?.nombre_completo || 'Sin asignar';
  const getNombrePsi = (uid: string) => listaProfesionales.psicosociales.find(u => u.uid === uid)?.nombre_completo || 'Sin asignar';

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;
  if (!victima) return <Box sx={{ p: 4 }}><Typography>Víctima no encontrada</Typography></Box>;

  const isAdmin = role === 'admin' || role === 'superadmin';

  return (
    <Box sx={{ p: 4 }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/victimas')} sx={{ mb: 3 }}>
        Volver a la Matriz
      </Button>

      <Grid container spacing={4}>
        
        {/* COLUMNA IZQUIERDA: DATOS Y ARCHIVOS */}
        <Grid size={{ xs: 12, lg: 7 }}>
          <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: '1px solid #e2e8f0', mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#003366' }}>{victima.nombre_completo}</Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>{victima.tipo_documento} {victima.identificacion}</Typography>
              </Box>
              <Chip label={victima.estado_jep.estado_acreditacion} color={victima.estado_jep.estado_acreditacion === 'Acreditada' ? 'success' : 'warning'} variant="outlined" sx={{ fontWeight: 600 }} />
            </Box>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary">Teléfono de Contacto</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>{victima.datos_contacto.telefono}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary">Ubicación</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>{victima.datos_contacto.departamento} {victima.datos_contacto.direccion && `- ${victima.datos_contacto.direccion}`}</Typography>
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* SECCIÓN DE REPRESENTACIÓN CON BOTÓN DE REASIGNAR */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#003366' }}>
                Información de Representación (IIRESODH)
              </Typography>
              {isAdmin && (
                <Button 
                  size="small" 
                  variant="outlined" 
                  color="warning" 
                  startIcon={<SwapHorizIcon />}
                  onClick={() => {
                    setReasignarData({
                      juridico_nuevo_id: victima.representacion.juridico_asignado_id,
                      psicosocial_nuevo_id: victima.representacion.psicosocial_asignado_id,
                      motivo: ''
                    });
                    setOpenReasignarModal(true);
                  }}
                >
                  Reasignar Caso
                </Button>
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
                <Typography variant="caption" color="text.secondary">Macrocasos Vinculados</Typography>
                <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>{victima.representacion.caso.map(c => <Chip key={c} label={c} size="small" sx={{ bgcolor: '#e0e7ff', color: '#3730a3' }} />)}</Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary">Bloques Asignados</Typography>
                <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>{victima.representacion.bloque.map(b => <Chip key={b} label={b} size="small" variant="outlined" />)}</Box>
              </Grid>
            </Grid>
          </Paper>

          {/* SECCIÓN DE ARCHIVOS (PODERES) */}
          <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: '1px solid #e2e8f0' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#003366' }}>Poderes y Documentos</Typography>
              <Button component="label" variant="outlined" startIcon={uploading ? <CircularProgress size={20} /> : <CloudUploadIcon />} disabled={uploading}>
                {uploading ? 'Subiendo...' : 'Subir Poder PDF'}
                <input type="file" hidden accept=".pdf,image/*" onChange={handleFileUpload} />
              </Button>
            </Box>
            
            {poderes.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center', py: 2 }}>
                No hay poderes o documentos adjuntos.
              </Typography>
            ) : (
              <List>
                {poderes.map((archivo, index) => (
                  <ListItem key={index} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, mb: 1, display: 'flex', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PictureAsPdfIcon color="error" />
                      <a href={archivo.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: '#0369a1', fontWeight: 600 }}>
                        {archivo.name.split('_').slice(1).join('_') || archivo.name}
                      </a>
                    </Box>
                    <IconButton size="small" color="error" onClick={() => handleDeleteFile(archivo.fullPath)}>
                      <DeleteIcon />
                    </IconButton>
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* COLUMNA DERECHA: HISTORIAL E INTERACCIONES */}
        <Grid size={{ xs: 12, lg: 5 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#f8fafc', height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Historial de Seguimiento</Typography>
              <Button startIcon={<AddCommentIcon />} variant="contained" size="small" sx={{ bgcolor: '#003366' }} onClick={() => setOpenNoteModal(true)}>
                Nueva Nota
              </Button>
            </Box>

            {interacciones.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 5 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  Aún no hay interacciones registradas para esta víctima.
                </Typography>
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                {interacciones.map((nota) => (
                  <Paper key={nota.id} elevation={0} sx={{ p: 2, mb: 2, border: '1px solid #e2e8f0' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Chip label={nota.tipo} size="small" color={nota.rol_responsable === 'Psicosocial' ? 'secondary' : 'primary'} variant="outlined" />
                      <Typography variant="caption" color="text.secondary">{new Date(nota.fecha).toLocaleDateString()}</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ mb: 1, whiteSpace: 'pre-line' }}>{nota.observaciones}</Typography>
                    {nota.compromisos && (
                      <Typography variant="caption" sx={{ display: 'block', mt: 1, p: 1, bgcolor: '#f1f5f9', borderRadius: 1 }}>
                        <strong>Compromisos:</strong> {nota.compromisos}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'right' }}>
                      Por: Equipo {nota.rol_responsable} ({nota.estado_contacto})
                    </Typography>
                  </Paper>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* MODAL: AGREGAR NUEVA INTERACCIÓN */}
      <Dialog open={openNoteModal} onClose={() => setOpenNoteModal(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 'bold', color: '#003366' }}>Registrar Interacción / Nota</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select fullWidth size="small" label="Tipo de Actividad" value={newNote.tipo} onChange={(e) => setNewNote({ ...newNote, tipo: e.target.value })}>
                {TIPOS_INTERACCION.map(tipo => <MenuItem key={tipo} value={tipo}>{tipo}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select fullWidth size="small" label="Estado del Contacto" value={newNote.estado_contacto} onChange={(e) => setNewNote({ ...newNote, estado_contacto: e.target.value as any })}>
                <MenuItem value="Contactado">Contactado con éxito</MenuItem>
                <MenuItem value="Contacto fallido">Contacto fallido / Número equivocado</MenuItem>
                <MenuItem value="No contactado">No contesta</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth multiline rows={4} label="Observaciones / Sentido del proceso" required placeholder="Escribe el resumen de la llamada..." value={newNote.observaciones} onChange={(e) => setNewNote({ ...newNote, observaciones: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth size="small" label="Compromisos / Tareas pendientes (Opcional)" value={newNote.compromisos} onChange={(e) => setNewNote({ ...newNote, compromisos: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenNoteModal(false)} color="inherit">Cancelar</Button>
          <Button onClick={handleSaveNote} variant="contained" sx={{ bgcolor: '#003366' }} disabled={!newNote.observaciones}>
            Guardar en Historial
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL: REASIGNAR CASO INDIVIDUAL */}
      <Dialog open={openReasignarModal} onClose={() => setOpenReasignarModal(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 'bold', color: '#92400e', display: 'flex', alignItems: 'center', gap: 1 }}>
          <SwapHorizIcon /> Reasignar Responsables del Caso
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
            Selecciona a los nuevos profesionales a cargo. El cambio quedará registrado en el historial de asignaciones de la víctima.
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField 
                select fullWidth size="small" 
                label="Nuevo Abogado/a" 
                value={reasignarData.juridico_nuevo_id} 
                onChange={(e) => setReasignarData({ ...reasignarData, juridico_nuevo_id: e.target.value })}
              >
                {listaProfesionales.abogados.map(u => <MenuItem key={u.uid} value={u.uid}>{u.nombre_completo || u.correo}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField 
                select fullWidth size="small" 
                label="Nuevo Psicosocial" 
                value={reasignarData.psicosocial_nuevo_id} 
                onChange={(e) => setReasignarData({ ...reasignarData, psicosocial_nuevo_id: e.target.value })}
              >
                {listaProfesionales.psicosociales.map(u => <MenuItem key={u.uid} value={u.uid}>{u.nombre_completo || u.correo}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField 
                fullWidth multiline rows={3} 
                label="Motivo de la Reasignación" 
                required 
                placeholder="Ej: Renuncia de la abogada anterior, nivelación de carga laboral, etc." 
                value={reasignarData.motivo} 
                onChange={(e) => setReasignarData({ ...reasignarData, motivo: e.target.value })} 
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenReasignarModal(false)} color="inherit">Cancelar</Button>
          <Button onClick={handleReasignar} variant="contained" color="warning" disabled={!reasignarData.motivo}>
            Ejecutar Reasignación
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default VictimaDetalle;