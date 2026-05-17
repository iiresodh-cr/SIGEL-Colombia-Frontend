import React, { useState } from 'react';
import { Box, TextField, Button, MenuItem, Typography, Paper, Grid } from '@mui/material';
import { adminService } from '../services/adminService';
import { useModal } from '../context/ModalContext';

interface UserManagementProps {
  onUserAdded: () => void;
}

export const UserManagement = ({ onUserAdded }: UserManagementProps) => {
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [role, setRole] = useState('abogado'); // Definido en minúscula según tipado estricto
  const { showModal } = useModal();

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanEmail = email.toLowerCase().trim();

    if (!cleanEmail.endsWith('@iiresodh.org')) {
      showModal('Dominio Inválido', 'Solo se permiten correos del dominio institucional @iiresodh.org', 'error');
      return;
    }

    if (cleanEmail === 'webmaster@iiresodh.org') {
      showModal('Acción Protegida', 'El usuario webmaster es el Superadministrador del sistema y no puede ser manipulado desde este panel.', 'error');
      return;
    }

    try {
      await adminService.invitarUsuario(cleanEmail, role, nombre.trim());
      showModal('Autorización Exitosa', `El usuario ${nombre || cleanEmail} ha sido pre-autorizado correctamente.`, 'success');
      setEmail('');
      setNombre('');
      onUserAdded();
    } catch (error) {
      console.error("Error al autorizar usuario:", error);
      showModal('Error del Sistema', 'Hubo un error al intentar autorizar al usuario en la base de datos.', 'error');
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', height: '100%' }}>
      <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, color: '#1e293b' }}>
        Autorizar Nuevo Personal
      </Typography>
      <Box component="form" onSubmit={handleAddUser}>
        <Grid container spacing={2}>
          {/* CORRECCIÓN: Se restauró a "size={{ xs: 12 }}" en todos los Grid */}
          <Grid size={{ xs: 12 }}>
            <TextField 
              fullWidth 
              label="Nombre Completo" 
              placeholder="Ej. Andrea Solano"
              value={nombre} 
              onChange={(e) => setNombre(e.target.value)} 
              required 
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField 
              fullWidth 
              label="Correo Workspace" 
              placeholder="nombre@iiresodh.org"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField 
              select 
              fullWidth 
              label="Rol Asignado" 
              value={role} 
              onChange={(e) => setRole(e.target.value)}
            >
              <MenuItem value="admin">Administrador/a</MenuItem>
              <MenuItem value="abogado">Abogado/a</MenuItem>
              <MenuItem value="psicosocial">Psicosocial</MenuItem>
              <MenuItem value="lector">Lector (Solo Lectura)</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Button 
              type="submit" 
              variant="contained" 
              fullWidth 
              sx={{ 
                py: 1.5, 
                fontWeight: 'bold', 
                bgcolor: '#003366',
                '&:hover': { bgcolor: '#002244' }
              }}
            >
              Confirmar Autorización
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};