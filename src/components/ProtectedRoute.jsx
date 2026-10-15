import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, roles, capacidades }) => {
  const { usuario, cargando } = useAuth();

  if (cargando) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  const tieneRol = !roles || roles.includes(usuario.rol_codigo);
  const tieneCapacidad = !capacidades || (usuario.capacidades || []).some(capacidad => capacidades.includes(capacidad));

  if (!tieneRol && !tieneCapacidad) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
