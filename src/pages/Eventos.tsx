import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Button, Table, TableBody, TableCell, 
  TableHead, TableRow, CircularProgress, Chip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Grid
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EventIcon from '@mui/icons-material/Event';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import { eventoService } from '../services/eventoService';
import { Evento, TipoEvento } from '../types/evento';

const TIPOS_EVENTO: TipoEvento[] = ['Taller', 'Capacitación', 'Jornada de Divulgación', 'Actividad', 'Reunión'];

const Eventos = () => {
  const { currentUser, role } = useAuth();
  const { showModal } = useModal();
  
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const isAdmin = role === 'admin' || role === 'superadmin';
  const canEdit = role !== 'lector';

  const [formData, setFormData] = useState<Partial<Evento>>({
    tipo: 'Taller',
    tema_titulo: '',
    fecha: new Date().toISOString().split('T')[0],
    lugar: '',
    asistentes_total: 0,
    observaciones: ''
  });

  const loadEventos = async () => {
    try {
      setLoading(true);
      const data = await eventoService.getEventos();
      setEventos(data);
    } catch (error) {
      console.error(error);
      showModal('Error', 'No se pudieron cargar los eventos.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEventos();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.email || !canEdit) return;

    try {
      setSaving(true);
      const nuevoEvento: Omit<Evento, 'id'> = {
        tipo: formData.tipo as TipoEvento,
        tema_titulo: formData.tema_titulo!,
        fecha: formData.fecha!,
        lugar: formData.lugar!,
        asistentes_total: Number(formData.asistentes_total),
        observaciones: formData.observaciones || '',
        creado_por_email: currentUser.email,
        fecha_creacion: new Date().toISOString()
      };

      await eventoService.addEvento(nuevoEvento);
      showModal('Éxito', 'Evento registrado correctamente.', 'success');
      setOpenForm(false);
      setFormData({ tipo: 'Taller', tema_titulo: '', fecha: new Date().toISOString().split('T')[0], lugar: '', asistentes_total: 0, observaciones: '' });
      await loadEventos();
    } catch (error) {
      console.error(error);
      showModal('Error', 'No se pudo guardar el evento.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string, titulo: string) => {
    if (!isAdmin) return;
    showModal('¿Eliminar Evento?', `¿Estás seguro de que deseas eliminar el evento "${titulo}"? Esta acción no se puede deshacer.`, 'confirm', async () => {
      try {
        await eventoService.deleteEvento(id);
        showModal('Eliminado', 'El evento ha sido borrado del sistema.', 'success');
        await loadEventos();
      } catch (error) {
        showModal('Error', 'Hubo un problema al intentar borrar el evento.', 'error');
      }
    });
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
            <EventIcon fontSize="large" /> Gestión de Eventos y Actividades
          </Typography>
          <Typography variant="body1" color="text.secondary">Registro institucional de talleres, reuniones y jornadas de divulgación.</Typography>
        </Box>
        {canEdit && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenForm(true)} sx={{ height: 'fit-content' }}>
            Nuevo Evento
          </Button>
        )}
      </Box>

      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0' }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: 'background.default' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Fecha</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Tipo</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Tema / Título</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Lugar</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Asistentes</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {eventos.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3 }}>No hay eventos registrados en el sistema.</TableCell></TableRow>
            ) : (
              eventos.map((evento) => (
                <TableRow key={evento.id} hover>
                  <TableCell>{new Date(evento.fecha).toLocaleDateString()}</TableCell>
                  <TableCell><Chip label={evento.tipo} size="small" color="primary" variant="outlined" /></TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{evento.tema_titulo}</TableCell>
                  <TableCell>{evento.lugar}</TableCell>
                  <TableCell>{evento.asistentes_total}</TableCell>
                  <TableCell align="right">
                    {isAdmin && (
                      <IconButton color="error" size="small" onClick={() => handleDelete(evento.id!, evento.tema_titulo)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* Modal de Registro */}
      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', color: 'primary.main' }}>Registrar Nuevo Evento</DialogTitle>
        <Box component="form" onSubmit={handleSave}>
          <DialogContent dividers>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <TextField select fullWidth label="Tipo de Evento" required value={formData.tipo} onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}>
                  {TIPOS_EVENTO.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} md={8}>
                <TextField fullWidth label="Tema o Título del Evento" required value={formData.tema_titulo} onChange={(e) => setFormData({ ...formData, tema_titulo: e.target.value })} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth type="date" label="Fecha" required InputLabelProps={{ shrink: true }} value={formData.fecha} onChange={(e) => setFormData({ ...formData, fecha: e.target.value })} />
              </Grid>
              <Grid item xs={12} md={5}>
                <TextField fullWidth label="Lugar (Municipio, Vereda, Sede)" required value={formData.lugar} onChange={(e) => setFormData({ ...formData, lugar: e.target.value })} />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth type="number" label="Total Asistentes" required inputProps={{ min: 0 }} value={formData.asistentes_total} onChange={(e) => setFormData({ ...formData, asistentes_total: parseInt(e.target.value) || 0 })} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth multiline rows={3} label="Observaciones / Conclusiones" value={formData.observaciones} onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenForm(false)} color="secondary" disabled={saving}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar Evento'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
};

export default Eventos;