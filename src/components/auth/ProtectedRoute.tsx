import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requirePlan?: boolean;
}

export const ProtectedRoute = ({ children, requirePlan = true }: ProtectedRouteProps) => {
  const { user, profile, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Authenticated but no active plan - redirect to plans page
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // If user is logged in and has active plan, redirect to dashboard
  if (user && profile?.plan_status === "active") {
    return <Navigate to="/dashboard" replace />;
  }

  // If user is logged in but no active plan, redirect to plans
  if (user && profile && profile.plan_status !== "active") {
    return <Navigate to="/planos" replace />;
  }

  return <>{children}</>;
};

interface PlanRouteProps {
  children: React.ReactNode;
}

// Route that requires authentication but allows users without active plan
export const PlanRoute = ({ children }: PlanRouteProps) => {
  const { user, profile, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to cadastro
  if (!user) {
    return <Navigate to="/cadastro" state={{ from: location }} replace />;
  }

  // If user already has active plan, redirect to dashboard
  if (profile?.plan_status === "active") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
