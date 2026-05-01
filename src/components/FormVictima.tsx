import React, { useState } from 'react';
import { Box, TextField, Button, Grid, Typography, Paper } from '@mui/material';

interface FormVictimaProps {
  onSave: (data: any) => void;
  onCancel: () => void;
}

export const FormVictima = ({ onSave, onCancel }: FormVictimaProps) => {
  const [formData, setFormData] = useState({
    nombreCompleto: '',
    documentoIdentidad: '',
    telefono: '',
    correo: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Paper elevation={0} sx={{ p: 2, bgcolor: 'white' }}>
      <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700 }}>
        Vincular Nueva Víctima
      </Typography>
      <Box component="form" onSubmit={handleSubmit}>
        {/* En MUI v6, eliminamos 'item' y usamos 'size' */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              size="small"
              label="Nombre Completo"
              required
              value={formData.nombreCompleto}
              onChange={(e) => setFormData({ ...formData, nombreCompleto: e.target.value })}
            />
          </Grid>
          
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              size="small"
              label="Documento de Identidad"
              required
              value={formData.documentoIdentidad}
              onChange={(e) => setFormData({ ...formData, documentoIdentidad: e.target.value })}
            />
          </Grid>
          
          <Grid size={{ xs: 12 }} sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Button 
              fullWidth 
              variant="outlined" 
              size="small" 
              onClick={onCancel}
            >
              Cancelar
            </Button>
            <Button 
              fullWidth 
              variant="contained" 
              size="small" 
              type="submit"
              sx={{ bgcolor: '#003366' }}
            >
              Guardar
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};