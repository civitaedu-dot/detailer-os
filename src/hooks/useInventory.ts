import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Product {
  id: string;
  name: string;
  brand: string | null;
  category: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  unit_cost: number;
  supplier_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  movement_type: string;
  quantity: number;
  reason: string | null;
  appointment_id: string | null;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  avg_delivery_days: number | null;
  notes: string | null;
  created_at: string;
}

export const useInventory = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    try {
      const [pRes, mRes, sRes] = await Promise.all([
        supabase.from("products").select("*").eq("user_id", user.id).order("name"),
        supabase.from("stock_movements").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("suppliers").select("*").eq("user_id", user.id).order("name"),
      ]);
      if (pRes.error) throw pRes.error;
      if (mRes.error) throw mRes.error;
      if (sRes.error) throw sRes.error;
      setProducts((pRes.data || []) as Product[]);
      setMovements((mRes.data || []) as StockMovement[]);
      setSuppliers((sRes.data || []) as Supplier[]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addProduct = async (product: Omit<Product, "id" | "created_at" | "is_active">) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("products").insert({ ...product, user_id: user.id } as any);
      if (error) throw error;
      toast({ title: "Produto cadastrado!" });
      await fetchAll();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("products").update(updates as any).eq("id", id).eq("user_id", user.id);
      if (error) throw error;
      await fetchAll();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const deleteProduct = async (id: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("products").delete().eq("id", id).eq("user_id", user.id);
      if (error) throw error;
      toast({ title: "Produto removido" });
      await fetchAll();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const addMovement = async (movement: { product_id: string; movement_type: string; quantity: number; reason?: string; appointment_id?: string }) => {
    if (!user) return;
    try {
      const { error: mErr } = await supabase.from("stock_movements").insert({ ...movement, user_id: user.id } as any);
      if (mErr) throw mErr;

      // Update stock
      const product = products.find((p) => p.id === movement.product_id);
      if (product) {
        const newStock = movement.movement_type === "entrada"
          ? product.current_stock + movement.quantity
          : product.current_stock - movement.quantity;
        await supabase.from("products").update({ current_stock: Math.max(0, newStock) } as any).eq("id", product.id);
      }

      toast({ title: `${movement.movement_type === "entrada" ? "Entrada" : "Saída"} registrada!` });
      await fetchAll();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const addSupplier = async (supplier: Omit<Supplier, "id" | "created_at">) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("suppliers").insert({ ...supplier, user_id: user.id } as any);
      if (error) throw error;
      toast({ title: "Fornecedor cadastrado!" });
      await fetchAll();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const updateSupplier = async (id: string, updates: Partial<Supplier>) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("suppliers").update(updates as any).eq("id", id).eq("user_id", user.id);
      if (error) throw error;
      await fetchAll();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const deleteSupplier = async (id: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("suppliers").delete().eq("id", id).eq("user_id", user.id);
      if (error) throw error;
      toast({ title: "Fornecedor removido" });
      await fetchAll();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const criticalProducts = products.filter((p) => p.is_active && p.current_stock <= p.min_stock);
  const totalStockValue = products.reduce((sum, p) => sum + p.current_stock * p.unit_cost, 0);

  return {
    products, movements, suppliers, isLoading,
    addProduct, updateProduct, deleteProduct,
    addMovement,
    addSupplier, updateSupplier, deleteSupplier,
    criticalProducts, totalStockValue,
    refetch: fetchAll,
  };
};
