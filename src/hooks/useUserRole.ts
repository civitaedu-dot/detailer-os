import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useUserRole = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkRole = useCallback(async () => {
    if (!user) {
      setIsAdmin(false);
      setIsLoading(false);
      return;
    }

    try {
      const query = supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      // Never block routing on a hanging request.
      const result = await Promise.race([
        Promise.resolve(query).catch(() => ({ data: null })),
        new Promise<{ data: null }>((resolve) => setTimeout(() => resolve({ data: null }), 8000)),
      ]);

      setIsAdmin(!!(result as { data: unknown }).data);
    } catch (err) {
      console.error("[useUserRole] Exception:", err);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  }, [user]);


  useEffect(() => {
    checkRole();
  }, [checkRole]);

  return { isAdmin, isLoading, refetchRole: checkRole };
};
