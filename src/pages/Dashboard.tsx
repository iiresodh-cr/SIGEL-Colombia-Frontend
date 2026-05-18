import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Grid, Paper, CircularProgress, TextField, 
  InputAdornment, Table, TableBody, TableCell, TableHead, TableRow, 
  Chip, Button, useTheme, Card, CardContent
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import FolderIcon from '@mui/icons-material/Folder';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
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
  
  // Estados para la IA
  const [sugerenciaAi, setSugerenciaAi] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);

  const isAdmin = role === 'admin' || role === 'superadmin';

  // Función para llamar a Cloud Run
  const invocarCopiloto = async (total: number, pendientes: number, eventos: Evento[], nombreUsuario: string, rolUsuario: string) => {
    setLoadingAi(true);
    try {
      const payload = {
        rol: isAdmin ? 'administrador' : rolUsuario,
        nombre_profesional: nombreUsuario || 'Profesional',
        total_victimas: total,
        pendientes_acreditacion: pendientes,
        eventos_semana: eventos.map(e => e.titulo)
      };

      // Si no encuentra la variable de entorno, usa localhost para desarrollo
      const apiUrl = import.meta.env.VITE_COPILOTO_API_URL || 'http://localhost:8080/api/copiloto/analizar';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        setSugerenciaAi(data.sugerencia);
      } else {
        setSugerenciaAi("El sistema de IA está fuera de línea por mantenimiento temporal.");
      }
    } catch (error) {
      console.error("Error consultando IA:", error);
      setSugerenciaAi("Error de conexión con el servidor Copiloto. Revisa tu consola.");
    } finally {
      setLoadingAi(false);
    }
  };

  const loadData = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const snapEventos = await jepService.getEventosProximos();
      setEventosList(snapEventos);
      
      let dataVictimas: Victima[] = [];
      let total = 0, pendientes = 0;

      if (isAdmin) {
        const [globalStats, snapVictimas, snapUsers] = await Promise.all([
          adminService.getGlobalStats(),
          getDocs(query(collection(db, 'victimas'))),
          adminService.getAllUsers()
        ]);

        dataVictimas = snapVictimas.docs.map(doc => ({ id: doc.id, ...doc.data() } as Victima));
        total = globalStats.totalVictimas;
        pendientes = dataVictimas.filter(v => v.estado_jep?.estado_acreditacion !== 'Acreditada').length;

        setStats({
          total,
          caso01: globalStats.totalCaso01,
          caso10: globalStats.totalCaso10,
          acreditadas: total - pendientes,
          eventosProximos: snapEventos.length
        });
        setVictimasList(dataVictimas);
        setProfesionales(snapUsers);

      } else {
        const rolBusqueda = role === 'psicosocial' ? 'psicosocial' : 'abogado';
        dataVictimas = await jepService.getVictimasAsignadas(currentUser, rolBusqueda);
        
        total = dataVictimas.length;
        pendientes = dataVictimas.filter(v => v.estado_jep?.estado_acreditacion !== 'Acreditada').length;

        setStats({
          total,
          caso01: dataVictimas.filter(v => v.representacion?.caso?.includes('Caso 01')).length,
          caso10: dataVictimas.filter(v => v.representacion?.caso?.includes('Caso 10')).length,
          acreditadas: total - pendientes,
          eventosProximos: snapEventos.length
        });
        setVictimasList(dataVictimas);
      }

      // Una vez que tenemos los datos, disparamos la petición asíncrona a Gemini
      const nombreMostrar = currentUser.displayName || currentUser.email?.split('@')[0] || 'Profesional';
      invocarCopiloto(total, pendientes, snapEventos, nombreMostrar, role || 'usuario');

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
      <Card elevation={0} sx={{ mb: 5, background: 'linear-gradient(135deg, #f0f7ff 0%, #e0f2fe 100%)', border: '1px solid #bae6fd', borderRadius: 3, minHeight: '120px' }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
            <AutoAwesomeIcon sx={{ color: '#0284c7', fontSize: 28 }} />
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0369a1' }}>
              Copiloto Judicial Inteligente
            </Typography>
          </Box>
          {loadingAi ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">Gemini 2.5 Flash está analizando tus prioridades...</Typography>
            </Box>
          ) : (
            <Typography variant="body1" sx={{ color: '#0f172a', lineHeight: 1.6, fontWeight: 500 }}>
              {sugerenciaAi}
            </Typography>
          )}
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