import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Package, Plus, ArrowDownCircle, ArrowUpCircle, AlertTriangle, Search,
  Trash2, Edit, Download, Truck, BarChart3, Filter, Eye,
  Bot, Shield, LogOut, CreditCard, Loader2, Wrench, Upload, Megaphone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { useInventory } from "@/hooks/useInventory";
import { useToast } from "@/hooks/use-toast";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useUserRole } from "@/hooks/useUserRole";
import logo from "@/assets/logo.jpeg";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const CATEGORIES = [
  { value: "ceras", label: "Ceras" },
  { value: "shampoos", label: "Shampoos" },
  { value: "peliculas", label: "Películas" },
  { value: "microfibras", label: "Microfibras" },
  { value: "quimicos", label: "Químicos" },
  { value: "polimentos", label: "Polimentos" },
  { value: "acessorios", label: "Acessórios" },
  { value: "outros", label: "Outros" },
];

const UNITS = [
  { value: "un", label: "Unidade" },
  { value: "ml", label: "mL" },
  { value: "l", label: "Litro" },
  { value: "g", label: "Gramas" },
  { value: "kg", label: "Kg" },
  { value: "m", label: "Metro" },
  { value: "m2", label: "m²" },
];

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const COLORS = [
  "hsl(var(--primary))", "hsl(152,60%,45%)", "hsl(38,92%,50%)",
  "hsl(200,80%,50%)", "hsl(340,70%,50%)", "hsl(270,60%,50%)", "hsl(20,80%,50%)", "hsl(100,50%,45%)"
];

