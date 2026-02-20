import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  DollarSign,
  TrendingUp,
  UserCheck,
  UserX,
  ArrowLeft,
  Loader2,
  Shield,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.jpeg";

interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  plan: string | null;
  plan_status: string | null;
  created_at: string;
  business_name: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const Admin = () => {
  const { user, profile } = useAuth();
  const { isAdmin, isLoading: isLoadingRole } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // Redirect if not admin
  useEffect(() => {
    if (!isLoadingRole && !isAdmin) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAdmin, isLoadingRole, navigate]);

  // Fetch all users
  useEffect(() => {
    if (!isAdmin) return;

    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching users:", error);
        toast({ title: "Erro ao carregar usuários", variant: "destructive" });
      } else {
        setUsers(data || []);
      }
      setIsLoadingUsers(false);
    };

    fetchUsers();
  }, [isAdmin, toast]);

  // Metrics
  const metrics = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.plan_status === "active").length;
    const cancelled = users.filter((u) => u.plan_status === "cancelled").length;
    const inactive = users.filter((u) => !u.plan_status || u.plan_status === "inactive").length;

    // Estimated MRR based on plan prices
    const planPrices: Record<string, number> = {
      base: 69.9,
      gestao: 99.9,
      escala: 149.9,
    };
    const mrr = users
      .filter((u) => u.plan_status === "active" && u.plan)
      .reduce((sum, u) => sum + (planPrices[u.plan!] || 0), 0);

    return { total, active, cancelled, inactive, mrr };
  }, [users]);

  const handleStatusChange = async (userId: string, newStatus: string) => {
    setUpdatingUserId(userId);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ plan_status: newStatus })
        .eq("user_id", userId);

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) => (u.user_id === userId ? { ...u, plan_status: newStatus } : u))
      );
      toast({ title: "Status atualizado com sucesso" });
    } catch (err) {
      console.error("Error updating status:", err);
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const getPlanLabel = (plan: string | null) => {
    switch (plan) {
      case "base": return "Base";
      case "gestao": return "Gestão";
      case "escala": return "Escala";
      default: return "Nenhum";
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Ativo</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Cancelado</Badge>;
      case "test":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Teste</Badge>;
      case "blocked":
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Bloqueado</Badge>;
      default:
        return <Badge variant="secondary">Inativo</Badge>;
    }
  };

  if (isLoadingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="flex items-center gap-2">
              <img src={logo} alt="Logo" className="w-8 h-8 rounded-lg object-contain" />
              <span className="font-display font-semibold hidden sm:block">
                Detailer<span className="text-primary">OS</span>
              </span>
            </Link>
            <div className="flex items-center gap-2 ml-4">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">Painel do Gestor</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Link>
          </Button>
        </div>
      </header>

      <main className="container px-4 sm:px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-display text-2xl sm:text-3xl font-bold mb-2">Painel do Gestor</h1>
          <p className="text-muted-foreground">Visão geral da plataforma e gestão de usuários.</p>
        </motion.div>

        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-8">
          {[
            { label: "Total de Usuários", value: metrics.total, icon: Users },
            { label: "Assinantes Ativos", value: metrics.active, icon: UserCheck },
            { label: "Cancelados", value: metrics.cancelled, icon: UserX },
            { label: "Inativos", value: metrics.inactive, icon: Users },
            { label: "MRR Estimado", value: formatCurrency(metrics.mrr), icon: DollarSign },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-xl p-4 sm:p-6"
            >
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center mb-3">
                <stat.icon className="w-4 h-4 text-primary" />
              </div>
              <p className="text-lg sm:text-2xl font-bold font-display mb-1">{stat.value}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Plans breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card border border-border rounded-xl p-6 mb-8"
        >
          <h3 className="font-display font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Distribuição de Planos (Ativos)
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {["base", "gestao", "escala"].map((plan) => {
              const count = users.filter((u) => u.plan === plan && u.plan_status === "active").length;
              return (
                <div key={plan} className="text-center p-4 rounded-lg bg-secondary/50">
                  <p className="text-2xl font-bold font-display">{count}</p>
                  <p className="text-sm text-muted-foreground">{getPlanLabel(plan)}</p>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Users table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card border border-border rounded-xl overflow-hidden"
        >
          <div className="p-6 border-b border-border">
            <h3 className="font-display font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Usuários ({users.length})
            </h3>
          </div>

          {isLoadingUsers ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden sm:table-cell">Empresa</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Cadastro</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{u.name}</p>
                          <p className="text-xs text-muted-foreground">{u.phone || "—"}</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {u.business_name || "—"}
                      </TableCell>
                      <TableCell>{getPlanLabel(u.plan)}</TableCell>
                      <TableCell>{getStatusBadge(u.plan_status)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {new Date(u.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={u.plan_status || "inactive"}
                          onValueChange={(val) => handleStatusChange(u.user_id, val)}
                          disabled={updatingUserId === u.user_id}
                        >
                          <SelectTrigger className="w-[120px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Ativo</SelectItem>
                            <SelectItem value="inactive">Inativo</SelectItem>
                            <SelectItem value="cancelled">Cancelado</SelectItem>
                            <SelectItem value="test">Teste</SelectItem>
                            <SelectItem value="blocked">Bloqueado</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default Admin;
