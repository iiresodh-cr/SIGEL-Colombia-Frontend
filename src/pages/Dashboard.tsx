import React, { useEffect, useState } from 'react';
import { Box, Typography, Grid, Paper, CircularProgress } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import FolderIcon from '@mui/icons-material/Folder';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import { useAuth } from '../context/AuthContext';
import { jepService } from '../services/jepService';
import { adminService } from '../services/adminService';
import { Victima } from '../types/jep';

const Dashboard = () => {
  const { currentUser, role } = useAuth();
  const [stats, setStats] = useState({ total: 0, caso01: 0, caso10: 0, acreditadas: 0 });
  const [loading, setLoading] = useState(true);

  const isAdmin = role === 'admin' || role === 'superadmin';

  useEffect(() => {
    const loadStats = async () => {
      if (!currentUser?.uid) return;
      try {
        setLoading(true);
        
        if (isAdmin) {
          // Panorama global para Administradores
          const globalData = await adminService.getGlobalStats();
          setStats({
            total: globalData.totalVictimas,
            caso01: globalData.totalCaso01,
            caso10: globalData.totalCaso10,
            acreditadas: 0 
          });
        } else {
          // Panorama individual para Abogados/Psicosociales
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
        console.error("Error al cargar estadísticas:", error);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, [currentUser, role, isAdmin]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h3" sx={{ fontWeight: 800, color: '#003366', mb: 1 }}>
        ¡Hola!
      </Typography>
      <Typography variant="h6" sx={{ color: '#003366', mb: 1, fontWeight: 500 }}>
        {currentUser?.email}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        {isAdmin 
          ? "Resumen global del estado de la representación en el IIRESODH." 
          : "Este es el resumen en tiempo real de tu carga de trabajo en el IIRESODH."}
      </Typography>

      <Grid container spacing={3}>
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
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#be185d' }}>{stats.caso01} <Typography component="span" variant="caption">en Caso 01</Typography></Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#be185d' }}>{stats.caso10} <Typography component="span" variant="caption">en Caso 10</Typography></Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">DISTRIBUCIÓN POR MACROCASO</Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ p: 3, display: 'flex', alignItems: 'center', borderRadius: 3, bgcolor: '#f0fdf4', border: '1px solid #dcfce7' }}>
            <AssignmentTurnedInIcon sx={{ fontSize: 40, color: '#15803d', mr: 2 }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>{stats.acreditadas}</Typography>
              <Typography variant="body2" color="text.secondary">ACREDITADAS EN LA JEP</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
      
      <Paper elevation={0} sx={{ mt: 4, p: 4, borderRadius: 3, border: '1px solid #e2e8f0', textAlign: 'center' }}>
         <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            En próximas actualizaciones aquí verás tu agenda de próximas audiencias, talleres y reuniones institucionales.
         </Typography>
      </Paper>
    </Box>
  );
};

export default Dashboard;