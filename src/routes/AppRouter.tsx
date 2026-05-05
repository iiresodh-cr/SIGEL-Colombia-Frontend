import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ModalProvider } from '../context/ModalContext';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { RoleGuard } from '../components/RoleGuard';
import MainLayout from '../layouts/MainLayout';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import AdminDashboard from '../pages/AdminDashboard';
import Victimas from '../pages/Victimas';
import VictimaDetalle from '../pages/VictimaDetalle';
import Eventos from '../pages/Eventos';

const isAdminApp = import.meta.env.VITE_APP_TYPE === 'ADMIN';

const AppRouter = () => {
  return (
    <ModalProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Ruta pública */}
            <Route path="/login" element={<Login />} />

            {/* Rutas Protegidas */}
            <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              
              {/* Dashboard común para ambos dominios */}
              <Route path="/dashboard" element={<Dashboard />} />
              
              {/* Rutas exclusivas del dominio ADMIN */}
              {isAdminApp && (
                <Route path="/admin" element={
                  <RoleGuard allowedRoles={['superadmin', 'admin']}>
                    <AdminDashboard />
                  </RoleGuard>
                } />
              )}
              
              {/* RUTAS DE VÍCTIMAS: Ahora visibles para AMBOS dominios */}
              {/* El Admin las necesita para reasignar, el Usuario para trabajar */}
              <Route path="/victimas" element={<Victimas />} />
              <Route path="/victimas/:id" element={<VictimaDetalle />} />
              
              {/* Rutas exclusivas del dominio USUARIOS (Abogados/Psicosociales) */}
              {!isAdminApp && (
                <Route path="/eventos" element={<Eventos />} />
              )}

            </Route>

            {/* Redirecciones y captura de errores */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ModalProvider>
  );
};

export default AppRouter;