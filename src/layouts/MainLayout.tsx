import { Box, AppBar, Toolbar, Typography, Button } from '@mui/material';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const MainLayout = () => {
  const { role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation(); // Para saber en qué ruta estamos

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      
      <Box 
        sx={{ 
          height: '4px', 
          width: '100%', 
          background: 'linear-gradient(90deg, #FFCD00 33.33%, #003087 33.33%, #003087 66.66%, #E63946 66.66%)' 
        }} 
      />

      <AppBar position="static" color="primary" elevation={0}>
        <Toolbar>
          <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '1px', flexGrow: 1 }}>
            SIGEL
          </Typography>
          
          <Button 
            color="inherit" 
            onClick={() => navigate('/dashboard')}
            sx={{ mr: 2, opacity: location.pathname === '/dashboard' ? 1 : 0.7 }}
          >
            Panel General
          </Button>

          {/* Este botón solo aparece si eres SuperAdmin o Administrador */}
          {(role === 'SuperAdmin' || role === 'Administrador') && (
            <Button 
              color="inherit" 
              onClick={() => navigate('/admin')}
              sx={{ opacity: location.pathname === '/admin' ? 1 : 0.7 }}
            >
              Administración
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