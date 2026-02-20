import { Navigate, useLocation } from "react-router-dom";
import { useAuth, isTrialActive, isTrialExpired } from "@/contexts/AuthContext";
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

  // Admins bypass all checks
  if (isAdmin) {
    return <>{children}</>;
  }

  // Check if trial expired → block access
  if (isTrialExpired(profile)) {
    return <Navigate to="/trial-expirado" replace />;
  }

  // Trial active → allow access (treated as gestao plan)
  if (isTrialActive(profile)) {
    return <>{children}</>;
  }

  // Regular plan check
  if (requirePlan && (!profile || profile.plan_status !== "active")) {
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

  if (user && isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Trial active or paid plan → dashboard
  if (user && (isTrialActive(profile) || profile?.plan_status === "active")) {
    return <Navigate to="/dashboard" replace />;
  }

  // Trial expired → block page
  if (user && isTrialExpired(profile)) {
    return <Navigate to="/trial-expirado" replace />;
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

  // Admins bypass
  if (isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Active paid plan → dashboard
  if (profile?.plan_status === "active") {
    return <Navigate to="/dashboard" replace />;
  }

  // Trial active → allow seeing plans (user might want to subscribe early)
  // Trial expired → also allow seeing plans (they need to subscribe)
  return <>{children}</>;
};
