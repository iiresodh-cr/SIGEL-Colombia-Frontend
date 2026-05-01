import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { RoleGuard } from '../components/RoleGuard';
import MainLayout from '../layouts/MainLayout';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import AdminDashboard from '../pages/AdminDashboard'; // <-- Importamos tu panel de admin
import ExpedienteDetalle from '../pages/ExpedienteDetalle';

const AppRouter = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            {/* Panel Principal General */}
            <Route path="/dashboard" element={<Dashboard />} />
            
            {/* Panel Exclusivo de Administración */}
            <Route path="/admin" element={
              <RoleGuard allowedRoles={['SuperAdmin', 'Administrador']}>
                <AdminDashboard />
              </RoleGuard>
            } />
            
            <Route path="/expedientes" element={<div style={{ padding: '20px' }}>Listado de Macrocasos en Desarrollo</div>} />
            <Route path="/expedientes/:id" element={<ExpedienteDetalle />} />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default AppRouter;