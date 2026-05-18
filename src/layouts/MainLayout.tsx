import React, { useState } from 'react';
import { 
  Box, AppBar, Toolbar, Typography, Button, IconButton, 
  Tooltip, Menu, MenuItem, alpha 
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const MainLayout = () => {
  const { role, currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = role === 'superadmin' || role === 'admin';

  // Estados para controlar qué menú desplegable está abierto
  const [anchorElLitigio, setAnchorElLitigio] = useState<null | HTMLElement>(null);
  const [anchorElAdmin, setAnchorElAdmin] = useState<null | HTMLElement>(null);

  // Funciones para abrir y cerrar menús
  const handleOpenLitigio = (event: React.MouseEvent<HTMLElement>) => setAnchorElLitigio(event.currentTarget);
  const handleCloseLitigio = () => setAnchorElLitigio(null);

  const handleOpenAdmin = (event: React.MouseEvent<HTMLElement>) => setAnchorElAdmin(event.currentTarget);
  const handleCloseAdmin = () => setAnchorElAdmin(null);

  // Función para navegar y cerrar el menú al mismo tiempo
  const handleNavigate = (path: string, closeMenuFn?: () => void) => {
    navigate(path);
    if (closeMenuFn) closeMenuFn();
  };

  // Estilo reutilizable para los botones del Navbar
  const navButtonStyles = (isActive: boolean) => ({
    color: isActive ? '#FFCD00' : 'inherit', 
    fontWeight: isActive ? 700 : 500,
    mx: 0.5,
    px: 2,
    '&:hover': {
      backgroundColor: 'rgba(255,255,255,0.1)',
    }
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Box sx={{ height: '4px', width: '100%', background: 'linear-gradient(90deg, #FFCD00 33.33%, #003087 33.33%, #003087 66.66%, #E63946 66.66%)' }} />

      <AppBar position="static" color="primary" elevation={0} sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Toolbar>
          <Typography 
            variant="h6" 
            color="inherit" 
            onClick={() => navigate('/dashboard')}
            sx={{ fontWeight: 800, letterSpacing: '1px', flexGrow: 1, cursor: 'pointer' }}
          >
            SIGEL
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {/* BOTÓN DIRECTO: Panel General */}
            <Button 
              onClick={() => handleNavigate('/dashboard')} 
              sx={navButtonStyles(location.pathname === '/dashboard')}
            >
              Panel General
            </Button>

            {/* MENÚ DESPLEGABLE: Gestión de Litigio */}
            <Button 
              onClick={handleOpenLitigio} 
              sx={navButtonStyles(location.pathname.startsWith('/victimas') || location.pathname.startsWith('/audiencias'))}
              endIcon={<KeyboardArrowDownIcon />}
            >
              Gestión de Litigio
            </Button>
            <Menu
              anchorEl={anchorElLitigio}
              open={Boolean(anchorElLitigio)}
              onClose={handleCloseLitigio}
              // CORRECCIÓN: Uso de slotProps en lugar de PaperProps
              slotProps={{ paper: { elevation: 3, sx: { mt: 1, minWidth: 200, borderRadius: 2 } } }}
            >
              <MenuItem onClick={() => handleNavigate('/victimas', handleCloseLitigio)}>Matriz de Víctimas</MenuItem>
              <MenuItem onClick={() => handleNavigate('/audiencias', handleCloseLitigio)}>Actuaciones Judiciales</MenuItem>
            </Menu>

            {/* BOTÓN DIRECTO: Eventos */}
            <Button 
              onClick={() => handleNavigate('/eventos')} 
              sx={navButtonStyles(location.pathname.startsWith('/eventos'))}
            >
              Eventos y Talleres
            </Button>

            {/* BOTÓN DIRECTO: Documentos */}
            <Button 
              onClick={() => handleNavigate('/radicados')} 
              sx={navButtonStyles(location.pathname.startsWith('/radicados'))}
            >
              Documentos
            </Button>

            {/* MENÚ DESPLEGABLE: Administración (Solo visible para Admins) */}
            {isAdmin && (
              <>
                <Button 
                  onClick={handleOpenAdmin} 
                  sx={navButtonStyles(location.pathname.startsWith('/admin') || location.pathname.startsWith('/importar'))}
                  endIcon={<KeyboardArrowDownIcon />}
                >
                  Administración
                </Button>
                <Menu
                  anchorEl={anchorElAdmin}
                  open={Boolean(anchorElAdmin)}
                  onClose={handleCloseAdmin}
                  // CORRECCIÓN: Uso de slotProps en lugar de PaperProps
                  slotProps={{ paper: { elevation: 3, sx: { mt: 1, minWidth: 200, borderRadius: 2 } } }}
                >
                  <MenuItem onClick={() => handleNavigate('/admin', handleCloseAdmin)}>Gestión de Usuarios</MenuItem>
                  <MenuItem onClick={() => handleNavigate('/importar', handleCloseAdmin)}>Importador Masivo</MenuItem>
                </Menu>
              </>
            )}
          </Box>

          {/* ÁREA DE PERFIL Y CERRAR SESIÓN */}
          <Box sx={{ display: 'flex', alignItems: 'center', ml: 3, pl: 3, borderLeft: '1px solid rgba(255,255,255,0.3)' }}>
            <Typography variant="body2" color="inherit" sx={{ mr: 2, fontWeight: 500, opacity: 0.9 }}>
              {currentUser?.email}
            </Typography>
            <Tooltip title="Cerrar Sesión">
              <IconButton 
                color="inherit" 
                onClick={logout} 
                size="small" 
                sx={{ '&:hover': { bgcolor: alpha('#E63946', 0.8) }, transition: 'background-color 0.2s' }}
              >
                <LogoutIcon />
              </IconButton>
            </Tooltip>
          </Box>
          
        </Toolbar>
      </AppBar>

      {/* ÁREA DE CONTENIDO DINÁMICO */}
      <Box component="main" sx={{ flexGrow: 1, backgroundColor: 'background.default' }}>
        <Outlet />
      </Box>
    </Box>
  );
};

export default MainLayout;