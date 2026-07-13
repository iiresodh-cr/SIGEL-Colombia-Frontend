import React, { useState } from 'react';
import { 
  Box, TextField, Button, Grid, Typography, Paper, 
  MenuItem, Select, InputLabel, FormControl, Chip, OutlinedInput 
} from '@mui/material';
import { Evento } from '../../core/types/jep';

interface FormEventoProps {
  onSave: (data: Omit<Evento, 'id'>) => void;
  onCancel: () => void;
}

const TIPOS_EVENTO = ['Taller', 'Audiencia', 'Jornada Divulgación', 'Capacitación', 'Reunión', 'Otro'];
const CASOS_JEP = ['Caso 01', 'Caso 10'];
const BLOQUES_JEP = ['BNOR', 'BSUR', 'BORI', 'BCAR', 'BCC', 'BMM'];

export const FormEvento = ({ onSave, onCancel }: FormEventoProps) => {
  const [formData, setFormData] = useState<Omit<Evento, 'id'>>({
    tipo: 'Taller',
    titulo: '',
    fecha_inicio: new Date().toISOString().split('T')[0],
    modalidad: '',
    casos: [],
    bloques: [],
    funcionarios_juridicos: [],
    funcionarios_psicosociales: [],
    explicacion_conclusiones: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Paper elevation={0} sx={{ p: 4, bgcolor: 'white', borderRadius: 3, border: '1px solid #e2e8f0' }}>
      <Typography variant="h6" sx={{ mb: 3, fontWeight: 800, color: '#003366' }}>
        Registrar Nuevo Evento / Actividad
      </Typography>

      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              select fullWidth size="small" label="Tipo de Evento" required
              value={formData.tipo}
              onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
            >
              {TIPOS_EVENTO.map((tipo) => <MenuItem key={tipo} value={tipo}>{tipo}</MenuItem>)}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, md: 8 }}>
            <TextField
              fullWidth size="small" label="Título o Tema del Evento" required
              placeholder="Ej: Audiencia Regional de Reconocimiento"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth size="small" type="date" label="Fecha de Inicio" required
              slotProps={{ inputLabel: { shrink: true } }}
              value={formData.fecha_inicio}
              onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 8 }}>
            <TextField
              fullWidth size="small" label="Modalidad y Lugar" required
              placeholder="Ej: Presencial - Corozal, Sucre"
              value={formData.modalidad}
              onChange={(e) => setFormData({ ...formData, modalidad: e.target.value })}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Macrocaso(s)</InputLabel>
              <Select
                multiple
                value={formData.casos}
                onChange={(e) => setFormData({ ...formData, casos: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value })}
                input={<OutlinedInput label="Macrocaso(s)" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => <Chip key={value} label={value} size="small" color="primary" variant="outlined" />)}
                  </Box>
                )}
              >
                {CASOS_JEP.map((caso) => <MenuItem key={caso} value={caso}>{caso}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Bloque(s)</InputLabel>
              <Select
                multiple
                value={formData.bloques}
                onChange={(e) => setFormData({ ...formData, bloques: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value })}
                input={<OutlinedInput label="Bloque(s)" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => <Chip key={value} label={value} size="small" />)}
                  </Box>
                )}
              >
                {BLOQUES_JEP.map((bloque) => <MenuItem key={bloque} value={bloque}>{bloque}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth multiline rows={3} label="Explicación o Conclusiones" required
              placeholder="Resume brevemente el objetivo o resultado de esta actividad..."
              value={formData.explicacion_conclusiones}
              onChange={(e) => setFormData({ ...formData, explicacion_conclusiones: e.target.value })}
            />
          </Grid>

          <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
            <Button variant="outlined" onClick={onCancel} sx={{ fontWeight: 'bold' }}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: '#003366', fontWeight: 'bold' }}>
              Guardar Evento
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};