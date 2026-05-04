import React, { useState } from 'react';
import { 
  Box, TextField, Button, Grid, Typography, Paper, 
  MenuItem, Select, InputLabel, FormControl, Chip, OutlinedInput, Divider 
} from '@mui/material';
import { Victima } from '../types/jep';

interface FormVictimaProps {
  onSave: (data: Omit<Victima, 'id' | 'fecha_registro'>) => void;
  onCancel: () => void;
}

const CASOS_JEP = ['Caso 01', 'Caso 10'];
const BLOQUES_JEP = ['BNOR', 'BSUR', 'BORI', 'BCAR', 'BCC', 'BMM'];
const CALIDADES = ['Directa', 'Indirecta', 'Indirecta (Vocera)', 'Ambas'];

// Listado de géneros para el selector
const GENEROS = ['Mujer', 'Hombre', 'No binario', 'Otro', 'Prefiero no decirlo'];

// Listado de departamentos de Colombia para el selector
const DEPARTAMENTOS = [
  'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bolívar', 'Boyacá', 'Caldas', 
  'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba', 'Cundinamarca', 
  'Guainía', 'Guaviare', 'Huila', 'La Guajira', 'Magdalena', 'Meta', 'Nariño', 
  'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda', 'San Andrés y Providencia', 
  'Santander', 'Sucre', 'Tolima', 'Valle del Cauca', 'Vaupés', 'Vichada', 'Bogotá D.C.'
];

