import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Paper, Grid, Divider, Button, CircularProgress, 
  Chip, List, ListItem, ListItemText, Dialog, DialogTitle, 
  DialogContent, DialogActions, TextField, MenuItem 
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddCommentIcon from '@mui/icons-material/AddComment';
import { jepService } from '../services/jepService';
import { Victima, Interaccion } from '../types/jep';
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
  const [loading, setLoading] = useState(true);

  // Estado para el modal de nueva nota
  const [openNoteModal, setOpenNoteModal] = useState(false);
  const [newNote, setNewNote] = useState<Partial<Interaccion>>({
    tipo: 'Llamada de sentido del proceso',
    estado_contacto: 'Contactado',
    observaciones: '',
    compromisos: ''
  });

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [victimaData, notasData] = await Promise.all([
        jepService.getVictimaById(id),
        jepService.getInteraccionesRecientes(id)
      ]);
      setVictima(victimaData);
      setInteracciones(notasData);
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
      showModal('Éxito', 'Interacción guardada correctamente en el historial.', 'success');
      setOpenNoteModal(false);
      setNewNote({ ...newNote, observaciones: '', compromisos: '' }); // Reset
      await loadData(); // Recargar notas
    } catch (error) {
      console.error("Error guardando nota:", error);
      showModal('Error', 'Hubo un problema al guardar la interacción.', 'error');
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;
  if (!victima) return <Box sx={{ p: 4 }}><Typography>Víctima no encontrada</Typography></Box>;

  return (
    <Box sx={{ p: 4 }}>
      <Button 
        startIcon={<ArrowBackIcon />} 
        onClick={() => navigate('/victimas')}
        sx={{ mb: 3 }}
      >
        Volver a la Matriz
      </Button>

      <Grid container spacing={4}>
        
        {/* ================= COLUMNA IZQUIERDA: DATOS DE LA VÍCTIMA ================= */}
        <Grid size={{ xs: 12, lg: 7 }}>
          <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: '1px solid #e2e8f0' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#003366' }}>
                  {victima.nombre_completo}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
                  {victima.tipo_documento} {victima.identificacion}
                </Typography>
              </Box>
              <Chip 
                label={victima.estado_jep.estado_acreditacion} 
                color={victima.estado_jep.estado_acreditacion === 'Acreditada' ? 'success' : 'warning'} 
                variant="outlined" 
                sx={{ fontWeight: 600 }} 
              />
            </Box>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary">Teléfono de Contacto</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>{victima.datos_contacto.telefono}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary">Ubicación</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {victima.datos_contacto.departamento} {victima.datos_contacto.direccion && `- ${victima.datos_contacto.direccion}`}
                </Typography>
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#003366' }}>
              Información de Representación (IIRESODH)
            </Typography>
            
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary">Macrocasos Vinculados</Typography>
                <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                  {victima.representacion.caso.map(c => <Chip key={c} label={c} size="small" sx={{ bgcolor: '#e0e7ff', color: '#3730a3' }} />)}
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary">Bloques Asignados</Typography>
                <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                  {victima.representacion.bloque.map(b => <Chip key={b} label={b} size="small" variant="outlined" />)}
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary">Calidad de Víctima</Typography>
                <Typography variant="body2">{victima.representacion.calidad_victima}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="text.secondary">Estado de Representación</Typography>
                <Typography variant="body2">{victima.representacion.estado}</Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* ================= COLUMNA DERECHA: HISTORIAL E INTERACCIONES ================= */}
        <Grid size={{ xs: 12, lg: 5 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#f8fafc', height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Historial de Seguimiento</Typography>
              <Button 
                startIcon={<AddCommentIcon />} 
                variant="contained" 
                size="small"
                sx={{ bgcolor: '#003366' }}
                onClick={() => setOpenNoteModal(true)}
              >
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
                      <Typography variant="caption" color="text.secondary">
                        {new Date(nota.fecha).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ mb: 1, whiteSpace: 'pre-line' }}>
                      {nota.observaciones}
                    </Typography>
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

      {/* ================= MODAL: AGREGAR NUEVA INTERACCIÓN ================= */}
      <Dialog open={openNoteModal} onClose={() => setOpenNoteModal(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 'bold', color: '#003366' }}>Registrar Interacción / Nota</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select fullWidth size="small" label="Tipo de Actividad"
                value={newNote.tipo}
                onChange={(e) => setNewNote({ ...newNote, tipo: e.target.value })}
              >
                {TIPOS_INTERACCION.map(tipo => <MenuItem key={tipo} value={tipo}>{tipo}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select fullWidth size="small" label="Estado del Contacto"
                value={newNote.estado_contacto}
                onChange={(e) => setNewNote({ ...newNote, estado_contacto: e.target.value as any })}
              >
                <MenuItem value="Contactado">Contactado con éxito</MenuItem>
                <MenuItem value="Contacto fallido">Contacto fallido / Número equivocado</MenuItem>
                <MenuItem value="No contactado">No contesta</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth multiline rows={4} label="Observaciones / Sentido del proceso" required
                placeholder="Escribe el resumen de la llamada o asesoría..."
                value={newNote.observaciones}
                onChange={(e) => setNewNote({ ...newNote, observaciones: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth size="small" label="Compromisos / Tareas pendientes (Opcional)"
                placeholder="Ej: Llamar en 15 días para confirmar recepción de poder"
                value={newNote.compromisos}
                onChange={(e) => setNewNote({ ...newNote, compromisos: e.target.value })}
              />
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
    </Box>
  );
};

export default VictimaDetalle;