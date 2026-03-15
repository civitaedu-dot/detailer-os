import { Bell, Check, CheckCheck, Trash2, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const typeColors: Record<string, string> = {
  danger: "bg-destructive/10 border-destructive/30 text-destructive",
  warning: "bg-orange-500/10 border-orange-500/30 text-orange-600",
  alert: "bg-yellow-500/10 border-yellow-500/30 text-yellow-600",
  success: "bg-green-500/10 border-green-500/30 text-green-600",
  info: "bg-primary/10 border-primary/30 text-primary",
  celebration: "bg-pink-500/10 border-pink-500/30 text-pink-600",
};

const NotificationItem = ({
  notification,
  onMarkRead,
  onDelete,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}) => {
  const colorClass = typeColors[notification.type] || typeColors.info;
  return (
    <div
      className={cn(
        "p-3 border-b border-border last:border-0 transition-colors",
        !notification.is_read && "bg-accent/30"
      )}
    >
      <div className="flex items-start gap-2">
        <div className={cn("w-2 h-2 rounded-full mt-2 shrink-0", !notification.is_read ? "bg-primary" : "bg-transparent")} />
        <div className="flex-1 min-w-0">
          <div className={cn("text-xs font-medium px-2 py-0.5 rounded-full border inline-block mb-1", colorClass)}>
            {notification.category === "retention" && "Retenção"}
            {notification.category === "birthday" && "Aniversário"}
            {notification.category === "milestone" && "Marco"}
            {notification.category === "system" && "Sistema"}
          </div>
          <p className="text-sm font-medium leading-tight">{notification.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{notification.message}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR })}
            </span>
            {notification.client_id && (
              <Link to={`/clientes`} className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                <ExternalLink className="w-3 h-3" /> Ver cliente
              </Link>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          {!notification.is_read && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onMarkRead(notification.id)}>
              <Check className="w-3 h-3" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => onDelete(notification.id)}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAll } = useNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] sm:w-[400px] p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-sm">Notificações</h3>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllAsRead}>
                <CheckCheck className="w-3 h-3 mr-1" /> Ler todas
              </Button>
            )}
            {notifications.length > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={clearAll}>
                <Trash2 className="w-3 h-3 mr-1" /> Limpar
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Nenhuma notificação
            </div>
          ) : (
            notifications.slice(0, 20).map((n) => (
              <NotificationItem key={n.id} notification={n} onMarkRead={markAsRead} onDelete={deleteNotification} />
            ))
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <div className="border-t border-border p-2">
            <Button variant="ghost" size="sm" className="w-full text-xs" asChild>
              <Link to="/notificacoes">Ver todas as notificações</Link>
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
