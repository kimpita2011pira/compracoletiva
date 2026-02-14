import { Navigate } from "react-router-dom";
import { forwardRef } from "react";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export const ProtectedRoute = forwardRef<HTMLDivElement, ProtectedRouteProps>(
  ({ children, requiredRole }: ProtectedRouteProps, ref) => {
    const { user, loading, roles } = useAuth();

    if (loading) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      );
    }

    if (!user) return <Navigate to="/auth" replace />;
    if (requiredRole && !roles.includes(requiredRole)) return <Navigate to="/" replace />;

    return <div ref={ref}>{children}</div>;
  }
);
