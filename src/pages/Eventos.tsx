import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, TableHead, 
  TableRow, Button, CircularProgress, Chip, Dialog, DialogContent 
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import AddIcon from '@mui/icons-material/Add'; // Cambiado al ícono clásico que nunca falla
import { jepService } from '../services/jepService';
import { useModal } from '../context/ModalContext';
import { Evento } from '../types/jep';
import { FormEvento } from '../components/FormEvento';

const Eventos = () => {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const { showModal } = useModal();

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await jepService.getEventosProximos();
      setEventos(data);
    } catch (error) {
      console.error("Error cargando eventos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCrearEvento = async (data: Omit<Evento, 'id'>) => {
    try {
      await jepService.createEvento(data);
      showModal('Éxito', 'El evento fue registrado en el sistema.', 'success');
      setOpenModal(false);
      await loadData();
    } catch (error) {
      console.error("Error al guardar evento:", error);
      showModal('Error', 'Hubo un problema de conexión al intentar guardar.', 'error');
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#003366' }}>
            Agenda de Actividades
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Talleres, audiencias y jornadas de divulgación
          </Typography>
        </Box>
        
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          sx={{ bgcolor: '#003366', '&:hover': { bgcolor: '#002244' } }}
          onClick={() => setOpenModal(true)} 
        >
          Registrar Actividad
        </Button>
      </Box>

      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#f8fafc' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Fecha</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Tipo</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Tema / Título</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Modalidad</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Casos</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {eventos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  No hay eventos registrados actualmente.
                </TableCell>
              </TableRow>
            ) : (
              eventos.map((evento) => (
                <TableRow key={evento.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{new Date(evento.fecha_inicio).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Chip icon={<EventIcon />} label={evento.tipo} size="small" variant="outlined" color="primary" />
                  </TableCell>
                  <TableCell sx={{ color: '#003366', fontWeight: 500 }}>{evento.titulo}</TableCell>
                  <TableCell>{evento.modalidad}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {evento.casos.map(c => <Chip key={c} label={c} size="small" sx={{ fontSize: '0.7rem' }} />)}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="md" fullWidth>
        <DialogContent sx={{ p: 0, bgcolor: '#f8fafc' }}>
          <FormEvento onSave={handleCrearEvento} onCancel={() => setOpenModal(false)} />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Eventos;