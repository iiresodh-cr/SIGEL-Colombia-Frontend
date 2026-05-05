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
  currentUserEmail: string; 
}

const CASOS_JEP = ['Caso 01', 'Caso 10'];
const BLOQUES_JEP = ['BNOR', 'BSUR', 'BORI', 'BCAR', 'BCC', 'BMM', 'BOCC']; 
const CALIDADES = ['Directa', 'Indirecta', 'Directa (Vocera)', 'Indirecta (Vocera)', 'Indirecta (No Vocera)', 'Ambas'];
const HECHOS = ['Desaparición', 'Desplazamiento', 'Homicidio', 'Secuestro', 'Ataque contra la población civil', 'Violencia Sexual', 'Otro'];
const GENEROS = ['Mujer', 'Hombre', 'No binario', 'Otro', 'Prefiero no decirlo'];
const ORIENTACIONES = ['Heterosexual', 'Lesbiana', 'Gay', 'Bisexual', 'Pansexual', 'Otro'];
const ETNICOS = ['Ninguno', 'Indígena', 'Afrodescendiente/Negro/Mulato', 'Rrom/Gitano', 'Palenquero', 'Raizal'];
const ETAREOS = ['Infancia (0-11)', 'Adolescencia (12-18)', 'Joven (18-28)', 'Adulto (28-60)', 'Adulto Mayor (60+)'];
const DISCAPACIDADES = ['Ninguna', 'Física', 'Auditiva', 'Visual', 'Sordoceguera', 'Intelectual', 'Psicosocial (Mental)', 'Múltiple'];
const DEPARTAMENTOS = ['Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bolívar', 'Boyacá', 'Caldas', 'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba', 'Cundinamarca', 'Guainía', 'Guaviare', 'Huila', 'La Guajira', 'Magdalena', 'Meta', 'Nariño', 'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda', 'San Andrés y Providencia', 'Santander', 'Sucre', 'Tolima', 'Valle del Cauca', 'Vaupés', 'Vichada', 'Bogotá D.C.'];

