import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Core & Layout
import { AuthProvider } from '../core/context/AuthContext';
import { ModalProvider } from '../core/context/ModalContext';
import { ProtectedRoute } from '../core/components/ProtectedRoute';
import { RoleGuard } from '../core/components/RoleGuard';
import MainLayout from '../layouts/MainLayout';

// Features
import Login from '../features/auth/Login';
import Dashboard from '../features/dashboard/Dashboard';
import AdminDashboard from '../features/admin/AdminDashboard';
import ImportadorMasivo from '../features/admin/ImportadorMasivo';
import Victimas from '../features/representados/Victimas';
import VictimaDetalle from '../features/representados/VictimaDetalle';
import Eventos from '../features/agenda/Eventos';
import Audiencias from '../features/agenda/Audiencias';
import Radicados from '../features/agenda/Radicados';
import Expedientes from '../features/expedientes/Expedientes';
import ExpedienteDetalle from '../features/expedientes/ExpedienteDetalle';

const AppRouter = () => {
  return (
    <ModalProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              {/* Dashboard del Profesional */}
              <Route path="/dashboard" element={<Dashboard />} />
              
              {/* Módulo: Administración */}
              <Route path="/admin" element={
                <RoleGuard allowedRoles={['superadmin', 'admin']}>
                  <AdminDashboard />
                </RoleGuard>
              } />
              <Route path="/importar" element={
                <RoleGuard allowedRoles={['superadmin', 'admin']}>
                  <ImportadorMasivo />
                </RoleGuard>
              } />
              
              {/* Módulo: Gestión de Litigio y Representados */}
              <Route path="/victimas" element={<Victimas />} />
              <Route path="/victimas/:id" element={<VictimaDetalle />} />
              <Route path="/expedientes" element={<Expedientes />} />
              <Route path="/expedientes/:id" element={<ExpedienteDetalle />} />
              
              {/* Módulo: Agenda y Actuaciones */}
              <Route path="/eventos" element={<Eventos />} />
              <Route path="/audiencias" element={<Audiencias />} />
              <Route path="/radicados" element={<Radicados />} />
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