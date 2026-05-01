import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Divider, CircularProgress, Card, CardContent, Grid } from '@mui/material';
import { jepService } from '../services/jepService';
import { ExpedienteJEP, VictimaJEP } from '../types/jep';
import { FormVictima } from '../components/FormVictima';
import { RoleGuard } from '../components/RoleGuard';

const ExpedienteDetalle = () => {
  const { id } = useParams<{ id: string }>();
  const [expediente, setExpediente] = useState<ExpedienteJEP | null>(null);
  const [victimas, setVictimas] = useState<VictimaJEP[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      Promise.all([jepService.getExpediente(id), jepService.getVictimas(id)])
        .then(([exp, vics]) => {
          setExpediente(exp);
          setVictimas(vics);
        })
        .catch(err => console.error("Error cargando datos del expediente:", err))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleAddVictima = async (data: any) => {
    if (id) {
      try {
        await jepService.addVictima(id, data);
        const updated = await jepService.getVictimas(id);
        setVictimas(updated);
      } catch (error) {
        console.error("Error al vincular víctima:", error);
      }
    }
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
      <CircularProgress />
    </Box>
  );

  return (
    <Box>
      {/* Cabecera del Expediente JEP */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" color="primary" sx={{ fontWeight: 'bold' }}>
          {expediente?.codigoExpediente} - {expediente?.macrocaso}
        </Typography>
        <Typography variant="body1" sx={{ mt: 1, color: 'text.secondary' }}>
          {expediente?.resumenHechos}
        </Typography>
      </Box>
      
      <Divider sx={{ my: 4 }} />

      {/* Listado de Víctimas - Visible para todos los roles autorizados */}
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
        Directorio de Víctimas Vinculadas
      </Typography>
      
      <Grid container spacing={3}>
        {victimas.length > 0 ? (
          victimas.map(v => (
            <Grid size={{ xs: 12, md: 4 }} key={v.id}>
              <Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                    {v.nombreCompleto}
                  </Typography>
                  <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    📞 {v.telefono}
                  </Typography>
                  <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    📍 {v.municipio}, {v.departamento}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      bgcolor: 'secondary.light', 
                      color: 'white', 
                      px: 1, 
                      py: 0.5, 
                      borderRadius: 1,
                      fontWeight: 'bold'
                    }}
                  >
                    {v.estadoAcreditacion}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))
        ) : (
          <Grid size={{ xs: 12 }}>
            <Typography variant="body2" color="text.secondary">
              No hay víctimas vinculadas a este expediente todavía.
            </Typography>
          </Grid>
        )}
      </Grid>

      {/* Formulario de Registro - Protegido por Roles */}
      <RoleGuard allowedRoles={['SuperAdmin', 'Administrador', 'Abogado']}>
        <Box sx={{ mt: 6 }}>
          <Divider sx={{ mb: 4 }}>
            <Typography variant="overline" sx={{ px: 2, color: 'text.secondary' }}>
              Zona de Registro Judicial
            </Typography>
          </Divider>
          <FormVictima onSave={handleAddVictima} />
        </Box>
      </RoleGuard>
    </Box>
  );
};

export default ExpedienteDetalle;