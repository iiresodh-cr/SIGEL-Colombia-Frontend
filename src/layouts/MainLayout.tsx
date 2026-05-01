import { Box, AppBar, Toolbar, Typography } from '@mui/material';
import { Outlet } from 'react-router-dom';

const MainLayout = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      
      {/* 1. AQUÍ VA EL TOQUE DE LA BANDERA */}
      {/* Se coloca hasta arriba, antes de cualquier otro elemento visual */}
      <Box 
        sx={{ 
          height: '4px', 
          width: '100%', 
          background: 'linear-gradient(90deg, #FFCD00 33.33%, #003087 33.33%, #003087 66.66%, #E63946 66.66%)' 
        }} 
      />

      {/* 2. Barra de Navegación (Header Institucional) */}
      <AppBar position="static" color="primary" elevation={0}>
        <Toolbar>
          <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '1px' }}>
            SIGEL
          </Typography>
        </Toolbar>
      </AppBar>

      {/* 3. Contenedor Dinámico */}
      {/* El componente <Outlet /> es el espacio donde React Router inyectará 
          tus pantallas (Dashboard, Expedientes, etc.) */}
      <Box component="main" sx={{ flexGrow: 1, p: 3, backgroundColor: 'background.default' }}>
        <Outlet />
      </Box>

    </Box>
  );
};

export default MainLayout;