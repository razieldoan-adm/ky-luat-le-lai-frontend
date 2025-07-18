// src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  children: JSX.Element;
  allowedRoles?: string[];
  allowAnonymous?: boolean;
}

export default function ProtectedRoute({ children, allowedRoles, allowAnonymous = false }: Props) {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!allowAnonymous && !user) {
    return <Navigate to="/login" />;
  }

  if (!allowAnonymous && allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
}
