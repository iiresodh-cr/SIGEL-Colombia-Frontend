import React, { useState } from 'react';
import { 
  Box, Typography, Paper, Grid, TextField, MenuItem, Button, Alert 
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { adminService } from '../services/adminService';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import { Usuario } from '../types/user';

interface SustitucionMasivaProps {
  usuarios: Usuario[];
  onComplete: () => void;
}

export const SustitucionMasiva = ({ usuarios, onComplete }: SustitucionMasivaProps) => {
  const { currentUser } = useAuth();
  const { showModal } = useModal();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tipoProfesional: 'Jurídico' as 'Jurídico' | 'Psicosocial',
    profesionalAnteriorId: '',
    profesionalNuevoId: '',
    motivo: '',
    radicadoJep: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.profesionalAnteriorId === formData.profesionalNuevoId) {
      showModal('Operación Inválida', 'El profesional de origen y destino no pueden ser la misma persona.', 'error');
      return;
    }

    // Modal de confirmación para evitar errores accidentales
    showModal(
      '¿Confirmar Reasignación Masiva?', 
      'Esta acción transferirá TODOS los casos activos del profesional anterior al nuevo. Se dejará constancia en el historial de cada víctima. ¿Deseas continuar?', 
      'confirm', 
      async () => {
        try {
          setLoading(true);
          const totalModificados = await adminService.reasignarCasosMasivamente(
            formData.profesionalAnteriorId,
            formData.profesionalNuevoId,
            currentUser!.uid,
            formData.tipoProfesional,
            formData.motivo,
            formData.radicadoJep
          );

          if (totalModificados > 0) {
            showModal('Sustitución Exitosa', `Se han reasignado ${totalModificados} víctimas correctamente.`, 'success');
          } else {
            showModal('Sin Cambios', 'El profesional seleccionado no tenía víctimas activas asignadas a su cargo.', 'info');
          }
          
          onComplete(); // Cerramos el panel y recargamos el dashboard
        } catch (error) {
          console.error("Error en sustitución masiva:", error);
          showModal('Error del Sistema', 'Hubo un problema al procesar la reasignación en bloque.', 'error');
        } finally {
          setLoading(false);
        }
      }
    );
  };

  return (
    <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: '2px solid #fbbf24', bgcolor: '#fffbeb', mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <WarningAmberIcon sx={{ color: '#d97706', mr: 1, fontSize: 32 }} />
        <Typography variant="h6" sx={{ fontWeight: 800, color: '#92400e' }}>
          Módulo de Transferencia Masiva de Casos
        </Typography>
      </Box>
      
      <Alert severity="warning" sx={{ mb: 4, '& .MuiAlert-message': { width: '100%' } }}>
        Utiliza esta herramienta cuando un abogado o psicosocial termine su vinculación o cambie de bloque. 
        <strong> Todos los casos activos </strong> del profesional de origen pasarán automáticamente al profesional de destino.
      </Alert>

      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              select
              fullWidth
              size="small"
              label="Tipo de Representación"
              required
              value={formData.tipoProfesional}
              onChange={(e) => setFormData({ ...formData, tipoProfesional: e.target.value as 'Jurídico' | 'Psicosocial' })}
            >
              <MenuItem value="Jurídico">Representación Jurídica</MenuItem>
              <MenuItem value="Psicosocial">Acompañamiento Psicosocial</MenuItem>
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              select
              fullWidth
              size="small"
              label="Profesional Anterior (Origen)"
              required
              value={formData.profesionalAnteriorId}
              onChange={(e) => setFormData({ ...formData, profesionalAnteriorId: e.target.value })}
            >
              {usuarios.map(u => (
                <MenuItem key={`origen-${u.uid}`} value={u.uid}>
                  {u.nombre_completo || u.correo}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              select
              fullWidth
              size="small"
              label="Nuevo Profesional (Destino)"
              required
              value={formData.profesionalNuevoId}
              onChange={(e) => setFormData({ ...formData, profesionalNuevoId: e.target.value })}
            >
              {usuarios.map(u => (
                <MenuItem key={`destino-${u.uid}`} value={u.uid}>
                  {u.nombre_completo || u.correo}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, md: 8 }}>
            <TextField
              fullWidth
              size="small"
              label="Motivo de la Sustitución"
              placeholder="Ej: Renuncia de la abogada Alejandra Gálvez, asume Gabriela Ramírez."
              required
              value={formData.motivo}
              onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              size="small"
              label="Radicado JEP (Opcional)"
              placeholder="Ej: 202401087168"
              value={formData.radicadoJep}
              onChange={(e) => setFormData({ ...formData, radicadoJep: e.target.value })}
            />
          </Grid>

          <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
            <Button 
              variant="outlined" 
              color="inherit" 
              onClick={onComplete}
              sx={{ mr: 2, fontWeight: 'bold' }}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              color="warning" 
              startIcon={<SwapHorizIcon />}
              sx={{ fontWeight: 'bold' }}
              disabled={loading}
            >
              {loading ? 'Procesando...' : 'Ejecutar Reasignación Masiva'}
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};