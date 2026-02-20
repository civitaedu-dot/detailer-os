import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requirePlan?: boolean;
}

export const ProtectedRoute = ({ children, requirePlan = true }: ProtectedRouteProps) => {
  const { user, profile, isLoading } = useAuth();
  const { isAdmin, isLoading: isLoadingRole } = useUserRole();
  const location = useLocation();

  if (isLoading || isLoadingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Admins bypass plan requirement
  if (requirePlan && !isAdmin && (!profile || profile.plan_status !== "active")) {
    return <Navigate to="/planos" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

interface PublicRouteProps {
  children: React.ReactNode;
}

export const PublicRoute = ({ children }: PublicRouteProps) => {
  const { user, profile, isLoading } = useAuth();
  const { isAdmin, isLoading: isLoadingRole } = useUserRole();

  if (isLoading || isLoadingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Admins go straight to dashboard
  if (user && isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (user && profile?.plan_status === "active") {
    return <Navigate to="/dashboard" replace />;
  }

  if (user && profile && profile.plan_status !== "active") {
    return <Navigate to="/planos" replace />;
  }

  return <>{children}</>;
};

interface PlanRouteProps {
  children: React.ReactNode;
}

export const PlanRoute = ({ children }: PlanRouteProps) => {
  const { user, profile, isLoading } = useAuth();
  const { isAdmin, isLoading: isLoadingRole } = useUserRole();
  const location = useLocation();

  if (isLoading || isLoadingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/cadastro" state={{ from: location }} replace />;
  }

  // Admins bypass plans page
  if (isAdmin || profile?.plan_status === "active") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
