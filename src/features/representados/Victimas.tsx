import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Paper, Button, IconButton, Chip, CircularProgress 
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
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
  const [exportingGoogle, setExportingGoogle] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [profesionales, setProfesionales] = useState<{ abogados: Usuario[], psicosociales: Usuario[] }>({ abogados: [], psicosociales: [] });

  // Control estricto de rol administrativo
  const isAdmin = role === 'admin' || role === 'superadmin';

  const loadData = async () => {
    if (!currentUser?.email) return;
    try {
      setLoading(true);
      const [data, profs] = await Promise.all([
        jepService.getVictimas(),
        adminService.getProfesionales()
      ]);
      
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

  const getProfesionalNombre = (correoId: string | undefined, tipo: 'abogado' | 'psicosocial') => {
    if (!correoId || correoId.trim() === '') return 'Sin asignar';
    const lista = tipo === 'abogado' ? profesionales.abogados : profesionales.psicosociales;
    const prof = lista.find(p => p.correo.toLowerCase() === correoId.toLowerCase());
    
    if (prof) return prof.nombre_completo || prof.correo;
    
    if (correoId.includes('ex_empleado')) {
      return correoId.split('ex_empleado-')[1].split('@')[0].replace(/_/g, ' ');
    }
    return correoId;
  };

  const exportarAGoogleSheets = () => {
    if (!isAdmin || victimas.length === 0) return;
    setExportingGoogle(true);

    if (!document.getElementById('google-gis-script')) {
      const script = document.createElement('script');
      script.src = "https://accounts.google.com/gsi/client";
      script.id = "google-gis-script";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }

    const checkAndInit = () => {
      if (!(window as any).google?.accounts?.oauth2) {
        setTimeout(checkAndInit, 100);
        return;
      }

      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
        scope: 'https://www.googleapis.com/auth/spreadsheets',
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error_code) {
            showModal('Error', 'Permiso denegado por el usuario.', 'error');
            setExportingGoogle(false);
            return;
          }

          try {
            const accessToken = tokenResponse.access_token;

            const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                properties: { title: `Matriz Consolidada SIGEL - ${new Date().toLocaleDateString()}` }
              })
            });

            const spreadsheet = await createResponse.json();
            const spreadsheetId = spreadsheet.spreadsheetId;
            const spreadsheetUrl = spreadsheet.spreadsheetUrl;

            const headers = ["Identificación", "Víctima", "Abogado/a Responsable", "Psicosocial Responsable", "Macrocaso", "Estado JEP"];
            const rows = victimas.map(v => [
              v.identificacion,
              v.nombre_completo,
              getProfesionalNombre(v.representacion?.juridico_asignado_id, 'abogado'),
              getProfesionalNombre(v.representacion?.psicosocial_asignado_id, 'psicosocial'),
              v.representacion?.caso?.join(', ') || 'Sin asignar',
              v.estado_jep?.estado_acreditacion || 'No está acreditada'
            ]);

            await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:append?valueInputOption=USER_ENTERED`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ values: [headers, ...rows] })
            });

            window.open(spreadsheetUrl, '_blank');
            showModal('Éxito', 'Se creó el consolidado en su Google Drive.', 'success');
          } catch (error) {
            console.error(error);
            showModal('Error', 'No se pudieron transferir los datos a Google Drive.', 'error');
          } finally {
            setExportingGoogle(false);
          }
        },
      });

      client.requestAccessToken();
    };

    checkAndInit();
  };

  const columns: GridColDef[] = [
    { field: 'identificacion', headerName: 'Identificación', width: 130 },
    { field: 'nombre_completo', headerName: 'Víctima', flex: 1, minWidth: 220 },
    { 
      field: 'abogado', 
      headerName: 'Abogado/a Responsable', 
      flex: 1,
      minWidth: 180,
      valueGetter: (value, row: any) => getProfesionalNombre(row?.representacion?.juridico_asignado_id, 'abogado')
    },
    { 
      field: 'psicosocial', 
      headerName: 'Psicosocial Responsable', 
      flex: 1,
      minWidth: 180,
      valueGetter: (value, row: any) => getProfesionalNombre(row?.representacion?.psicosocial_asignado_id, 'psicosocial')
    },
    { 
      field: 'macrocaso', 
      headerName: 'Macrocaso', 
      width: 140,
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
        <Box sx={{ display: 'flex', gap: 2 }}>
          {/* RENDERIZADO CONDICIONAL EXCLUSIVO PARA ADMINISTRADORES */}
          {isAdmin && (
            <Button 
              variant="contained" 
              color="success" 
              startIcon={exportingGoogle ? <CircularProgress size={20} color="inherit" /> : <CloudDownloadIcon />}
              onClick={exportarAGoogleSheets}
              disabled={victimas.length === 0 || exportingGoogle}
              sx={{ fontWeight: 'bold' }}
            >
              {exportingGoogle ? 'Abriendo Google Drive...' : 'Exportar a Google Sheets'}
            </Button>
          )}
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
              }
            }}
          />
        </Paper>
      )}
    </Box>
  );
};

export default Victimas;