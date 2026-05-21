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
import { useNavigate } from 'react-router-dom';
import { adminService } from '../services/adminService';
import { AdminStats } from '../components/AdminStats';
import { UserManagement } from '../components/UserManagement';
import { SustitucionMasiva } from '../components/SustitucionMasiva';
import { MigracionLegacy } from '../components/MigracionLegacy';
import { useModal } from '../context/ModalContext';
import { useAuth } from '../context/AuthContext';
import { Usuario } from '../types/user';
import { Victima } from '../types/jep';

// IMPORTS REQUERIDOS PARA EL NUEVO MOTOR DE UNIFICACIÓN MASIVA
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';

// =========================================================================
// COMPONENTE: MIGRACIÓN Y UNIFICACIÓN ESTRICTA (FASE 1)
// =========================================================================
const MigracionUnificacion = () => {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const TARGET_COLLECTION = 'victimas';

  const DICCIONARIO_MANUAL: Record<string, string> = {
    "alejandra solano gallardo": "asolano@iiresodh.org",
    "adriana suarez vasquez": "asuarez@iiresodh.org",
    "cristina isabel eraso cordoba": "ceraso@iiresodh.org",
    "carlos mendieta andino": "cmendieta@iiresodh.org",
    "carlos humberto montero vargas": "cmontero@iiresodh.org",
    "carolina vizcaino parrado": "cvizcaino@iiresodh.org",
    "diana paola castro arevalo": "dcastro@iiresodh.org",
    "dalila andrea henao guerrero": "dhenao@iiresodh.org",
    "danna carolina mora ramirez": "dmora@iiresodh.org",
    "david urquilla": "durquilla@iiresodh.org",
    "felipe castano fuertes": "fcastano@iiresodh.org",
    "gabriela ramirez giraldo": "gramirez@iiresodh.org",
    "jose david diaz arevalo": "jdiaz@iiresodh.org",
    "julieta olarte espitia": "jolarte@iiresodh.org",
    "juan david solano espitia": "jsolano@iiresodh.org",
    "jindra lizeth zambrano cruz": "jzambrano@iiresodh.org",
    "liliani barreto lugo": "lbarreto@iiresodh.org",
    "luisa ramos diaz": "lramos@iiresodh.org",
    "lorena rendon gomez": "lrendon@iiresodh.org",
    "maria isabel balcazar santiago": "mbalcazar@iiresodh.org",
    "marcela mancipe martinez": "mmancipe@iiresodh.org",
    "oscar david herrera casas": "oherrera@iiresodh.org",
    "ricardo escobar osorio": "rescobar@iiresodh.org",
    "tatiana lucia ojeda acevedo": "tojeda@iiresodh.org",
    "victor rodriguez rescia": "vrodriguez@iiresodh.org"
  };

  const normalizar = (texto: string) => {
    return texto ? texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";
  };

  const ejecutarUnificacion = async () => {
    const msgConfirm = `⚠️ ¿Confirmar unificación de IDs directamente en producción [${TARGET_COLLECTION}] para ~2,900 registros?`;
    if (!window.confirm(msgConfirm)) return;

    setLoading(true);
    setLogs(["🚀 Iniciando motor asíncrono secuencial con tolerancia a ex-empleados..."]);

    try {
      const usuariosSnapshot = await getDocs(collection(db, 'usuarios'));
      const listaUsuarios = usuariosSnapshot.docs.map(d => ({ uid: d.id, ...d.data() } as any));
      
      setLogs(prev => [...prev, `ℹ️ Se cargaron ${listaUsuarios.length} perfiles activos como referencia de sistema.`]);

      const mapPorUid = new Map<string, any>();
      const mapPorCorreo = new Map<string, any>();
      const mapPorUsername = new Map<string, any>();
      const mapPorNombreNormalizado = new Map<string, any>();

      listaUsuarios.forEach(u => {
        const correo = u.correo ? u.correo.toLowerCase().trim() : "";
        const uidReal = u.uid ? u.uid.trim() : "";
        const username = correo.split('@')[0];
        const nombreNorm = normalizar(u.nombre_completo || "");

        if (uidReal) mapPorUid.set(uidReal, u);
        if (correo) mapPorCorreo.set(correo, u);
        if (username) mapPorUsername.set(username, u);
        if (nombreNorm) mapPorNombreNormalizado.set(nombreNorm, u);
      });

      setLogs(prev => [...prev, `🔍 Conectando con la colección '${TARGET_COLLECTION}' y descargando expedientes...`]);
      const victimasSnapshot = await getDocs(collection(db, TARGET_COLLECTION));
      
      setLogs(prev => [...prev, `✅ Datos listos. Procesando un total de ${victimasSnapshot.size} documentos de víctimas...`]);

      let actualizados = 0;
      let totalAnalizados = 0;
      let totalExEmpleadosMapeados = 0;
      
      let batch = writeBatch(db);
      let operacionesBatch = 0;

      const resolverIdentificador = (idCrudo: string): { correo: string; nombre: string } => {
        if (!idCrudo || idCrudo.trim() === "") return { correo: "", nombre: "" };

        const stringLimpio = idCrudo.trim();
        const stringMinuscula = stringLimpio.toLowerCase();
        const nombreNorm = normalizar(stringLimpio);

        if (DICCIONARIO_MANUAL[nombreNorm]) {
          const emailDict = DICCIONARIO_MANUAL[nombreNorm];
          const userActivo = mapPorCorreo.get(emailDict);
          return { correo: emailDict, nombre: userActivo ? (userActivo.nombre_completo || stringLimpio) : stringLimpio };
        }
        if (DICCIONARIO_MANUAL[stringMinuscula]) {
          const emailDict = DICCIONARIO_MANUAL[stringMinuscula];
          const userActivo = mapPorCorreo.get(emailDict);
          return { correo: emailDict, nombre: userActivo ? (userActivo.nombre_completo || stringLimpio) : stringLimpio };
        }

        if (mapPorCorreo.has(stringMinuscula)) {
          const user = mapPorCorreo.get(stringMinuscula);
          return { correo: user.correo, nombre: user.nombre_completo || "" };
        }

        if (stringMinuscula.includes('@')) {
          return { correo: stringMinuscula, nombre: stringLimpio };
        }

        if (mapPorUid.has(stringLimpio)) {
          const user = mapPorUid.get(stringLimpio);
          return { correo: user.correo, nombre: user.nombre_completo || "" };
        }

        if (mapPorUsername.has(stringMinuscula)) {
          const user = mapPorUsername.get(stringMinuscula);
          return { correo: user.correo, nombre: user.nombre_completo || "" };
        }

        if (mapPorNombreNormalizado.has(nombreNorm)) {
          const user = mapPorNombreNormalizado.get(nombreNorm);
          return { correo: user.correo, nombre: user.nombre_completo || "" };
        }

        if (nombreNorm.length > 2) {
          const palabras = nombreNorm.split(/\s+/);
          const coincidenciaFuzzy = listaUsuarios.find(u => {
            const nOficial = normalizar(u.nombre_completo || "");
            return palabras.every(p => nOficial.includes(p));
          });
          if (coincidenciaFuzzy) {
            return { correo: coincidenciaFuzzy.correo, nombre: coincidenciaFuzzy.nombre_completo || "" };
          }
        }

        const slug = nombreNorm.replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
        const fallbackEmail = `ex_empleado-${slug || 'desconocido'}@iiresodh.org`;
        totalExEmpleadosMapeados++;
        return { correo: fallbackEmail, nombre: stringLimpio };
      };

      for (const victimaDoc of victimasSnapshot.docs) {
        totalAnalizados++;
        const data = victimaDoc.data();
        const representacion = data.representacion || {};

        const jurActual = representacion.juridico_asignado_id;
        const psiActual = representacion.psicosocial_asignado_id;

        let necesitaUpdate = false;
        let camposUpdate: any = {};

        if (jurActual) {
          const resJur = resolverIdentificador(jurActual);
          if (jurActual !== resJur.correo || representacion.juridico_asignado_nombre !== resJur.nombre) {
            camposUpdate['representacion.juridico_asignado_id'] = resJur.correo;
            camposUpdate['representacion.juridico_asignado_nombre'] = resJur.nombre;
            necesitaUpdate = true;
          }
        }

        if (psiActual) {
          const resPsi = resolverIdentificador(psiActual);
          if (psiActual !== resPsi.correo || representacion.psicosocial_asignado_nombre !== resPsi.nombre) {
            camposUpdate['representacion.psicosocial_asignado_id'] = resPsi.correo;
            camposUpdate['representacion.psicosocial_asignado_nombre'] = resPsi.nombre;
            necesitaUpdate = true;
          }
        }

        if (necesitaUpdate) {
          const refDoc = doc(db, TARGET_COLLECTION, victimaDoc.id);
          batch.update(refDoc, camposUpdate);
          actualizados++;
          operacionesBatch++;
        }

        if (operacionesBatch >= 450) {
          setLogs(prev => [...prev, `⏳ Comprometiendo lote de escrituras en la base de datos...`]);
          await batch.commit();
          batch = writeBatch(db);
          operacionesBatch = 0;
        }
      }

      if (operacionesBatch > 0) {
        await batch.commit();
      }

      setLogs(prev => [
        ...prev, 
        `🎉 ¡PROCESO DE HOMOLOGACIÓN GLOBAL COMPLETADO!`,
        `📊 Total de expedientes evaluados: ${totalAnalizados}.`,
        `✅ Total de campos corregidos e indexados bajo formato de Correo Único: ${actualizados}.`,
        `👤 Casos residuales / Históricos de ex-empleados creados automáticamente: ${totalExEmpleadosMapeados}.`
      ]);

    } catch (error) {
      console.error(error);
      setLogs(prev => [...prev, "❌ Error crítico durante la unificación. Revisa la consola del navegador."]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 3, mb: 4, bgcolor: '#eff6ff', border: '2px dashed #3b82f6', borderRadius: 2 }}>
      <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold', mb: 1 }}>
        Fase 1: Unificador Estricto de Identificadores (Correo Único con Soporte Histórico)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Este motor unifica los strings de asignación. Cruza de forma inteligente los usuarios activos y utiliza el <strong>Diccionario Manual</strong> para resolver nombres de ex-empleados o errores de escritura ortográfica complejos de la matriz original.
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
        <Button variant="contained" color="primary" onClick={ejecutarUnificacion} disabled={loading}>
          {loading ? <CircularProgress size={24} color="inherit" /> : "Ejecutar Unificación en Producción"}
        </Button>
        <Typography variant="subtitle2">
          Colección Activa: <Chip label={TARGET_COLLECTION} color="error" size="small" sx={{ fontWeight: 'bold' }} />
        </Typography>
      </Box>

      <Box sx={{ mt: 2, maxHeight: 150, overflowY: 'auto', bgcolor: '#1e293b', p: 2, borderRadius: 1 }}>
        {logs.map((log, i) => (
          <Typography 
            key={i} 
            variant="caption" 
            sx={{ 
              display: 'block', 
              fontFamily: 'monospace', 
              color: log.includes('❌') || log.includes('⚠️') ? '#f87171' : (log.includes('🎉') || log.includes('✅') ? '#4ade80' : '#f8fafc'),
              mt: 0.5 
            }}
          >
            {log}
          </Typography>
        ))}
      </Box>
    </Paper>
  );
};


