import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Button, Table, TableBody, TableCell, 
  TableHead, TableRow, CircularProgress, Chip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Grid,
  FormControl, InputLabel, Select, OutlinedInput
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import GavelIcon from '@mui/icons-material/Gavel';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import { audienciaService } from '../services/audienciaService';
import { Audiencia, TipoAudiencia, DespachoJEP } from '../types/audiencia';

const TIPOS_AUDIENCIA: TipoAudiencia[] = ['Versión Voluntaria', 'Audiencia de Observaciones', 'Audiencia de Reconocimiento', 'Diligencia de Testimonio', 'Mesa de Trabajo JEP', 'Otra'];
const DESPACHOS: DespachoJEP[] = ['SRVR', 'Sala de Amnistía', 'Sala de Definición', 'Sección de Primera Instancia', 'Sección de Apelación', 'UIA'];
const MACROCASOS = ['Caso 01', 'Caso 10'];

const Audiencias = () => {
  const { currentUser, role } = useAuth();
  const { showModal } = useModal();
  
  const [audiencias, setAudiencias] = useState<Audiencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const isAdmin = role === 'admin' || role === 'superadmin';
  const canEdit = role !== 'lector';

  const [formData, setFormData] = useState<Partial<Audiencia>>({
    macrocaso: [],
    fecha: new Date().toISOString().split('T')[0],
    despacho: 'SRVR',
    tipo: 'Versión Voluntaria',
    titulo_diligencia: '',
    observaciones: '',
    profesionales_asistentes: ''
  });

  const loadAudiencias = async () => {
    try {
      setLoading(true);
      const data = await audienciaService.getAudiencias();
      setAudiencias(data);
    } catch (error) {
      console.error(error);
      showModal('Error', 'No se pudieron cargar las actuaciones judiciales.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAudiencias();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.email || !canEdit) return;

    if (!formData.macrocaso || formData.macrocaso.length === 0) {
      showModal('Falta Información', 'Debe seleccionar al menos un macrocaso.', 'error');
      return;
    }

    try {
      setSaving(true);
      const nuevaAudiencia: Omit<Audiencia, 'id'> = {
        macrocaso: formData.macrocaso,
        fecha: formData.fecha!,
        despacho: formData.despacho!,
        tipo: formData.tipo as TipoAudiencia,
        titulo_diligencia: formData.titulo_diligencia!,
        observaciones: formData.observaciones || '',
        profesionales_asistentes: formData.profesionales_asistentes || '',
        creado_por_email: currentUser.email,
        fecha_creacion: new Date().toISOString()
      };

      await audienciaService.addAudiencia(nuevaAudiencia);
      showModal('Éxito', 'Actuación judicial registrada correctamente.', 'success');
      setOpenForm(false);
      setFormData({ macrocaso: [], fecha: new Date().toISOString().split('T')[0], despacho: 'SRVR', tipo: 'Versión Voluntaria', titulo_diligencia: '', observaciones: '', profesionales_asistentes: '' });
      await loadAudiencias();
    } catch (error) {
      console.error(error);
      showModal('Error', 'No se pudo guardar la actuación judicial.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string, titulo: string) => {
    if (!isAdmin) return;
    showModal('¿Eliminar Registro?', `¿Estás seguro de eliminar el registro de "${titulo}"?`, 'confirm', async () => {
      try {
        await audienciaService.deleteAudiencia(id);
        showModal('Eliminado', 'El registro ha sido borrado.', 'success');
        await loadAudiencias();
      } catch (error) {
        showModal('Error', 'Hubo un problema al intentar borrar el registro.', 'error');
      }
    });
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#003366', display: 'flex', alignItems: 'center', gap: 1 }}>
            <GavelIcon fontSize="large" /> Actuaciones Judiciales
          </Typography>
          <Typography variant="body1" color="text.secondary">Registro de audiencias, versiones voluntarias y diligencias ante la JEP.</Typography>
        </Box>
        {canEdit && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenForm(true)} sx={{ height: 'fit-content', bgcolor: '#003366' }}>
            Nueva Actuación
          </Button>
        )}
      </Box>

      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0' }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: 'background.default' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Fecha</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Macrocaso</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Tipo y Despacho</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Diligencia</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Asistentes IIRESODH</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {audiencias.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3 }}>No hay actuaciones judiciales registradas.</TableCell></TableRow>
            ) : (
              audiencias.map((aud) => (
                <TableRow key={aud.id} hover>
                  <TableCell>{new Date(aud.fecha).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {aud.macrocaso.map(c => <Chip key={c} label={c} size="small" sx={{ bgcolor: '#e0e7ff', color: '#3730a3', fontWeight: 'bold' }} />)}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{aud.tipo}</Typography>
                    <Typography variant="caption" color="text.secondary">{aud.despacho}</Typography>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 500, maxWidth: 250 }}>{aud.titulo_diligencia}</TableCell>
                  <TableCell sx={{ fontSize: '0.85rem' }}>{aud.profesionales_asistentes}</TableCell>
                  <TableCell align="right">
                    {isAdmin && (
                      <IconButton color="error" size="small" onClick={() => handleDelete(aud.id!, aud.titulo_diligencia)}>
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

      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', color: '#003366' }}>Registrar Actuación Judicial</DialogTitle>
        <Box component="form" onSubmit={handleSave}>
          <DialogContent dividers>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Macrocaso(s) vinculados</InputLabel>
                  <Select
                    multiple
                    value={formData.macrocaso || []}
                    onChange={(e) => setFormData({ ...formData, macrocaso: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value })}
                    input={<OutlinedInput label="Macrocaso(s) vinculados" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(selected as string[]).map((value) => (
                          <Chip key={value} label={value} size="small" color="primary" />
                        ))}
                      </Box>
                    )}
                  >
                    {MACROCASOS.map((caso) => (
                      <MenuItem key={caso} value={caso}>{caso}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField 
                  fullWidth type="date" label="Fecha de la Diligencia" required 
                  slotProps={{ inputLabel: { shrink: true } }} 
                  value={formData.fecha} onChange={(e) => setFormData({ ...formData, fecha: e.target.value })} 
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField select fullWidth label="Despacho JEP" required value={formData.despacho} onChange={(e) => setFormData({ ...formData, despacho: e.target.value })}>
                  {DESPACHOS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                </TextField>
              </Grid>
              
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField select fullWidth label="Tipo de Actuación" required value={formData.tipo} onChange={(e) => setFormData({ ...formData, tipo: e.target.value as TipoAudiencia })}>
                  {TIPOS_AUDIENCIA.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 8 }}>
                <TextField fullWidth label="Título / Detalle de la Diligencia" required placeholder="Ej. Versión Voluntaria de..." value={formData.titulo_diligencia} onChange={(e) => setFormData({ ...formData, titulo_diligencia: e.target.value })} />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField fullWidth label="Profesionales del IIRESODH que asistieron" placeholder="Ej. Johana Merchán, Gabriela Ramírez" value={formData.profesionales_asistentes} onChange={(e) => setFormData({ ...formData, profesionales_asistentes: e.target.value })} />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField fullWidth multiline rows={3} label="Observaciones / Resumen" value={formData.observaciones} onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenForm(false)} color="secondary" disabled={saving}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={saving} sx={{ bgcolor: '#003366' }}>
              {saving ? 'Guardando...' : 'Guardar Actuación'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
};

export default Audiencias;