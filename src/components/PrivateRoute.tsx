import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export default function PrivateRoute({ children, requiredRole }: any) {
  const { user, token, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
