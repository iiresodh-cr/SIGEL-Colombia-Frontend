import React, { useState } from 'react';
import { 
  Box, TextField, Button, Grid, Typography, Paper, 
  MenuItem, Select, InputLabel, FormControl, Chip, OutlinedInput, Divider 
} from '@mui/material';
import { Victima } from '../types/jep';
import { Usuario } from '../types/user';

interface FormVictimaProps {
  onSave: (data: Omit<Victima, 'id' | 'fecha_registro'>) => void;
  onCancel: () => void;
  profesionales: { abogados: Usuario[], psicosociales: Usuario[] };
  currentUserRole: string;
  currentUserId: string;
}

const CASOS_JEP = ['Caso 01', 'Caso 10'];
const BLOQUES_JEP = ['BNOR', 'BSUR', 'BORI', 'BCAR', 'BCC', 'BMM'];
const CALIDADES = ['Directa', 'Indirecta', 'Indirecta (Vocera)', 'Ambas'];
const GENEROS = ['Mujer', 'Hombre', 'No binario', 'Otro', 'Prefiero no decirlo'];
const DEPARTAMENTOS = ['Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bolívar', 'Boyacá', 'Caldas', 'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba', 'Cundinamarca', 'Guainía', 'Guaviare', 'Huila', 'La Guajira', 'Magdalena', 'Meta', 'Nariño', 'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda', 'San Andrés y Providencia', 'Santander', 'Sucre', 'Tolima', 'Valle del Cauca', 'Vaupés', 'Vichada', 'Bogotá D.C.'];

