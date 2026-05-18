import React, { useState } from 'react';
import { Button, CircularProgress, Typography, Box } from '@mui/material';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';

// DICCIONARIO DE MIGRACIÓN: 'Nombre viejo en DB' -> 'correo institucional correcto'
const MAPPING: Record<string, string> = {
  "Alejandra Solano": "asolano@iiresodh.org",
  "Tatiana Ojeda": "tojeda@iiresodh.org" // Cambia esto por el correo real de Tatiana
  // Agrega más si es necesario
};

export const MigracionLegacy = () => {
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const ejecutarMigracion = async () => {
    if (!window.confirm("¿Seguro que deseas normalizar la base de datos? Se reemplazarán los nombres viejos por correos oficiales.")) return;
    setLoading(true);
    setLog(["Iniciando escaneo de los casos..."]);

    try {
      const victimasRef = collection(db, 'victimas');
      const snapshot = await getDocs(victimasRef);
      
      let actualizados = 0;
      let batch = writeBatch(db);
      let operacionesEnBatch = 0;

      snapshot.forEach((victimaDoc) => {
        const data = victimaDoc.data();
        const rep = data.representacion || {};
        let necesitaActualizar = false;
        let updates: any = {};

        const jurViejo = rep.juridico_asignado_id;
        const psiViejo = rep.psicosocial_asignado_id;

        // Verificar si el jurídico coincide con algún nombre del diccionario
        if (jurViejo && MAPPING[jurViejo]) {
          updates['representacion.juridico_asignado_id'] = MAPPING[jurViejo];
          necesitaActualizar = true;
        }

        // Verificar el psicosocial
        if (psiViejo && MAPPING[psiViejo]) {
          updates['representacion.psicosocial_asignado_id'] = MAPPING[psiViejo];
          necesitaActualizar = true;
        }

        // Si encontramos un caso desactualizado, lo preparamos para actualizar
        if (necesitaActualizar) {
          const ref = doc(db, 'victimas', victimaDoc.id);
          batch.update(ref, updates);
          actualizados++;
          operacionesEnBatch++;
        }

        // Firebase Batch tiene un límite estricto de 500 operaciones por envío
        if (operacionesEnBatch >= 450) {
          batch.commit();
          batch = writeBatch(db);
          operacionesEnBatch = 0;
        }
      });

      // Enviar el resto de actualizaciones que quedaron pendientes
      if (operacionesEnBatch > 0) {
        await batch.commit();
      }

      setLog(prev => [...prev, `¡Migración completada! ${actualizados} casos fueron normalizados exitosamente.`]);
    } catch (error) {
      console.error(error);
      setLog(prev => [...prev, "Error crítico durante la migración. Revisa la consola (F12)."]);
    } finally {
      setLoading(false);
    }
  };

  return (
     <Box sx={{ p: 3, mb: 4, bgcolor: '#fee2e2', border: '2px dashed #ef4444', borderRadius: 2 }}>
        <Typography variant="h6" color="error" sx={{ fontWeight: 'bold' }}>⚠️ Herramienta de Normalización (Uso Único)</Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Este script buscará en toda la colección de víctimas los textos sueltos y los reemplazará por los IDs oficiales del sistema.
        </Typography>
        <Button variant="contained" color="error" onClick={ejecutarMigracion} disabled={loading}>
          {loading ? <CircularProgress size={24} color="inherit" /> : "Ejecutar Migración de IDs"}
        </Button>
        {log.map((l, i) => <Typography key={i} variant="subtitle2" sx={{ mt: 1, color: '#000' }}>{l}</Typography>)}
     </Box>
  );
};