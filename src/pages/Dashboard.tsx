import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Grid, Paper, CircularProgress, TextField, 
  InputAdornment, Table, TableBody, TableCell, TableHead, TableRow, 
  Chip, Button, useTheme, Divider, Card, CardContent
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import FolderIcon from '@mui/icons-material/Folder';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import EventNoteIcon from '@mui/icons-material/EventNote';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { jepService } from '../services/jepService';
import { adminService } from '../services/adminService';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Victima, Evento } from '../types/jep';
import { Usuario } from '../types/user';

const Dashboard = () => {
  const { currentUser, role } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  
  const [stats, setStats] = useState({ total: 0, caso01: 0, caso10: 0, acreditadas: 0, eventosProximos: 0 });
  const [victimasList, setVictimasList] = useState<Victima[]>([]);
  const [eventosList, setEventosList] = useState<Evento[]>([]);
  const [profesionales, setProfesionales] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const isAdmin = role === 'admin' || role === 'superadmin';

  const loadData = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      
      // Cargamos los eventos institucionales compartidos para ambos roles
      const snapEventos = await jepService.getEventosProximos();
      setEventosList(snapEventos);
      
      if (isAdmin) {
        const [globalStats, snapVictimas, snapUsers] = await Promise.all([
          adminService.getGlobalStats(),
          getDocs(query(collection(db, 'victimas'))),
          adminService.getAllUsers()
        ]);

        const victimasData = snapVictimas.docs.map(doc => ({ id: doc.id, ...doc.data() } as Victima));

        setStats({
          total: globalStats.totalVictimas,
          caso01: globalStats.totalCaso01,
          caso10: globalStats.totalCaso10,
          acreditadas: victimasData.filter(v => v.estado_jep?.estado_acreditacion === 'Acreditada').length,
          eventosProximos: snapEventos.length
        });

        setVictimasList(victimasData);
        setProfesionales(snapUsers);

      } else {
        const rolBusqueda = role === 'psicosocial' ? 'psicosocial' : 'abogado';
        const data = await jepService.getVictimasAsignadas(currentUser, rolBusqueda);
        
        setStats({
          total: data.length,
          caso01: data.filter(v => v.representacion?.caso?.includes('Caso 01')).length,
          caso10: data.filter(v => v.representacion?.caso?.includes('Caso 10')).length,
          acreditadas: data.filter(v => v.estado_jep?.estado_acreditacion === 'Acreditada').length,
          eventosProximos: snapEventos.length
        });
        setVictimasList(data);
      }
    } catch (error) {
      console.error("Error Dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser, role, isAdmin]);

  const getNombreProfesional = (id: string) => {
    if (!id || id === "") return 'Sin asignar';
    const cleanId = id.toLowerCase();
    const prof = profesionales.find(u => 
      u.correo.toLowerCase() === cleanId || 
      u.uid === id || 
      u.correo.split('@')[0].toLowerCase() === cleanId
    );
    return prof ? (prof.nombre_completo || prof.correo) : id;
  };

  // Función analítica simulada de lo que Gemini computa al cruzar portafolio + agenda
  const generarSugerenciaGemini = () => {
    if (isAdmin) {
      return "Control global activo. Se detectan 24 solicitudes de acreditación pendientes en el despacho de la JEP del Caso 01. Se sugiere realizar una reasignación masiva de carga técnica optimizada.";
    }
    
    const pendientesPoder = victimasList.filter(v => !v.estado_jep?.estado_reconocimiento_pj?.includes('Con PJ')).length;
    const proximasAudiencias = eventosList.filter(e => e.tipo === 'Audiencia').length;

    if (stats.total === 0) {
      return "Aún no tienes casos asignados en tu portafolio operativo. Una vez que la administración central te vincule expedientes, analizaré tus plazos judiciales aquí.";
    }

    return `Hola. Detecto que tienes ${proximasAudiencias} audiencias programadas en la JEP esta semana. Cruzando tus datos, veo que tienes ${pendientesPoder} víctimas sin radicar el poder de representación formal. Te sugiero priorizar hoy las llamadas de estas carpetas antes de las diligencias de la JEP.`;
  };

  const adminFiltered = search.trim() === '' 
    ? [] 
    : victimasList.filter(v => 
        v.nombre_completo.toLowerCase().includes(search.toLowerCase()) ||
        v.identificacion.includes(search)
      );

  const casosAlertas = victimasList
    .filter(v => v.estado_jep?.estado_acreditacion !== 'Acreditada')
    .slice(0, 5);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 800, color: '#003366' }}>
          {isAdmin ? "Control Maestro de Casos" : "Mi Panel de Trabajo"}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {isAdmin 
            ? "Gestión global de la representación técnica e institucional IIRESODH." 
            : `Bienvenido/a. Tienes ${stats.total} víctimas activas bajo tu responsabilidad.`}
        </Typography>
      </Box>

      {/* TARJETAS DE ESTADÍSTICAS */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ p: 3, display: 'flex', alignItems: 'center', border: '1px solid', borderColor: 'divider' }}>
            <PeopleIcon sx={{ fontSize: 40, color: theme.palette.primary.main, mr: 2 }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>{stats.total}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>PORTAFOLIO DE VÍCTIMAS</Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ p: 3, display: 'flex', alignItems: 'center', border: '1px solid', borderColor: 'divider' }}>
            <FolderIcon sx={{ fontSize: 40, color: theme.palette.warning.main, mr: 2 }} />
            <Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  {stats.caso01} <Typography component="span" variant="caption" color="text.secondary">C01</Typography>
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  {stats.caso10} <Typography component="span" variant="caption" color="text.secondary">C10</Typography>
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>COBERTURA MACROCASOS</Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ p: 3, display: 'flex', alignItems: 'center', border: '1px solid', borderColor: 'divider' }}>
            <AssignmentTurnedInIcon sx={{ fontSize: 40, color: theme.palette.secondary.main, mr: 2 }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>{stats.acreditadas}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>EXPEDIENTES ACREDITADOS</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* COPILOTO INTELIGENTE GEMINI AI */}
      <Card elevation={0} sx={{ mb: 5, background: 'linear-gradient(135deg, #f0f7ff 0%, #e0f2fe 100%)', border: '1px solid #bae6fd', borderRadius: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
            <AutoAwesomeIcon sx={{ color: '#0284c7', fontSize: 28 }} />
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0369a1' }}>
              Copiloto Judicial Inteligente (Gemini AI)
            </Typography>
          </Box>
          <Typography variant="body1" sx={{ color: '#0f172a', lineHeight: 1.6, fontWeight: 500 }}>
            {generarSugerenciaGemini()}
          </Typography>
        </CardContent>
      </Card>

      {/* DISTRIBUCIÓN INFERIOR POR ROL */}
      {isAdmin ? (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>Buscador de Reasignación</Typography>
            <TextField 
              size="small"
              placeholder="Buscar caso por nombre o ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ width: 350, bgcolor: 'background.paper' }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>

          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden', borderRadius: 3 }}>
            <Table>
              <TableHead sx={{ bgcolor: 'background.default' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Víctima</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Abogado/a Asignado/a</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Acción</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {search.trim() === '' ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                      Utiliza el buscador para localizar expedientes y gestionar traslados masivos o individuales.
                    </TableCell>
                  </TableRow>
                ) : adminFiltered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                      No se encontraron víctimas que coincidan con los parámetros introducidos.
                    </TableCell>
                  </TableRow>
                ) : (
                  adminFiltered.map((v) => (
                    <TableRow key={v.id} hover>
                      <TableCell>
                        <Typography 
                          variant="body1" 
                          sx={{ fontWeight: 600, color: 'primary.main', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                          onClick={() => navigate(`/victimas/${v.id}`)}
                        >
                          {v.nombre_completo}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">ID: {v.identificacion}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={getNombreProfesional(v.representacion?.juridico_asignado_id)} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="right">
                        <Button variant="contained" size="small" color="secondary" startIcon={<VisibilityIcon />} onClick={() => navigate(`/victimas/${v.id}`)}>
                          Reasignar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Paper>
        </Box>
      ) : (
        <Grid container spacing={4}>
          {/* COLUMNA IZQUIERDA: ALERTAS DE ACREDITACIÓN */}
          <Grid size={{ xs: 12, lg: 6 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningAmberIcon color="warning" />
                <Typography variant="h5" sx={{ fontWeight: 700 }}>Alertas de Acreditación</Typography>
              </Box>
              <Button size="small" variant="outlined" onClick={() => navigate('/victimas')}>Ver mi Portafolio</Button>
            </Box>
            
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden', borderRadius: 3 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#fffbeb' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, color: '#92400e' }}>Víctima</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#92400e' }}>Estado JEP</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {casosAlertas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} align="center" sx={{ py: 6, color: 'success.main', fontWeight: 'bold' }}>
                        ¡Felicidades! Todos tus casos activos se encuentran plenamente acreditados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    casosAlertas.map((v) => (
                      <TableRow key={v.id} hover>
                        <TableCell sx={{ py: 1.5 }}>
                          <Typography 
                            variant="body2" 
                            sx={{ fontWeight: 600, color: 'primary.main', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                            onClick={() => navigate(`/victimas/${v.id}`)}
                          >
                            {v.nombre_completo}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">ID: {v.identificacion}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={v.estado_jep?.estado_acreditacion} size="small" color="warning" variant="outlined" />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Paper>
          </Grid>

          {/* COLUMNA DERECHA: AGENDA OPERATIVA (AUDIENCIAS Y EVENTOS) */}
          <Grid size={{ xs: 12, lg: 6 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarMonthIcon color="primary" />
                <Typography variant="h5" sx={{ fontWeight: 700 }}>Agenda JEP y Talleres</Typography>
              </Box>
              <Button size="small" variant="outlined" onClick={() => navigate('/eventos')}>Ir al Calendario</Button>
            </Box>

            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', overflow: 'hidden', borderRadius: 3 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#f0fdf4' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, color: '#166534' }}>Evento / Audiencia</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#166534' }}>Fecha e Info</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {eventosList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                        No hay audiencias o talleres programados en el calendario próximo.
                      </TableCell>
                    </TableRow>
                  ) : (
                    eventosList.slice(0, 5).map((e) => (
                      <TableRow key={e.id} hover>
                        <TableCell sx={{ py: 1.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                            {e.titulo}
                          </Typography>
                          <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5 }}>
                            <Chip label={e.tipo} size="small" color={e.tipo === 'Audiencia' ? 'error' : 'success'} sx={{ fontSize: '0.65rem', height: 18 }} />
                            {e.casos?.map(c => <Chip key={c} label={c} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 18 }} />)}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{e.fecha_inicio}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{e.modalidad}</Typography>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default Dashboard;