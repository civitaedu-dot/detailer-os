import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogOut, CreditCard, Loader2, Search, LayoutDashboard, Calendar, Users, TrendingUp, Plus, Wrench, FileText, DollarSign, Package, Megaphone, Upload, Settings, Bot, Eye, EyeOff, ClipboardList } from "lucide-react";
import { usePrivacyMode } from "@/contexts/PrivacyModeContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import logo from "@/assets/logo.jpeg";

const mobileMoreItems = [
  { title: "Serviços", url: "/servicos", icon: Wrench },
  { title: "Orçamentos", url: "/orcamentos", icon: FileText },
  { title: "Ordens de Serviço", url: "/ordens-servico", icon: ClipboardList },
  { title: "Financeiro", url: "/financeiro", icon: DollarSign },
  { title: "Estoque", url: "/estoque", icon: Package },
  { title: "Campanhas", url: "/campanhas", icon: Megaphone },
  { title: "Importar", url: "/importar-dados", icon: Upload },
  { title: "Sócio IA", url: "/socio-ia", icon: Bot },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AppLayout() {
  const { user, profile, session, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const isMobile = useIsMobile();
  const { isPrivate, togglePrivacy } = usePrivacyMode();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const handleManageSubscription = async () => {
    if (!session?.access_token) return;
    setIsOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch {
      toast({ title: "Erro", description: "Não foi possível abrir o portal.", variant: "destructive" });
    } finally {
      setIsOpeningPortal(false);
    }
  };

  const getPlanLabel = (plan: string | undefined) => {
    switch (plan) {
      case "base": return "Base";
      case "gestao": return "Gestão";
      case "escala": return "Escala";
      default: return "Sem plano";
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const bottomNavItems = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Agenda", url: "/agenda", icon: Calendar },
    { title: "Clientes", url: "/clientes", icon: Users },
    { title: "Vendas", url: "/vendas", icon: TrendingUp },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {/* Desktop sidebar */}
        {!isMobile && <AppSidebar />}

        <div className="flex-1 flex flex-col min-w-0">
          {/* Top header bar */}
          <header className="h-14 flex items-center justify-between border-b border-border bg-card/50 backdrop-blur-md px-3 sm:px-6 sticky top-0 z-40">
            <div className="flex items-center gap-3">
              {!isMobile && <SidebarTrigger className="text-muted-foreground hover:text-foreground" />}
              {isMobile && (
                <Link to="/dashboard" className="flex items-center gap-2">
                  <img src={logo} alt="DetailerOS" className="w-8 h-8 rounded-lg object-contain" />
                  <span className="font-display font-bold text-sm">
                    Detailer<span className="text-primary">OS</span>
                  </span>
                </Link>
              )}
            </div>

            {/* Global Search - desktop only */}
            <div className="hidden md:flex flex-1 max-w-md mx-6">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar clientes, serviços..."
                  className="pl-9 h-9 bg-secondary/50 border-border/50 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePrivacy}
                className="text-muted-foreground hover:text-foreground"
                title={isPrivate ? "Mostrar valores" : "Ocultar valores"}
              >
                {isPrivate ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </Button>
              <NotificationBell />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">
                        {profile?.name?.charAt(0).toUpperCase() || "U"}
                      </span>
                    </div>
                    <span className="hidden sm:block text-sm font-medium">{profile?.name || "Usuário"}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2">
                    <p className="text-sm font-semibold">{profile?.name}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                    <p className="text-xs text-primary mt-0.5">Plano {getPlanLabel(profile?.plan)}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleManageSubscription} disabled={isOpeningPortal}>
                    {isOpeningPortal ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
                    Gerenciar assinatura
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/planos">Alterar plano</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Page content */}
          <main className={`flex-1 overflow-auto ${isMobile ? 'pb-20' : ''}`}>
            <Outlet />
          </main>

          {/* Mobile bottom navigation */}
          {isMobile && (
            <nav className="fixed bottom-0 left-0 right-0 z-40 h-16 bg-card/95 backdrop-blur-lg border-t border-border flex items-center justify-around px-2">
              {bottomNavItems.map((item) => (
                <Link
                  key={item.url}
                  to={item.url}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                    isActive(item.url) 
                      ? 'text-primary' 
                      : 'text-muted-foreground'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{item.title}</span>
                </Link>
              ))}

              {/* More button */}
              <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
                <SheetTrigger asChild>
                  <button className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-muted-foreground">
                    <Plus className="w-5 h-5" />
                    <span className="text-[10px] font-medium">Mais</span>
                  </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-2xl pb-8">
                  <div className="grid grid-cols-4 gap-4 pt-4">
                    {mobileMoreItems.map((item) => (
                      <Link
                        key={item.url}
                        to={item.url}
                        onClick={() => setMoreOpen(false)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors ${
                          isActive(item.url) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary'
                        }`}
                      >
                        <item.icon className="w-6 h-6" />
                        <span className="text-xs font-medium text-center">{item.title}</span>
                      </Link>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>
            </nav>
          )}
        </div>
      </div>
    </SidebarProvider>
  );
}
