import { useState, useCallback } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  CheckCheck,
  Clock,
  Filter,
  Inbox,
  Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Notification } from "@/hooks/useNotifications";

type FilterType = "all" | "unread" | "read";

export default function NotificationsPage() {
  const { data: notifications, unreadCount, markAsRead, markAllRead, deleteNotification, deleteAllRead, isLoading } = useNotifications();
  const [filter, setFilter] = useState<FilterType>("all");
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const handleDelete = useCallback((id: string) => {
    setDeletingIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      deleteNotification.mutate(id);
    }, 300);
  }, [deleteNotification]);

  const readCount = (notifications ?? []).filter((n) => n.read).length;

  const filtered = (notifications ?? []).filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "read") return n.read;
    return true;
  });

  const headerRight = (
    <div className="flex items-center gap-2">
      {readCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => deleteAllRead.mutate()}
          disabled={deleteAllRead.isPending}
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Excluir lidas ({readCount})</span>
        </Button>
      )}
      {unreadCount > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => markAllRead.mutate()}
        >
          <CheckCheck className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Marcar todas como lidas</span>
        </Button>
      )}
    </div>
  );

  return (
    <AppLayout title="🔔 Notificações" headerRight={headerRight}>
      <main className="container max-w-2xl py-6 space-y-4">
        {/* Filters */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all" className="gap-1.5 text-xs">
              <Filter className="h-3.5 w-3.5" />
              Todas ({notifications?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="unread" className="gap-1.5 text-xs">
              <Bell className="h-3.5 w-3.5" />
              Não lidas ({unreadCount})
            </TabsTrigger>
            <TabsTrigger value="read" className="gap-1.5 text-xs">
              <CheckCheck className="h-3.5 w-3.5" />
              Lidas ({(notifications?.length ?? 0) - unreadCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 py-16 animate-fade-in">
            <Inbox className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="font-display font-bold text-muted-foreground">
              {filter === "unread"
                ? "Nenhuma notificação não lida"
                : filter === "read"
                ? "Nenhuma notificação lida"
                : "Nenhuma notificação"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {filter === "all"
                ? "Suas notificações aparecerão aqui"
                : "Tente outro filtro"}
            </p>
          </div>
        )}

        {/* Notifications list */}
        {filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((n) => (
              <NotificationCard
                key={n.id}
                notification={n}
                isDeleting={deletingIds.has(n.id)}
                onRead={() => !n.read && markAsRead.mutate(n.id)}
                onDelete={() => handleDelete(n.id)}
              />
            ))}
          </div>
        )}
      </main>
    </AppLayout>
  );
}

function NotificationCard({
  notification: n,
  onRead,
  onDelete,
  isDeleting,
}: {
  notification: Notification;
  onRead: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <div
      className={`relative rounded-xl border p-4 transition-all duration-300 hover:bg-muted/50 overflow-hidden ${
        !n.read ? "bg-primary/5 border-primary/20" : "bg-card"
      } ${isDeleting ? "animate-slide-out-right opacity-0 pointer-events-none" : "animate-fade-in"}`}
    >
      <button onClick={onRead} className="w-full text-left">
        <div className="flex items-start gap-3 pr-8">
          {!n.read && (
            <span className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-primary" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold">{n.title}</p>
              {!n.read && (
                <Badge variant="secondary" className="text-[10px]">Nova</Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
            </div>
          </div>
        </div>
      </button>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 h-7 w-7 text-muted-foreground hover:text-destructive transition-colors"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
