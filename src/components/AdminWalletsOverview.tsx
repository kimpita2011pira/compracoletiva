import { useMemo, useState } from "react";
import { useAdminWallets, usePlatformWalletBalance } from "@/hooks/useAdminWallets";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Landmark, Search, Users, Wallet } from "lucide-react";

const formatBRL = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  VENDEDOR: "Vendedor",
  FRANQUEADO: "Franqueado",
  CLIENTE: "Cliente",
};

type Filter = "TODOS" | "VENDEDOR" | "FRANQUEADO" | "CLIENTE";

export function AdminWalletsOverview() {
  const { data: wallets, isLoading, isError } = useAdminWallets();
  const { data: platform } = usePlatformWalletBalance();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("TODOS");

  const rows = useMemo(() => {
    const list = wallets ?? [];
    const term = search.trim().toLowerCase();
    return list.filter((row) => {
      const roles = row.roles ?? "";
      const matchesRole = filter === "TODOS" || roles.includes(filter);
      const matchesTerm =
        !term ||
        (row.name ?? "").toLowerCase().includes(term) ||
        (row.company_name ?? "").toLowerCase().includes(term);
      return matchesRole && matchesTerm;
    });
  }, [wallets, search, filter]);

  const totals = useMemo(() => {
    const list = wallets ?? [];
    const sumFor = (role: string) =>
      list.filter((r) => (r.roles ?? "").includes(role)).reduce((acc, r) => acc + r.balance, 0);
    return {
      vendors: sumFor("VENDEDOR"),
      franchisees: sumFor("FRANQUEADO"),
      all: list.reduce((acc, r) => acc + r.balance, 0),
    };
  }, [wallets]);

  return (
    <section className="space-y-5">
      <div>
        <h3 className="font-display text-lg font-bold">Carteiras em tempo real</h3>
        <p className="text-sm text-muted-foreground">
          Saldo do caixa da plataforma e de cada vendedor, franqueado e cliente. Atualiza automaticamente a cada 5 segundos.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={<Landmark className="h-4 w-4" />}
          label="Caixa da plataforma"
          value={formatBRL(platform?.balance ?? 0)}
          highlight
        />
        <SummaryCard icon={<Building2 className="h-4 w-4" />} label="Total vendedores" value={formatBRL(totals.vendors)} />
        <SummaryCard icon={<Wallet className="h-4 w-4" />} label="Total franqueados" value={formatBRL(totals.franchisees)} />
        <SummaryCard icon={<Users className="h-4 w-4" />} label="Total geral (usuários)" value={formatBRL(totals.all)} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome ou empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(["TODOS", "VENDEDOR", "FRANQUEADO", "CLIENTE"] as Filter[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              className={
                option === filter
                  ? "rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                  : "rounded-full border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted"
              }
            >
              {option === "TODOS" ? "Todos" : ROLE_LABEL[option]}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-10">
          <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {isError && (
        <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          Não foi possível carregar as carteiras agora. Tente novamente em instantes.
        </p>
      )}

      {!isLoading && !isError && rows.length === 0 && (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhuma carteira encontrada com esse filtro.
        </p>
      )}

      {rows.length > 0 && (
        <div className="divide-y rounded-xl border">
          {rows.map((row) => (
            <div key={row.wallet_id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {row.company_name || row.name || "Usuário sem nome"}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {(row.roles ?? "CLIENTE").split(", ").map((role) => (
                    <Badge key={role} variant="outline" className="text-[10px]">
                      {ROLE_LABEL[role] ?? role}
                    </Badge>
                  ))}
                  <span className="text-[11px] text-muted-foreground">
                    atualizado {new Date(row.updated_at).toLocaleString("pt-BR")}
                  </span>
                </div>
              </div>
              <span className="shrink-0 font-display text-sm font-bold text-primary">
                {formatBRL(row.balance)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-primary/40 bg-primary/5" : undefined}>
      <CardContent className="space-y-1 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {icon} {label}
        </div>
        <p className="font-display text-xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
