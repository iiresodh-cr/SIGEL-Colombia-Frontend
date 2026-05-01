import { Box, Typography, Paper, Button, Divider, Grid } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import GavelIcon from '@mui/icons-material/Gavel';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

/**
 * Dashboard principal del Sistema SIGEL - IIRESODH.
 * Gestiona el resumen de expedientes y el estado de la sesión.
 */
const Dashboard = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Encabezado Institucional */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, color: 'primary.main' }}>
          Panel Principal - IIRESODH
        </Typography>
        <Button 
          variant="contained" 
          color="error" 
          onClick={handleLogout}
          sx={{ fontWeight: 'bold', px: 4 }}
        >
          Cerrar Sesión
        </Button>
      </Box>

      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
        Bienvenido al Sistema Integrado de Gestión de Expedientes Legales.
      </Typography>

      {/* Grid de Indicadores Clave */}
      <Grid container spacing={4}>
        
        {/* Tarjeta: Expedientes Activos */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={3} sx={{ p: 3, display: 'flex', alignItems: 'center', borderRadius: 2 }}>
            <Box sx={{ bgcolor: 'primary.light', p: 2, borderRadius: '50%', mr: 2, display: 'flex' }}>
              <FolderOpenIcon sx={{ color: 'white' }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>142</Typography>
              <Typography variant="body2" color="text.secondary">Expedientes Activos</Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Tarjeta: Casos en Revisión */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={3} sx={{ p: 3, display: 'flex', alignItems: 'center', borderRadius: 2 }}>
            <Box sx={{ bgcolor: 'secondary.light', p: 2, borderRadius: '50%', mr: 2, display: 'flex' }}>
              <GavelIcon sx={{ color: 'white' }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>28</Typography>
              <Typography variant="body2" color="text.secondary">Casos en Revisión</Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Tarjeta: Términos Jurídicos */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={3} sx={{ p: 3, display: 'flex', alignItems: 'center', borderRadius: 2 }}>
            <Box sx={{ bgcolor: 'error.light', p: 2, borderRadius: '50%', mr: 2, display: 'flex' }}>
              <WarningAmberIcon sx={{ color: 'white' }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>5</Typography>
              <Typography variant="body2" color="text.secondary">Términos por Vencer</Typography>
            </Box>
          </Paper>
        </Grid>

      </Grid>

      <Divider sx={{ my: 6 }} />

      <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
        Actividad Reciente del Sistema
      </Typography>
      <Paper variant="outlined" sx={{ p: 10, textAlign: 'center', borderRadius: 2, bgcolor: 'background.paper' }}>
        <Typography variant="body1" color="text.secondary">
          No hay actividad reciente para mostrar en este momento.
        </Typography>
      </Paper>
    </Box>
  );
};

export default Dashboard;