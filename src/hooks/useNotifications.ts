import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  category: string;
  title: string;
  message: string;
  client_id: string | null;
  client_name: string | null;
  metadata: any;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

export const useNotifications = () => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      const notifs = (data || []) as unknown as Notification[];
      setNotifications(notifs);
      setUnreadCount(notifs.filter((n) => !n.is_read).length);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const generateNotifications = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      await supabase.functions.invoke("generate-notifications", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      await fetchNotifications();
    } catch (err) {
      console.error("Error generating notifications:", err);
    }
  }, [session, fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() } as any)
      .eq("id", id);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() } as any)
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
  }, [user]);

  const deleteNotification = useCallback(async (id: string) => {
    const notif = notifications.find((n) => n.id === id);
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (!error) {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (notif && !notif.is_read) setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  }, [notifications]);

  const clearAll = useCallback(async () => {
    if (!user) return;
    const { error } = await supabase.from("notifications").delete().eq("user_id", user.id);
    if (!error) {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user]);

  // Initial fetch + generate
  useEffect(() => {
    if (user) {
      fetchNotifications();
      generateNotifications();
    }
  }, [user]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const newNotif = payload.new as unknown as Notification;
          setNotifications((prev) => [newNotif, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    fetchNotifications,
    generateNotifications,
  };
};
