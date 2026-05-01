import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { RoleGuard } from '../components/RoleGuard';
import MainLayout from '../layouts/MainLayout';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import AdminDashboard from '../pages/AdminDashboard';
import ExpedienteDetalle from '../pages/ExpedienteDetalle';

// Detectamos el tipo de aplicación en tiempo de compilación
const isAdminApp = import.meta.env.VITE_APP_TYPE === 'ADMIN';

const AppRouter = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            {/* Panel Principal común a ambas */}
            <Route path="/dashboard" element={<Dashboard />} />
            
            {/* SOLUCIÓN PROFESIONAL: 
               Las rutas de administración SOLO existen si la app se compiló para el subdominio admin.
            */}
            {isAdminApp && (
              <Route path="/admin" element={
                <RoleGuard allowedRoles={['SuperAdmin', 'Administrador']}>
                  <AdminDashboard />
                </RoleGuard>
              } />
            )}
            
            {/* Rutas de gestión de expedientes (App Principal) */}
            {!isAdminApp && (
              <>
                <Route path="/expedientes" element={<div style={{ padding: '20px' }}>Listado de Macrocasos</div>} />
                <Route path="/expedientes/:id" element={<ExpedienteDetalle />} />
              </>
            )}
          </Route>

          {/* Redirección inteligente */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default AppRouter;