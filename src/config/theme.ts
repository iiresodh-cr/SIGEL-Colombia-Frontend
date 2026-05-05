import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#003087', // Azul institucional serio (acorde a la franja de la bandera)
      dark: '#002266', // Tono más oscuro para hovers
      light: '#335aa0',
    },
    secondary: {
      main: '#6C757D', // Gris sobrio para acciones secundarias o botones de cancelar
      dark: '#495057',
    },
    error: {
      main: '#E63946', // Rojo alerta/destructivo
    },
    warning: {
      main: '#FFCD00', // Amarillo de la bandera para advertencias
    },
    background: {
      default: '#F8F9FA', // Un gris muy claro y limpio para el fondo de la app
      paper: '#FFFFFF',   // Blanco puro para expedientes y tarjetas
    },
    text: {
      primary: '#212529', // Texto principal muy oscuro para máxima legibilidad jurídica
      secondary: '#495057', // Texto secundario
    }
  },
  typography: {
    // Tipografía limpia, legible y tradicional
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700, color: '#003087', fontSize: '2.5rem' },
    h2: { fontWeight: 600, color: '#003087', fontSize: '2rem' },
    h3: { fontWeight: 600, color: '#003087', fontSize: '1.75rem' },
    h4: { fontWeight: 600, color: '#212529', fontSize: '1.5rem' },
    h5: { fontWeight: 500, color: '#212529', fontSize: '1.25rem' },
    h6: { fontWeight: 500, color: '#212529', fontSize: '1rem' },
    body1: { fontSize: '1rem', color: '#212529', lineHeight: 1.6 },
    body2: { fontSize: '0.875rem', color: '#495057', lineHeight: 1.5 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none', 
          borderRadius: '4px',   // Bordes más rectos, aspecto de software "Enterprise"
          fontWeight: 600,
          padding: '8px 16px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 2px 4px rgba(0,0,0,0.2)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '8px', // Reducción del radio para un aspecto más sobrio
          boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.08)', // Sombra fina y elegante
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0px 1px 5px rgba(0,0,0,0.1)', // Separación sutil del header
        }
      }
    }
  },
});

export default theme;