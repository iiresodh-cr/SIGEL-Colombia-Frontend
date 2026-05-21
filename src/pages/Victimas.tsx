import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, TableHead, 
  TableRow, TextField, InputAdornment, Button, Chip, IconButton, Skeleton,
  Grid, MenuItem, FormControl, InputLabel, Select
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import { useNavigate } from 'react-router-dom';
import { jepService } from '../services/jepService';
import { adminService } from '../services/adminService';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import { FormVictima } from '../components/FormVictima';
import { Victima } from '../types/jep';
import { Usuario } from '../types/user';

const CASOS_JEP = ['Caso 01', 'Caso 10'];
const BLOQUES_JEP = ['BNOR', 'BSUR', 'BORI', 'BCAR', 'BCC', 'BMM', 'BOCC'];

const Victimas = () => {
  const { role, currentUser } = useAuth();
  const navigate = useNavigate();
  const { showModal } = useModal();
  
  const [victimas, setVictimas] = useState<Victima[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [profesionales, setProfesionales] = useState<{ abogados: Usuario[], psicosociales: Usuario[] }>({ abogados: [], psicosociales: [] });

  const [search, setSearch] = useState('');
  const [filterCaso, setFilterCaso] = useState('');
  const [filterBloque, setFilterBloque] = useState('');
  const [filterAbogado, setFilterAbogado] = useState('');
  const [filterPsicosocial, setFilterPsicosocial] = useState('');

  const loadData = async () => {
    if (!currentUser?.email) return;
    try {
      setLoading(true);
      const data = await jepService.getVictimas();
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

  const handleClearFilters = () => {
    setSearch('');
    setFilterCaso('');
    setFilterBloque('');
    setFilterAbogado('');
    setFilterPsicosocial('');
  };

  const getProfesionalUI = (correoId: string, tipo: 'abogado' | 'psicosocial') => {
    if (!correoId || correoId.trim() === '') {
      return <Typography variant="caption" color="text.secondary"><i>Sin asignar</i></Typography>;
    }

    const lista = tipo === 'abogado' ? profesionales.abogados : profesionales.psicosociales;
    const prof = lista.find(p => p.correo.toLowerCase() === correoId.toLowerCase());

    if (prof) {
      return (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{prof.nombre_completo || 'Sin nombre'}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{prof.correo}</Typography>
        </Box>
      );
    }

    return (
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          {correoId.includes('ex_empleado') ? correoId.split('ex_empleado-')[1].split('@')[0].replace(/_/g, ' ') : correoId}
        </Typography>
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>{correoId}</Typography>
      </Box>
    );
  };

  const filtered = victimas.filter(v => {
    const matchSearch = v.nombre_completo.toLowerCase().includes(search.toLowerCase()) ||
                        v.identificacion.includes(search);
                        
    const matchCaso = filterCaso === '' || v.representacion?.caso?.includes(filterCaso);
    const matchBloque = filterBloque === '' || v.representacion?.bloque?.includes(filterBloque);
    const matchAbogado = filterAbogado === '' || v.representacion?.juridico_asignado_id?.toLowerCase() === filterAbogado.toLowerCase();
    const matchPsicosocial = filterPsicosocial === '' || v.representacion?.psicosocial_asignado_id?.toLowerCase() === filterPsicosocial.toLowerCase();

    return matchSearch && matchCaso && matchBloque && matchAbogado && matchPsicosocial;
  });

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
          <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Grid container spacing={2} sx={{ alignItems: 'center' }}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField 
                  fullWidth 
                  size="small"
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
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Macrocaso</InputLabel>
                  <Select value={filterCaso} label="Macrocaso" onChange={(e) => setFilterCaso(e.target.value)}>
                    <MenuItem value=""><em>Todos</em></MenuItem>
                    {CASOS_JEP.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Bloque</InputLabel>
                  <Select value={filterBloque} label="Bloque" onChange={(e) => setFilterBloque(e.target.value)}>
                    <MenuItem value=""><em>Todos</em></MenuItem>
                    {BLOQUES_JEP.map(b => <MenuItem key={b} value={b}>{b}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Abogado/a</InputLabel>
                  <Select value={filterAbogado} label="Abogado/a" onChange={(e) => setFilterAbogado(e.target.value)}>
                    <MenuItem value=""><em>Todos</em></MenuItem>
                    {profesionales.abogados.map(p => <MenuItem key={p.uid} value={p.correo}>{p.nombre_completo || p.correo}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Psicosocial</InputLabel>
                  <Select value={filterPsicosocial} label="Psicosocial" onChange={(e) => setFilterPsicosocial(e.target.value)}>
                    <MenuItem value=""><em>Todos</em></MenuItem>
                    {profesionales.psicosociales.map(p => <MenuItem key={p.uid} value={p.correo}>{p.nombre_completo || p.correo}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>

              {(search || filterCaso || filterBloque || filterAbogado || filterPsicosocial) && (
                <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'flex-end', mt: -1 }}>
                  <Button 
                    size="small" 
                    startIcon={<ClearAllIcon />} 
                    color="secondary" 
                    onClick={handleClearFilters}
                    sx={{ fontWeight: 'bold' }}
                  >
                    Limpiar Filtros
                  </Button>
                </Grid>
              )}
            </Grid>
          </Paper>

          <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
            <Table>
              {/* CORRECCIÓN: Etiqueta de cierre corregida de </Head> a </TableHead> */}
              <TableHead sx={{ bgcolor: 'background.default' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Víctima</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Identificación</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Abogado/a Responsable</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Psicosocial Responsable</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Macrocaso</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Estado JEP</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary' }}>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  Array.from(new Array(5)).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton variant="text" width="75%" height={24} /></TableCell>
                      <TableCell><Skeleton variant="text" width="55%" height={24} /></TableCell>
                      <TableCell><Skeleton variant="text" width="70%" height={24} /></TableCell>
                      <TableCell><Skeleton variant="text" width="70%" height={24} /></TableCell>
                      <TableCell><Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: 1 }} /></TableCell>
                      <TableCell><Skeleton variant="rectangular" width={85} height={24} sx={{ borderRadius: 1 }} /></TableCell>
                      <TableCell align="right"><Skeleton variant="circular" width={32} height={32} sx={{ display: 'inline-block' }} /></TableCell>
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No se encontraron víctimas con los criterios de búsqueda o filtrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((v) => (
                    <TableRow key={v.id} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{v.nombre_completo}</TableCell>
                      <TableCell>{v.identificacion}</TableCell>
                      <TableCell>{getProfesionalUI(v.representacion?.juridico_asignado_id, 'abogado')}</TableCell>
                      <TableCell>{getProfesionalUI(v.representacion?.psicosocial_asignado_id, 'psicosocial')}</TableCell>
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