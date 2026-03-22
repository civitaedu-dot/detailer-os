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
import Admin from "./pages/Admin";
import TrialExpired from "./pages/TrialExpired";
import SocioIA from "./pages/SocioIA";
import Orcamentos from "./pages/Orcamentos";
import ConfiguracaoEmpresa from "./pages/ConfiguracaoEmpresa";
import RelatorioServicos from "./pages/RelatorioServicos";
import Notificacoes from "./pages/Notificacoes";
import ImportarDados from "./pages/ImportarDados";
import Vendas from "./pages/Vendas";
import Campanhas from "./pages/Campanhas";
import Estoque from "./pages/Estoque";

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
              path="/orcamentos" 
              element={
                <ProtectedRoute>
                  <Orcamentos />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/relatorio-servicos" 
              element={
                <ProtectedRoute>
                  <RelatorioServicos />
                </ProtectedRoute>
              } 
            />
            <Route
              path="/notificacoes"
              element={
                <ProtectedRoute>
                  <Notificacoes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/importar-dados"
              element={
                <ProtectedRoute>
                  <ImportarDados />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vendas"
              element={
                <ProtectedRoute>
                  <Vendas />
                </ProtectedRoute>
              }
            />
            <Route
              path="/campanhas"
              element={
                <ProtectedRoute>
                  <Campanhas />
                </ProtectedRoute>
              }
            />
            <Route
              path="/socio-ia"
              element={
                <ProtectedRoute>
                  <SocioIA />
                </ProtectedRoute>
              } 
            />
            
            {/* Admin route - requires auth + admin role (checked inside component) */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute requirePlan={false}>
                  <Admin />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/configuracoes" 
              element={
                <ProtectedRoute>
                  <ConfiguracaoEmpresa />
                </ProtectedRoute>
              } 
            />
            
            {/* Trial expired */}
            <Route 
              path="/trial-expirado" 
              element={
                <ProtectedRoute requirePlan={false}>
                  <TrialExpired />
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