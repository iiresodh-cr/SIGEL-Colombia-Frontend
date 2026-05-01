import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1d3557', // Azul institucional profundo
    },
    secondary: {
      main: '#457b9d', // Azul medio para acentos
    },
    error: {
      main: '#E63946', // Rojo para acciones destructivas y alertas
    },
    background: {
      default: '#F4F6F8', // Un gris muy claro y elegante para el fondo de la app
      paper: '#FFFFFF',   // Blanco puro para las "hojas" o tarjetas de los formularios
    },
  },
  typography: {
    // Tipografía limpia y legible, esencial para leer mucho texto jurídico
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700, color: '#1d3557' },
    h2: { fontWeight: 600, color: '#1d3557' },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none', // Quita las mayúsculas automáticas para un look más moderno
          borderRadius: '8px',   // Bordes ligeramente redondeados
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          boxShadow: '0px 4px 20px rgba(29, 53, 87, 0.05)', // Sombra sutil con el color primario
        },
      },
    },
  },
});

export default theme;