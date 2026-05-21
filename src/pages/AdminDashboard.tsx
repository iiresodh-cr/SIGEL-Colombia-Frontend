import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Divider, Paper, Table, TableBody, TableCell, TableHead, 
  TableRow, Select, MenuItem, Button, CircularProgress, IconButton, Chip, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText, TextField, InputAdornment
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FolderSharedIcon from '@mui/icons-material/FolderShared';
import SearchIcon from '@mui/icons-material/Search';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import BarChartIcon from '@mui/icons-material/BarChart';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import GavelIcon from '@mui/icons-material/Gavel';
import PublicIcon from '@mui/icons-material/Public';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../services/adminService';
import { AdminStats } from '../components/AdminStats';
import { UserManagement } from '../components/UserManagement';
import { SustitucionMasiva } from '../components/SustitucionMasiva';
import { useModal } from '../context/ModalContext';
import { useAuth } from '../context/AuthContext';
import { Usuario } from '../types/user';
import { Victima } from '../types/jep';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

import * as XLSX from 'xlsx';

const AdminDashboard = () => {
  const [users, setUsers] = useState<Usuario[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [ultimasVictimas, setUltimasVictimas] = useState<Victima[]>([]);
  const [casosExEmpleados, setCasosExEmpleados] = useState<Victima[]>([]);
  const [stats, setStats] = useState({ totalVictimas: 0, totalCaso01: 0, totalCaso10: 0 });
  const [loading, setLoading] = useState(true);
  const [loadingModal, setLoadingModal] = useState(false);
  const [showSustitucion, setShowSustitucion] = useState(false);
  
  const [openCargaModal, setOpenCargaModal] = useState(false);
  const [victimasCarga, setVictimasCarga] = useState<Victima[]>([]);
  const [usuarioSupervisado, setUsuarioSupervisado] = useState('');

  // ESTADOS AVANZADOS DE INTELIGENCIA DE DATOS
  const [showPivotModule, setShowPivotModule] = useState(false);
  const [loadingPivot, setLoadingPivot] = useState(false);
  const [universoCompletoVictimas, setUniversoCompletoVictimas] = useState<Victima[]>([]);
  
  // Matrices multidimensionales calculadas
  const [pivotMacrocasoAcreditacion, setPivotMacrocasoAcreditacion] = useState<any>(null);
  const [pivotBloqueGenero, setPivotBloqueGenero] = useState<any>(null);
  const [pivotInterseccional, setPivotInterseccional] = useState<any>(null);
  const [pivotGeografico, setPivotGeografico] = useState<any>(null);

  const navigate = useNavigate();
  const { showModal } = useModal();
  const { currentUser } = useAuth();

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [userList, statsData] = await Promise.all([
        adminService.getAllUsers(),
        adminService.getGlobalStats()
      ]);
      
      setUsers(userList);
      setUltimasVictimas(statsData.ultimasVictimas);
      setStats({
        totalVictimas: statsData.totalVictimas,
        totalCaso01: statsData.totalCaso01,
        totalCaso10: statsData.totalCaso10
      });

      const victimasRef = collection(db, 'victimas');
      const qExJur = query(victimasRef, where('representacion.juridico_asignado_id', '>=', 'ex_empleado-'), where('representacion.juridico_asignado_id', '<=', 'ex_empleado-' + '\uf8ff'));
      const qExPsi = query(victimasRef, where('representacion.psicosocial_asignado_id', '>=', 'ex_empleado-'), where('representacion.psicosocial_asignado_id', '<=', 'ex_empleado-' + '\uf8ff'));

      const [snapExJur, snapExPsi] = await Promise.all([getDocs(qExJur), getDocs(qExPsi)]);
      const mapEx = new Map();
      snapExJur.forEach(d => mapEx.set(d.id, { id: d.id, ...d.data() }));
      snapExPsi.forEach(d => mapEx.set(d.id, { id: d.id, ...d.data() }));
      setCasosExEmpleados(Array.from(mapEx.values()) as Victima[]);

    } catch (error) {
      console.error("Error al cargar datos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // MOTOR MULTIDIMENSIONAL DE ESTADÍSTICAS INSTITUCIONALES
  const cargarYGenerarTablasDinamicas = async () => {
    if (showPivotModule) {
      setShowPivotModule(false);
      return;
    }
    
    try {
      setLoadingPivot(true);
      setShowPivotModule(true);
      
      const snap = await getDocs(collection(db, 'victimas'));
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Victima));
      setUniversoCompletoVictimas(docs);

      // 1. MACROCASO VS ACREDITACIÓN
      const m1: Record<string, Record<string, number>> = {
        "Caso 01": { "Acreditada": 0, "En trámite (despacho no ha resuelto)": 0, "No está acreditada": 0 },
        "Caso 10": { "Acreditada": 0, "En trámite (despacho no ha resuelto)": 0, "No está acreditada": 0 },
        "Sin Macrocaso": { "Acreditada": 0, "En trámite (despacho no ha resuelto)": 0, "No está acreditada": 0 }
      };

      // 2. FRENTE/BLOQUE VS GÉNERO
      const bloquesValidos = ['BNOR', 'BSUR', 'BORI', 'BCAR', 'BCC', 'BMM', 'BOCC', 'Sin Bloque'];
      const m2: Record<string, Record<string, number>> = {};
      bloquesValidos.forEach(b => { m2[b] = { "Mujer": 0, "Hombre": 0, "Otros": 0 }; });

      // 3. ENFOQUE INTERSECCIONAL: ENFOQUE DIFERENCIAL (ÉTNICO/DISCAPACIDAD) VS ACREDITACIÓN
      const m3: Record<string, Record<string, number>> = {
        "Población Étnica (Afro/Indígena)": { "Acreditada": 0, "Resto Estados": 0 },
        "Víctimas con Discapacidad": { "Acreditada": 0, "Resto Estados": 0 },
        "Adulto Mayor (60+)": { "Acreditada": 0, "Resto Estados": 0 },
        "Sin Criterio Diferencial": { "Acreditada": 0, "Resto Estados": 0 }
      };

      // 4. CONCENTRACIÓN TERRITORIAL CRÍTICA (TOP DEPARTAMENTOS VS MACROCASO)
      const m4: Record<string, Record<string, number>> = {};

      docs.forEach(v => {
        const estAcreditacion = v.estado_jep?.estado_acreditacion || "No está acreditada";
        const genero = v.datos_demograficos?.genero || 'Otro';
        const depto = v.datos_contacto?.departamento || 'No especificado';
        const casos = v.representacion?.caso || [];
        const bloques = v.representacion?.bloque || [];

        // Procesamiento Pivot 1 (Macrocasos)
        if (casos.length === 0) {
          if (m1["Sin Macrocaso"][estAcreditacion] !== undefined) m1["Sin Macrocaso"][estAcreditacion]++;
        } else {
          casos.forEach(c => { if (m1[c] && m1[c][estAcreditacion] !== undefined) m1[c][estAcreditacion]++; });
        }

        // Procesamiento Pivot 2 (Bloques)
        let genKey = (genero === 'Mujer' || genero === 'Hombre') ? genero : 'Otros';
        if (bloques.length === 0) {
          m2["Sin Bloque"][genKey]++;
        } else {
          bloques.forEach(b => {
            const bClean = String(b).trim().toUpperCase();
            if (m2[bClean]) m2[bClean][genKey]++;
            else m2["Sin Bloque"][genKey]++;
          });
        }

        // Procesamiento Pivot 3 (Interseccionalidad)
        let tieneDiferencial = false;
        const etnia = v.datos_demograficos?.grupo_etnico || 'Ninguno';
        const disc = v.datos_demograficos?.discapacidad || 'Ninguna';
        const edad = v.datos_demograficos?.etareo || 'Adulto';

        const estKey = estAcreditacion === 'Acreditada' ? 'Acreditada' : 'Resto Estados';

        if (etnia !== 'Ninguno' && etnia !== '') { m3["Población Étnica (Afro/Indígena)"][estKey]++; tieneDiferencial = true; }
        if (disc !== 'Ninguna' && disc !== '') { m3["Víctimas con Discapacidad"][estKey]++; tieneDiferencial = true; }
        if (edad.includes('60+')) { m3["Adulto Mayor (60+)"][estKey]++; tieneDiferencial = true; }
        if (!tieneDiferencial) { m3["Sin Criterio Diferencial"][estKey]++; }

        // Procesamiento Pivot 4 (Territorial)
        if (!m4[depto]) { m4[depto] = { "Caso 01": 0, "Caso 10": 0, "Otros": 0 }; }
        if (casos.length === 0) { m4[depto]["Otros"]++; }
        else { casos.forEach(c => { if (m4[depto][c] !== undefined) m4[depto][c]++; }); }
      });

      setPivotMacrocasoAcreditacion(m1);
      setPivotBloqueGenero(m2);
      setPivotInterseccional(m3);
      setPivotGeografico(m4);

    } catch (error) {
      console.error("Error computando analíticas:", error);
    } finally { // CORRECCIÓN 1: 'file' reemplazado por 'finally' correcto
      setLoadingPivot(false);
    }
  };

  // GENERADOR DEL LIBRO CORPORATIVO MULTIPESTAÑA (3 TABLAS INDEPENDIENTES)
  const descargarLibroCorporativoExcel = () => {
    if (universoCompletoVictimas.length === 0) return;

    const libro = XLSX.utils.book_new();

    // PESTAÑA 1: BASE DE DATOS MATRIZ CONSOLIDADA COMPLETA
    const hoja1Data = universoCompletoVictimas.map(v => ({
      "CODIGO EXPEDIENTE": v.id,
      "NOMBRES Y APELLIDOS": v.nombre_completo,
      "TIPO IDENTIFICACION": v.tipo_documento || 'CC',
      "NUMERO IDENTIFICACION": v.identificacion,
      "GÉNERO": v.datos_demograficos?.genero || 'No registra',
      "ENFOQUE ÉTNICO": v.datos_demograficos?.grupo_etnico || 'Ninguno',
      "CICLO VITAL": v.datos_demograficos?.etareo || 'Adulto',
      "SITUACIÓN DISCAPACIDAD": v.datos_demograficos?.discapacidad || 'Ninguna',
      "TELÉFONO CONTACTO": v.datos_contacto?.telefono || 'No registra',
      "EMAIL": v.datos_contacto?.correo || 'No registra',
      "DEPARTAMENTO RESIDENCIA": v.datos_contacto?.departamento || 'No registra',
      "DIRECCIÓN DE CONTACTO": v.datos_contacto?.direccion || 'No registra',
      "MACROCASOS JEP VINCULADOS": v.representacion?.caso?.join(', ') || 'Sin Macrocaso',
      "BLOQUES / FRENTES": v.representacion?.bloque?.join(', ') || 'No registra',
      "DELITOS SUFRIDOS (HECHOS)": v.representacion?.hechos_victimizantes?.join(', ') || 'No registra',
      "CORREO JURÍDICO ASIGNADO": v.representacion?.juridico_asignado_id || 'Sin asignar',
      "CORREO PSICOSOCIAL ASIGNADO": v.representacion?.psicosocial_asignado_id || 'Sin asignar',
      "ESTADO ACREDITACIÓN JEP": v.estado_jep?.estado_acreditacion || 'No está acreditada',
      "AUTO DE ACREDITACIÓN": v.estado_jep?.auto_acreditacion || 'N/A',
      "RECONOCIMIENTO PERSONERÍA": v.estado_jep?.estado_reconocimiento_pj || 'Sin PJ',
      "AUTO DE RECONOCIMIENTO": v.estado_jep?.auto_reconocimiento || 'N/A'
    }));
    const hoja1 = XLSX.utils.json_to_sheet(hoja1Data);
    XLSX.utils.book_append_sheet(libro, hoja1, "1. Matriz Consolidada");

    // PESTAÑA 2: CONTROL DE CARGAS LABORALES POR PROFESIONAL COHESIONADO
    const balanceCargas: Record<string, { nombre: string, rol: string, juridicos: number, psicosociales: number }> = {};
    users.forEach(u => {
      balanceCargas[u.correo.toLowerCase()] = {
        nombre: u.nombre_completo || 'Sin nombre registrado',
        rol: u.rol.toUpperCase(),
        juridicos: 0,
        psicosociales: 0
      };
    });

    universoCompletoVictimas.forEach(v => {
      const jur = String(v.representacion?.juridico_asignado_id || '').toLowerCase().trim();
      // CORRECCIÓN 2: Tipado saneado a 'psicosocial_asignado_id' removiendo propiedad inexistente en inglés
      const psi = String(v.representacion?.psicosocial_asignado_id || '').toLowerCase().trim();
      if (balanceCargas[jur]) balanceCargas[jur].juridicos++;
      if (balanceCargas[psi]) balanceCargas[psi].psicosociales++;
    });

    const hoja2Data = Object.keys(balanceCargas).map(correo => ({
      "EMAIL INSTITUCIONAL": correo,
      "NOMBRE COMPLETO": balanceCargas[correo].nombre,
      "ROL DE ACCESO": balanceCargas[correo].rol,
      "CASOS ASIGNADOS COMO ABOGADO": balanceCargas[correo].juridicos,
      "CASOS ASIGNADOS COMO PSICOSOCIAL": balanceCargas[correo].psicosociales,
      "TOTAL EXPEDIENTES BAJO SUPERVISIÓN": balanceCargas[correo].juridicos + balanceCargas[correo].psicosociales
    }));
    const hoja2 = XLSX.utils.json_to_sheet(hoja2Data);
    XLSX.utils.book_append_sheet(libro, hoja2, "2. Cargas de Trabajo");

    // PESTAÑA 3: ANALÍTICA PREALIMENTADA DE ENFOQUES DIFERENCIALES
    const hoja3Data: any[] = [];
    if (pivotInterseccional) {
      hoja3Data.push({ "INDICADOR DE ENFOQUE DIFERENCIAL": "--- ANÁLISIS DE ENFOQUE DIFERENCIAL E INTERSECCIONALIDAD ---", "ACREDITADAS": "", "RESTO ESTADOS JEP": "" });
      Object.keys(pivotInterseccional).forEach(k => {
        hoja3Data.push({
          "INDICADOR DE ENFOQUE DIFERENCIAL": k,
          "ACREDITADAS": pivotInterseccional[k]["Acreditada"],
          "RESTO ESTADOS JEP": pivotInterseccional[k]["Resto Estados"]
        });
      });
    }
    const hoja3 = XLSX.utils.json_to_sheet(hoja3Data);
    XLSX.utils.book_append_sheet(libro, hoja3, "3. Resumen Enfoques");

    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(libro, `REPORTE_INTELIGENCIA_SIGEL_${fecha}.xlsx`);
  };

  const handleRoleChange = async (email: string, role: string) => {
    try {
      await adminService.updateUserRole(email, role);
      await loadDashboardData();
      showModal('Rol Actualizado', `Éxito al actualizar a ${email}.`, 'success');
    } catch (error) {
      showModal('Error', 'No se pudo actualizar el rol.', 'error');
    }
  };

  const handleVerCarga = async (user: Usuario) => {
    const displayName = user.nombre_completo ? `${user.nombre_completo} (${user.correo})` : user.correo;
    setUsuarioSupervisado(displayName);
    try {
      setLoadingModal(true);
      setOpenCargaModal(true);
      const data = await adminService.getVictimasPorProfesional(user);
      setVictimasCarga(data.filter(v => v.representacion?.estado === 'Active' || v.representacion?.estado === 'Activo'));
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingModal(false);
    }
  };

  const handleDeleteUser = (email: string) => {
    if (email.toLowerCase() === currentUser?.email?.toLowerCase()) {
      showModal('Acción no permitida', 'No puedes borrarte a ti mismo.', 'error');
      return;
    }
    showModal('¿Revocar Acceso?', `¿Eliminar a ${email}?`, 'confirm', async () => {
      try {
        await adminService.deleteUser(email);
        await loadDashboardData();
        showModal('Acceso Revocado', 'Usuario eliminado.', 'success');
      } catch (error) {
        showModal('Error', 'No se pudo eliminar.');
      }
    });
  };

  const filteredUsers = users.filter(u => 
    u.correo.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.rol.toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.nombre_completo && u.nombre_completo.toLowerCase().includes(userSearch.toLowerCase()))
  );

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#003366' }}>Administración Central SIGEL</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="contained" 
            startIcon={<BarChartIcon />} 
            color="primary"
            onClick={cargarYGenerarTablasDinamicas}
            sx={{ fontWeight: 'bold', bgcolor: '#003366', '&:hover': { bgcolor: '#001a33' } }}
          >
            {showPivotModule ? 'Ocultar Analíticas' : 'Inteligencia de Datos'}
          </Button>
          <Button 
            variant="contained" 
            startIcon={<SwapHorizIcon />} 
            color="warning"
            onClick={() => setShowSustitucion(!showSustitucion)}
            sx={{ fontWeight: 'bold' }}
          >
            {showSustitucion ? 'Cerrar Sustituciones' : 'Sustitución Masiva'}
          </Button>
        </Box>
      </Box>

      {showPivotModule && (
        <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: '2px solid #003366', bgcolor: '#f8fafc', mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <AnalyticsIcon sx={{ color: '#003366', fontSize: 36 }} />
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#003366' }}>
                  Auditoría Analítica e Inteligencia de Casos
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Cómputos agregados en tiempo real sobre el portafolio consolidado de expedientes.
                </Typography>
              </Box>
            </Box>
            
            {!loadingPivot && universoCompletoVictimas.length > 0 && (
              <Button 
                variant="contained" 
                color="success" 
                startIcon={<CloudDownloadIcon />}
                onClick={descargarLibroCorporativoExcel}
                sx={{ fontWeight: 'bold', px: 3, py: 1 }}
              >
                Exportar Libro Analítico Completo (Excel)
              </Button>
            )}
          </Box>

          {loadingPivot ? (
            <Box sx={{ display: 'flex', alignItems: 'center', py: 6, gap: 2, justifyContent: 'center' }}>
              <CircularProgress size={30} />
              <Typography variant="body1" sx={{ color: '#003366', fontWeight: 600 }}>
                Ejecutando algoritmos cruzados sobre el portafolio institucional...
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={4}>
              <Grid size={{ xs: 12, lg: 6 }}>
                <Paper elevation={0} sx={{ p: 3, border: '1px solid #e2e8f0', borderRadius: 2, bgcolor: 'white' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#003366', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <GavelIcon fontSize="small"/> Macrocasos JEP vs Acreditación
                  </Typography>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Macrocaso</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold', color: 'success.main' }}>Acreditada</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold', color: 'warning.main' }}>En Trámite</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold', color: 'error.main' }}>No Acreditada</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pivotMacrocasoAcreditacion && Object.keys(pivotMacrocasoAcreditacion).map(caso => (
                        <TableRow key={caso} hover>
                          <TableCell sx={{ fontWeight: 700 }}>{caso}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 600 }}>{pivotMacrocasoAcreditacion[caso]["Acreditada"]}</TableCell>
                          <TableCell align="center">{pivotMacrocasoAcreditacion[caso]["En trámite (despacho no ha resuelto)"]}</TableCell>
                          <TableCell align="center">{pivotMacrocasoAcreditacion[caso]["No está acreditada"]}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, lg: 6 }}>
                <Paper elevation={0} sx={{ p: 3, border: '1px solid #e2e8f0', borderRadius: 2, bgcolor: 'white' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#003366', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PublicIcon fontSize="small"/> Frentes / Bloques vs Identidad de Género
                  </Typography>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Frente / Bloque</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>Mujer</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>Hombre</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>Otros</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pivotBloqueGenero && Object.keys(pivotBloqueGenero).map(bloque => (
                        <TableRow key={bloque} hover>
                          <TableCell sx={{ fontWeight: 700 }}>{bloque}</TableCell>
                          <TableCell align="center">{pivotBloqueGenero[bloque]["Mujer"]}</TableCell>
                          <TableCell align="center">{pivotBloqueGenero[bloque]["Hombre"]}</TableCell>
                          <TableCell align="center" sx={{ color: 'text.secondary' }}>{pivotBloqueGenero[bloque]["Otros"]}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, lg: 6 }}>
                <Paper elevation={0} sx={{ p: 3, border: '1px solid #e2e8f0', borderRadius: 2, bgcolor: 'white' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#003366', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WarningAmberIcon fontSize="small" color="warning"/> Vulnerabilidad Crítica e Interseccionalidad
                  </Typography>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Enfoque Diferencial Poblacional</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold', color: 'success.main' }}>Acreditadas</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>Pendientes / No</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pivotInterseccional && Object.keys(pivotInterseccional).map(key => (
                        <TableRow key={key} hover>
                          <TableCell sx={{ fontWeight: 700 }}>{key}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 600, color: 'success.dark' }}>{pivotInterseccional[key]["Acreditada"]}</TableCell>
                          <TableCell align="center" sx={{ color: 'text.secondary' }}>{pivotInterseccional[key]["Resto Estados"]}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, lg: 6 }}>
                <Paper elevation={0} sx={{ p: 3, border: '1px solid #e2e8f0', borderRadius: 2, bgcolor: 'white', maxHeight: '275px', overflowY: 'auto' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#003366', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PublicIcon fontSize="small"/> Concentración Territorial por Departamento
                  </Typography>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f1f5f9', position: 'sticky', top: 0, zIndex: 1 }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Departamento</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>Caso 01</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>Caso 10</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>Otros</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pivotGeografico && Object.keys(pivotGeografico).map(depto => (
                        <TableRow key={depto} hover>
                          <TableCell sx={{ fontWeight: 700 }}>{depto}</TableCell>
                          <TableCell align="center">{pivotGeografico[depto]["Caso 01"]}</TableCell>
                          <TableCell align="center">{pivotGeografico[depto]["Caso 10"]}</TableCell>
                          <TableCell align="center" sx={{ color: 'text.secondary' }}>{pivotGeografico[depto]["Otros"]}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              </Grid>
            </Grid>
          )}
        </Paper>
      )}

      {casosExEmpleados.length > 0 && (
        <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: '2px solid #ef4444', bgcolor: '#fef2f2', mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <WarningAmberIcon sx={{ color: '#dc2626', mr: 1, fontSize: 32 }} />
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#991b1b' }}>
              Buzón de Casos Especiales y Ex-empleados ({casosExEmpleados.length} por resolver)
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ mb: 3, color: '#7f1d1d' }}>
            Los siguientes expedientes están asignados a cuentas inactivas u homónimos no resueltos por el sistema. 
            Haz clic en <strong>Ver y Reasignar</strong> para transferirlos individualmente a un profesional activo.
          </Typography>
          
          <Table size="small" sx={{ bgcolor: 'white', borderRadius: 2, overflow: 'hidden', border: '1px solid #fee2e2' }}>
            <TableHead sx={{ bgcolor: '#fee2e2' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', color: '#991b1b' }}>Víctima / Nombre</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#991b1b' }}>Cédula</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: '#991b1b' }}>Asignación Inactiva Detectada</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', color: '#991b1b' }}>Acción</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {casosExEmpleados.map((v) => {
                const jur = v.representacion?.juridico_asignado_id || '';
                const psi = v.representacion?.psicosocial_asignado_id || '';
                const exResponsable = jur.includes('ex_empleado') ? jur : psi;
                return (
                  <TableRow key={v.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{v.nombre_completo}</TableCell>
                    <TableCell>{v.identificacion}</TableCell>
                    <TableCell>
                      <Chip 
                        label={exResponsable} 
                        size="small" 
                        color="error" 
                        variant="outlined" 
                        sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }} 
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button 
                        size="small" 
                        variant="contained" 
                        color="error"
                        onClick={() => navigate(`/victimas/${v.id}`)}
                        sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}
                      >
                        Ver y Reasignar
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      )}

      {showSustitucion ? (
        <SustitucionMasiva 
          usuarios={users} 
          onComplete={() => {
            setShowSustitucion(false);
            loadDashboardData();
          }} 
        />
      ) : (
        <>
          <AdminStats 
            totalVictimas={stats.totalVictimas} 
            totalCaso01={stats.totalCaso01} 
            totalCaso10={stats.totalCaso10} 
          />

          <Grid container spacing={4} sx={{ mt: 2 }}>
            <Grid size={{ xs: 12, lg: 5 }}>
              <UserManagement onUserAdded={loadDashboardData} />
            </Grid>
            <Grid size={{ xs: 12, lg: 7 }}>
              <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0' }}>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>Últimas Víctimas Registradas</Typography>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Nombre</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Acreditación</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>Acción</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ultimasVictimas.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell sx={{ fontWeight: 600 }}>{v.nombre_completo}</TableCell>
                        <TableCell>
                          <Chip label={v.estado_jep.estado_acreditacion} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton 
                            size="small" 
                            color="primary" 
                            onClick={() => navigate(`/victimas/${v.id}`)}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}

      <Divider sx={{ my: 6 }}><Typography variant="overline" sx={{ px: 2 }}>Personal Autorizado y Control de Cargas</Typography></Divider>
      
      <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 3, border: '1px solid #e2e8f0' }}>
        <TextField 
          fullWidth 
          size="small"
          placeholder="Buscar profesional por nombre, correo o rol..." 
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
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
      </Paper>

      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#f8fafc' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Nombre Completo</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Email Institucional</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Rol Actual</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.map((u) => {
              return (
                <TableRow key={u.uid} hover>
                  <TableCell>
                    {u.nombre_completo ? (
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{u.nombre_completo}</Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary"><i>Sin nombre registrado</i></Typography>
                    )}
                  </TableCell>
                  <TableCell>{u.correo}</TableCell>
                  <TableCell><Chip label={u.rol} size="small" /></TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      <IconButton 
                        color="info" 
                        title="Ver carga de trabajo"
                        onClick={() => handleVerCarga(u)}
                      >
                        <FolderSharedIcon />
                      </IconButton>

                      {u.correo !== 'webmaster@iiresodh.org' && (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Select 
                            size="small" 
                            value={u.rol} 
                            onChange={(e) => handleRoleChange(u.correo, e.target.value)} 
                            sx={{ minWidth: 175, textAlign: 'left' }}
                          >
                            <MenuItem value="admin">Administrador/a</MenuItem>
                            <MenuItem value="abogado">Abogado/a</MenuItem>
                            <MenuItem value="psicosocial">Psicosocial</MenuItem>
                            <MenuItem value="lector">Lector (Solo Lectura)</MenuItem>
                          </Select>
                          <IconButton color="error" onClick={() => handleDeleteUser(u.correo)}>
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>

      <Dialog 
        open={openCargaModal} 
        onClose={() => setOpenCargaModal(false)} 
        fullWidth 
        maxWidth="sm"
        scroll="paper"
      >
        <DialogTitle sx={{ fontWeight: 'bold', color: '#003366', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Carga de Trabajo</Typography>
            <Typography variant="caption" color="text.secondary">{usuarioSupervisado}</Typography>
          </Box>
          <Chip label={`${victimasCarga.length} víctimas activas`} color="primary" size="small" />
        </DialogTitle>
        
        <DialogContent dividers sx={{ minHeight: '300px', maxHeight: '450px' }}>
          {loadingModal ? (
            <Box sx={{ py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, textAlign: 'center' }}>
              <CircularProgress size={30} />
              <Typography variant="body2" color="text.secondary">Consultando expedientes asignados en servidor...</Typography>
            </Box>
          ) : victimasCarga.length === 0 ? (
            <Box sx={{ py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, textAlign: 'center' }}>
              <FolderSharedIcon sx={{ fontSize: 70, color: 'text.secondary', opacity: 0.25 }} />
              <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                No hay casos activos vinculados a este perfil.
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {victimasCarga.map((v) => (
                <ListItem 
                  key={v.id} 
                  divider
                  sx={{ py: 1.5 }}
                  secondaryAction={
                    <Button 
                      size="small" 
                      variant="outlined" 
                      onClick={() => {
                        setOpenCargaModal(false);
                        navigate(`/victimas/${v.id}`);
                      }}
                      sx={{ fontSize: '0.7rem' }}
                    >
                      Ver Detalle
                    </Button>
                  }
                >
                  <ListItemText 
                    primary={v.nombre_completo} 
                    secondary={
                      <React.Fragment>
                        <Typography component="span" variant="caption" sx={{ display: 'block' }}>
                          ID: {v.identificacion}
                        </Typography>
                        <Typography component="span" variant="caption" color="primary">
                          {v.representacion?.caso?.join(' · ') || 'Sin macrocaso'}
                        </Typography>
                      </React.Fragment>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenCargaModal(false)} variant="contained" sx={{ bgcolor: '#003366' }}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDashboard;