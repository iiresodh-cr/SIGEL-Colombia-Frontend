import React, { useState } from 'react';
import { Button, CircularProgress, Typography, Box } from '@mui/material';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';

export const MigracionLegacy = () => {
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const ejecutarMigracion = async () => {
    if (!window.confirm("¿Ejecutar migración dinámica para TODOS los abogados y psicosociales?")) return;
    setLoading(true);
    setLog(["1. Obteniendo lista oficial de Personal Autorizado..."]);

    try {
      // 1. Obtener todos los usuarios oficiales
      const usuariosSnapshot = await getDocs(collection(db, 'usuarios'));
      const usuariosOficiales = usuariosSnapshot.docs.map(doc => doc.data());
      
      setLog(prev => [...prev, `✅ Se encontraron ${usuariosOficiales.length} perfiles oficiales. Escaneando 3000 víctimas...`]);

      // 2. Motor para buscar el correo oficial basado en el texto viejo
      const encontrarCorreoOficial = (textoViejo: string) => {
        if (!textoViejo || textoViejo.includes('@')) return null; // Si está vacío o ya es correo, está bien
        
        const textoLimpio = textoViejo.toLowerCase().trim();
        const coincidencia = usuariosOficiales.find(u => {
            const nombreOficial = (u.nombre_completo || '').toLowerCase().trim();
            if (!nombreOficial) return false;
            // Busca si el nombre viejo está dentro del oficial (ej. "Alejandra" en "Alejandra Solano Gallardo") o viceversa
            return nombreOficial.includes(textoLimpio) || textoLimpio.includes(nombreOficial);
        });

        return coincidencia ? coincidencia.correo : null;
      };

      const victimasRef = collection(db, 'victimas');
      const snapshot = await getDocs(victimasRef);
      
      let actualizados = 0;
      let noEncontrados = new Set<string>();
      let batch = writeBatch(db);
      let operacionesEnBatch = 0;

      snapshot.forEach((victimaDoc) => {
        const data = victimaDoc.data();
        const rep = data.representacion || {};
        let necesitaActualizar = false;
        let updates: any = {};

        const jurViejo = rep.juridico_asignado_id;
        const psiViejo = rep.psicosocial_asignado_id;

        // Revisar Abogados / Jurídicos
        if (jurViejo && !jurViejo.includes('@')) {
            const correoNuevo = encontrarCorreoOficial(jurViejo);
            if (correoNuevo) {
                updates['representacion.juridico_asignado_id'] = correoNuevo;
                necesitaActualizar = true;
            } else {
                noEncontrados.add(`Abogado viejo sin perfíl oficial: ${jurViejo}`);
            }
        }

        // Revisar Psicosociales
        if (psiViejo && !psiViejo.includes('@')) {
            const correoNuevo = encontrarCorreoOficial(psiViejo);
            if (correoNuevo) {
                updates['representacion.psicosocial_asignado_id'] = correoNuevo;
                necesitaActualizar = true;
            } else {
                noEncontrados.add(`Psicosocial viejo sin perfíl oficial: ${psiViejo}`);
            }
        }

        // Preparar actualización al Batch
        if (necesitaActualizar) {
          const ref = doc(db, 'victimas', victimaDoc.id);
          batch.update(ref, updates);
          actualizados++;
          operacionesEnBatch++;
        }

        // Firebase Batch tiene límite de 500, enviamos de 450 en 450
        if (operacionesEnBatch >= 450) {
          batch.commit();
          batch = writeBatch(db);
          operacionesEnBatch = 0;
        }
      });

      // Enviar las actualizaciones restantes
      if (operacionesEnBatch > 0) {
        await batch.commit();
      }

      setLog(prev => [...prev, `🎉 ¡Migración completada! ${actualizados} víctimas fueron normalizadas.`]);
      
      if (noEncontrados.size > 0) {
          setLog(prev => [...prev, `⚠️ Ojo: No se pudo arreglar a las siguientes personas porque no están en tu tabla de "Personal Autorizado" (Créalos ahí primero y vuelve a darle a este botón):`, ...Array.from(noEncontrados)]);
      }

    } catch (error) {
      console.error(error);
      setLog(prev => [...prev, "❌ Ocurrió un error. Revisa la consola de tu navegador."]);
    } finally {
      setLoading(false);
    }
  };

  return (
     <Box sx={{ p: 3, mb: 4, bgcolor: '#fee2e2', border: '2px dashed #ef4444', borderRadius: 2 }}>
        <Typography variant="h6" color="error" sx={{ fontWeight: 'bold' }}>⚠️ Motor de Normalización de Base de Datos</Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Este script vinculará dinámicamente todos los textos viejos (Abogados y Psicosociales) a sus correos oficiales verificando los nombres.
        </Typography>
        <Button variant="contained" color="error" onClick={ejecutarMigracion} disabled={loading}>
          {loading ? <CircularProgress size={24} color="inherit" /> : "Iniciar Migración Total"}
        </Button>
        <Box sx={{ mt: 2, maxHeight: 200, overflowY: 'auto' }}>
            {log.map((l, i) => <Typography key={i} variant="caption" sx={{ display: 'block', mt: 0.5, color: l.includes('⚠️') ? 'error.main' : '#333' }}>{l}</Typography>)}
        </Box>
     </Box>
  );
};