const Estoque = () => {
  const { user, profile, session, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const { toast } = useToast();
  const {
    products, movements, suppliers, isLoading,
    addProduct, updateProduct, deleteProduct,
    addMovement, addSupplier, updateSupplier, deleteSupplier,
    criticalProducts, totalStockValue,
  } = useInventory();

  const [activeTab, setActiveTab] = useState("painel");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  // Product form
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [pName, setPName] = useState("");
  const [pBrand, setPBrand] = useState("");
  const [pCategory, setPCategory] = useState("outros");
  const [pUnit, setPUnit] = useState("un");
  const [pStock, setPStock] = useState("");
  const [pMinStock, setPMinStock] = useState("");
  const [pCost, setPCost] = useState("");
  const [pYields, setPYields] = useState("1");
  const [pSupplier, setPSupplier] = useState<string>("");

  // Movement form
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [mProductId, setMProductId] = useState("");
  const [mType, setMType] = useState("entrada");
  const [mQuantity, setMQuantity] = useState("");
  const [mReason, setMReason] = useState("");

  // Supplier form
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [sName, setSName] = useState("");
  const [sContact, setSContact] = useState("");
  const [sPhone, setSPhone] = useState("");
  const [sEmail, setSEmail] = useState("");
  const [sDeliveryDays, setSDeliveryDays] = useState("");
  const [sNotes, setSNotes] = useState("");

  const resetProductForm = () => {
    setPName(""); setPBrand(""); setPCategory("outros"); setPUnit("un");
    setPStock(""); setPMinStock(""); setPCost(""); setPSupplier("");
    setEditingProduct(null); setShowProductForm(false);
  };

  const handleSaveProduct = async () => {
    if (!pName) return;
    const data = {
      name: pName, brand: pBrand || null, category: pCategory, unit: pUnit,
      current_stock: parseFloat(pStock) || 0, min_stock: parseFloat(pMinStock) || 0,
      unit_cost: parseFloat(pCost) || 0, supplier_id: pSupplier || null,
    };
    if (editingProduct) {
      await updateProduct(editingProduct.id, data);
    } else {
      await addProduct(data as any);
    }
    resetProductForm();
  };

  const startEdit = (p: any) => {
    setEditingProduct(p);
    setPName(p.name); setPBrand(p.brand || ""); setPCategory(p.category);
    setPUnit(p.unit); setPStock(String(p.current_stock)); setPMinStock(String(p.min_stock));
    setPCost(String(p.unit_cost)); setPSupplier(p.supplier_id || "");
    setShowProductForm(true);
  };

  const handleSaveMovement = async () => {
    if (!mProductId || !mQuantity) return;
    await addMovement({
      product_id: mProductId, movement_type: mType,
      quantity: parseFloat(mQuantity), reason: mReason || undefined,
    });
    setMProductId(""); setMQuantity(""); setMReason(""); setMType("entrada");
    setShowMovementForm(false);
  };

  const handleSaveSupplier = async () => {
    if (!sName) return;
    await addSupplier({
      name: sName, contact_name: sContact || null, phone: sPhone || null,
      email: sEmail || null, avg_delivery_days: parseInt(sDeliveryDays) || 7, notes: sNotes || null,
    } as any);
    setSName(""); setSContact(""); setSPhone(""); setSEmail(""); setSDeliveryDays(""); setSNotes("");
    setShowSupplierForm(false);
  };

  // Filtered products
  const filteredProducts = useMemo(() => {
    let list = products;
    if (categoryFilter !== "all") list = list.filter((p) => p.category === categoryFilter);
    if (searchTerm) list = list.filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.brand?.toLowerCase().includes(searchTerm.toLowerCase()));
    return list;
  }, [products, categoryFilter, searchTerm]);

  // Chart data
  const categoryChartData = useMemo(() => {
    const map = new Map<string, { count: number; value: number }>();
    products.forEach((p) => {
      const existing = map.get(p.category) || { count: 0, value: 0 };
      map.set(p.category, { count: existing.count + 1, value: existing.value + p.current_stock * p.unit_cost });
    });
    return Array.from(map.entries()).map(([cat, data]) => ({
      name: CATEGORIES.find((c) => c.value === cat)?.label || cat,
      produtos: data.count,
      valor: data.value,
    }));
  }, [products]);

  const consumptionData = useMemo(() => {
    const last3Months = subMonths(new Date(), 3);
    const recent = movements.filter((m) => m.movement_type === "saida" && parseISO(m.created_at) >= last3Months);
    const map = new Map<string, number>();
    recent.forEach((m) => {
      const month = format(parseISO(m.created_at), "MMM/yy", { locale: ptBR });
      map.set(month, (map.get(month) || 0) + m.quantity);
    });
    return Array.from(map.entries()).map(([month, qty]) => ({ month, saidas: qty }));
  }, [movements]);

  // Export
  const exportCSV = () => {
    const headers = "Nome,Marca,Categoria,Unidade,Estoque Atual,Estoque Mínimo,Custo Unitário,Valor Total";
    const rows = products.map((p) =>
      `"${p.name}","${p.brand || ""}","${p.category}","${p.unit}",${p.current_stock},${p.min_stock},${p.unit_cost},${(p.current_stock * p.unit_cost).toFixed(2)}`
    ).join("\n");
    const blob = new Blob([`${headers}\n${rows}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "estoque.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleLogout = async () => { await signOut(); };
  const handleManageSubscription = async () => {
    if (!session?.access_token) return;
    setIsOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch { toast({ title: "Erro", variant: "destructive" }); }
    finally { setIsOpeningPortal(false); }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <img src={logo} alt="DetailerOS" className="w-8 h-8 rounded-lg object-contain" />
            <span className="font-display font-semibold hidden sm:block">Detailer<span className="text-primary">OS</span></span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {[
              { to: "/dashboard", label: "Dashboard" },
              { to: "/financeiro", label: "Financeiro" },
              { to: "/agenda", label: "Agenda" },
              { to: "/clientes", label: "Clientes" },
              { to: "/servicos", label: "Serviços" },
              { to: "/vendas", label: "Vendas" },
              { to: "/campanhas", label: "Campanhas" },
            ].map((l) => (
              <Button key={l.to} variant="ghost" size="sm" asChild><Link to={l.to}>{l.label}</Link></Button>
            ))}
            <Button variant="default" size="sm" asChild><Link to="/estoque"><Package className="w-4 h-4 mr-1" />Estoque</Link></Button>
            {isAdmin && <Button variant="ghost" size="sm" asChild><Link to="/admin" className="text-primary"><Shield className="w-4 h-4 mr-1" />Admin</Link></Button>}
          </nav>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-2">
                    <span className="text-xs font-semibold text-primary">{profile?.name?.charAt(0).toUpperCase() || "U"}</span>
                  </div>
                  <span className="hidden sm:block">{profile?.name || "Usuário"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{profile?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleManageSubscription} disabled={isOpeningPortal}>
                  {isOpeningPortal ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
                  Gerenciar assinatura
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container px-4 sm:px-6 py-6 sm:py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                <Package className="w-7 h-7 text-primary" />
                Controle de Estoque
              </h1>
              <p className="text-muted-foreground mt-1">Gerencie produtos, movimentações e fornecedores</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <Download className="w-4 h-4 mr-1" />Exportar
              </Button>
              <Button size="sm" onClick={() => { resetProductForm(); setShowProductForm(true); }}>
                <Plus className="w-4 h-4 mr-1" />Produto
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1"><Package className="w-4 h-4" /><span className="text-xs">Produtos</span></div>
              <p className="text-xl sm:text-2xl font-bold">{products.length}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1"><AlertTriangle className="w-4 h-4" /><span className="text-xs">Críticos</span></div>
              <p className="text-xl sm:text-2xl font-bold text-destructive">{criticalProducts.length}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1"><ArrowDownCircle className="w-4 h-4" /><span className="text-xs">Movimentações</span></div>
              <p className="text-xl sm:text-2xl font-bold">{movements.length}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1"><BarChart3 className="w-4 h-4" /><span className="text-xs">Valor em Estoque</span></div>
              <p className="text-lg sm:text-xl font-bold">{formatCurrency(totalStockValue)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Critical alerts */}
        {criticalProducts.length > 0 && (
          <Card className="mb-6 border-destructive/30 bg-destructive/5">
            <CardContent className="p-4">
              <h3 className="font-semibold flex items-center gap-2 text-destructive mb-3">
                <AlertTriangle className="w-5 h-5" />Produtos com Estoque Crítico
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {criticalProducts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-background border border-border/50">
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.brand}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="destructive">{p.current_stock} {p.unit}</Badge>
                      <p className="text-xs text-muted-foreground">mín: {p.min_stock}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="painel" className="text-xs sm:text-sm">Painel</TabsTrigger>
            <TabsTrigger value="produtos" className="text-xs sm:text-sm">Produtos</TabsTrigger>
            <TabsTrigger value="movimentacoes" className="text-xs sm:text-sm">Movimentações</TabsTrigger>
            <TabsTrigger value="fornecedores" className="text-xs sm:text-sm">Fornecedores</TabsTrigger>
          </TabsList>

          {/* ===== PAINEL ===== */}
          <TabsContent value="painel">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-lg">Distribuição por Categoria</CardTitle></CardHeader>
                <CardContent>
                  {categoryChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={categoryChartData} cx="50%" cy="50%" outerRadius={80} dataKey="valor" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {categoryChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">Cadastre produtos para visualizar</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-lg">Consumo Recente (Saídas)</CardTitle></CardHeader>
                <CardContent>
                  {consumptionData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={consumptionData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="saidas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">Registre movimentações para visualizar</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ===== PRODUTOS ===== */}
          <TabsContent value="produtos">
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar produto..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={() => { resetProductForm(); setShowProductForm(true); }}>
                <Plus className="w-4 h-4 mr-1" />Novo
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead className="hidden sm:table-cell">Categoria</TableHead>
                        <TableHead>Estoque</TableHead>
                        <TableHead className="hidden sm:table-cell">Custo Un.</TableHead>
                        <TableHead className="hidden md:table-cell">Valor Total</TableHead>
                        <TableHead className="w-20">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum produto encontrado</TableCell></TableRow>
                      ) : filteredProducts.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{p.name}</p>
                              <p className="text-xs text-muted-foreground">{p.brand}</p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant="outline">{CATEGORIES.find((c) => c.value === p.category)?.label || p.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className={p.current_stock <= p.min_stock ? "text-destructive font-semibold" : ""}>
                                {p.current_stock} {p.unit}
                              </span>
                              {p.current_stock <= p.min_stock && <AlertTriangle className="w-4 h-4 text-destructive" />}
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">{formatCurrency(p.unit_cost)}</TableCell>
                          <TableCell className="hidden md:table-cell">{formatCurrency(p.current_stock * p.unit_cost)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => startEdit(p)}><Edit className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => deleteProduct(p.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== MOVIMENTAÇÕES ===== */}
          <TabsContent value="movimentacoes">
            <div className="flex justify-between mb-4">
              <h3 className="text-lg font-semibold">Histórico de Movimentações</h3>
              <Button onClick={() => setShowMovementForm(true)}>
                <Plus className="w-4 h-4 mr-1" />Registrar
              </Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Qtd</TableHead>
                        <TableHead className="hidden sm:table-cell">Motivo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movements.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma movimentação</TableCell></TableRow>
                      ) : movements.slice(0, 50).map((m) => {
                        const product = products.find((p) => p.id === m.product_id);
                        return (
                          <TableRow key={m.id}>
                            <TableCell className="text-sm">{format(parseISO(m.created_at), "dd/MM/yy HH:mm")}</TableCell>
                            <TableCell className="font-medium">{product?.name || "—"}</TableCell>
                            <TableCell>
                              {m.movement_type === "entrada" ? (
                                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30"><ArrowDownCircle className="w-3 h-3 mr-1" />Entrada</Badge>
                              ) : (
                                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30"><ArrowUpCircle className="w-3 h-3 mr-1" />Saída</Badge>
                              )}
                            </TableCell>
                            <TableCell>{m.quantity}</TableCell>
                            <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{m.reason || "—"}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== FORNECEDORES ===== */}
          <TabsContent value="fornecedores">
            <div className="flex justify-between mb-4">
              <h3 className="text-lg font-semibold">Fornecedores</h3>
              <Button onClick={() => setShowSupplierForm(true)}>
                <Plus className="w-4 h-4 mr-1" />Fornecedor
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {suppliers.length === 0 ? (
                <Card className="col-span-full border-dashed">
                  <CardContent className="py-12 text-center">
                    <Truck className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">Nenhum fornecedor cadastrado</p>
                  </CardContent>
                </Card>
              ) : suppliers.map((s) => (
                <Card key={s.id} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{s.name}</h4>
                        {s.contact_name && <p className="text-sm text-muted-foreground">{s.contact_name}</p>}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deleteSupplier(s.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="mt-3 space-y-1 text-sm">
                      {s.phone && <p className="text-muted-foreground">📱 {s.phone}</p>}
                      {s.email && <p className="text-muted-foreground">📧 {s.email}</p>}
                      {s.avg_delivery_days && <p className="text-muted-foreground">🚚 Entrega: ~{s.avg_delivery_days} dias</p>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {products.filter((p) => p.supplier_id === s.id).length} produto(s) vinculado(s)
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Product Dialog */}
        <Dialog open={showProductForm} onOpenChange={setShowProductForm}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingProduct ? "Editar Produto" : "Novo Produto"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Nome *</Label><Input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="Ex: Cera Carnaúba" /></div>
                <div><Label>Marca</Label><Input value={pBrand} onChange={(e) => setPBrand(e.target.value)} placeholder="Ex: Meguiar's" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Categoria</Label>
                  <Select value={pCategory} onValueChange={setPCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Unidade</Label>
                  <Select value={pUnit} onValueChange={setPUnit}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{UNITS.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Estoque Atual</Label><Input type="number" value={pStock} onChange={(e) => setPStock(e.target.value)} /></div>
                <div><Label>Estoque Mínimo</Label><Input type="number" value={pMinStock} onChange={(e) => setPMinStock(e.target.value)} /></div>
                <div><Label>Custo Unitário</Label><Input type="number" step="0.01" value={pCost} onChange={(e) => setPCost(e.target.value)} /></div>
              </div>
              {suppliers.length > 0 && (
                <div>
                  <Label>Fornecedor</Label>
                  <Select value={pSupplier || "none"} onValueChange={(v) => setPSupplier(v === "none" ? "" : v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button className="w-full" onClick={handleSaveProduct}>{editingProduct ? "Salvar Alterações" : "Cadastrar Produto"}</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Movement Dialog */}
        <Dialog open={showMovementForm} onOpenChange={setShowMovementForm}>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar Movimentação</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Produto *</Label>
                <Select value={mProductId} onValueChange={setMProductId}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.current_stock} {p.unit})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo</Label>
                  <Select value={mType} onValueChange={setMType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entrada">Entrada</SelectItem>
                      <SelectItem value="saida">Saída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Quantidade *</Label><Input type="number" value={mQuantity} onChange={(e) => setMQuantity(e.target.value)} /></div>
              </div>
              <div><Label>Motivo</Label><Input value={mReason} onChange={(e) => setMReason(e.target.value)} placeholder="Ex: Compra mensal, Uso em serviço..." /></div>
              <Button className="w-full" onClick={handleSaveMovement}>Registrar</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Supplier Dialog */}
        <Dialog open={showSupplierForm} onOpenChange={setShowSupplierForm}>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Fornecedor</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nome *</Label><Input value={sName} onChange={(e) => setSName(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Contato</Label><Input value={sContact} onChange={(e) => setSContact(e.target.value)} /></div>
                <div><Label>Telefone</Label><Input value={sPhone} onChange={(e) => setSPhone(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>E-mail</Label><Input value={sEmail} onChange={(e) => setSEmail(e.target.value)} /></div>
                <div><Label>Prazo Entrega (dias)</Label><Input type="number" value={sDeliveryDays} onChange={(e) => setSDeliveryDays(e.target.value)} /></div>
              </div>
              <div><Label>Observações</Label><Textarea value={sNotes} onChange={(e) => setSNotes(e.target.value)} rows={3} /></div>
              <Button className="w-full" onClick={handleSaveSupplier}>Cadastrar Fornecedor</Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Estoque;
