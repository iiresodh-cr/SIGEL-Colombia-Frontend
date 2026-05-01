import React, { useState } from 'react';
import { Box, TextField, Button, MenuItem, Typography, Paper } from '@mui/material';
import Grid from '@mui/material/Grid';
import { VictimaJEP } from '../types/jep';

interface Props {
  onSave: (data: Omit<VictimaJEP, 'id' | 'expedienteId'>) => void;
}

export const FormVictima = ({ onSave }: Props) => {
  const [formData, setFormData] = useState({
    nombreCompleto: '',
    documentoIdentidad: '',
    telefono: '',
    direccion: '',
    municipio: '',
    departamento: '',
    estadoAcreditacion: 'En proceso',
    observacionesContacto: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as any);
  };

  return (
    <Paper sx={{ p: 3, mt: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Vincular Nueva Víctima</Typography>
      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth label="Nombre Completo" required 
              onChange={(e) => setFormData({...formData, nombreCompleto: e.target.value})} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth label="Documento" required 
              onChange={(e) => setFormData({...formData, documentoIdentidad: e.target.value})} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField fullWidth label="Teléfono" required 
              onChange={(e) => setFormData({...formData, telefono: e.target.value})} />
          </Grid>
          <Grid size={{ xs: 12, md: 8 }}>
            <TextField fullWidth label="Dirección / Vereda" required 
              onChange={(e) => setFormData({...formData, direccion: e.target.value})} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth multiline rows={2} label="Observaciones de Ubicación" 
              onChange={(e) => setFormData({...formData, observacionesContacto: e.target.value})} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Button type="submit" variant="contained" color="primary">Guardar Víctima</Button>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};