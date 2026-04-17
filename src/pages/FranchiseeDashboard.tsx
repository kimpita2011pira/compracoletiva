import { useState } from "react";
import { useFranchiseeMetrics } from "@/hooks/useFranchiseeMetrics";
import { useWallet } from "@/hooks/useWallet";
import { useFranchiseeWithdrawals } from "@/hooks/useWithdrawals";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Building2,
  DollarSign,
  MapPin,
  Package,
  ShoppingCart,
  TrendingUp,
  Wallet,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpRight,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AdminWithdrawals } from "@/components/AdminWithdrawals";
import FranchiseeWithdrawModal from "@/components/FranchiseeWithdrawModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function FranchiseeDashboard() {
  const [days, setDays] = useState(30);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const { data, isLoading } = useFranchiseeMetrics(days);
  const { data: wallet } = useWallet();
  const { data: myWithdrawals } = useFranchiseeWithdrawals();

  if (isLoading) {
    return (
      <AppLayout title="Painel do Franqueado">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  if (!data) {
    return (
      <AppLayout title="Painel do Franqueado">
        <main className="container py-12">
          <div className="rounded-xl border-2 border-dashed py-16 text-center">
            <Building2 className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">Você ainda não tem uma franquia ativa.</p>
          </div>
        </main>
      </AppLayout>
    );
  }

  const { franchise, cities, totals, byCity, dailyRevenue, recentOrders } = data;
  const franchiseePct = franchise.commission_rate - 1;

  return (
    <AppLayout title="🏢 Painel do Franqueado">
      <main className="container space-y-6 py-8">
        {/* Header */}
        <div className="rounded-xl border bg-gradient-to-r from-primary/10 to-primary/5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold">Sua franquia</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Comissão: <strong>{franchiseePct.toFixed(1)}%</strong> sobre vendas validadas
                <span className="mx-1.5">·</span>
                Plataforma: <strong>1%</strong>
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                {cities.length === 0 ? (
                  <span className="text-xs italic text-muted-foreground">Nenhuma cidade vinculada</span>
                ) : (
                  cities.map((c) => (
                    <Badge key={`${c.city}-${c.state}`} variant="secondary" className="font-normal">
                      {c.city}/{c.state}
                    </Badge>
                  ))
                )}
              </div>
            </div>
            <Badge variant={franchise.active ? "default" : "secondary"} className="text-xs">
              {franchise.active ? "Ativa" : "Inativa"}
            </Badge>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="gap-2"><BarChart3 className="h-4 w-4" /> Visão Geral</TabsTrigger>
            <TabsTrigger value="cities" className="gap-2"><MapPin className="h-4 w-4" /> Por Cidade</TabsTrigger>
            <TabsTrigger value="withdrawals" className="gap-2"><DollarSign className="h-4 w-4" /> Saques</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* KPIs */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi icon={<Wallet className="h-5 w-5" />} label="Comissão acumulada" value={fmtBRL(totals.franchiseeCommissionEarned)} accent="primary" />
              <Kpi icon={<DollarSign className="h-5 w-5" />} label="Receita validada" value={fmtBRL(totals.totalRevenue)} accent="success" />
              <Kpi icon={<ShoppingCart className="h-5 w-5" />} label="Pedidos" value={String(totals.totalOrders)} accent="secondary" />
              <Kpi icon={<Building2 className="h-5 w-5" />} label="Vendedores" value={String(totals.vendors)} sub={totals.pendingVendors > 0 ? `${totals.pendingVendors} pendente(s)` : undefined} accent="warning" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi icon={<Package className="h-5 w-5" />} label="Ofertas totais" value={String(totals.offers)} />
              <Kpi icon={<TrendingUp className="h-5 w-5" />} label="Ativas" value={String(totals.activeOffers)} accent="success" />
              <Kpi icon={<CheckCircle className="h-5 w-5" />} label="Validadas" value={String(totals.validatedOffers)} accent="primary" />
              <Kpi icon={<Clock className="h-5 w-5" />} label="Saques pendentes" value={String(totals.pendingWithdrawals)} accent="warning" />
            </div>

            {/* Chart */}
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold">Receita & Comissão</h3>
                  <p className="text-xs text-muted-foreground">Últimos {days} dias (ofertas validadas)</p>
                </div>
                <div className="flex gap-1 rounded-lg border bg-muted/50 p-0.5">
                  {[7, 14, 30].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDays(d)}
                      className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                        days === d ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={dailyRevenue}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="com" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(142, 70%, 45%)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(142, 70%, 45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tickFormatter={(d) => { const [, m, day] = d.split("-"); return `${day}/${m}`; }} fontSize={11} stroke="hsl(var(--muted-foreground))" />
                  <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${v}`} />
                  <Tooltip
                    formatter={(v: number, name) => [fmtBRL(v), name === "revenue" ? "Receita" : "Comissão"]}
                    labelFormatter={(d) => { const [y, m, day] = d.split("-"); return `${day}/${m}/${y}`; }}
                    contentStyle={{ borderRadius: "0.75rem", border: "1px solid hsl(var(--border))" }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#rev)" strokeWidth={2} />
                  <Area type="monotone" dataKey="commission" stroke="hsl(142, 70%, 45%)" fill="url(#com)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Recent orders */}
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <h3 className="mb-4 font-display text-lg font-bold">Pedidos recentes</h3>
              {recentOrders.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Nenhum pedido ainda</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Oferta</TableHead>
                        <TableHead>Cidade</TableHead>
                        <TableHead className="text-center">Qtd</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentOrders.map((o) => (
                        <TableRow key={o.id}>
                          <TableCell className="max-w-[220px] truncate font-medium">{o.offer_title}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{o.city ?? "—"}</TableCell>
                          <TableCell className="text-center">{o.quantity}</TableCell>
                          <TableCell className="text-right font-semibold">{fmtBRL(o.total_price)}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{o.status}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("pt-BR")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="cities">
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <h3 className="mb-4 font-display text-lg font-bold">Performance por cidade</h3>
              {byCity.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma cidade vinculada</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cidade</TableHead>
                        <TableHead className="text-center">Ofertas</TableHead>
                        <TableHead className="text-center">Validadas</TableHead>
                        <TableHead className="text-center">Pedidos</TableHead>
                        <TableHead className="text-right">Receita</TableHead>
                        <TableHead className="text-right">Sua comissão</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {byCity.map((c) => (
                        <TableRow key={c.city}>
                          <TableCell className="font-medium">{c.city}</TableCell>
                          <TableCell className="text-center">{c.offers}</TableCell>
                          <TableCell className="text-center text-success">{c.validated}</TableCell>
                          <TableCell className="text-center">{c.orders}</TableCell>
                          <TableCell className="text-right font-semibold">{fmtBRL(c.revenue)}</TableCell>
                          <TableCell className="text-right text-primary font-medium">{fmtBRL(c.commission)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="withdrawals">
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <h3 className="mb-4 font-display text-lg font-bold">Saques de vendedores das suas cidades</h3>
              <AdminWithdrawals />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </AppLayout>
  );
}

function Kpi({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string; sub?: string; accent?: "primary" | "success" | "warning" | "secondary" }) {
  const accentMap = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/15 text-warning-foreground",
    secondary: "bg-secondary/15 text-secondary-foreground",
  };
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <div className={`grid h-9 w-9 place-items-center rounded-lg ${accent ? accentMap[accent] : "bg-muted text-muted-foreground"}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-display text-lg font-bold leading-tight">{value}</p>
          {sub && <p className="text-[10px] text-warning-foreground">{sub}</p>}
        </div>
      </div>
    </div>
  );
}
