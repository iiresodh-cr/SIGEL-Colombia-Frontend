import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Button, Table, TableBody, TableCell, 
  TableHead, TableRow, CircularProgress, Chip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Grid,
  FormControl, InputLabel, Select, OutlinedInput
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import { radicadoService } from '../services/radicadoService';
import { Radicado, EmisorRadicado } from '../types/radicado';

const EMISORES: EmisorRadicado[] = ['JEP (SRVR)', 'JEP (Sala de Amnistía)', 'JEP (Sala de Definición)', 'JEP (UIA)', 'IIRESODH', 'Representación de Víctimas', 'Defensa', 'Otro'];
const MACROCASOS = ['Caso 01', 'Caso 10', 'Institucional / Otro'];

const Radicados = () => {
  const { currentUser, role } = useAuth();
  const { showModal } = useModal();
  
  const [radicados, setRadicados] = useState<Radicado[]>([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const isAdmin = role === 'admin' || role === 'superadmin';
  const canEdit = role !== 'lector';

  const [formData, setFormData] = useState<Partial<Radicado>>({
    numero_radicado: '',
    fecha_radicado: new Date().toISOString().split('T')[0],
    asunto: '',
    emisor: 'JEP (SRVR)',
    receptor: 'IIRESODH',
    macrocaso: [],
    observaciones: ''
  });

  const loadRadicados = async () => {
    try {
      setLoading(true);
      const data = await radicadoService.getRadicados();
      setRadicados(data);
    } catch (error) {
      console.error(error);
      showModal('Error', 'No se pudieron cargar los radicados.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRadicados();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.email || !canEdit) return;

    if (!formData.macrocaso || formData.macrocaso.length === 0) {
      showModal('Falta Información', 'Debe seleccionar al menos un macrocaso o categoría.', 'error');
      return;
    }

    try {
      setSaving(true);
      const nuevoRadicado: Omit<Radicado, 'id'> = {
        numero_radicado: formData.numero_radicado!,
        fecha_radicado: formData.fecha_radicado!,
        asunto: formData.asunto!,
        emisor: formData.emisor as EmisorRadicado,
        receptor: formData.receptor!,
        macrocaso: formData.macrocaso,
        observaciones: formData.observaciones || '',
        creado_por_email: currentUser.email,
        fecha_creacion: new Date().toISOString()
      };

      await radicadoService.addRadicado(nuevoRadicado);
      showModal('Éxito', 'Documento radicado correctamente en el sistema.', 'success');
      setOpenForm(false);
      setFormData({ numero_radicado: '', fecha_radicado: new Date().toISOString().split('T')[0], asunto: '', emisor: 'JEP (SRVR)', receptor: 'IIRESODH', macrocaso: [], observaciones: '' });
      await loadRadicados();
    } catch (error) {
      console.error(error);
      showModal('Error', 'No se pudo guardar el documento.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string, numero: string) => {
    if (!isAdmin) return;
    showModal('¿Eliminar Radicado?', `¿Estás seguro de eliminar el registro del radicado "${numero}"?`, 'confirm', async () => {
      try {
        await radicadoService.deleteRadicado(id);
        showModal('Eliminado', 'El radicado ha sido borrado.', 'success');
        await loadRadicados();
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
            <FolderSpecialIcon fontSize="large" /> Control de Radicados
          </Typography>
          <Typography variant="body1" color="text.secondary">Libro digital de oficios, autos y documentos legales entrantes/salientes.</Typography>
        </Box>
        {canEdit && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenForm(true)} sx={{ height: 'fit-content', bgcolor: '#003366' }}>
            Nuevo Documento
          </Button>
        )}
      </Box>

      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0' }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: 'background.default' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Fecha</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>N° Radicado / Auto</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Emisor</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Asunto</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Macrocaso</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {radicados.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3 }}>No hay documentos radicados en el sistema.</TableCell></TableRow>
            ) : (
              radicados.map((doc) => (
                <TableRow key={doc.id} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{new Date(doc.fecha_radicado).toLocaleDateString()}</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#003366' }}>{doc.numero_radicado}</TableCell>
                  <TableCell>{doc.emisor}</TableCell>
                  <TableCell sx={{ maxWidth: 300 }}>{doc.asunto}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {doc.macrocaso.map(c => <Chip key={c} label={c} size="small" variant="outlined" sx={{ fontWeight: 'bold' }} />)}
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    {isAdmin && (
                      <IconButton color="error" size="small" onClick={() => handleDelete(doc.id!, doc.numero_radicado)}>
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
        <DialogTitle sx={{ fontWeight: 'bold', color: '#003366' }}>Registrar Documento</DialogTitle>
        <Box component="form" onSubmit={handleSave}>
          <DialogContent dividers>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField 
                  fullWidth label="N° de Radicado o Auto" required 
                  placeholder="Ej. Auto SRVR-01..."
                  value={formData.numero_radicado} 
                  onChange={(e) => setFormData({ ...formData, numero_radicado: e.target.value })} 
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField 
                  fullWidth type="date" label="Fecha del Documento" required 
                  slotProps={{ inputLabel: { shrink: true } }} 
                  value={formData.fecha_radicado} 
                  onChange={(e) => setFormData({ ...formData, fecha_radicado: e.target.value })} 
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth size="medium">
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

              <Grid size={{ xs: 12, md: 6 }}>
                <TextField select fullWidth label="Emisor (Quién envía)" required value={formData.emisor} onChange={(e) => setFormData({ ...formData, emisor: e.target.value as EmisorRadicado })}>
                  {EMISORES.map(e => <MenuItem key={e} value={e}>{e}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth label="Receptor (A quién va dirigido)" required value={formData.receptor} onChange={(e) => setFormData({ ...formData, receptor: e.target.value })} />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField fullWidth label="Asunto o Resumen Breve" required value={formData.asunto} onChange={(e) => setFormData({ ...formData, asunto: e.target.value })} />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField fullWidth multiline rows={3} label="Observaciones Adicionales" value={formData.observaciones} onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenForm(false)} color="secondary" disabled={saving}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={saving} sx={{ bgcolor: '#003366' }}>
              {saving ? 'Guardando...' : 'Radicar Documento'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
};

export default Radicados;