export const FormVictima = ({ onSave, onCancel, profesionales, currentUserRole, currentUserId }: FormVictimaProps) => {
  const isAltRole = currentUserRole === 'admin' || currentUserRole === 'superadmin';

  const [formData, setFormData] = useState<Omit<Victima, 'id' | 'fecha_registro' | 'storage_folder_url'>>({
    nombre_completo: '',
    tipo_documento: 'CC',
    identificacion: '',
    datos_demograficos: { genero: '', orientacion_sexual: '', grupo_etnico: 'Ninguno', etareo: 'Adulto', discapacidad: 'Ninguna' },
    datos_contacto: { telefono: '', correo: '', direccion: '', departamento: '' },
    representacion: {
      caso: [],
      bloque: [],
      calidad_victima: '',
      juridico_asignado_id: (currentUserRole === 'abogado') ? currentUserId : '',
      psicosocial_asignado_id: (currentUserRole === 'psicosocial') ? currentUserId : '',
      fecha_asignacion: new Date().toISOString().split('T')[0],
      estado: 'Activo'
    },
    estado_jep: {
      estado_acreditacion: 'No está acreditada',
      estado_reconocimiento_pj: 'Sin PJ (no se ha recibido poder)'
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as any);
  };

  return (
    <Paper elevation={0} sx={{ p: 3, bgcolor: 'white', borderRadius: 3, border: '1px solid #e2e8f0' }}>
      <Typography variant="h6" sx={{ mb: 3, fontWeight: 800, color: '#003366' }}>Registro de Nueva Víctima</Typography>
      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* DATOS PERSONALES */}
          <Grid size={{ xs: 12 }}><Divider textAlign="left"><Typography variant="subtitle2" color="text.secondary">Datos Personales</Typography></Divider></Grid>
          <Grid size={{ xs: 12, md: 8 }}><TextField fullWidth size="small" label="Nombre Completo" required value={formData.nombre_completo} onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })} /></Grid>
          <Grid size={{ xs: 12, md: 4 }}><TextField select fullWidth size="small" label="Tipo Doc." value={formData.tipo_documento} onChange={(e) => setFormData({ ...formData, tipo_documento: e.target.value })}><MenuItem value="CC">Cédula de Ciudadanía</MenuItem><MenuItem value="TI">Tarjeta de Identidad</MenuItem></TextField></Grid>
          <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth size="small" label="Número de Identificación" required value={formData.identificacion} onChange={(e) => setFormData({ ...formData, identificacion: e.target.value })} /></Grid>
          <Grid size={{ xs: 12, md: 6 }}><TextField select fullWidth size="small" label="Género" required value={formData.datos_demograficos.genero} onChange={(e) => setFormData({ ...formData, datos_demograficos: { ...formData.datos_demograficos, genero: e.target.value } })}>{GENEROS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}</TextField></Grid>
          
          {/* ASIGNACIÓN DE RESPONSABLES */}
          <Grid size={{ xs: 12 }}><Divider textAlign="left"><Typography variant="subtitle2" color="text.secondary">Asignación de Responsables</Typography></Divider></Grid>
          
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField 
              select fullWidth size="small" 
              label="Abogado/a Responsable" 
              required
              disabled={!isAltRole && currentUserRole === 'abogado'} 
              value={formData.representacion.juridico_asignado_id}
              onChange={(e) => setFormData({ ...formData, representacion: { ...formData.representacion, juridico_asignado_id: e.target.value } })}
            >
              {profesionales.abogados.map(u => <MenuItem key={u.uid} value={u.uid}>{u.nombre_completo || u.correo}</MenuItem>)}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField 
              select fullWidth size="small" 
              label="Psicosocial Responsable" 
              required
              disabled={!isAltRole && currentUserRole === 'psicosocial'} 
              value={formData.representacion.psicosocial_asignado_id}
              onChange={(e) => setFormData({ ...formData, representacion: { ...formData.representacion, psicosocial_asignado_id: e.target.value } })}
            >
              {profesionales.psicosociales.map(u => <MenuItem key={u.uid} value={u.uid}>{u.nombre_completo || u.correo}</MenuItem>)}
            </TextField>
          </Grid>

          {/* UBICACIÓN Y CONTACTO */}
          <Grid size={{ xs: 12 }}><Divider textAlign="left"><Typography variant="subtitle2" color="text.secondary">Ubicación y Contacto</Typography></Divider></Grid>
          <Grid size={{ xs: 12, md: 6 }}><TextField select fullWidth size="small" label="Departamento" required value={formData.datos_contacto.departamento} onChange={(e) => setFormData({ ...formData, datos_contacto: { ...formData.datos_contacto, departamento: e.target.value } })}>{DEPARTAMENTOS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}</TextField></Grid>
          <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth size="small" label="Teléfono" required value={formData.datos_contacto.telefono} onChange={(e) => setFormData({ ...formData, datos_contacto: { ...formData.datos_contacto, telefono: e.target.value } })} /></Grid>
          <Grid size={{ xs: 12 }}><TextField fullWidth multiline rows={2} label="Dirección" value={formData.datos_contacto.direccion} onChange={(e) => setFormData({ ...formData, datos_contacto: { ...formData.datos_contacto, direccion: e.target.value } })} /></Grid>

          {/* REPRESENTACIÓN JEP */}
          <Grid size={{ xs: 12 }}><Divider textAlign="left"><Typography variant="subtitle2" color="text.secondary">Representación JEP</Typography></Divider></Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth size="small"><InputLabel>Macrocaso(s)</InputLabel><Select multiple value={formData.representacion.caso} input={<OutlinedInput label="Macrocaso(s)" />} onChange={(e) => setFormData({ ...formData, representacion: { ...formData.representacion, caso: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value } })} renderValue={(selected) => <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{selected.map((value) => <Chip key={value} label={value} size="small" color="primary" />)}</Box>}>{CASOS_JEP.map((caso) => <MenuItem key={caso} value={caso}>{caso}</MenuItem>)}</Select></FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}><TextField select fullWidth size="small" label="Calidad" required value={formData.representacion.calidad_victima} onChange={(e) => setFormData({ ...formData, representacion: { ...formData.representacion, calidad_victima: e.target.value } })}>{CALIDADES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}</TextField></Grid>

          <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
            <Button variant="outlined" onClick={onCancel}>Cancelar</Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: '#003366' }}>Guardar Víctima</Button>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};