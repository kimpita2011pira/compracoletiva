import { Bell, CheckCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function NotificationBell() {
  const navigate = useNavigate();
  const { data: notifications, unreadCount, markAsRead, markAllRead } = useNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="font-display font-bold text-sm">Notificações</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-primary hover:text-primary/80"
              onClick={() => markAllRead.mutate()}
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Marcar todas como lidas
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {!notifications?.length ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Nenhuma notificação
            </p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => !n.read && markAsRead.mutate(n.id)}
                className={`w-full text-left border-b last:border-0 px-4 py-3 transition-colors hover:bg-muted/50 ${
                  !n.read ? "bg-primary/5" : ""
                }`}
              >
                <div className="flex items-start gap-2">
                  {!n.read && (
                    <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{n.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </ScrollArea>
        <div className="border-t px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-primary"
            onClick={() => navigate("/notifications")}
          >
            Ver todas as notificações
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
