import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

type AllowedRole = 'SUPER_ADMIN' | 'ADMIN' | 'CUSTOMER';

interface RouteGuardProps {
  children: ReactNode;
  allowedRoles?: AllowedRole[];
  requireAuth?: boolean;
}

export function RouteGuard({ 
  children, 
  allowedRoles, 
  requireAuth = false 
}: RouteGuardProps) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If auth is required but user is not logged in
  if (requireAuth && !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If specific roles are required
  if (allowedRoles && allowedRoles.length > 0) {
    if (!user || !profile) {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (!allowedRoles.includes(profile.role)) {
      // Redirect to appropriate dashboard based on role
      switch (profile.role) {
        case 'SUPER_ADMIN':
          return <Navigate to="/superadmin" replace />;
        case 'ADMIN':
          return <Navigate to="/admin" replace />;
        case 'CUSTOMER':
        default:
          return <Navigate to="/" replace />;
      }
    }
  }

  return <>{children}</>;
}
