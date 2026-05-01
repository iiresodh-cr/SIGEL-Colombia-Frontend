import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';
import MainLayout from '../layouts/MainLayout';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import ExpedienteDetalle from '../pages/ExpedienteDetalle';

const AppRouter = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Ruta Pública: Acceso inicial */}
          <Route path="/login" element={<Login />} />

          {/* Rutas Privadas: Protegidas por AuthContext y ProtectedRoute */}
          <Route 
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            {/* Panel Principal */}
            <Route path="/dashboard" element={<Dashboard />} />
            
            {/* Gestión de JEP: Listado general de casos */}
            <Route path="/expedientes" element={<div style={{ padding: '20px' }}>Listado de Macrocasos en Desarrollo</div>} />
            
            {/* Gestión de JEP: Detalle, víctimas y bitácora (Ruta Dinámica) */}
            <Route path="/expedientes/:id" element={<ExpedienteDetalle />} />
          </Route>

          {/* Redirecciones de Seguridad */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default AppRouter;