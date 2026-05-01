import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider } from '../config/firebase';
import { signInWithRedirect } from 'firebase/auth'; // <-- 1. Cambiamos Popup por Redirect
import { Box, Button, Typography, Paper, Container } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { useAuth } from '../context/AuthContext'; // <-- 2. Importamos el contexto

const Login = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth(); // Obtenemos el usuario actual

  // 3. Si el usuario ya está logueado (después de volver de Google), lo enviamos al Dashboard
  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard', { replace: true });
    }
  }, [currentUser, navigate]);

  const handleGoogleLogin = async () => {
    try {
      // 4. Usamos redirección completa en lugar de ventana emergente
      await signInWithRedirect(auth, googleProvider);
    } catch (error: any) {
      console.error("Error en la autenticación:", error.message);
    }
  };

  return (
    <Box 
      sx={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        background: 'linear-gradient(135deg, #003366 0%, #001a33 100%)' 
      }}
    >
      <Container maxWidth="xs">
        <Paper elevation={6} sx={{ p: 5, textAlign: 'center', borderRadius: 4 }}>
          <Typography variant="h4" sx={{ mb: 1, fontWeight: 700, color: '#003366' }}>
            SIGEL
          </Typography>
          <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary' }}>
            Sistema de Gestión IIRESODH
          </Typography>
          
          <Button 
            fullWidth 
            variant="contained" 
            size="large"
            startIcon={<GoogleIcon />}
            onClick={handleGoogleLogin}
            sx={{ 
              py: 1.5, 
              bgcolor: '#ffffff', 
              color: '#757575',
              textTransform: 'none',
              fontSize: '1rem',
              '&:hover': { bgcolor: '#f1f1f1', boxShadow: 2 }
            }}
          >
            Continuar con Google Workspace
          </Button>
          
          <Typography variant="caption" sx={{ display: 'block', mt: 4, color: 'text.disabled' }}>
            Acceso exclusivo para personal autorizado @iiresodh.org
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;