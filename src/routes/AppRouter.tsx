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
import Audiencias from '../pages/Audiencias';
import ImportadorMasivo from '../pages/ImportadorMasivo';
import Radicados from '../pages/Radicados';

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
              
              {/* RUTAS EXCLUSIVAS DEL DOMINIO ADMIN */}
              {isAdminApp && (
                <>
                  <Route path="/admin" element={
                    <RoleGuard allowedRoles={['superadmin', 'admin']}>
                      <AdminDashboard />
                    </RoleGuard>
                  } />
                  
                  {/* El importador ahora solo existe en el build de ADMIN */}
                  <Route path="/importar" element={
                    <RoleGuard allowedRoles={['superadmin', 'admin']}>
                      <ImportadorMasivo />
                    </RoleGuard>
                  } />
                </>
              )}
              
              {/* RUTAS COMUNES: Visibles para AMBOS dominios (Admin y Usuarios) */}
              <Route path="/victimas" element={<Victimas />} />
              <Route path="/victimas/:id" element={<VictimaDetalle />} />
              <Route path="/eventos" element={<Eventos />} />
              <Route path="/audiencias" element={<Audiencias />} />
              <Route path="/radicados" element={<Radicados />} />

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