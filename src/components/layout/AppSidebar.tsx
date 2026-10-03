import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Calendar, Users, Wrench, FileText, Car, ClipboardList,
  DollarSign, Package, UsersRound,
  TrendingUp, Megaphone, Upload,
  Settings, Shield, Bot
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useUserRole } from "@/hooks/useUserRole";
import logo from "@/assets/logo.jpeg";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

const navGroups = [
  {
    label: "Visão Geral",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Operacional",
    items: [
      { title: "Agenda", url: "/agenda", icon: Calendar },
      { title: "Clientes", url: "/clientes", icon: Users },
      { title: "Serviços", url: "/servicos", icon: Wrench },
      { title: "Orçamentos", url: "/orcamentos", icon: FileText },
      { title: "Ordens de Serviço", url: "/ordens-servico", icon: ClipboardList },
    ],
  },
  {
    label: "Gestão",
    items: [
      { title: "Financeiro", url: "/financeiro", icon: DollarSign },
      { title: "Estoque", url: "/estoque", icon: Package },
    ],
  },
  {
    label: "Crescimento",
    items: [
      { title: "Vendas", url: "/vendas", icon: TrendingUp },
      { title: "Campanhas", url: "/campanhas", icon: Megaphone },
      { title: "Importar", url: "/importar-dados", icon: Upload },
    ],
  },
  {
    label: "Configurações",
    items: [
      { title: "Config. Empresa", url: "/configuracoes", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { isAdmin } = useUserRole();
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <Link to="/dashboard" className="flex items-center gap-3">
          <img src={logo} alt="DetailerOS" className="w-9 h-9 rounded-xl object-contain shrink-0" />
          {!collapsed && (
            <span className="font-display font-bold text-lg tracking-tight">
              Detailer<span className="text-primary">OS</span>
            </span>
          )}
        </Link>
      </SidebarHeader>

      <Separator className="mx-3 w-auto bg-sidebar-border" />

      <SidebarContent className="px-2 py-3">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            {!collapsed && (
              <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-1 px-3">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/dashboard"}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 transition-all hover:bg-sidebar-accent hover:text-sidebar-foreground"
                        activeClassName="bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary"
                      >
                        <item.icon className="w-[18px] h-[18px] shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        {isAdmin && (
          <SidebarGroup>
            {!collapsed && (
              <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-1 px-3">
                Admin
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/admin"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 transition-all hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      activeClassName="bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary"
                    >
                      <Shield className="w-[18px] h-[18px] shrink-0" />
                      {!collapsed && <span>Admin</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3">
        <Button
          asChild
          className="w-full bg-gradient-primary hover:opacity-90 text-primary-foreground font-semibold shadow-accent-glow"
          size={collapsed ? "icon" : "default"}
        >
          <Link to="/socio-ia" className="flex items-center gap-2">
            <Bot className="w-5 h-5 shrink-0" />
            {!collapsed && <span>Sócio IA</span>}
          </Link>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
