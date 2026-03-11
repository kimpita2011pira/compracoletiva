import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminVendors } from "@/hooks/useAdminVendors";
import { useAdminMetrics } from "@/hooks/useAdminMetrics";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle,
  XCircle,
  Clock,
  Store,
  Building2,
  BarChart3,
  Users,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Package,
  Wallet,
  Megaphone,
} from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";
import { AdminBannerManager } from "@/components/AdminBannerManager";
import { AdminWithdrawals } from "@/components/AdminWithdrawals";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

type VendorStatus = Database["public"]["Enums"]["vendor_status"];

const statusConfig: Record<VendorStatus, { label: string; color: string; icon: React.ReactNode }> = {
  PENDENTE: { label: "Pendente", color: "bg-warning/15 text-warning-foreground border-warning/30", icon: <Clock className="h-4 w-4" /> },
  APROVADO: { label: "Aprovado", color: "bg-success/15 text-success border-success/30", icon: <CheckCircle className="h-4 w-4" /> },
  REJEITADO: { label: "Rejeitado", color: "bg-destructive/15 text-destructive border-destructive/30", icon: <XCircle className="h-4 w-4" /> },
};

const PIE_COLORS = ["hsl(24, 95%, 53%)", "hsl(142, 70%, 45%)", "hsl(0, 84%, 60%)", "hsl(45, 100%, 51%)"];

