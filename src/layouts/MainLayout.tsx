import React from 'react';
import { Box, AppBar, Toolbar, Typography, Button, IconButton, Tooltip } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const isAdminApp = import.meta.env.VITE_APP_TYPE === 'ADMIN';

const MainLayout = () => {
  const { role, currentUser, logout } = useAuth();
  const navigate = useNavigate();

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

          {isAdminApp && (role === 'superadmin' || role === 'admin') && (
            <Button color="inherit" onClick={() => navigate('/admin')}>
              Gestión de Usuarios
            </Button>
          )}

          {/* MATRIZ HABILITADA PARA TODOS (Admins y Abogados) */}
          <Button color="inherit" onClick={() => navigate('/victimas')}>
            Matriz de Víctimas
          </Button>

          {!isAdminApp && (
            <Button color="inherit" onClick={() => navigate('/eventos')}>
              Eventos y Talleres
            </Button>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', ml: 2, pl: 2, borderLeft: '1px solid rgba(255,255,255,0.3)' }}>
            <Typography variant="body2" sx={{ mr: 2, fontWeight: 500 }}>
              {currentUser?.email}
            </Typography>
            <Tooltip title="Cerrar Sesión">
              <IconButton color="inherit" onClick={logout} size="small" sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}>
                <LogoutIcon />
              </IconButton>
            </Tooltip>
          </Box>
          
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flexGrow: 1, p: 3, backgroundColor: 'background.default' }}>
        <Outlet />
      </Box>
    </Box>
  );
};

export default MainLayout;