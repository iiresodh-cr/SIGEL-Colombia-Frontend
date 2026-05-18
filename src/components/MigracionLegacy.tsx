import React, { useState } from 'react';
import { Button, CircularProgress, Typography, Box } from '@mui/material';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';

// Diccionario para arreglar errores de dedo severos en la base de datos vieja
const MAPPING_MANUAL: Record<string, string> = {
  "tatiaja ojeda": "tojeda@iiresodh.org"
};

export const MigracionLegacy = () => {
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const ejecutarMigracion = async () => {
    if (!window.confirm("¿Ejecutar migración dinámica avanzada para Abogados y Psicosociales?")) return;
    setLoading(true);
    setLog(["1. Obteniendo lista oficial de Personal Autorizado..."]);

    try {
      // 1. Obtener todos los usuarios oficiales
      const usuariosSnapshot = await getDocs(collection(db, 'usuarios'));
      const usuariosOficiales = usuariosSnapshot.docs.map(doc => doc.data());
      
      setLog(prev => [...prev, `✅ Se encontraron ${usuariosOficiales.length} perfiles oficiales. Escaneando víctimas...`]);

      // Función para normalizar texto (quitar tildes y pasar a minúsculas)
      const normalizar = (texto: string) => {
        return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      };

      // 2. Motor avanzado para buscar el correo oficial
      const encontrarCorreoOficial = (textoViejo: string) => {
        if (!textoViejo || textoViejo.includes('@')) return null; 
        
        const textoLimpio = normalizar(textoViejo);

        // Revisar si es un error de tipeo conocido (Ej. Tatiaja)
        if (MAPPING_MANUAL[textoLimpio]) {
            return MAPPING_MANUAL[textoLimpio];
        }

        const palabrasViejas = textoLimpio.split(/\s+/);

        const coincidencia = usuariosOficiales.find(u => {
            const nombreOficial = normalizar(u.nombre_completo || '');
            if (!nombreOficial) return false;
            
            const palabrasOficiales = nombreOficial.split(/\s+/);

            // Verifica que TODAS las palabras del nombre viejo existan en el nombre oficial
            const match = palabrasViejas.every(palabraVieja => 
                palabrasOficiales.some(palabraOficial => 
                    palabraOficial.includes(palabraVieja) || palabraVieja.includes(palabraOficial)
                )
            );
            return match;
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
                noEncontrados.add(`Abogado: ${jurViejo}`);
            }
        }

        // Revisar Psicosociales
        if (psiViejo && !psiViejo.includes('@')) {
            const correoNuevo = encontrarCorreoOficial(psiViejo);
            if (correoNuevo) {
                updates['representacion.psicosocial_asignado_id'] = correoNuevo;
                necesitaActualizar = true;
            } else {
                noEncontrados.add(`Psicosocial: ${psiViejo}`);
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

      setLog(prev => [...prev, `🎉 ¡Migración exitosa! ${actualizados} víctimas fueron conectadas a su perfil oficial.`]);
      
      if (noEncontrados.size > 0) {
          setLog(prev => [...prev, `⚠️ Los siguientes nombres NO existen en tu lista de usuarios oficiales (crea sus perfiles y vuelve a correr el script):`, ...Array.from(noEncontrados)]);
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
          Este script vinculará dinámicamente todos los textos viejos a sus correos oficiales (Inmune a segundos nombres y tildes).
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