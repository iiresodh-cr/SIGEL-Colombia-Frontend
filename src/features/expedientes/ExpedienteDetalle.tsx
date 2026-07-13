import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Divider, 
  Button, 
  CircularProgress, 
  List, 
  ListItem, 
  ListItemText, 
  Chip,
  IconButton 
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { jepService } from '../representados/jepService';
import { adminService } from '../admin/adminService';
import { FormVictima } from '../representados/FormVictima';
import { useModal } from '../../core/context/ModalContext';
import { useAuth } from '../../core/context/AuthContext';
import { Usuario } from '../../core/types/user';

const ExpedienteDetalle = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showModal } = useModal();
  const { currentUser, role } = useAuth();
  
  const [expediente, setExpediente] = useState<any>(null);
  const [victimas, setVictimas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVictimaForm, setShowVictimaForm] = useState(false);
  const [listaProfesionales, setListaProfesionales] = useState<{ abogados: Usuario[], psicosociales: Usuario[] }>({ 
    abogados: [], 
    psicosociales: [] 
  });

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const [expData, victimasData, profsData] = await Promise.all([
          jepService.getExpedienteById(id),
          jepService.getVictimas(id),
          adminService.getProfesionales()
        ]);
        setExpediente(expData);
        setVictimas(victimasData);
        setListaProfesionales(profsData);
      } catch (error) {
        console.error("Error:", error);
        showModal('Error', 'No se pudo cargar la información.', 'error');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, showModal]);

  const handleAddVictima = async (data: any) => {
    if (!id) return;
    try {
      await jepService.addVictima(id, data);
      const updated = await jepService.getVictimas(id);
      setVictimas(updated);
      setShowVictimaForm(false);
      showModal('Éxito', 'Víctima vinculada correctamente.', 'success');
    } catch (error) {
      showModal('Error', 'No se pudo registrar la víctima.', 'error');
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;
  if (!expediente) return <Box sx={{ p: 4 }}><Typography>Expediente no encontrado</Typography></Box>;

  return (
    <Box sx={{ p: 4 }}>
      <Button 
        startIcon={<ArrowBackIcon />} 
        onClick={() => navigate('/expedientes')}
        sx={{ mb: 3 }}
      >
        Volver al Listado
      </Button>

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: '1px solid #e2e8f0' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'flex-start' }}>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#003366' }}>
                  {expediente.codigoExpediente}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Registrado: {expediente.fechaRegistro ? new Date(expediente.fechaRegistro).toLocaleDateString() : 'N/A'}
                </Typography>
              </Box>
              <Chip label={expediente.estadoProcesal} color="primary" variant="outlined" sx={{ fontWeight: 600 }} />
            </Box>
            
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Macrocaso</Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>{expediente.macrocaso}</Typography>

            <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Resumen de los Hechos</Typography>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
              {expediente.resumenHechos}
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Víctimas Vinculadas</Typography>
              <IconButton color="primary" onClick={() => setShowVictimaForm(true)} size="small">
                <PersonAddIcon />
              </IconButton>
            </Box>

            {victimas.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', py: 2 }}>
                No hay víctimas registradas.
              </Typography>
            ) : (
              <List sx={{ bgcolor: 'white', borderRadius: 2, mb: 2 }}>
                {victimas.map((v) => (
                  <ListItem key={v.id} divider>
                    <ListItemText 
                      primary={v.nombreCompleto} 
                      secondary={`ID: ${v.documentoIdentidad}`} 
                    />
                  </ListItem>
                ))}
              </List>
            )}

            {showVictimaForm && (
              <Box sx={{ mt: 2 }}>
                <FormVictima 
                  onSave={handleAddVictima} 
                  onCancel={() => setShowVictimaForm(false)} 
                  profesionales={listaProfesionales}
                  currentUserRole={role || ''}
                  currentUserEmail={currentUser?.email || ''}
                />
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ExpedienteDetalle;