import React from 'react';
import { Grid, Paper, Typography, Box, useTheme } from '@mui/material';

interface StatsProps {
  totalVictimas: number;
  totalCaso01: number;
  totalCaso10: number;
}

export const AdminStats = ({ totalVictimas, totalCaso01, totalCaso10 }: StatsProps) => {
  const theme = useTheme();

  return (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      <Grid size={{ xs: 12, md: 4 }}>
        <Paper elevation={0} sx={{ p: 3, textAlign: 'center', border: '1px solid', borderColor: 'divider', borderTop: `4px solid ${theme.palette.primary.main}` }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>Víctimas Totales</Typography>
          <Typography variant="h3" sx={{ fontWeight: 'bold', color: theme.palette.text.primary }}>{totalVictimas}</Typography>
        </Paper>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Paper elevation={0} sx={{ p: 3, textAlign: 'center', border: '1px solid', borderColor: 'divider', borderTop: `4px solid ${theme.palette.warning.main}` }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>Macrocaso 01</Typography>
          <Typography variant="h3" sx={{ fontWeight: 'bold', color: theme.palette.text.primary }}>{totalCaso01}</Typography>
        </Paper>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Paper elevation={0} sx={{ p: 3, textAlign: 'center', border: '1px solid', borderColor: 'divider', borderTop: `4px solid ${theme.palette.secondary.main}` }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>Macrocaso 10</Typography>
          <Typography variant="h3" sx={{ fontWeight: 'bold', color: theme.palette.text.primary }}>{totalCaso10}</Typography>
        </Paper>
      </Grid>
    </Grid>
  );
};