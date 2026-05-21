import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, TableHead, 
  TableRow, TextField, InputAdornment, Button, Chip, IconButton, Skeleton
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useNavigate } from 'react-router-dom';
import { jepService } from '../services/jepService';
import { adminService } from '../services/adminService';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import { FormVictima } from '../components/FormVictima';
import { Victima } from '../types/jep';
import { Usuario } from '../types/user';

const Victimas = () => {
  const { role, currentUser } = useAuth();
  const navigate = useNavigate();
  const { showModal } = useModal();
  
  const [victimas, setVictimas] = useState<Victima[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [profesionales, setProfesionales] = useState<{ abogados: Usuario[], psicosociales: Usuario[] }>({ abogados: [], psicosociales: [] });

  const loadData = async () => {
    if (!currentUser?.email) return;
    try {
      setLoading(true);
      const isAltRole = role === 'admin' || role === 'superadmin';
      
      let data;
      if (isAltRole) {
        data = await jepService.getVictimas();
      } else {
        const rolTipo = role === 'psicosocial' ? 'psicosocial' : 'abogado';
        data = await jepService.getVictimasAsignadas(currentUser, rolTipo);
      }

      const profs = await adminService.getProfesionales();
      setVictimas(data);
      setProfesionales(profs);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser, role]);

  const handleSave = async (data: any) => {
    try {
      await jepService.createVictima(data);
      showModal('Éxito', 'Víctima registrada correctamente.', 'success');
      setShowForm(false);
      loadData();
    } catch (error) {
      showModal('Error', 'No se pudo registrar la víctima.', 'error');
    }
  };

  // Función relacional optimizada: cruza directamente por string de correo homologado
  const getResponsableUI = (v: Victima) => {
    const asignadoId = v.representacion?.juridico_asignado_id || v.representacion?.psicosocial_asignado_id;
    if (!asignadoId) {
      return <Typography variant="caption" color="text.secondary">Sin asignar</Typography>;
    }

    const prof = profesionales.abogados.find(p => p.correo === asignadoId) || 
                 profesionales.psicosociales.find(p => p.correo === asignadoId);

    if (prof) {
      return (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{prof.nombre_completo || 'Sin nombre'}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{prof.correo}</Typography>
        </Box>
      );
    }

    return <Typography variant="caption" color="text.secondary">{asignadoId}</Typography>;
  };

  const filtered = victimas.filter(v => 
    v.nombre_completo.toLowerCase().includes(search.toLowerCase()) ||
    v.identificacion.includes(search)
  );

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main' }}>Matriz de Víctimas</Typography>
          <Typography variant="body1" color="text.secondary">Base de datos de representación institucional.</Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />} 
          color="primary"
          onClick={() => setShowForm(true)}
        >
          Nuevo Registro
        </Button>
      </Box>

      {showForm ? (
        <Box sx={{ mb: 4 }}>
          <FormVictima 
            onSave={handleSave} 
            onCancel={() => setShowForm(false)} 
            profesionales={profesionales}
            currentUserRole={role || ''}
            currentUserEmail={currentUser?.email || ''} 
          />
        </Box>
      ) : (
        <>
          <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <TextField 
              fullWidth 
              placeholder="Buscar por nombre o identificación..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Paper>

          <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
            <Table>
              <TableHead sx={{ bgcolor: 'background.default' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Víctima</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Identificación</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Responsable (Abogado/Psicosocial)</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Macrocaso</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Estado JEP</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary' }}>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  // PLACEHOLDERS INTELIGENTES: Skeletons fluidos adaptados a la forma de la tabla
                  Array.from(new Array(5)).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton variant="text" width="70%" height={24} /></TableCell>
                      <TableCell><Skeleton variant="text" width="50%" height={24} /></TableCell>
                      <TableCell><Skeleton variant="text" width="60%" height={24} /></TableCell>
                      <TableCell><Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: 1 }} /></TableCell>
                      <TableCell><Skeleton variant="rectangular" width={80} height={24} sx={{ borderRadius: 1 }} /></TableCell>
                      <TableCell align="right"><Skeleton variant="circular" width={32} height={32} sx={{ display: 'inline-block' }} /></TableCell>
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No se encontraron víctimas con los criterios de búsqueda.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((v) => (
                    <TableRow key={v.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{v.nombre_completo}</TableCell>
                      <TableCell>{v.identificacion}</TableCell>
                      <TableCell>{getResponsableUI(v)}</TableCell>
                      <TableCell>
                        {v.representacion.caso.map((c: string) => <Chip key={c} label={c} size="small" sx={{ mr: 0.5 }} />)}
                      </TableCell>
                      <TableCell>
                        <Chip label={v.estado_jep.estado_acreditacion} size="small" variant="outlined" color="primary" />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton color="primary" onClick={() => navigate(`/victimas/${v.id}`)}>
                          <VisibilityIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}
    </Box>
  );
};

export default Victimas;