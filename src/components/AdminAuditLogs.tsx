import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, FileText, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const ACTION_LABELS: Record<string, { label: string; variant: "default" | "destructive" | "outline" | "secondary" }> = {
  WITHDRAWAL_APPROVED: { label: "Saque Aprovado", variant: "default" },
  WITHDRAWAL_REJECTED: { label: "Saque Rejeitado", variant: "destructive" },
};

export function AdminAuditLogs() {
  const [actionFilter, setActionFilter] = useState<string>("ALL");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ["audit-logs", actionFilter, dateFrom?.toISOString(), dateTo?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (actionFilter !== "ALL") {
        query = query.eq("action", actionFilter);
      }
      if (dateFrom) {
        query = query.gte("created_at", dateFrom.toISOString());
      }
      if (dateTo) {
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte("created_at", endOfDay.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch admin profiles for display
  const adminIds = [...new Set(logs.map((l) => l.admin_id))];
  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-profiles", adminIds],
    queryFn: async () => {
      if (adminIds.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", adminIds);
      return data ?? [];
    },
    enabled: adminIds.length > 0,
  });

  const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p.name]));

  const clearFilters = () => {
    setActionFilter("ALL");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const hasFilters = actionFilter !== "ALL" || dateFrom || dateTo;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Ação</label>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todas as ações" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas as ações</SelectItem>
              <SelectItem value="WITHDRAWAL_APPROVED">Saque Aprovado</SelectItem>
              <SelectItem value="WITHDRAWAL_REJECTED">Saque Rejeitado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">De</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[150px] justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Início"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} locale={ptBR} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Até</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[150px] justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateTo ? format(dateTo, "dd/MM/yyyy") : "Fim"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateTo} onSelect={setDateTo} locale={ptBR} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex gap-2">
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Limpar filtros
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Results */}
      <div className="rounded-xl border bg-card shadow-sm">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <FileText className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="font-display font-bold text-muted-foreground">Nenhum log encontrado</p>
            {hasFilters && <p className="mt-1 text-sm text-muted-foreground">Tente ajustar os filtros</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-4 py-3">Data/Hora</th>
                  <th className="px-4 py-3">Admin</th>
                  <th className="px-4 py-3">Ação</th>
                  <th className="px-4 py-3">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const actionCfg = ACTION_LABELS[log.action] ?? { label: log.action, variant: "outline" as const };
                  const details = log.details as Record<string, unknown> | null;

                  return (
                    <tr key={log.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {new Date(log.created_at).toLocaleDateString("pt-BR")}{" "}
                        <span className="text-xs">{new Date(log.created_at).toLocaleTimeString("pt-BR")}</span>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {profileMap[log.admin_id] || "Admin"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={actionCfg.variant}>{actionCfg.label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {details && (
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {details.amount != null && (
                              <span>R$ {Number(details.amount).toFixed(2).replace(".", ",")}</span>
                            )}
                            {details.pix_key && <span>Pix: {String(details.pix_key)}</span>}
                            {details.admin_note && (
                              <span className="italic">"{String(details.admin_note)}"</span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {logs.length > 0 && (
          <div className="border-t px-4 py-2 text-xs text-muted-foreground">
            Exibindo {logs.length} registro{logs.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}
