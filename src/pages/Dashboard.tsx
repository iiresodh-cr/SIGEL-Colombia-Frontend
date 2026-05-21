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
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { jepService } from '../services/jepService';
import { adminService } from '../services/adminService';
import { collection, query, getDocs, limit, startAfter, endBefore, limitToLast, orderBy, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Victima, Evento } from '../types/jep';
import { Usuario } from '../types/user';

// IMPORTACIÓN DEL MOTOR DE EXCEL
import * as XLSX from 'xlsx';

const PAGE_SIZE = 10;

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
  
  const [firstVisible, setFirstVisible] = useState<any>(null);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [sugerenciaAi, setSugerenciaAi] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);

  const isAdmin = role === 'admin' || role === 'superadmin';

  const parseDate = (fecha: any) => {
    if (!fecha) return new Date(0);
    if (fecha.toDate) return fecha.toDate();
    if (typeof fecha === 'string') {
      if (fecha.includes('/')) {
        const partes = fecha.split('/');
        if (partes.length === 3 && partes[2].length === 4) {
          return new Date(`${partes[2]}-${partes[1]}-${partes[0]}T00:00:00`);
        }
      }
      return new Date(fecha);
    }
    return new Date(fecha);
  };

  const getEventosVigentes = (eventos: Evento[]) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); 
    return eventos.filter(e => {
      const fechaEvento = parseDate(e.fecha_inicio);
      return fechaEvento >= hoy;
    });
  };

  const fetchAdminVictimas = async (direction?: 'next' | 'prev', forcedSearch?: string) => {
    try {
      const targetSearch = forcedSearch !== undefined ? forcedSearch : search;
      let q;

      if (targetSearch.trim() !== '') {
        const cleanTerm = targetSearch.trim();
        if (!isNaN(Number(cleanTerm))) {
          q = query(collection(db, 'victimas'), where('identificacion', '==', cleanTerm), limit(PAGE_SIZE));
        } else {
          q = query(
            collection(db, 'victimas'),
            where('nombre_completo', '>=', cleanTerm),
            where('nombre_completo', '<=', cleanTerm + '\uf8ff'),
            limit(PAGE_SIZE)
          );
        }
      } else {
        if (direction === 'next' && lastVisible) {
          q = query(collection(db, 'victimas'), orderBy('nombre_completo', 'asc'), startAfter(lastVisible), limit(PAGE_SIZE));
        } else if (direction === 'prev' && firstVisible) {
          q = query(collection(db, 'victimas'), orderBy('nombre_completo', 'asc'), endBefore(firstVisible), limitToLast(PAGE_SIZE));
        } else {
          q = query(collection(db, 'victimas'), orderBy('nombre_completo', 'asc'), limit(PAGE_SIZE));
        }
      }

      const snap = await getDocs(q);
      if (!snap.empty) {
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Victima));
        setVictimasList(data);
        setFirstVisible(snap.docs[0]);
        setLastVisible(snap.docs[snap.docs.length - 1]);
        setHasMore(snap.docs.length === PAGE_SIZE);
      } else {
        setVictimasList([]);
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error paginando portafolio:", error);
    }
  };

  const handlePageChange = (direction: 'next' | 'prev') => {
    if (direction === 'next') {
      setPage(prev => prev + 1);
      fetchAdminVictimas('next');
    } else {
      setPage(prev => Math.max(1, prev - 1));
      fetchAdminVictimas('prev');
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    setPage(1);
    setFirstVisible(null);
    setLastVisible(null);
    fetchAdminVictimas(undefined, val);
  };

  // FUNCIÓN: PERMITE AL PROFESIONAL DESCARGAR SU PORTAFOLIO EN EXCEL
  const descargarExcelProfesional = () => {
    if (victimasList.length === 0) return;
    
    // Mapeo semántico de campos planos estructurados
    const filasFormateadas = victimasList.map(v => ({
      "Nombre Completo": v.nombre_completo,
      "Documento": `${v.tipo_documento || 'CC'} ${v.identificacion}`,
      "Género": v.datos_demograficos?.genero || 'No registra',
      "Grupo Étnico": v.datos_demograficos?.grupo_etnico || 'Ninguno',
      "Ciclo Vital": v.datos_demograficos?.etareo || 'Adulto',
      "Teléfono": v.datos_contacto?.telefono || 'No registra',
      "Correo Electrónico": v.datos_contacto?.correo || 'No registra',
      "Ubicación": `${v.datos_contacto?.departamento || ''} - ${v.datos_contacto?.direccion || ''}`,
      "Macrocaso(s) JEP": v.representacion?.caso?.join(', ') || 'Sin vincular',
      "Bloque(s)": v.representacion?.bloque?.join(', ') || 'No registra',
      "Calidad de Víctima": v.representacion?.calidad_victima || 'No registra',
      "Estado Acreditación JEP": v.estado_jep?.estado_acreditacion || 'No está acreditada',
      "Auto de Acreditación": v.estado_jep?.auto_acreditacion || 'N/A'
    }));

    const hoja = XLSX.utils.json_to_sheet(filasFormateadas);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Mis Víctimas Asignadas");
    
    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(libro, `Mi_Portafolio_SIGEL_${fecha}.xlsx`);
  };

  const invocarCopiloto = async (total: number, pendientes: number, eventos: Evento[], nombreUsuario: string, rolUsuario: string) => {
    setLoadingAi(true);
    try {
      const token = await currentUser?.getIdToken();
      const payload = {
        rol: String(isAdmin ? 'administrador' : (rolUsuario || 'usuario')),
        nombre_profesional: String(nombreUsuario || 'Profesional'),
        total_victimas: Number(total || 0),
        pendientes_acreditacion: Number(pendientes || 0),
        eventos_semana: Array.isArray(eventos) ? eventos.map(e => String(e.titulo || 'Evento')) : []
      };

      let apiUrl = import.meta.env.VITE_COPILOTO_API_URL || 'http://localhost:8080/api/copiloto/analizar';
      if (apiUrl.endsWith('/')) apiUrl = apiUrl.slice(0, -1);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        setSugerenciaAi(data.sugerencia);
      } else {
        setSugerenciaAi("PIDA no pudo procesar los datos en este momento.");
      }
    } catch (error) {
      console.error("Error Copiloto:", error);
      setSugerenciaAi("No se pudo conectar con el servidor de PIDA.");
    } finally {
      setLoadingAi(false);
    }
  };

  const handlePidaClick = () => {
    const nombreMostrar = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Profesional';
    invocarCopiloto(stats.total, stats.total - stats.acreditadas, eventosList, nombreMostrar, role || 'usuario');
  };

  const loadData = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const snapEventosCrudos = await jepService.getEventosProximos();
      const eventosVigentes = getEventosVigentes(snapEventosCrudos);
      setEventosList(eventosVigentes);
      
      let total = 0, pendientes = 0;

      if (isAdmin) {
        const [globalStats, snapUsers] = await Promise.all([
          adminService.getGlobalStats(),
          adminService.getAllUsers()
        ]);

        total = globalStats.totalVictimas;
        setStats({
          total,
          caso01: globalStats.totalCaso01,
          caso10: globalStats.totalCaso10,
          acreditadas: globalStats.totalAcreditadas,
          eventosProximos: eventosVigentes.length
        });
        setProfesionales(snapUsers);
        await fetchAdminVictimas(undefined, '');

      } else {
        const rolBusqueda = role === 'psicosocial' ? 'psicosocial' : 'abogado';
        const dataVictimas = await jepService.getVictimasAsignadas(currentUser, rolBusqueda);
        
        total = dataVictimas.length;
        pendientes = dataVictimas.filter(v => v.estado_jep?.estado_acreditacion !== 'Acreditada').length;

        setStats({
          total,
          caso01: dataVictimas.filter(v => v.representacion?.caso?.includes('Caso 01')).length,
          caso10: dataVictimas.filter(v => v.representacion?.caso?.includes('Caso 10')).length,
          acreditadas: total - pendientes,
          eventosProximos: eventosVigentes.length
        });
        setVictimasList(dataVictimas);
      }

      const sessionKey = `pida_has_run_${currentUser.uid}`;
      if (!sessionStorage.getItem(sessionKey)) {
        sessionStorage.setItem(sessionKey, 'true');
        const nombreMostrar = currentUser.displayName || currentUser.email?.split('@')[0] || 'Profesional';
        invocarCopiloto(total, total - stats.acreditadas, eventosVigentes, nombreMostrar, role || 'usuario');
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
    const cleanId = id.toLowerCase().trim();
    const prof = profesionales.find(u => u.correo.toLowerCase() === cleanId);
    return prof ? (prof.nombre_completo || prof.correo) : id;
  };

  const casosAlertas = victimasList
    .filter(v => v.estado_jep?.estado_acreditacion !== 'Acreditada')
    .slice(0, 5);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ mb: 1, fontWeight: 800, color: '#003366' }}>
            {isAdmin ? "Control Maestro de Casos" : "Mi Panel de Trabajo"}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {isAdmin 
              ? "Gestión global de la representación técnica e institucional IIRESODH." 
              : `Bienvenido/a. Tienes ${stats.total} víctimas activas bajo tu responsabilidad.`}
          </Typography>
        </Box>
        
        {/* BOTÓN OPERACIONAL EXCEL PROFESIONALES */}
        {!isAdmin && victimasList.length > 0 && (
          <Button 
            variant="contained" 
            color="success" 
            startIcon={<CloudDownloadIcon />} 
            onClick={descargarExcelProfesional}
            sx={{ fontWeight: 'bold' }}
          >
            Descargar Mi Portafolio (Excel)
          </Button>
        )}
      </Box>

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

      <Card elevation={0} sx={{ mb: 5, background: 'linear-gradient(135deg, #f0f7ff 0%, #e0f2fe 100%)', border: '1px solid #bae6fd', borderRadius: 3, minHeight: '120px' }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <AutoAwesomeIcon sx={{ color: '#0284c7', fontSize: 28 }} />
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0369a1' }}>
                PIDA - Tu Asistente Inteligente
              </Typography>
            </Box>
            {!loadingAi && (
              <Button variant="contained" size="small" onClick={handlePidaClick} sx={{ bgcolor: '#0284c7', boxShadow: 0, '&:hover': { bgcolor: '#0369a1' } }}>
                Actualizar Resumen
              </Button>
            )}
          </Box>
          {loadingAi ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">Analizando agenda y portafolio...</Typography>
            </Box>
          ) : sugerenciaAi ? (
            <Box 
              sx={{ 
                color: '#0f172a', 
                mt: 1,
                '& p': { variant: 'body1', lineHeight: 1.6, fontWeight: 500, mb: 1.5 },
                '& ul, & ol': { pl: 3, mb: 1.5 },
                '& li': { variant: 'body1', lineHeight: 1.5, mb: 0.5 },
                '& strong': { color: '#0284c7', fontWeight: 700 }
              }}
            >
              <ReactMarkdown>{sugerenciaAi}</ReactMarkdown>
            </Box>
          ) : (
            <Typography variant="body2" sx={{ color: '#64748b', mt: 1 }}>Haz clic en el botón para generar un resumen estratégico.</Typography>
          )}
        </CardContent>
      </Card>

      {isAdmin ? (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>Explorador y Buscador Paginado</Typography>
            <TextField 
              size="small"
              placeholder="Buscar por cédula o prefijo de nombre..."
              value={search}
              onChange={handleSearchChange}
              sx={{ width: 350, bgcolor: 'background.paper' }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>
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
                {victimasList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                      No se encontraron víctimas que coincidan con los criterios.
                    </TableCell>
                  </TableRow>
                ) : (
                  victimasList.map((v) => (
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
                          Gestionar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Paper>

          {search.trim() === '' && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mt: 3 }}>
              <Button variant="outlined" size="small" disabled={page === 1} onClick={() => handlePageChange('prev')}>Anterior</Button>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Página {page}</Typography>
              <Button variant="outlined" size="small" disabled={!hasMore} onClick={() => handlePageChange('next')}>Siguiente</Button>
            </Box>
          )}
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
                        ¡Felicidades! Todos tus casos activos se encuentran acreditados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    casosAlertas.map((v) => (
                      <TableRow key={v.id} hover>
                        <TableCell sx={{ py: 1.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }} onClick={() => navigate(`/victimas/${v.id}`)}>{v.nombre_completo}</Typography>
                          <Typography variant="caption" color="text.secondary">ID: {v.identificacion}</Typography>
                        </TableCell>
                        <TableCell><Chip label={v.estado_jep?.estado_acreditacion} size="small" color="warning" variant="outlined" /></TableCell>
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
                    <TableRow><TableCell colSpan={2} align="center" sx={{ py: 6, color: 'text.secondary' }}>No hay audiencias o talleres programados próximamente.</TableCell></TableRow>
                  ) : (
                    eventosList.slice(0, 5).map((e) => (
                      <TableRow key={e.id} hover>
                        <TableCell sx={{ py: 1.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b' }}>{e.titulo}</Typography>
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