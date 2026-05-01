import React, { useState } from 'react';
import { Box, TextField, Button, MenuItem, Typography, Paper, Grid } from '@mui/material';
import { adminService } from '../services/adminService';

interface UserManagementProps {
  onUserAdded: () => void;
}

export const UserManagement = ({ onUserAdded }: UserManagementProps) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Abogado');

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.toLowerCase().endsWith('@iiresodh.org')) {
      alert("Error: Solo se permiten correos del dominio institucional @iiresodh.org");
      return;
    }

    try {
      await adminService.invitarUsuario(email, role);
      alert(`Usuario ${email} pre-autorizado correctamente.`);
      setEmail('');
      onUserAdded();
    } catch (error) {
      console.error("Error al autorizar usuario:", error);
      alert("Hubo un error al intentar autorizar al usuario.");
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', height: '100%' }}>
      <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, color: '#1e293b' }}>
        Autorizar Nuevo Personal
      </Typography>
      <Box component="form" onSubmit={handleAddUser}>
        <Grid container spacing={2}>
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
              <MenuItem value="Abogado">Abogado/a</MenuItem>
              <MenuItem value="Administrador">Administrador/a</MenuItem>
              <MenuItem value="Invitado">Invitado (Solo Lectura)</MenuItem>
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