import React, { useState } from 'react';
import { Box, TextField, Button, MenuItem, Typography, Paper, Grid } from '@mui/material';
// CORRECCIÓN: Importación redirigida al nuevo archivo de tipos legacy
import { ExpedienteJEP } from '../../core/types/legacy';

interface Props {
  onSave: (data: Omit<ExpedienteJEP, 'id'>) => void;
}

export const FormExpediente = ({ onSave }: Props) => {
  const [formData, setFormData] = useState({
    codigoExpediente: '',
    macrocaso: 'Caso 01' as 'Caso 01' | 'Caso 10',
    estadoProcesal: 'Versión Voluntaria',
    resumenHechos: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      fechaRegistro: new Date().toISOString()
    });
    setFormData({
      codigoExpediente: '',
      macrocaso: 'Caso 01',
      estadoProcesal: 'Versión Voluntaria',
      resumenHechos: ''
    });
  };

  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e2e8f0', borderLeft: '6px solid #d4af37' }}>
      <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, color: '#1e293b' }}>
        Registrar Nuevo Macrocaso JEP
      </Typography>
      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField 
              fullWidth 
              label="Código de Expediente" 
              placeholder="Ej: JEP-C01-001" 
              required 
              value={formData.codigoExpediente}
              onChange={(e) => setFormData({...formData, codigoExpediente: e.target.value})} 
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField 
              select 
              fullWidth 
              label="Macrocaso" 
              value={formData.macrocaso}
              onChange={(e) => setFormData({...formData, macrocaso: e.target.value as any})}
            >
              <MenuItem value="Caso 01">Caso 01 - Secuestro</MenuItem>
              <MenuItem value="Caso 10">Caso 10 - Crímenes FARC</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField 
              fullWidth 
              label="Estado Procesal Actual" 
              value={formData.estadoProcesal}
              onChange={(e) => setFormData({...formData, estadoProcesal: e.target.value})} 
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField 
              fullWidth 
              multiline 
              rows={3} 
              label="Resumen de los Hechos" 
              required 
              value={formData.resumenHechos}
              onChange={(e) => setFormData({...formData, resumenHechos: e.target.value})} 
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Button 
              type="submit" 
              variant="contained" 
              sx={{ 
                py: 1.5, 
                px: 4, 
                fontWeight: 'bold', 
                bgcolor: '#1e293b',
                '&:hover': { bgcolor: '#0f172a' }
              }}
            >
              Dar de Alta Expediente
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};