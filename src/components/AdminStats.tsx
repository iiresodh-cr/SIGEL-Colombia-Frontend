import React from 'react';
import { Grid, Paper, Typography, Box } from '@mui/material';

interface StatsProps {
  totalVictimas: number;
  totalCaso01: number;
  totalCaso10: number;
}

export const AdminStats = ({ totalVictimas, totalCaso01, totalCaso10 }: StatsProps) => {
  return (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      <Grid size={{ xs: 12, md: 4 }}>
        <Paper sx={{ p: 3, textAlign: 'center', borderTop: '5px solid #1a365d' }}>
          <Typography variant="h6">Víctimas Totales</Typography>
          <Typography variant="h3" sx={{ fontWeight: 'bold' }}>{totalVictimas}</Typography>
        </Paper>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Paper sx={{ p: 3, textAlign: 'center', borderTop: '5px solid #d32f2f' }}>
          <Typography variant="h6">Macrocaso 01</Typography>
          <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#d32f2f' }}>{totalCaso01}</Typography>
        </Paper>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Paper sx={{ p: 3, textAlign: 'center', borderTop: '5px solid #2e7d32' }}>
          <Typography variant="h6">Macrocaso 10</Typography>
          <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>{totalCaso10}</Typography>
        </Paper>
      </Grid>
    </Grid>
  );
};