import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Grid, Paper, CircularProgress, TextField, 
  InputAdornment, Table, TableBody, TableCell, TableHead, TableRow, 
  IconButton, Chip, Button 
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
  
  const [stats, setStats] = useState({ total: 0, caso01: 0, caso10: 0, acreditadas: 0 });
  const [victimasGlobales, setVictimasGlobales] = useState<Victima[]>([]);
  const [profesionales, setProfesionales] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const isAdmin = role === 'admin' || role === 'superadmin';

  const loadData = async () => {
    if (!currentUser?.uid) return;
    try {
      setLoading(true);
      
      if (isAdmin) {
        // Carga de datos globales para el Administrador
        const [globalStats, snapVictimas, snapUsers] = await Promise.all([
          adminService.getGlobalStats(),
          getDocs(query(collection(db, 'victimas'))),
          adminService.getAllUsers()
        ]);

        setStats({
          total: globalStats.totalVictimas,
          caso01: globalStats.totalCaso01,
          caso10: globalStats.totalCaso10,
          acreditadas: 0 
        });

        setVictimasGlobales(snapVictimas.docs.map(doc => ({ id: doc.id, ...doc.data() } as Victima)));
        setProfesionales(snapUsers);

      } else {
        // Carga de datos individuales para Abogados/Psicosociales
        const rolBusqueda = role === 'psicosocial' ? 'psicosocial' : 'abogado';
        const victimas = await jepService.getVictimasAsignadas(currentUser.uid, rolBusqueda);
        
        setStats({
          total: victimas.length,
          caso01: victimas.filter(v => v.representacion.caso.includes('Caso 01')).length,
          caso10: victimas.filter(v => v.representacion.caso.includes('Caso 10')).length,
          acreditadas: victimas.filter(v => v.estado_jep.estado_acreditacion === 'Acreditada').length
        });
      }
    } catch (error) {
      console.error("Error al cargar Dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser, role, isAdmin]);

  const getNombreProfesional = (id: string) => {
    const prof = profesionales.find(u => u.uid === id);
    return prof ? (prof.nombre_completo || prof.correo) : 'Sin asignar';
  };

  const victimasFiltradas = victimasGlobales.filter(v => 
    v.nombre_completo.toLowerCase().includes(search.toLowerCase()) ||
    v.identificacion.includes(search)
  ).slice(0, 10);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 800, color: '#003366', mb: 1 }}>¡Hola!</Typography>
        <Typography variant="h6" sx={{ color: '#003366', mb: 1, fontWeight: 500 }}>{currentUser?.email}</Typography>
        <Typography variant="body1" color="text.secondary">
          {isAdmin ? "Resumen global y control maestro de casos del IIRESODH." : "Resumen de tu carga de trabajo actual."}
        </Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 6 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ p: 3, display: 'flex', alignItems: 'center', borderRadius: 3, bgcolor: '#f0f9ff', border: '1px solid #e0f2fe' }}>
            <PeopleIcon sx={{ fontSize: 40, color: '#0369a1', mr: 2 }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>{stats.total}</Typography>
              <Typography variant="body2" color="text.secondary">{isAdmin ? "VÍCTIMAS TOTALES" : "VÍCTIMAS ASIGNADAS"}</Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ p: 3, display: 'flex', alignItems: 'center', borderRadius: 3, bgcolor: '#fdf2f8', border: '1px solid #fce7f3' }}>
            <FolderIcon sx={{ fontSize: 40, color: '#be185d', mr: 2 }} />
            <Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#be185d' }}>{stats.caso01} <Typography component="span" variant="caption">C01</Typography></Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#be185d' }}>{stats.caso10} <Typography component="span" variant="caption">C10</Typography></Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">POR MACROCASO</Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ p: 3, display: 'flex', alignItems: 'center', borderRadius: 3, bgcolor: '#f0fdf4', border: '1px solid #dcfce7' }}>
            <AssignmentTurnedInIcon sx={{ fontSize: 40, color: '#15803d', mr: 2 }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>{stats.acreditadas}</Typography>
              <Typography variant="body2" color="text.secondary">ACREDITADAS JEP</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {isAdmin && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#003366' }}>Buscador para Reasignación</Typography>
            <TextField 
              size="small"
              placeholder="Buscar por nombre o cédula..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ width: 350, bgcolor: 'white' }}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> } }}
            />
          </Box>

          <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <Table>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Víctima</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Abogado Asignado</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Acción</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {victimasFiltradas.map((v) => (
                  <TableRow key={v.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{v.nombre_completo}</Typography>
                      <Typography variant="caption" color="text.secondary">CC: {v.identificacion}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={getNombreProfesional(v.representacion.juridico_asignado_id)} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell align="right">
                      <Button 
                        variant="contained" 
                        size="small" 
                        color="warning"
                        startIcon={<VisibilityIcon />}
                        onClick={() => navigate(`/victimas/${v.id}`)}
                      >
                        Reasignar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Box>
      )}

      {!isAdmin && (
        <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            En próximas actualizaciones aquí verás tu agenda institucional.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default Dashboard;