export default function AdminDashboard() {
  const [chartDays, setChartDays] = useState(14);
  const { vendors, isLoading, updateStatus } = useAdminVendors();
  const { data: metrics, isLoading: metricsLoading } = useAdminMetrics(chartDays);

  const pending = vendors.filter((v) => v.status === "PENDENTE");
  const approved = vendors.filter((v) => v.status === "APROVADO");
  const rejected = vendors.filter((v) => v.status === "REJEITADO");

  const handleStatusChange = async (vendorId: string, status: VendorStatus) => {
    // Clear previous_data when approving/rejecting
    const { error: clearError } = await supabase
      .from("vendors")
      .update({ previous_data: null } as any)
      .eq("id", vendorId);

    updateStatus.mutate(
      { vendorId, status },
      {
        onSuccess: () => toast.success(`Vendedor ${status === "APROVADO" ? "aprovado" : "rejeitado"} com sucesso!`),
        onError: (err) => toast.error(`Erro: ${err.message}`),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <AppLayout title="🛡️ Painel Admin">
      <main className="container py-8">
        <Tabs defaultValue="metricas" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="metricas" className="gap-2">
              <BarChart3 className="h-4 w-4" /> Métricas
            </TabsTrigger>
            <TabsTrigger value="vendedores" className="gap-2">
              <Building2 className="h-4 w-4" /> Vendedores ({vendors.length})
            </TabsTrigger>
            <TabsTrigger value="banners" className="gap-2">
              <Megaphone className="h-4 w-4" /> Banners
            </TabsTrigger>
          </TabsList>

          {/* ===== MÉTRICAS TAB ===== */}
          <TabsContent value="metricas" className="space-y-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
              </span>
              Dados em tempo real — atualização automática
            </div>
            {metricsLoading ? (
              <div className="flex justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : metrics ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <MetricCard icon={<Users className="h-5 w-5" />} label="Usuários" value={metrics.totalUsers} color="primary" />
                  <MetricCard icon={<ShoppingCart className="h-5 w-5" />} label="Pedidos" value={metrics.totalOrders} color="secondary" />
                  <MetricCard
                    icon={<DollarSign className="h-5 w-5" />}
                    label="Receita Total"
                    value={`R$ ${metrics.totalRevenue.toFixed(2).replace(".", ",")}`}
                    color="success"
                  />
                  <MetricCard
                    icon={<Wallet className="h-5 w-5" />}
                    label="Caixa Plataforma"
                    value={`R$ ${metrics.platformBalance.toFixed(2).replace(".", ",")}`}
                    color="warning"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <MetricCard icon={<Building2 className="h-5 w-5" />} label="Vendedores" value={metrics.totalVendors} color="primary" />
                  <MetricCard icon={<Package className="h-5 w-5" />} label="Ofertas Totais" value={metrics.totalOffers} color="secondary" />
                  <MetricCard icon={<TrendingUp className="h-5 w-5" />} label="Ofertas Ativas" value={metrics.activeOffers} color="success" />
                  <MetricCard icon={<Clock className="h-5 w-5" />} label="Vendedores Pendentes" value={pending.length} color="warning" />
                </div>

                <div className="rounded-xl border bg-card p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-display text-lg font-bold">Receita</h3>
                    <div className="flex gap-1 rounded-lg border bg-muted/50 p-0.5">
                      {[7, 14, 30].map((d) => (
                        <button
                          key={d}
                          onClick={() => setChartDays(d)}
                          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                            chartDays === d
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {d}d
                        </button>
                      ))}
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={metrics.dailyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tickFormatter={(d) => { const [, m, day] = d.split("-"); return `${day}/${m}`; }} fontSize={12} stroke="hsl(var(--muted-foreground))" />
                      <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip formatter={(v: number) => [`R$ ${v.toFixed(2)}`, "Receita"]} labelFormatter={(d) => { const [y, m, day] = d.split("-"); return `${day}/${m}/${y}`; }} contentStyle={{ borderRadius: "0.75rem", border: "1px solid hsl(var(--border))" }} />
                      <Bar dataKey="revenue" fill="hsl(24, 95%, 53%)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="rounded-xl border bg-card p-5 shadow-sm">
                  <h3 className="mb-4 font-display text-lg font-bold">Pedidos — últimos {chartDays} dias</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={metrics.dailyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tickFormatter={(d) => { const [, m, day] = d.split("-"); return `${day}/${m}`; }} fontSize={12} stroke="hsl(var(--muted-foreground))" />
                      <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                      <Tooltip labelFormatter={(d) => { const [y, m, day] = d.split("-"); return `${day}/${m}/${y}`; }} contentStyle={{ borderRadius: "0.75rem", border: "1px solid hsl(var(--border))" }} />
                      <Line type="monotone" dataKey="orders" stroke="hsl(142, 70%, 45%)" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border bg-card p-5 shadow-sm">
                    <h3 className="mb-4 font-display text-lg font-bold">Pedidos por Status</h3>
                    {metrics.ordersByStatus.length === 0 ? (
                      <p className="py-8 text-center text-muted-foreground">Sem dados</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie data={metrics.ordersByStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label={({ status, count }) => `${status} (${count})`} fontSize={11}>
                            {metrics.ordersByStatus.map((_, i) => (<Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  <div className="rounded-xl border bg-card p-5 shadow-sm">
                    <h3 className="mb-4 font-display text-lg font-bold">Ofertas por Status</h3>
                    {metrics.offersByStatus.length === 0 ? (
                      <p className="py-8 text-center text-muted-foreground">Sem dados</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie data={metrics.offersByStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label={({ status, count }) => `${status} (${count})`} fontSize={11}>
                            {metrics.offersByStatus.map((_, i) => (<Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {pending.length > 0 && (
                  <div className="rounded-xl border-2 border-warning/40 bg-warning/5 p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="font-display text-lg font-bold flex items-center gap-2">
                        <Clock className="h-5 w-5 text-warning-foreground" />
                        Solicitações Pendentes de Vendedores ({pending.length})
                      </h3>
                    </div>
                    <div className="space-y-3">
                      {pending.map((v) => {
                        const prevData = (v as any).previous_data as Record<string, { de: string; para: string }> | null;
                        const fieldLabels: Record<string, string> = { company_name: "Razão Social", cnpj: "CPF/CNPJ", city: "Cidade", description: "Descrição" };
                        return (
                          <div key={v.id} className="rounded-lg border bg-card p-4 space-y-2">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <Store className="h-4 w-4 text-primary shrink-0" />
                                  <span className="font-bold truncate">{v.company_name}</span>
                                </div>
                                {v.cnpj && <p className="text-xs text-muted-foreground mt-0.5">CNPJ: {v.cnpj}</p>}
                                {v.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{v.description}</p>}
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  {new Date(v.created_at).toLocaleDateString("pt-BR")}
                                </p>
                              </div>
                              <div className="flex gap-2 shrink-0">
                                <Button size="sm" className="gap-1" onClick={() => handleStatusChange(v.id, "APROVADO")}>
                                  <CheckCircle className="h-3.5 w-3.5" /> Aprovar
                                </Button>
                                <Button size="sm" variant="outline" className="gap-1 text-destructive hover:text-destructive" onClick={() => handleStatusChange(v.id, "REJEITADO")}>
                                  <XCircle className="h-3.5 w-3.5" /> Rejeitar
                                </Button>
                              </div>
                            </div>
                            {prevData && Object.keys(prevData).length > 0 && (
                              <div className="rounded-md border border-warning/30 bg-warning/5 p-2 space-y-1">
                                <p className="text-[10px] font-bold text-warning-foreground">✏️ Alterações:</p>
                                {Object.entries(prevData).map(([field, { de, para }]) => (
                                  <p key={field} className="text-[10px]">
                                    <span className="font-medium">{fieldLabels[field] || field}:</span>{" "}
                                    <span className="line-through text-muted-foreground">{de || "(vazio)"}</span> → <span className="font-semibold">{para || "(vazio)"}</span>
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="rounded-xl border bg-card p-5 shadow-sm">
                  <h3 className="mb-4 font-display text-lg font-bold">Pedidos Recentes</h3>
                  {metrics.recentOrders.length === 0 ? (
                    <p className="py-8 text-center text-muted-foreground">Nenhum pedido ainda</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="pb-2 pr-4">Oferta</th>
                            <th className="pb-2 pr-4">Qtd</th>
                            <th className="pb-2 pr-4">Total</th>
                            <th className="pb-2 pr-4">Status</th>
                            <th className="pb-2">Data</th>
                          </tr>
                        </thead>
                        <tbody>
                          {metrics.recentOrders.map((o) => (
                            <tr key={o.id} className="border-b last:border-0">
                              <td className="py-2 pr-4 font-medium truncate max-w-[200px]">{o.offer_title}</td>
                              <td className="py-2 pr-4">{o.quantity}</td>
                              <td className="py-2 pr-4 font-semibold">R$ {Number(o.total_price).toFixed(2).replace(".", ",")}</td>
                              <td className="py-2 pr-4"><Badge variant="outline" className="text-[10px]">{o.status}</Badge></td>
                              <td className="py-2 text-muted-foreground">{new Date(o.created_at).toLocaleDateString("pt-BR")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </TabsContent>

          {/* ===== VENDEDORES TAB ===== */}
          <TabsContent value="vendedores" className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <KpiCard label="Pendentes" value={pending.length} icon={<Clock className="h-5 w-5" />} color="warning" />
              <KpiCard label="Aprovados" value={approved.length} icon={<CheckCircle className="h-5 w-5" />} color="success" />
              <KpiCard label="Rejeitados" value={rejected.length} icon={<XCircle className="h-5 w-5" />} color="destructive" />
            </div>

            <Tabs defaultValue="pendente" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="pendente" className="gap-2">
                  <Clock className="h-4 w-4" /> Pendentes ({pending.length})
                </TabsTrigger>
                <TabsTrigger value="aprovado" className="gap-2">
                  <CheckCircle className="h-4 w-4" /> Aprovados ({approved.length})
                </TabsTrigger>
                <TabsTrigger value="rejeitado" className="gap-2">
                  <XCircle className="h-4 w-4" /> Rejeitados ({rejected.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pendente">
                {pending.length === 0 ? <EmptyState message="Nenhum vendedor pendente de aprovação" /> : (
                  <div className="space-y-4">{pending.map((v) => <VendorCard key={v.id} vendor={v} onApprove={() => handleStatusChange(v.id, "APROVADO")} onReject={() => handleStatusChange(v.id, "REJEITADO")} isPending />)}</div>
                )}
              </TabsContent>
              <TabsContent value="aprovado">
                {approved.length === 0 ? <EmptyState message="Nenhum vendedor aprovado ainda" /> : (
                  <div className="space-y-4">{approved.map((v) => <VendorCard key={v.id} vendor={v} onReject={() => handleStatusChange(v.id, "REJEITADO")} />)}</div>
                )}
              </TabsContent>
              <TabsContent value="rejeitado">
                {rejected.length === 0 ? <EmptyState message="Nenhum vendedor rejeitado" /> : (
                  <div className="space-y-4">{rejected.map((v) => <VendorCard key={v.id} vendor={v} onApprove={() => handleStatusChange(v.id, "APROVADO")} />)}</div>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* ===== BANNERS TAB ===== */}
          <TabsContent value="banners" className="space-y-6">
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <h3 className="mb-4 font-display text-lg font-bold">Gerenciar Banners Promocionais</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Adicione, edite ou desative mensagens que aparecem no topo do site para todos os visitantes.
              </p>
              <AdminBannerManager />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </AppLayout>
  );
}

/* ── Sub-components ── */

function MetricCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  const bgMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    secondary: "bg-secondary/10 text-secondary-foreground",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning-foreground",
  };
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <div className={`rounded-lg p-2 ${bgMap[color]}`}>{icon}</div>
      </div>
      <p className="mt-2 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}

function KpiCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  const colorMap: Record<string, string> = {
    warning: "bg-warning/10 text-warning-foreground",
    success: "bg-success/10 text-success",
    destructive: "bg-destructive/10 text-destructive",
  };
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <div className={`rounded-lg p-2 ${colorMap[color]}`}>{icon}</div>
      </div>
      <p className="mt-2 font-display text-3xl font-bold">{value}</p>
    </div>
  );
}

function VendorCard({ vendor, onApprove, onReject, isPending }: { vendor: Tables<"vendors">; onApprove?: () => void; onReject?: () => void; isPending?: boolean }) {
  const cfg = statusConfig[vendor.status];
  const previousData = (vendor as any).previous_data as Record<string, { de: string; para: string }> | null;
  const fieldLabels: Record<string, string> = {
    company_name: "Razão Social",
    cnpj: "CPF/CNPJ",
    city: "Cidade",
    description: "Descrição",
  };

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-primary shrink-0" />
            <h3 className="font-display font-bold truncate">{vendor.company_name}</h3>
          </div>
          {vendor.cnpj && <p className="mt-1 text-xs text-muted-foreground">CNPJ: {vendor.cnpj}</p>}
          {vendor.description && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{vendor.description}</p>}
          <p className="mt-2 text-xs text-muted-foreground">
            Cadastrado em {new Date(vendor.created_at).toLocaleDateString("pt-BR")}
          </p>
        </div>
        <Badge variant="outline" className={`shrink-0 gap-1 ${cfg.color}`}>
          {cfg.icon} {cfg.label}
        </Badge>
      </div>

      {previousData && Object.keys(previousData).length > 0 && (
        <div className="mt-4 rounded-lg border-2 border-warning/40 bg-warning/5 p-3 space-y-2">
          <p className="text-xs font-bold text-warning-foreground flex items-center gap-1">
            ✏️ Alterações solicitadas pelo vendedor:
          </p>
          {Object.entries(previousData).map(([field, { de, para }]) => (
            <div key={field} className="text-xs">
              <span className="font-medium text-foreground">{fieldLabels[field] || field}:</span>{" "}
              <span className="line-through text-muted-foreground">{de || "(vazio)"}</span>
              {" → "}
              <span className="font-semibold text-foreground">{para || "(vazio)"}</span>
            </div>
          ))}
        </div>
      )}

      {(onApprove || onReject) && (
        <div className="mt-4 flex gap-2 border-t pt-4">
          {onApprove && (
            <Button size="sm" className="gap-1.5" onClick={onApprove}>
              <CheckCircle className="h-3.5 w-3.5" /> Aprovar
            </Button>
          )}
          {onReject && (
            <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive" onClick={onReject}>
              <XCircle className="h-3.5 w-3.5" /> Rejeitar
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 py-12">
      <Building2 className="mb-3 h-10 w-10 text-muted-foreground/40" />
      <p className="font-display font-bold text-muted-foreground">{message}</p>
    </div>
  );
}
