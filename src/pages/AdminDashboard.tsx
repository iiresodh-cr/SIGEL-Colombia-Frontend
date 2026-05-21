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
import { useModal } from '../context/ModalContext';
import { useAuth } from '../context/AuthContext';
import { Usuario } from '../types/user';
import { Victima } from '../types/jep';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

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

      // CARGA ESTRICTA DEL BUZÓN DE EX-EMPLEADOS USANDO PREFIJOS EN SERVIDOR (~52 docs en lugar de 2,900)
      const victimasRef = collection(db, 'with_victimas', 'victimas');
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

  const handleRoleChange = async (email: string, role: string) => {
    try {
      await adminService.updateUserRole(email, role);
      await loadDashboardData();
      showModal('Rol Actualizado', `Éxito al actualizar a ${email}.`, 'success');
    } catch (error) {
      showModal('Error', 'No se pudo actualizar el rol.', 'error');
    }
  };

  // CONSULTA MASIVA EN VIVO (BAJO DEMANDA: Solo descarga si haces clic en el botón)
  const handleVerCarga = async (user: Usuario) => {
    const displayName = user.nombre_completo ? `${user.nombre_completo} (${user.correo})` : user.correo;
    setUsuarioSupervisado(displayName);
    try {
      setLoadingModal(true);
      setOpenCargaModal(true);
      const data = await adminService.getVictimasPorProfesional(user);
      setVictimasCarga(data.filter(v => v.representacion?.estado === 'Activo'));
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

      {/* PANEL INTELIGENTE: BUZÓN DE CASOS ESPECIALES / EX-EMPLEADOS */}
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
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 2 }}>
              <CircularProgress size={30} />
              <Typography variant="body2" color="text.secondary">Consultando expedientes asignados en servidor...</Typography>
            </Box>
          ) : victimasCarga.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">No hay casos activos vinculados a este perfil.</Typography>
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