import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Paper, Button, IconButton, Chip 
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { DataGrid, GridColDef, GridToolbar, GridRenderCellParams } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import { jepService } from './jepService';
import { adminService } from '../admin/adminService';
import { useAuth } from '../../core/context/AuthContext';
import { useModal } from '../../core/context/ModalContext';
import { FormVictima } from './FormVictima';
import { Victima } from '../../core/types/jep';
import { Usuario } from '../../core/types/user';

const Victimas = () => {
  const { role, currentUser } = useAuth();
  const navigate = useNavigate();
  const { showModal } = useModal();
  
  const [victimas, setVictimas] = useState<Victima[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [profesionales, setProfesionales] = useState<{ abogados: Usuario[], psicosociales: Usuario[] }>({ abogados: [], psicosociales: [] });

  const loadData = async () => {
    if (!currentUser?.email) return;
    try {
      setLoading(true);
      const [data, profs] = await Promise.all([
        jepService.getVictimas(),
        adminService.getProfesionales()
      ]);
      
      // El DataGrid exige que cada fila tenga un campo 'id' explícito
      const dataFormat = data.map(v => ({ ...v, id: v.id }));
      setVictimas(dataFormat);
      setProfesionales(profs);
    } catch (error) {
      console.error(error);
      showModal('Error', 'No se pudieron cargar los registros.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser, role]);

  const handleSave = async (data: any) => {
    try {
      await jepService.createVictima(data);
      showModal('Éxito', 'Víctima registrada correctamente.', 'success');
      setShowForm(false);
      loadData();
    } catch (error) {
      showModal('Error', 'No se pudo registrar la víctima.', 'error');
    }
  };

  // Función auxiliar para traducir los correos a nombres en el DataGrid
  const getProfesionalNombre = (correoId: string | undefined, tipo: 'abogado' | 'psicosocial') => {
    if (!correoId || correoId.trim() === '') return 'Sin asignar';
    const lista = tipo === 'abogado' ? profesionales.abogados : profesionales.psicosociales;
    const prof = lista.find(p => p.correo.toLowerCase() === correoId.toLowerCase());
    
    if (prof) return prof.nombre_completo || prof.correo;
    
    // Tratamiento para ex-empleados
    if (correoId.includes('ex_empleado')) {
      return correoId.split('ex_empleado-')[1].split('@')[0].replace(/_/g, ' ');
    }
    return correoId;
  };

  // =======================================================
  // DEFINICIÓN DE COLUMNAS PARA EL DATAGRID (Actualizado v7)
  // =======================================================
  const columns: GridColDef[] = [
    { 
      field: 'identificacion', 
      headerName: 'Identificación', 
      width: 130 
    },
    { 
      field: 'nombre_completo', 
      headerName: 'Víctima', 
      flex: 1, 
      minWidth: 220 
    },
    { 
      field: 'abogado', 
      headerName: 'Abogado/a Responsable', 
      flex: 1,
      minWidth: 180,
      // Nueva sintaxis: (value, row)
      valueGetter: (value, row: any) => getProfesionalNombre(row?.representacion?.juridico_asignado_id, 'abogado')
    },
    { 
      field: 'psicosocial', 
      headerName: 'Psicosocial Responsable', 
      flex: 1,
      minWidth: 180,
      // Nueva sintaxis: (value, row)
      valueGetter: (value, row: any) => getProfesionalNombre(row?.representacion?.psicosocial_asignado_id, 'psicosocial')
    },
    { 
      field: 'macrocaso', 
      headerName: 'Macrocaso', 
      width: 140,
      // Nueva sintaxis: (value, row)
      valueGetter: (value, row: any) => row?.representacion?.caso?.join(', ') || 'Sin asignar',
      renderCell: (params: any) => (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center', height: '100%' }}>
          {params.row?.representacion?.caso?.map((c: string) => (
            <Chip key={c} label={c} size="small" sx={{ bgcolor: '#e0e7ff', color: '#3730a3', fontWeight: 'bold' }} />
          ))}
        </Box>
      )
    },
    { 
      field: 'estado', 
      headerName: 'Estado JEP', 
      width: 180,
      // Nueva sintaxis: (value, row)
      valueGetter: (value, row: any) => row?.estado_jep?.estado_acreditacion || 'No está acreditada',
      renderCell: (params: any) => {
        const estado = params.value;
        return (
          <Chip 
            label={estado} 
            size="small" 
            color={estado === 'Acreditada' ? 'success' : (estado === 'No está acreditada' ? 'error' : 'warning')} 
            variant="outlined" 
            sx={{ fontWeight: 'bold' }}
          />
        );
      }
    },
    {
      field: 'acciones',
      headerName: 'Acciones',
      width: 100,
      sortable: false,
      filterable: false,
      renderCell: (params: any) => (
        <IconButton color="primary" onClick={() => navigate(`/victimas/${params.row?.id}`)}>
          <VisibilityIcon />
        </IconButton>
      )
    }
  ];

  return (
    <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main' }}>Matriz General de Víctimas</Typography>
          <Typography variant="body1" color="text.secondary">Base de datos de representación institucional y acreditaciones.</Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />} 
          color="primary"
          onClick={() => setShowForm(true)}
          sx={{ fontWeight: 'bold' }}
        >
          Nuevo Registro
        </Button>
      </Box>

      {showForm ? (
        <Box sx={{ mb: 4, flexGrow: 1, overflowY: 'auto' }}>
          <FormVictima 
            onSave={handleSave} 
            onCancel={() => setShowForm(false)} 
            profesionales={profesionales}
            currentUserRole={role || ''}
            currentUserEmail={currentUser?.email || ''} 
          />
        </Box>
      ) : (
        <Paper elevation={0} sx={{ flexGrow: 1, width: '100%', border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
          <DataGrid
            rows={victimas}
            columns={columns}
            loading={loading}
            slots={{ toolbar: GridToolbar }}
            slotProps={{
              toolbar: {
                showQuickFilter: true, // Habilita la barra de búsqueda universal
                quickFilterProps: { debounceMs: 400 },
              },
            }}
            initialState={{
              pagination: { paginationModel: { pageSize: 25 } },
            }}
            pageSizeOptions={[25, 50, 100]}
            disableRowSelectionOnClick
            sx={{
              border: 'none',
              '& .MuiDataGrid-columnHeaders': { 
                backgroundColor: '#f8fafc', 
                fontWeight: 800, 
                color: '#1e293b' 
              },
              '& .MuiDataGrid-row:hover': { 
                backgroundColor: '#f1f5f9' 
              },
              '& .MuiDataGrid-toolbarContainer': {
                padding: 2,
                backgroundColor: '#ffffff',
                borderBottom: '1px solid #e2e8f0'
              }
            }}
          />
        </Paper>
      )}
    </Box>
  );
};

export default Victimas;