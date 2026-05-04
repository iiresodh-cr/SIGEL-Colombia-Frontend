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
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              
              {isAdminApp && (
                <Route path="/admin" element={
                  <RoleGuard allowedRoles={['superadmin', 'admin']}>
                    <AdminDashboard />
                  </RoleGuard>
                } />
              )}
              
              {!isAdminApp && (
                <>
                  <Route path="/victimas" element={<Victimas />} />
                  <Route path="/victimas/:id" element={<VictimaDetalle />} />
                  <Route path="/eventos" element={<Eventos />} />
                </>
              )}
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ModalProvider>
  );
};

export default AppRouter;