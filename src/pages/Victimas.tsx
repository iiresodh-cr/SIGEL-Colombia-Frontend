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
import { adminService } from '../services/adminService';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import { Victima } from '../types/jep';
import { Usuario } from '../types/user';
import { FormVictima } from '../components/FormVictima';

const Victimas = () => {
  const [victimas, setVictimas] = useState<Victima[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [openModalVictima, setOpenModalVictima] = useState(false);
  
  // Aquí declaramos explícitamente los tipos para evitar el error de "never[]"
  const [listaProfesionales, setListaProfesionales] = useState<{ abogados: Usuario[], psicosociales: Usuario[] }>({ 
    abogados: [], 
    psicosociales: [] 
  });
  
  const navigate = useNavigate();
  const { currentUser, role } = useAuth();
  const { showModal } = useModal();

  const loadData = async () => {
    if (!currentUser?.uid || !role) return;
    try {
      setLoading(true);
      const tipoRol = (role === 'psicosocial') ? 'psicosocial' : 'abogado';
      
      const [data, profs] = await Promise.all([
        jepService.getVictimasAsignadas(currentUser.uid, tipoRol),
        adminService.getProfesionales()
      ]);

      setVictimas(data);
      setListaProfesionales(profs);
    } catch (error) {
      console.error("Error al cargar datos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser, role]);

  const handleCrearVictima = async (data: Omit<Victima, 'id' | 'fecha_registro'>) => {
    try {
      await jepService.createVictima(data);
      showModal('Éxito', 'La víctima fue registrada y asignada correctamente.', 'success');
      setOpenModalVictima(false);
      await loadData();
    } catch (error) {
      console.error("Error al guardar:", error);
      showModal('Error', 'Hubo un problema al guardar la víctima.', 'error');
    }
  };

  const filteredData = victimas.filter(v => 
    v.nombre_completo.toLowerCase().includes(search.toLowerCase()) ||
    v.identificacion.includes(search)
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
            Casos activos bajo tu responsabilidad
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField 
            size="small"
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: 250, bgcolor: 'white' }}
            slotProps={{
              input: { startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }
            }}
          />
          <Button 
            variant="contained" 
            startIcon={<PersonAddIcon />}
            sx={{ bgcolor: '#003366' }}
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
              <TableCell sx={{ fontWeight: 'bold' }}>Macrocaso</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Estado JEP</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredData.map((v) => (
              <TableRow key={v.id} hover>
                <TableCell sx={{ fontWeight: 700, color: '#003366' }}>{v.nombre_completo}</TableCell>
                <TableCell>{v.identificacion}</TableCell>
                <TableCell>
                    {v.representacion.caso.map(c => <Chip key={c} label={c} size="small" sx={{ mr: 0.5 }} />)}
                </TableCell>
                <TableCell>
                  <Chip label={v.estado_jep.estado_acreditacion} size="small" color="primary" variant="outlined" />
                </TableCell>
                <TableCell align="right">
                  <Button size="small" onClick={() => navigate(`/victimas/${v.id}`)}>Ver Perfil</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={openModalVictima} onClose={() => setOpenModalVictima(false)} maxWidth="md" fullWidth>
        <DialogContent sx={{ p: 0, bgcolor: '#f8fafc' }}>
          <FormVictima 
            onSave={handleCrearVictima} 
            onCancel={() => setOpenModalVictima(false)} 
            profesionales={listaProfesionales}
            currentUserRole={role || ''}
            currentUserId={currentUser?.uid || ''}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Victimas;