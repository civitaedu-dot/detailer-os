import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { PrivacyModeProvider } from "@/contexts/PrivacyModeContext";
import { ProtectedRoute, PublicRoute, PlanRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
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
      <PrivacyModeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/cadastro" element={<PublicRoute><Cadastro /></PublicRoute>} />
            
            {/* Plans page - requires auth but not active plan */}
            <Route path="/planos" element={<PlanRoute><Planos /></PlanRoute>} />
            
            {/* Protected routes with sidebar layout */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/financeiro" element={<Financeiro />} />
              <Route path="/agenda" element={<Agenda />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/servicos" element={<Servicos />} />
              <Route path="/orcamentos" element={<Orcamentos />} />
              <Route path="/relatorio-servicos" element={<RelatorioServicos />} />
              <Route path="/notificacoes" element={<Notificacoes />} />
              <Route path="/importar-dados" element={<ImportarDados />} />
              <Route path="/vendas" element={<Vendas />} />
              <Route path="/campanhas" element={<Campanhas />} />
              <Route path="/estoque" element={<Estoque />} />
              <Route path="/socio-ia" element={<SocioIA />} />
              <Route path="/configuracoes" element={<ConfiguracaoEmpresa />} />
            </Route>

            {/* Admin - requires auth but checked inside */}
            <Route element={<ProtectedRoute requirePlan={false}><AppLayout /></ProtectedRoute>}>
              <Route path="/admin" element={<Admin />} />
            </Route>
            
            {/* Trial expired */}
            <Route path="/trial-expirado" element={<ProtectedRoute requirePlan={false}><TrialExpired /></ProtectedRoute>} />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </PrivacyModeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
