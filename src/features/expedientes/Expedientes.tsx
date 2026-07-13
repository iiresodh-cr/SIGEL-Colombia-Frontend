import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, TableHead, 
  TableRow, TextField, InputAdornment, Button, CircularProgress, Chip 
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useNavigate } from 'react-router-dom';
import { jepService } from '../representados/jepService';

const Expedientes = () => {
  const [expedientes, setExpedientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await jepService.getExpedientes();
        setExpedientes(data);
      } catch (error) {
        console.error("Error al cargar expedientes:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredData = expedientes.filter(exp => 
    (exp.codigoExpediente || "").toLowerCase().includes(search.toLowerCase()) ||
    (exp.macrocaso || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#003366' }}>
            Expedientes JEP
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sistema Integrado de Gestión de Macrocasos
          </Typography>
        </Box>
        
        {/* CORRECCIÓN: Usando slotProps para compatibilidad con MUI v6 */}
        <TextField 
          size="small"
          placeholder="Buscar por código o caso..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 300, bgcolor: 'white' }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }
          }}
        />
      </Box>

      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#f8fafc' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Código de Expediente</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Macrocaso Correspondiente</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Estado Procesal</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Última Actualización</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  No se encontraron expedientes con los criterios de búsqueda.
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((exp) => (
                <TableRow key={exp.id} hover>
                  <TableCell sx={{ fontWeight: 700, color: '#003366' }}>
                    {exp.codigoExpediente}
                  </TableCell>
                  <TableCell>{exp.macrocaso}</TableCell>
                  <TableCell>
                    <Chip 
                      label={exp.estadoProcesal} 
                      size="small" 
                      sx={{ bgcolor: '#e0e7ff', color: '#3730a3', fontWeight: 600 }} 
                    />
                  </TableCell>
                  <TableCell>
                    {exp.fechaRegistro ? new Date(exp.fechaRegistro).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell align="right">
                    <Button 
                      startIcon={<VisibilityIcon />}
                      size="small"
                      onClick={() => navigate(`/expedientes/${exp.id}`)}
                      sx={{ textTransform: 'none' }}
                    >
                      Ver Detalle
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};

export default Expedientes;