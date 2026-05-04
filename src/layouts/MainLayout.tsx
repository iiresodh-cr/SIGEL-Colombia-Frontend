import { Box, AppBar, Toolbar, Typography, Button } from '@mui/material';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const isAdminApp = import.meta.env.VITE_APP_TYPE === 'ADMIN';

const MainLayout = () => {
  const { role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Box sx={{ height: '4px', width: '100%', background: 'linear-gradient(90deg, #FFCD00 33.33%, #003087 33.33%, #003087 66.66%, #E63946 66.66%)' }} />

      <AppBar position="static" color="primary" elevation={0}>
        <Toolbar>
          <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '1px', flexGrow: 1 }}>
            SIGEL {isAdminApp ? 'ADMIN' : ''}
          </Typography>
          
          <Button color="inherit" onClick={() => navigate('/dashboard')} sx={{ mr: 2 }}>
            Panel General
          </Button>

          {/* Actualizado a roles en minúscula */}
          {isAdminApp && (role === 'superadmin' || role === 'admin') && (
            <Button color="inherit" onClick={() => navigate('/admin')}>
              Gestión de Usuarios
            </Button>
          )}

          {!isAdminApp && (
            <Button color="inherit" onClick={() => navigate('/expedientes')}>
              Gestión de Casos (Víctimas)
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flexGrow: 1, p: 3, backgroundColor: 'background.default' }}>
        <Outlet />
      </Box>
    </Box>
  );
};

export default MainLayout;