import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider } from '../config/firebase';
import { signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { Box, Button, Typography, Paper, Container, CircularProgress } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  // Estado para mostrar un loader mientras vuelve de Google
  const [isProcessing, setIsProcessing] = useState(true); 

  useEffect(() => {
    // Esta función "atrapa" al usuario cuando regresa de Google
    const processRedirect = async () => {
      try {
        await getRedirectResult(auth);
        // Si hay éxito, el AuthContext lo detectará automáticamente y cambiará el currentUser
      } catch (error: any) {
        console.error("Error al procesar la redirección:", error);
        alert("Hubo un error al iniciar sesión: " + error.message);
      } finally {
        setIsProcessing(false); // Terminó de procesar, ocultar loader
      }
    };

    processRedirect();
  }, []);

  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard', { replace: true });
    }
  }, [currentUser, navigate]);

  const handleGoogleLogin = async () => {
    try {
      setIsProcessing(true);
      await signInWithRedirect(auth, googleProvider);
    } catch (error: any) {
      console.error("Error en la autenticación:", error.message);
      setIsProcessing(false);
    }
  };

  // Pantalla de carga mientras se comunica con Google
  if (isProcessing) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #003366 0%, #001a33 100%)' }}>
        <CircularProgress sx={{ color: 'white', mb: 2 }} />
        <Typography sx={{ color: 'white' }}>Procesando acceso seguro...</Typography>
      </Box>
    );
  }

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
          <Typography variant="h4" sx={{ mb: 1, fontWeight: 700, color: '#E63946' }}>
            SIGEL
          </Typography>
          <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary' }}>
            Sistema de Gestión de Expedientes Legales
          </Typography>
          <Typography variant="body1" sx={{ mb: 4, fontWeight: 700, color: '#003366' }}>
            IIRESODH Colombia
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
            <strong>Ingresar con @iiresodh.org</strong>
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