// =========================================================================
// COMPONENTE PRINCIPAL: ADMIN DASHBOARD
// =========================================================================
const AdminDashboard = () => {
  const [users, setUsers] = useState<Usuario[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [ultimasVictimas, setUltimasVictimas] = useState<Victima[]>([]);
  const [allVictimas, setAllVictimas] = useState<Victima[]>([]);
  const [stats, setStats] = useState({ totalVictimas: 0, totalCaso01: 0, totalCaso10: 0 });
  const [loading, setLoading] = useState(true);
  const [showSustitucion, setShowSustitucion] = useState(false);
  
  const [openCargaModal, setOpenCargaModal] = useState(false);
  const [victimasCarga, setVictimasCarga] = useState<Victima[]>([]);
  const [usuarioSupervisado, setUsuarioSupervisado] = useState('');

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
      setAllVictimas(statsData.allVictimas || []);
      setStats({
        totalVictimas: statsData.totalVictimas,
        totalCaso01: statsData.totalCaso01,
        totalCaso10: statsData.totalCaso10
      });
    } catch (error) {
      console.error("Error al cargar datos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleRoleChange = async (email: string, role: string) => {
    try {
      await adminService.updateUserRole(email, role);
      await loadDashboardData();
      showModal('Rol Actualizado', `Éxito al actualizar a ${email}.`, 'success');
    } catch (error) {
      showModal('Error', 'No se pudo actualizar el rol.', 'error');
    }
  };

  const getVictimasByUsuario = (user: Usuario) => {
    const email = user.correo.toLowerCase().trim();
    const username = email.split('@')[0];
    const uid = user.uid;

    return allVictimas.filter(v => {
      if (v.representacion?.estado !== 'Activo') return false;
      
      const jurId = v.representacion?.juridico_asignado_id?.toLowerCase()?.trim();
      const psiId = v.representacion?.psicosocial_asignado_id?.toLowerCase()?.trim();

      return jurId === email || jurId === uid || jurId === username ||
             psiId === email || psiId === uid || psiId === username;
    });
  };

  const handleVerCarga = (user: Usuario) => {
    const displayName = user.nombre_completo ? `${user.nombre_completo} (${user.correo})` : user.correo;
    setUsuarioSupervisado(displayName);
    const data = getVictimasByUsuario(user);
    setVictimasCarga(data);
    setOpenCargaModal(true);
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

  // FILTRO EN TIEMPO REAL PARA EL BUZÓN DE CASOS ESPECIALES (EX-EMPLEADOS)
  const casosExEmpleados = allVictimas.filter(v => 
    v.representacion?.juridico_asignado_id?.includes('ex_empleado') ||
    v.representacion?.psicosocial_asignado_id?.includes('ex_empleado')
  );

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#003366' }}>Administración Central SIGEL</Typography>
        <Button 
          variant="contained" 
          startIcon={<SwapHorizIcon />} 
          color="warning"
          onClick={() => setShowSustitucion(!showSustitucion)}
        >
          {showSustitucion ? 'Cerrar Sustituciones' : 'Sustitución Masiva de Casos'}
        </Button>
      </Box>

      {/* RENDERIZADO SECUENCIAL DE AMBOS COMPONENTES DE MIGRACIÓN */}
      <MigracionLegacy />
      <MigracionUnificacion />

      {/* NUEVO PANEL: BUZÓN DE CASOS ESPECIALES / EX-EMPLEADOS */}
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
              <TableCell sx={{ fontWeight: 'bold' }}>Carga de Trabajo</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.map((u) => {
              const victimasAsignadas = getVictimasByUsuario(u);
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
                  <TableCell>
                    <Chip 
                      label={`${victimasAsignadas.length} asignados`} 
                      size="small" 
                      color={victimasAsignadas.length > 0 ? "primary" : "default"}
                      variant="outlined"
                      sx={{ fontWeight: 'bold' }}
                    />
                  </TableCell>
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
          <Chip label={`${victimasCarga.length} víctimas`} color="primary" size="small" />
        </DialogTitle>
        
        <DialogContent dividers sx={{ minHeight: '300px', maxHeight: '450px' }}>
          {victimasCarga.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">No hay casos vinculados a este perfil.</Typography>
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