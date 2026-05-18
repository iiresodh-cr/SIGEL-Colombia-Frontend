import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Grid, Paper, CircularProgress, TextField, 
  InputAdornment, Table, TableBody, TableCell, TableHead, TableRow, 
  Chip, Button, useTheme
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import FolderIcon from '@mui/icons-material/Folder';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { jepService } from '../services/jepService';
import { adminService } from '../services/adminService';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Victima } from '../types/jep';
import { Usuario } from '../types/user';

const Dashboard = () => {
  const { currentUser, role } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  
  const [stats, setStats] = useState({ total: 0, caso01: 0, caso10: 0, acreditadas: 0 });
  const [victimasList, setVictimasList] = useState<Victima[]>([]);
  const [profesionales, setProfesionales] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const isAdmin = role === 'admin' || role === 'superadmin';

  const loadData = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      
      if (isAdmin) {
        const [globalStats, snapVictimas, snapUsers] = await Promise.all([
          adminService.getGlobalStats(),
          getDocs(query(collection(db, 'victimas'))),
          adminService.getAllUsers()
        ]);

        const victimasData = snapVictimas.docs.map(doc => ({ id: doc.id, ...doc.data() } as Victima));

        setStats({
          total: globalStats.totalVictimas,
          caso01: globalStats.totalCaso01,
          caso10: globalStats.totalCaso10,
          acreditadas: victimasData.filter(v => v.estado_jep?.estado_acreditacion === 'Acreditada').length 
        });

        setVictimasList(victimasData);
        setProfesionales(snapUsers);

      } else {
        const rolBusqueda = role === 'psicosocial' ? 'psicosocial' : 'abogado';
        
        const data = await jepService.getVictimasAsignadas(currentUser, rolBusqueda);
        
        setStats({
          total: data.length,
          caso01: data.filter(v => v.representacion?.caso?.includes('Caso 01')).length,
          caso10: data.filter(v => v.representacion?.caso?.includes('Caso 10')).length,
          acreditadas: data.filter(v => v.estado_jep?.estado_acreditacion === 'Acreditada').length
        });
        setVictimasList(data);
      }
    } catch (error) {
      console.error("Error Dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser, role, isAdmin]);

  const getNombreProfesional = (id: string) => {
    if (!id || id === "") return 'Sin asignar';
    const cleanId = id.toLowerCase();
    
    const prof = profesionales.find(u => 
      u.correo.toLowerCase() === cleanId || 
      u.uid === id || 
      u.correo.split('@')[0].toLowerCase() === cleanId
    );
    
    return prof ? (prof.nombre_completo || prof.correo) : id;
  };

  // NUEVA LÓGICA DE BÚSQUEDA:
  // Si el buscador está vacío, devuelve un arreglo vacío para no mostrar resultados random.
  // Si tiene texto, busca sin límite artificial de cantidad.
  const filtered = search.trim() === '' 
    ? [] 
    : victimasList.filter(v => 
        v.nombre_completo.toLowerCase().includes(search.toLowerCase()) ||
        v.identificacion.includes(search)
      );

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ mb: 1 }}>
          {isAdmin ? "Control Maestro de Casos" : "Mi Panel de Trabajo"}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {isAdmin 
            ? "Gestión global de la representación IIRESODH." 
            : `Bienvenido/a. Tienes ${stats.total} víctimas asignadas.`}
        </Typography>
      </Box>

      {/* TARJETAS DE ESTADÍSTICAS */}
      <Grid container spacing={3} sx={{ mb: 6 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ p: 3, display: 'flex', alignItems: 'center', border: '1px solid', borderColor: 'divider' }}>
            <PeopleIcon sx={{ fontSize: 40, color: theme.palette.primary.main, mr: 2 }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: theme.palette.text.primary }}>{stats.total}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>VÍCTIMAS TOTALES</Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ p: 3, display: 'flex', alignItems: 'center', border: '1px solid', borderColor: 'divider' }}>
            <FolderIcon sx={{ fontSize: 40, color: theme.palette.warning.main, mr: 2 }} />
            <Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: theme.palette.text.primary }}>
                  {stats.caso01} <Typography component="span" variant="caption" color="text.secondary">C01</Typography>
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: theme.palette.text.primary }}>
                  {stats.caso10} <Typography component="span" variant="caption" color="text.secondary">C10</Typography>
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>DISTRIBUCIÓN JEP</Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ p: 3, display: 'flex', alignItems: 'center', border: '1px solid', borderColor: 'divider' }}>
            <AssignmentTurnedInIcon sx={{ fontSize: 40, color: theme.palette.secondary.main, mr: 2 }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: theme.palette.text.primary }}>{stats.acreditadas}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>ACREDITADAS EN JEP</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5">
            {isAdmin ? "Buscador para Reasignación" : "Listado de mis Víctimas"}
          </Typography>
          <TextField 
            size="small"
            placeholder="Buscar por nombre o ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: 350, bgcolor: 'background.paper' }}
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
        </Box>

        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          <Table>
            <TableHead sx={{ bgcolor: 'background.default' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Víctima</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>{isAdmin ? "Abogado/a Actual" : "Estado Acreditación"}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary' }}>Acción</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {search.trim() === '' ? (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    <Typography variant="body1">Utiliza el buscador de arriba para encontrar un caso específico.</Typography>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    <Typography variant="body1">No hay registros que coincidan con tu búsqueda.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((v) => (
                  <TableRow key={v.id} hover>
                    <TableCell>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>{v.nombre_completo}</Typography>
                      <Typography variant="body2" color="text.secondary">ID: {v.identificacion}</Typography>
                    </TableCell>
                    <TableCell>
                      {isAdmin ? (
                        <Chip label={getNombreProfesional(v.representacion?.juridico_asignado_id)} size="small" variant="outlined" />
                      ) : (
                        <Chip 
                          label={v.estado_jep?.estado_acreditacion || 'No está acreditada'} 
                          size="small" 
                          color={v.estado_jep?.estado_acreditacion === 'Acreditada' ? 'primary' : 'default'}
                          variant="outlined" 
                        />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Button 
                        variant="contained" 
                        size="small" 
                        color={isAdmin ? "secondary" : "primary"}
                        startIcon={<VisibilityIcon />}
                        onClick={() => navigate(`/victimas/${v.id}`)}
                      >
                        {isAdmin ? "Reasignar" : "Ver Perfil"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Paper>
      </Box>
    </Box>
  );
};

export default Dashboard;