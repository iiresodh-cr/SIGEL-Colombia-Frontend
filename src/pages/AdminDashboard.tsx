import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Divider, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableRow, 
  Select, 
  MenuItem, 
  Grid, 
  Button,
  CircularProgress 
} from '@mui/material';
import { adminService } from '../services/adminService';
import { jepService } from '../services/jepService';
import { AdminStats } from '../components/AdminStats';
import { UserManagement } from '../components/UserManagement';
import { FormExpediente } from '../components/FormExpediente';
import { useModal } from '../context/ModalContext';

const AdminDashboard = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalVictimas: 0, totalCaso01: 0, totalCaso10: 0 });
  const [loading, setLoading] = useState(true);
  const { showModal } = useModal();

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [userList, globalStats] = await Promise.all([
        adminService.getAllUsers(),
        adminService.getGlobalStats()
      ]);
      
      setUsers(userList);
      setStats({
        totalVictimas: 0,
        totalCaso01: globalStats.totalCaso01,
        totalCaso10: globalStats.totalCaso10
      });
    } catch (error) {
      console.error("Error al cargar datos administrativos:", error);
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
      showModal('Rol Actualizado', `Se ha actualizado el rol de ${email} correctamente.`, 'success');
    } catch (error) {
      showModal('Error', 'No se pudo actualizar el rol. Verifica los permisos.', 'error');
    }
  };

  const handleCrearExpediente = async (data: any) => {
    try {
      await jepService.crearExpediente(data);
      showModal('Éxito', 'Macrocaso registrado correctamente en el sistema.', 'success');
      await loadDashboardData();
    } catch (error) {
      showModal('Error de Registro', 'Hubo un error al registrar el expediente.', 'error');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#003366' }}>
          Administración Central SIGEL
        </Typography>
        <Button variant="contained" color="primary">
          Generar Informe Ejecutivo
        </Button>
      </Box>

      <AdminStats 
        totalVictimas={stats.totalVictimas} 
        totalCaso01={stats.totalCaso01} 
        totalCaso10={stats.totalCaso10} 
      />

      <Grid container spacing={4} sx={{ mt: 2 }}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <UserManagement onUserAdded={loadDashboardData} />
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <FormExpediente onSave={handleCrearExpediente} />
        </Grid>
      </Grid>

      <Divider sx={{ my: 6 }}>
        <Typography variant="overline" sx={{ color: 'text.disabled', px: 2 }}>
          Auditoría de Acceso Institucional
        </Typography>
      </Divider>

      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0' }}>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>
          Personal Autorizado (@iiresodh.org)
        </Typography>
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
                <TableCell>
                  <Box sx={{ px: 1, py: 0.5, borderRadius: 1, bgcolor: '#f0fdf4', display: 'inline-block' }}>
                    {u.role}
                  </Box>
                </TableCell>
                <TableCell align="right">
                  {u.email !== 'webmaster@iiresodh.org' ? (
                    <Select
                      size="small"
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.email, e.target.value)}
                      sx={{ minWidth: 160 }}
                    >
                      <MenuItem value="Abogado">Abogado/a</MenuItem>
                      <MenuItem value="Administrador">Administrador/a</MenuItem>
                      <MenuItem value="Invitado">Invitado</MenuItem>
                    </Select>
                  ) : "Súper Administrador"}
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