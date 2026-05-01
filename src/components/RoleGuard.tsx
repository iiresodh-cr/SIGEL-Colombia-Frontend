import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/user';

interface Props {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export const RoleGuard = ({ children, allowedRoles }: Props) => {
  const { role } = useAuth();

  if (!role || !allowedRoles.includes(role)) {
    return null; // Si no tiene el rol, no renderiza nada
  }

  return <>{children}</>;
};