export const FormVictima = ({ onSave, onCancel }: FormVictimaProps) => {
  const [formData, setFormData] = useState<Omit<Victima, 'id' | 'fecha_registro' | 'storage_folder_url'>>({
    nombre_completo: '',
    tipo_documento: 'CC',
    identificacion: '',
    datos_demograficos: {
      genero: '',
      orientacion_sexual: '',
      grupo_etnico: 'Ninguno',
      etareo: 'Adulto',
      discapacidad: 'Ninguna'
    },
    datos_contacto: {
      telefono: '',
      correo: '',
      direccion: '',
      departamento: ''
    },
    representacion: {
      caso: [],
      bloque: [],
      calidad_victima: '',
      juridico_asignado_id: '',
      psicosocial_asignado_id: '',
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
      <Typography variant="h6" sx={{ mb: 3, fontWeight: 800, color: '#003366' }}>
        Registro de Nueva Víctima
      </Typography>

      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          
          {/* ================= SECCIÓN 1: DATOS PERSONALES ================= */}
          <Grid size={{ xs: 12 }}>
            <Divider textAlign="left"><Typography variant="subtitle2" color="text.secondary">Datos Personales</Typography></Divider>
          </Grid>
          
          <Grid size={{ xs: 12, md: 8 }}>
            <TextField
              fullWidth size="small" label="Nombre Completo" required
              value={formData.nombre_completo}
              onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              select fullWidth size="small" label="Tipo Doc."
              value={formData.tipo_documento}
              onChange={(e) => setFormData({ ...formData, tipo_documento: e.target.value })}
            >
              <MenuItem value="CC">Cédula de Ciudadanía</MenuItem>
              <MenuItem value="TI">Tarjeta de Identidad</MenuItem>
              <MenuItem value="CE">Cédula de Extranjería</MenuItem>
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth size="small" label="Número de Identificación" required
              value={formData.identificacion}
              onChange={(e) => setFormData({ ...formData, identificacion: e.target.value })}
            />
          </Grid>

          {/* Campo de Género actualizado a Selector */}
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              select fullWidth size="small" label="Género" required
              value={formData.datos_demograficos.genero}
              onChange={(e) => setFormData({ 
                ...formData, 
                datos_demograficos: { ...formData.datos_demograficos, genero: e.target.value } 
              })}
            >
              {GENEROS.map((opcion) => (
                <MenuItem key={opcion} value={opcion}>{opcion}</MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* ================= SECCIÓN 2: DATOS DE CONTACTO ================= */}
          <Grid size={{ xs: 12 }}>
            <Divider textAlign="left" sx={{ mt: 1 }}><Typography variant="subtitle2" color="text.secondary">Información de Contacto</Typography></Divider>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth size="small" label="Teléfono / Celular" required
              value={formData.datos_contacto.telefono}
              onChange={(e) => setFormData({ 
                ...formData, 
                datos_contacto: { ...formData.datos_contacto, telefono: e.target.value } 
              })}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth size="small" label="Correo Electrónico" type="email"
              value={formData.datos_contacto.correo}
              onChange={(e) => setFormData({ 
                ...formData, 
                datos_contacto: { ...formData.datos_contacto, correo: e.target.value } 
              })}
            />
          </Grid>

          {/* Campo de Departamento actualizado a Selector */}
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              select fullWidth size="small" label="Departamento" required
              value={formData.datos_contacto.departamento}
              onChange={(e) => setFormData({ 
                ...formData, 
                datos_contacto: { ...formData.datos_contacto, departamento: e.target.value } 
              })}
            >
              {DEPARTAMENTOS.map((dep) => (
                <MenuItem key={dep} value={dep}>{dep}</MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Campo de Dirección actualizado a Multilínea */}
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth multiline rows={3} label="Dirección / Vereda / Detalles de ubicación"
              placeholder="Ingresa la dirección detallada, incluyendo vereda o indicaciones adicionales..."
              value={formData.datos_contacto.direccion}
              onChange={(e) => setFormData({ 
                ...formData, 
                datos_contacto: { ...formData.datos_contacto, direccion: e.target.value } 
              })}
            />
          </Grid>

          {/* ================= SECCIÓN 3: REPRESENTACIÓN JEP ================= */}
          <Grid size={{ xs: 12 }}>
            <Divider textAlign="left" sx={{ mt: 1 }}><Typography variant="subtitle2" color="text.secondary">Representación JEP (IIRESODH)</Typography></Divider>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Macrocaso(s)</InputLabel>
              <Select
                multiple
                value={formData.representacion.caso}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  representacion: { ...formData.representacion, caso: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value } 
                })}
                input={<OutlinedInput label="Macrocaso(s)" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" color="primary" variant="outlined" />
                    ))}
                  </Box>
                )}
              >
                {CASOS_JEP.map((caso) => (
                  <MenuItem key={caso} value={caso}>{caso}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Bloque(s)</InputLabel>
              <Select
                multiple
                value={formData.representacion.bloque}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  representacion: { ...formData.representacion, bloque: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value } 
                })}
                input={<OutlinedInput label="Bloque(s)" />}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {BLOQUES_JEP.map((bloque) => (
                  <MenuItem key={bloque} value={bloque}>{bloque}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              select fullWidth size="small" label="Calidad de Víctima" required
              value={formData.representacion.calidad_victima}
              onChange={(e) => setFormData({ 
                ...formData, 
                representacion: { ...formData.representacion, calidad_victima: e.target.value } 
              })}
            >
              {CALIDADES.map((calidad) => (
                <MenuItem key={calidad} value={calidad}>{calidad}</MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              select fullWidth size="small" label="Estado Acreditación"
              value={formData.estado_jep.estado_acreditacion}
              onChange={(e) => setFormData({ 
                ...formData, 
                estado_jep: { ...formData.estado_jep, estado_acreditacion: e.target.value as any } 
              })}
            >
              <MenuItem value="Acreditada">Acreditada</MenuItem>
              <MenuItem value="En trámite (despacho no ha resuelto)">En trámite (despacho no ha resuelto)</MenuItem>
              <MenuItem value="No está acreditada">No está acreditada</MenuItem>
            </TextField>
          </Grid>

          {/* ================= BOTONES DE ACCIÓN ================= */}
          <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
            <Button variant="outlined" onClick={onCancel} sx={{ fontWeight: 'bold' }}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: '#003366', fontWeight: 'bold' }}>
              Guardar Víctima
            </Button>
          </Grid>

        </Grid>
      </Box>
    </Paper>
  );
};