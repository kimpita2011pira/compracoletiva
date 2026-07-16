import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingUp, Receipt } from "lucide-react";

type Row = {
  id: string;
  type: string;
  amount: number;
  source_label: string;
  city: string | null;
  state: string | null;
  description: string | null;
  created_at: string;
};

const TYPE_LABEL: Record<string, { label: string; color: string }> = {
  COMISSAO_FRANQUIA: { label: "Comissão franquia (1%)", color: "text-primary" },
  COMISSAO_SEM_FRANQUIA: { label: "Comissão sem franquia (10%)", color: "text-success" },
  TAXA_ADMIN: { label: "Taxa administrativa", color: "text-warning-foreground" },
  AJUSTE: { label: "Ajuste manual", color: "text-muted-foreground" },
};

export function PlatformWalletLedger() {
  const { data: rows, isLoading } = useQuery({
    queryKey: ["platform-wallet-ledger"],
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_wallet_transactions" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const totals = (rows ?? []).reduce(
    (acc, r) => {
      acc.total += Number(r.amount);
      acc.bySource[r.source_label] = (acc.bySource[r.source_label] ?? 0) + Number(r.amount);
      return acc;
    },
    { total: 0, bySource: {} as Record<string, number> }
  );

  const sourceEntries = Object.entries(totals.bySource).sort((a, b) => b[1] - a[1]);

  return (
    <div className="rounded-2xl border bg-card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Wallet className="h-5 w-5 text-primary" />
        <h3 className="font-display text-lg font-bold">Carteira da plataforma</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Registro detalhado das receitas da plataforma: 1% de cada oferta com franquia ativa,
        10% de comissão em cidades sem franquia e taxa administrativa mensal dos compradores.
      </p>

      {/* Totals by source */}
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border bg-gradient-to-br from-primary/5 to-transparent p-3">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> Total recebido (últimas 200)
          </div>
          <p className="font-display text-2xl font-bold text-primary">
            R$ {totals.total.toFixed(2).replace(".", ",")}
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Receipt className="h-3 w-3" /> Fontes distintas
          </div>
          <p className="font-display text-2xl font-bold">{sourceEntries.length}</p>
        </div>
      </div>

      {sourceEntries.length > 0 && (
        <div className="rounded-lg border">
          <div className="border-b px-3 py-2 text-xs font-semibold text-muted-foreground">
            Total por fonte
          </div>
          <div className="divide-y">
            {sourceEntries.slice(0, 10).map(([source, sum]) => (
              <div key={source} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="truncate">{source}</span>
                <span className="font-semibold shrink-0">
                  R$ {sum.toFixed(2).replace(".", ",")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="text-sm font-semibold mb-2">Histórico</h4>
        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        )}
        {!isLoading && (rows?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhuma receita registrada ainda.
          </p>
        )}
        {rows && rows.length > 0 && (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {rows.map((r) => {
              const cfg = TYPE_LABEL[r.type] ?? { label: r.type, color: "text-foreground" };
              return (
                <div key={r.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold truncate">{r.source_label}</span>
                      <Badge variant="outline" className={`text-[10px] ${cfg.color}`}>
                        {cfg.label}
                      </Badge>
                    </div>
                    {r.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {r.description}
                      </p>
                    )}
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <span className="font-display font-bold text-sm text-success shrink-0">
                    +R$ {Number(r.amount).toFixed(2).replace(".", ",")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
