import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, TableHead, 
  TableRow, TextField, InputAdornment, Button, CircularProgress, Chip,
  Dialog, DialogContent
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { useNavigate } from 'react-router-dom';
import { jepService } from '../services/jepService';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import { Victima } from '../types/jep';
import { FormVictima } from '../components/FormVictima';

const Victimas = () => {
  const [victimas, setVictimas] = useState<Victima[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Estado para controlar si el modal de Nueva Víctima está abierto o cerrado
  const [openModalVictima, setOpenModalVictima] = useState(false);
  
  const navigate = useNavigate();
  const { currentUser, role } = useAuth();
  const { showModal } = useModal();

  const loadData = async () => {
    if (!currentUser?.uid || !role) return;
    try {
      setLoading(true);
      const tipoRol = (role === 'psicosocial') ? 'psicosocial' : 'abogado';
      const data = await jepService.getVictimasAsignadas(currentUser.uid, tipoRol);
      setVictimas(data);
    } catch (error) {
      console.error("Error al cargar la matriz de víctimas:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser, role]);

  // Función para guardar la nueva víctima en Firestore
  const handleCrearVictima = async (data: Omit<Victima, 'id' | 'fecha_registro'>) => {
    try {
      if (!currentUser?.uid) return;

      // Inyectamos el ID del usuario actual como el responsable asignado
      const victimaToSave = {
        ...data,
        representacion: {
          ...data.representacion,
          [role === 'psicosocial' ? 'psicosocial_asignado_id' : 'juridico_asignado_id']: currentUser.uid
        }
      };

      await jepService.createVictima(victimaToSave);
      showModal('Éxito', 'La víctima fue registrada y asignada a tu matriz correctamente.', 'success');
      setOpenModalVictima(false); // Cerramos el modal
      await loadData(); // Recargamos la tabla para que aparezca la nueva víctima
    } catch (error) {
      console.error("Error al guardar la víctima:", error);
      showModal('Error', 'Hubo un problema de conexión al intentar guardar.', 'error');
    }
  };

  const filteredData = victimas.filter(v => 
    v.nombre_completo.toLowerCase().includes(search.toLowerCase()) ||
    v.identificacion.includes(search) ||
    (v.representacion.bloque && v.representacion.bloque.join(', ').toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#003366' }}>
            Matriz de Seguimiento
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Casos activos asignados a tu perfil
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField 
            size="small"
            placeholder="Buscar por nombre, cédula o bloque..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: 320, bgcolor: 'white' }}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
              }
            }}
          />
          <Button 
            variant="contained" 
            startIcon={<PersonAddIcon />}
            sx={{ bgcolor: '#003366', '&:hover': { bgcolor: '#002244' } }}
            onClick={() => setOpenModalVictima(true)} 
          >
            Nueva Víctima
          </Button>
        </Box>
      </Box>

      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#f8fafc' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Nombre Completo</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Identificación</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Casos / Bloques</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Estado JEP</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  No tienes víctimas asignadas o ninguna coincide con tu búsqueda.
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((victima) => (
                <TableRow key={victima.id} hover>
                  <TableCell sx={{ fontWeight: 700, color: '#003366' }}>
                    {victima.nombre_completo}
                  </TableCell>
                  <TableCell>{victima.tipo_documento} {victima.identificacion}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {victima.representacion.caso.map(c => (
                        <Chip key={c} label={c} size="small" sx={{ bgcolor: '#e0e7ff', color: '#3730a3', fontWeight: 600, fontSize: '0.7rem' }} />
                      ))}
                      {victima.representacion.bloque.map(b => (
                        <Chip key={b} label={b} size="small" variant="outlined" sx={{ fontWeight: 600, fontSize: '0.7rem' }} />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={victima.estado_jep.estado_acreditacion} 
                      size="small" 
                      color={victima.estado_jep.estado_acreditacion === 'Acreditada' ? 'success' : 'warning'}
                      variant={victima.estado_jep.estado_acreditacion === 'Acreditada' ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Button 
                      startIcon={<VisibilityIcon />}
                      size="small"
                      onClick={() => navigate(`/victimas/${victima.id}`)}
                      sx={{ textTransform: 'none' }}
                    >
                      Ver Perfil
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* ================= MODAL DE NUEVA VÍCTIMA ================= */}
      <Dialog 
        open={openModalVictima} 
        onClose={() => setOpenModalVictima(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogContent sx={{ p: 0, bgcolor: '#f8fafc' }}>
          <FormVictima 
            onSave={handleCrearVictima} 
            onCancel={() => setOpenModalVictima(false)} 
          />
        </DialogContent>
      </Dialog>

    </Box>
  );
};

export default Victimas;