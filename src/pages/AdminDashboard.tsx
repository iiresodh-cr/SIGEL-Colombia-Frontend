import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Divider, Paper, Table, TableBody, TableCell, TableHead, 
  TableRow, Select, MenuItem, Grid, Button, CircularProgress, IconButton, Tooltip 
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { adminService } from '../services/adminService';
import { jepService } from '../services/jepService';
import { AdminStats } from '../components/AdminStats';
import { UserManagement } from '../components/UserManagement';
import { FormExpediente } from '../components/FormExpediente';
import { useModal } from '../context/ModalContext';
import { useAuth } from '../context/AuthContext';

const AdminDashboard = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [expedientes, setExpedientes] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalVictimas: 0, totalCaso01: 0, totalCaso10: 0 });
  const [loading, setLoading] = useState(true);
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
      setExpedientes(statsData.allExpedientes);
      setStats({
        totalVictimas: statsData.allExpedientes.length,
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
        showModal('Error', 'No se pudo eliminar.', 'error');
      }
    });
  };

  const handleCrearExpediente = async (data: any) => {
    try {
      await jepService.crearExpediente(data);
      showModal('Éxito', 'Expediente dado de alta en la base de datos.', 'success');
      await loadDashboardData();
    } catch (error) {
      showModal('Error', 'Hubo un problema al guardar.', 'error');
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 800, color: '#003366', mb: 4 }}>Administración Central SIGEL</Typography>

      <AdminStats totalVictimas={stats.totalVictimas} totalCaso01={stats.totalCaso01} totalCaso10={stats.totalCaso10} />

      {/* CORRECCIÓN DE GRID: Usando prop 'size' para compatibilidad con MUI v6 */}
      <Grid container spacing={4} sx={{ mt: 2 }}>
        <Grid size={{ xs: 12, lg: 5 }}>
          <UserManagement onUserAdded={loadDashboardData} />
        </Grid>
        <Grid size={{ xs: 12, lg: 7 }}>
          <FormExpediente onSave={handleCrearExpediente} />
        </Grid>
      </Grid>

      <Divider sx={{ my: 6 }}><Typography variant="overline" sx={{ px: 2 }}>Control de Expedientes Recientes</Typography></Divider>
      
      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>Últimos Registros JEP</Typography>
        <Table>
          <TableHead sx={{ bgcolor: '#f8fafc' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Código</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Macrocaso</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Estado</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Fecha</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {expedientes.length === 0 ? (
              <TableRow><TableCell colSpan={4} align="center">No hay expedientes registrados aún.</TableCell></TableRow>
            ) : (
              expedientes.map((exp) => (
                <TableRow key={exp.id}>
                  <TableCell sx={{ fontWeight: 'bold', color: '#003366' }}>{exp.codigo}</TableCell>
                  <TableCell>{exp.macrocaso}</TableCell>
                  <TableCell>{exp.estadoProcesal}</TableCell>
                  <TableCell>{exp.createdAt ? new Date(exp.createdAt).toLocaleDateString() : 'N/A'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      <Divider sx={{ my: 6 }}><Typography variant="overline" sx={{ px: 2 }}>Personal Autorizado</Typography></Divider>
      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#f8fafc' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Rol</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Acción</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.uid} hover>
                <TableCell>{u.email}</TableCell>
                <TableCell><Box sx={{ px: 1, py: 0.5, borderRadius: 1, bgcolor: '#f0fdf4', display: 'inline-block' }}>{u.role}</Box></TableCell>
                <TableCell align="right">
                  {u.email !== 'webmaster@iiresodh.org' && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      <Select size="small" value={u.role} onChange={(e) => handleRoleChange(u.email, e.target.value)} sx={{ minWidth: 150 }}>
                        <MenuItem value="Abogado">Abogado/a</MenuItem>
                        <MenuItem value="Administrador">Administrador/a</MenuItem>
                        <MenuItem value="Invitado">Invitado</MenuItem>
                      </Select>
                      <IconButton color="error" onClick={() => handleDeleteUser(u.email)}><DeleteIcon /></IconButton>
                    </Box>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};

export default AdminDashboard;