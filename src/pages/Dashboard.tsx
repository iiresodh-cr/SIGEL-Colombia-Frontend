import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, CircularProgress, Card, CardContent, Grid } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import { useAuth } from '../context/AuthContext';
import { jepService } from '../services/jepService';
import { Victima } from '../types/jep';

const Dashboard = () => {
  const { currentUser, role, loading: authLoading } = useAuth();
  const [victimas, setVictimas] = useState<Victima[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      if (!currentUser?.uid || !role) return;
      try {
        setLoading(true);
        const tipoRol = role === 'psicosocial' ? 'psicosocial' : 'abogado';
        // Traemos las víctimas asignadas a este usuario específico
        const data = await jepService.getVictimasAsignadas(currentUser.uid, tipoRol);
        setVictimas(data);
      } catch (error) {
        console.error("Error cargando dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      loadStats();
    }
  }, [currentUser, role, authLoading]);

  if (authLoading || loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  // Cálculos estadísticos en tiempo real sobre la matriz del usuario
  const totalVictimas = victimas.length;
  
  // Como una víctima puede estar en varios casos (array), buscamos dentro del array
  const caso01 = victimas.filter(v => v.representacion.caso.includes('Caso 01')).length;
  const caso10 = victimas.filter(v => v.representacion.caso.includes('Caso 10')).length;
  
  const acreditadas = victimas.filter(v => v.estado_jep.estado_acreditacion === 'Acreditada').length;

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 800, color: '#003366', mb: 1 }}>
        ¡Hola, {currentUser?.displayName || currentUser?.email?.split('@')[0]}!
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Este es el resumen en tiempo real de tu carga de trabajo en el IIRESODH.
      </Typography>

      <Grid container spacing={3}>
        {/* Tarjeta 1: Total Asignadas */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#f0f9ff', height: '100%' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
              <Box sx={{ p: 2, bgcolor: '#e0f2fe', borderRadius: 2, mr: 2, display: 'flex' }}>
                <PeopleIcon sx={{ color: '#0284c7', fontSize: 36 }} />
              </Box>
              <Box>
                <Typography variant="h3" sx={{ fontWeight: 800, color: '#0369a1' }}>{totalVictimas}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>VÍCTIMAS ASIGNADAS</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Tarjeta 2: Distribución por Caso */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#fdf4ff', height: '100%' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
              <Box sx={{ p: 2, bgcolor: '#fae8ff', borderRadius: 2, mr: 2, display: 'flex' }}>
                <FolderSpecialIcon sx={{ color: '#c026d3', fontSize: 36 }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#a21caf', lineHeight: 1.2 }}>
                  {caso01} <Typography component="span" variant="body2" sx={{ fontWeight: 600 }}>en Caso 01</Typography>
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#a21caf', lineHeight: 1.2 }}>
                  {caso10} <Typography component="span" variant="body2" sx={{ fontWeight: 600 }}>en Caso 10</Typography>
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, mt: 0.5, display: 'block' }}>DISTRIBUCIÓN</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Tarjeta 3: Estado de Acreditación */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#f0fdf4', height: '100%' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
              <Box sx={{ p: 2, bgcolor: '#dcfce7', borderRadius: 2, mr: 2, display: 'flex' }}>
                <AssignmentTurnedInIcon sx={{ color: '#16a34a', fontSize: 36 }} />
              </Box>
              <Box>
                <Typography variant="h3" sx={{ fontWeight: 800, color: '#15803d' }}>{acreditadas}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>ACREDITADAS EN LA JEP</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Aquí podemos agregar después una tabla con las interacciones recientes o próximos talleres */}
      <Paper elevation={0} sx={{ mt: 4, p: 4, borderRadius: 3, border: '1px solid #e2e8f0', textAlign: 'center', bgcolor: '#f8fafc' }}>
        <Typography variant="body1" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          En próximas actualizaciones aquí verás tu agenda de próximas audiencias, talleres y reuniones institucionales.
        </Typography>
      </Paper>
    </Box>
  );
};

export default Dashboard;