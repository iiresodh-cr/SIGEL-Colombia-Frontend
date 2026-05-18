import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider } from '../config/firebase';
import { signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { Box, Button, Typography, Paper, Container, CircularProgress } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { useAuth } from '../context/AuthContext';

// IMPORTACIÓN DEL LOGO
import logoInst from '../assets/logo-iire.png';

const Login = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [isProcessing, setIsProcessing] = useState(true); 

  useEffect(() => {
    const processRedirect = async () => {
      try {
        await getRedirectResult(auth);
      } catch (error: any) {
        console.error("Error al procesar la redirección:", error);
        alert("Hubo un error al iniciar sesión: " + error.message);
      } finally {
        setIsProcessing(false);
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
          
          {/* INTEGRACIÓN DEL LOGO CENTRADO */}
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
            <img 
              src={logoInst} 
              alt="Logo IIRESODH - SIGEL" 
              style={{ 
                maxWidth: '100%', 
                height: 'auto', // Mantiene proporción
                maxHeight: '92px' // Altura máxima original
              }} 
            />
          </Box>

          <Typography variant="body2" sx={{ mb: 4, color: 'text.secondary', fontWeight: 500 }}>
            Sistema Integral de Gestión de Expedientes de Litigio
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
              border: '1px solid #dadce0',
              '&:hover': { bgcolor: '#f8f9fa', boxShadow: 1, borderColor: '#dadce0' }
            }}
          >
            <strong>Ingresar con @iiresodh.org</strong>
          </Button>
          
          <Typography variant="caption" sx={{ display: 'block', mt: 4, color: 'text.disabled', lineHeight: 1.5 }}>
            IIRESODH Colombia <br/>
            Acceso exclusivo para personal autorizado
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;