export const FormVictima = ({ onSave, onCancel, profesionales, currentUserRole, currentUserEmail }: FormVictimaProps) => {
  const isAltRole = currentUserRole === 'admin' || currentUserRole === 'superadmin';

  const [formData, setFormData] = useState<Partial<Victima>>({
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
      hechos_victimizantes: [],
      calidad_victima: '',
      juridico_asignado_id: (currentUserRole === 'abogado') ? currentUserEmail : '',
      psicosocial_asignado_id: (currentUserRole === 'psicosocial') ? currentUserEmail : '',
      fecha_asignacion: new Date().toISOString().split('T')[0],
      estado: 'Activo'
    },
    estado_jep: {
      estado_acreditacion: 'No está acreditada',
      estado_reconocimiento_pj: 'Sin PJ (no se ha recibido poder)',
      auto_acreditacion: '',
      auto_reconocimiento: ''
    },
    seguimiento_vista: {
      primer_contacto: false,
      firma_poder: false,
      demandas_verdad: false,
      sol_desasignacion: false
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as any);
  };

  return (
    <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
      <Typography variant="h6" sx={{ mb: 3, fontWeight: 800, color: 'primary.main' }}>Registro de Nueva Víctima</Typography>
      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          
          <Grid size={{ xs: 12 }}><Divider textAlign="left"><Typography variant="subtitle2" color="text.secondary">Identificación</Typography></Divider></Grid>
          <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth size="small" label="Nombre Completo" required value={formData.nombre_completo} onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })} /></Grid>
          <Grid size={{ xs: 12, md: 3 }}><TextField select fullWidth size="small" label="Tipo Doc." value={formData.tipo_documento} onChange={(e) => setFormData({ ...formData, tipo_documento: e.target.value })}><MenuItem value="CC">CC</MenuItem><MenuItem value="TI">TI</MenuItem><MenuItem value="CE">CE</MenuItem></TextField></Grid>
          <Grid size={{ xs: 12, md: 3 }}><TextField fullWidth size="small" label="Número de Identificación" required value={formData.identificacion} onChange={(e) => setFormData({ ...formData, identificacion: e.target.value })} /></Grid>

          <Grid size={{ xs: 12 }}><Divider textAlign="left"><Typography variant="subtitle2" color="text.secondary">Datos Demográficos</Typography></Divider></Grid>
          <Grid size={{ xs: 12, md: 4 }}><TextField select fullWidth size="small" label="Género" required value={formData.datos_demograficos?.genero} onChange={(e) => setFormData({ ...formData, datos_demograficos: { ...formData.datos_demograficos!, genero: e.target.value } })}>{GENEROS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}</TextField></Grid>
          <Grid size={{ xs: 12, md: 4 }}><TextField select fullWidth size="small" label="Orientación Sexual" value={formData.datos_demograficos?.orientacion_sexual} onChange={(e) => setFormData({ ...formData, datos_demograficos: { ...formData.datos_demograficos!, orientacion_sexual: e.target.value } })}>{ORIENTACIONES.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}</TextField></Grid>
          <Grid size={{ xs: 12, md: 4 }}><TextField select fullWidth size="small" label="Grupo Étnico" value={formData.datos_demograficos?.grupo_etnico} onChange={(e) => setFormData({ ...formData, datos_demograficos: { ...formData.datos_demograficos!, grupo_etnico: e.target.value } })}>{ETNICOS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}</TextField></Grid>
          <Grid size={{ xs: 12, md: 6 }}><TextField select fullWidth size="small" label="Ciclo Vital" value={formData.datos_demograficos?.etareo} onChange={(e) => setFormData({ ...formData, datos_demograficos: { ...formData.datos_demograficos!, etareo: e.target.value } })}>{ETAREOS.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}</TextField></Grid>
          <Grid size={{ xs: 12, md: 6 }}><TextField select fullWidth size="small" label="Discapacidad" value={formData.datos_demograficos?.discapacidad} onChange={(e) => setFormData({ ...formData, datos_demograficos: { ...formData.datos_demograficos!, discapacidad: e.target.value } })}>{DISCAPACIDADES.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}</TextField></Grid>

          <Grid size={{ xs: 12 }}><Divider textAlign="left"><Typography variant="subtitle2" color="text.secondary">Información de Contacto</Typography></Divider></Grid>
          <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth size="small" label="Teléfono" value={formData.datos_contacto?.telefono} onChange={(e) => setFormData({ ...formData, datos_contacto: { ...formData.datos_contacto!, telefono: e.target.value } })} /></Grid>
          <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth size="small" label="Correo Electrónico" value={formData.datos_contacto?.correo} onChange={(e) => setFormData({ ...formData, datos_contacto: { ...formData.datos_contacto!, correo: e.target.value } })} /></Grid>
          <Grid size={{ xs: 12, md: 4 }}><TextField select fullWidth size="small" label="Departamento" value={formData.datos_contacto?.departamento} onChange={(e) => setFormData({ ...formData, datos_contacto: { ...formData.datos_contacto!, departamento: e.target.value } })}>{DEPARTAMENTOS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}</TextField></Grid>
          <Grid size={{ xs: 12 }}><TextField fullWidth size="small" label="Dirección de Residencia" value={formData.datos_contacto?.direccion} onChange={(e) => setFormData({ ...formData, datos_contacto: { ...formData.datos_contacto!, direccion: e.target.value } })} /></Grid>

          <Grid size={{ xs: 12 }}><Divider textAlign="left"><Typography variant="subtitle2" color="text.secondary">Asignación de Responsables</Typography></Divider></Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField 
              select fullWidth size="small" 
              label="Abogado/a Responsable" 
              required 
              disabled={!isAltRole && currentUserRole === 'abogado'} 
              value={formData.representacion?.juridico_asignado_id} 
              onChange={(e) => setFormData({ ...formData, representacion: { ...formData.representacion!, juridico_asignado_id: e.target.value } })}
            >
              {profesionales.abogados.map(u => <MenuItem key={u.uid} value={u.correo}>{u.nombre_completo || u.correo}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField 
              select fullWidth size="small" 
              label="Psicosocial Responsable" 
              required 
              disabled={!isAltRole && currentUserRole === 'psicosocial'} 
              value={formData.representacion?.psicosocial_asignado_id} 
              onChange={(e) => setFormData({ ...formData, representacion: { ...formData.representacion!, psicosocial_asignado_id: e.target.value } })}
            >
              {profesionales.psicosociales.map(u => <MenuItem key={u.uid} value={u.correo}>{u.nombre_completo || u.correo}</MenuItem>)}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12 }}><Divider textAlign="left"><Typography variant="subtitle2" color="text.secondary">Representación y Proceso JEP</Typography></Divider></Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Macrocaso(s)</InputLabel>
              <Select 
                multiple 
                value={formData.representacion?.caso || []} 
                input={<OutlinedInput label="Macrocaso(s)" />} 
                onChange={(e) => setFormData({ ...formData, representacion: { ...formData.representacion!, caso: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value } })} 
                renderValue={(selected) => <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{(selected as string[]).map((value: string) => <Chip key={value} label={value} size="small" color="primary" />)}</Box>}
              >
                {CASOS_JEP.map((caso) => <MenuItem key={caso} value={caso}>{caso}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Bloque(s)</InputLabel>
              <Select 
                multiple 
                value={formData.representacion?.bloque || []} 
                input={<OutlinedInput label="Bloque(s)" />} 
                onChange={(e) => setFormData({ ...formData, representacion: { ...formData.representacion!, bloque: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value } })} 
                renderValue={(selected) => <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{(selected as string[]).map((value: string) => <Chip key={value} label={value} size="small" variant="outlined" />)}</Box>}
              >
                {BLOQUES_JEP.map((bloque) => <MenuItem key={bloque} value={bloque}>{bloque}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Delitos (Hechos)</InputLabel>
              <Select 
                multiple 
                value={formData.representacion?.hechos_victimizantes || []} 
                input={<OutlinedInput label="Delitos (Hechos)" />} 
                onChange={(e) => setFormData({ ...formData, representacion: { ...formData.representacion!, hechos_victimizantes: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value } })} 
                renderValue={(selected) => <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{(selected as string[]).map((value: string) => <Chip key={value} label={value} size="small" />)}</Box>}
              >
                {HECHOS.map((hecho) => <MenuItem key={hecho} value={hecho}>{hecho}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField 
              select fullWidth size="small" label="Calidad de Víctima" required 
              value={formData.representacion?.calidad_victima} 
              onChange={(e) => setFormData({ ...formData, representacion: { ...formData.representacion!, calidad_victima: e.target.value } })}
            >
              {CALIDADES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField 
              select fullWidth size="small" label="Estado Acreditación" 
              value={formData.estado_jep?.estado_acreditacion} 
              onChange={(e) => setFormData({ ...formData, estado_jep: { ...formData.estado_jep!, estado_acreditacion: e.target.value as any } })}
            >
              <MenuItem value="No está acreditada">No está acreditada</MenuItem>
              <MenuItem value="Acreditada">Acreditada</MenuItem>
              <MenuItem value="En trámite (despacho no ha resuelto)">En trámite (despacho no ha resuelto)</MenuItem>
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <TextField 
              select fullWidth size="small" label="Reconocimiento PJ" 
              value={formData.estado_jep?.estado_reconocimiento_pj} 
              onChange={(e) => setFormData({ ...formData, estado_jep: { ...formData.estado_jep!, estado_reconocimiento_pj: e.target.value } })}
            >
              <MenuItem value="Sin PJ (no se ha recibido poder)">Sin PJ</MenuItem>
              <MenuItem value="Con PJ (poder recibido)">Con PJ</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField 
              fullWidth size="small" label="Auto de Acreditación" placeholder="Ej. AUTO MGM-10..."
              value={formData.estado_jep?.auto_acreditacion} 
              onChange={(e) => setFormData({ ...formData, estado_jep: { ...formData.estado_jep!, auto_acreditacion: e.target.value } })} 
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField 
              fullWidth size="small" label="Auto de Reconocimiento" placeholder="Ej. Auto JLR01..."
              value={formData.estado_jep?.auto_reconocimiento} 
              onChange={(e) => setFormData({ ...formData, estado_jep: { ...formData.estado_jep!, auto_reconocimiento: e.target.value } })} 
            />
          </Grid>

          <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
            <Button variant="outlined" color="secondary" onClick={onCancel}>Cancelar</Button>
            <Button type="submit" variant="contained" color="primary">Guardar Víctima</Button>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};