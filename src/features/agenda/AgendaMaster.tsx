import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Paper, Grid, TextField, MenuItem, 
  Card, CardContent, Chip, CircularProgress, Button
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import GavelIcon from '@mui/icons-material/Gavel';
import GroupIcon from '@mui/icons-material/Group';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import { audienciaService } from './audienciaService'; //[cite: 1]
import { eventoService } from './eventoService'; //[cite: 1]
import { adminService } from '../admin/adminService'; //[cite: 1]
import { Audiencia } from '../../core/types/audiencia'; //[cite: 1]
import { Evento } from '../../core/types/evento'; //[cite: 1]
import { Usuario } from '../../core/types/user'; //[cite: 1]
import { useModal } from '../../core/context/ModalContext'; //[cite: 1]

interface AgendaItem {
  id: string;
  fecha: string;
  tipo_item: 'AUDIENCIA' | 'EVENTO';
  titulo: string;
  subtitulo: string;
  macrocaso: string[];
  responsables_texto: string;
  lugar_despacho: string;
  observaciones: string;
}

const AgendaMaster = () => {
  const { showModal } = useModal();
  const [compromisos, setCompromisos] = useState<AgendaItem[]>([]);
  const [profesionales, setProfesionales] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de Filtros
  const [filtroProfesional, setFiltroProfesional] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroMacrocaso, setFiltroMacrocaso] = useState('');

  const loadAgendaData = async () => {
    try {
      setLoading(true);
      const [allAudiencias, allEventos, listaProfs] = await Promise.all([
        audienciaService.getAudiencias(), //[cite: 1]
        eventoService.getEventos(), //[cite: 1]
        adminService.getAllUsers() //[cite: 1]
      ]);

      setProfesionales(listaProfs);

      // Normalizar Audiencias a la interfaz unificada
      const audNormalizadas: AgendaItem[] = allAudiencias.map((aud: Audiencia) => ({
        id: aud.id || '',
        fecha: aud.fecha,
        tipo_item: 'AUDIENCIA',
        titulo: aud.titulo_diligencia,
        subtitulo: aud.tipo,
        macrocaso: aud.macrocaso,
        responsables_texto: aud.profesionales_asistentes,
        lugar_despacho: aud.despacho,
        observaciones: aud.observaciones
      }));

      // Normalizar Eventos a la interfaz unificada
      const evtNormalizados: AgendaItem[] = allEventos.map((evt: Evento) => ({
        id: evt.id || '',
        fecha: evt.fecha,
        tipo_item: 'EVENTO',
        titulo: evt.tema_titulo,
        subtitulo: evt.tipo,
        macrocaso: [],
        responsables_texto: evt.creado_por_email,
        lugar_despacho: evt.lugar,
        observaciones: evt.observaciones
      }));

      // Fusionar y ordenar cronológicamente
      const fusionados = [...audNormalizadas, ...evtNormalizados].sort(
        (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      );

      setCompromisos(fusionados);
    } catch (error) {
      console.error(error);
      showModal('Error', 'No se pudo cargar la agenda unificada.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgendaData();
  }, []);

  const limpiarFiltros = () => {
    setFiltroProfesional('');
    setFiltroTipo('');
    setFiltroMacrocaso('');
  };

  const compromisosFiltrados = compromisos.filter((item) => {
    const cumpleProf = filtroProfesional === '' || 
      item.responsables_texto.toLowerCase().includes(filtroProfesional.toLowerCase());
    
    const cumpleTipo = filtroTipo === '' || item.tipo_item === filtroTipo;
    
    const cumpleCaso = filtroMacrocaso === '' || 
      item.macrocaso.includes(filtroMacrocaso);

    return cumpleProf && cumpleTipo && cumpleCaso;
  });

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <CalendarMonthIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main' }}>Agenda General de la Oficina</Typography>
            <Typography variant="body1" color="text.secondary">Control unificado de audiencias, diligencias y talleres comunitarios.</Typography>
          </Box>
        </Box>
      </Box>

      {/* BARRA DE FILTROS AVANZADOS */}
      <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Grid container spacing={2} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              select
              fullWidth
              size="small"
              label="Filtrar por Profesional Responsable"
              value={filtroProfesional}
              onChange={(e) => setFiltroProfesional(e.target.value)}
            >
              <MenuItem value=""><em>Todos los profesionales</em></MenuItem>
              {profesionales.map((p) => (
                <MenuItem key={p.uid} value={p.correo}>
                  {p.nombre_completo || p.correo}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              select
              fullWidth
              size="small"
              label="Tipo de Compromiso"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
            >
              <MenuItem value=""><em>Todos los tipos</em></MenuItem>
              <MenuItem value="AUDIENCIA">Solo Audiencias y Diligencias JEP</MenuItem>
              <MenuItem value="EVENTO">Solo Talleres y Reuniones</MenuItem>
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              select
              fullWidth
              size="small"
              label="Macrocaso"
              value={filtroMacrocaso}
              onChange={(e) => setFiltroMacrocaso(e.target.value)}
            >
              <MenuItem value=""><em>Todos los macrocasos</em></MenuItem>
              <MenuItem value="Caso 01">Caso 01</MenuItem>
              <MenuItem value="Caso 10">Caso 10</MenuItem>
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, md: 2 }}>
            <Button
              fullWidth
              variant="outlined"
              color="secondary"
              startIcon={<ClearAllIcon />}
              onClick={limpiarFiltros}
              disabled={!filtroProfesional && !filtroTipo && !filtroMacrocaso}
              sx={{ fontWeight: 'bold', textTransform: 'none' }}
            >
              Limpiar
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* RENDERIZADO DE LA LÍNEA DE TIEMPO / AGENDAMIENTO */}
      <Grid container spacing={3}>
        {compromisosFiltrados.length === 0 ? (
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 6, textAlign: 'center', color: 'text.secondary', border: '1px dashed #cbd5e1' }}>
              No se registran compromisos agendados que coincidan con los filtros seleccionados.
            </Paper>
          </Grid>
        ) : (
          compromisosFiltrados.map((item) => {
            const esAudiencia = item.tipo_item === 'AUDIENCIA';
            return (
              <Grid size={{ xs: 12 }} key={item.id}>
                <Card 
                  elevation={0} 
                  sx={{ 
                    border: '1px solid #e2e8f0',
                    borderRadius: 3,
                    borderLeft: `6px solid ${esAudiencia ? '#E63946' : '#003087'}`,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)'
                    }
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Grid container spacing={2} sx={{ alignItems: 'flex-start' }}>
                      {/* Fecha del compromiso */}
                      <Grid size={{ xs: 12, md: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary' }}>
                          {new Date(item.fecha + 'T00:00:00').toLocaleDateString('es-CO', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </Typography>
                        <Chip 
                          icon={esAudiencia ? <GavelIcon /> : <GroupIcon />}
                          label={item.tipo_item} 
                          size="small" 
                          color={esAudiencia ? "error" : "primary"}
                          sx={{ mt: 1, fontWeight: 'bold', fontSize: '0.7rem' }}
                        />
                      </Grid>

                      {/* Cuerpo de la información */}
                      <Grid size={{ xs: 12, md: 7 }}>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1, alignItems: 'center' }}>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                            {item.titulo}
                          </Typography>
                          <Typography variant="subtitle2" color="text.secondary">
                            ({item.subtitulo})
                          </Typography>
                        </Box>

                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontStyle: item.observaciones ? 'normal' : 'italic' }}>
                          {item.observaciones || 'Sin observaciones detalladas registradas.'}
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {item.macrocaso.map((c) => (
                            <Chip key={c} label={c} size="small" variant="outlined" sx={{ fontWeight: 'bold' }} />
                          ))}
                          <Chip label={`Lugar/Despacho: ${item.lugar_despacho}`} size="small" variant="outlined" />
                        </Box>
                      </Grid>

                      {/* Responsables asignados */}
                      <Grid size={{ xs: 12, md: 3 }} sx={{ borderLeft: { xs: 'none', md: '1px solid #e2e8f0' }, pl: { xs: 0, md: 3 } }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700, textTransform: 'uppercase' }}>
                          Personal Convocado:
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5, color: '#334155' }}>
                          {item.responsables_texto || 'Institucional / Todo el equipo'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            );
          })
        )}
      </Grid>
    </Box>
  );
};

export default AgendaMaster;