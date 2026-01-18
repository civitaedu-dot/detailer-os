import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute, PublicRoute, PlanRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import Planos from "./pages/Planos";
import Dashboard from "./pages/Dashboard";
import Financeiro from "./pages/Financeiro";
import Agenda from "./pages/Agenda";
import Clientes from "./pages/Clientes";
import Servicos from "./pages/Servicos";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } 
            />
            <Route 
              path="/cadastro" 
              element={
                <PublicRoute>
                  <Cadastro />
                </PublicRoute>
              } 
            />
            
            {/* Plans page - requires auth but not active plan */}
            <Route 
              path="/planos" 
              element={
                <PlanRoute>
                  <Planos />
                </PlanRoute>
              } 
            />
            
            {/* Protected routes - require auth AND active plan */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/financeiro" 
              element={
                <ProtectedRoute>
                  <Financeiro />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/agenda" 
              element={
                <ProtectedRoute>
                  <Agenda />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/clientes" 
              element={
                <ProtectedRoute>
                  <Clientes />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/servicos" 
              element={
                <ProtectedRoute>
                  <Servicos />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/socio-ia" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;