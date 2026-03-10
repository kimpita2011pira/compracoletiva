import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useVendor } from "@/hooks/useVendor";
import { useVendorMetrics, useVendorSalesHistory } from "@/hooks/useVendorMetrics";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Store, Clock, CheckCircle, XCircle, Package, Plus, TrendingUp, ShoppingCart, DollarSign, BarChart3 } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useState } from "react";

const statusConfig = {
  PENDENTE: { label: "Pendente", icon: Clock, variant: "secondary" as const, color: "text-yellow-600", bg: "bg-yellow-50" },
  APROVADO: { label: "Aprovado", icon: CheckCircle, variant: "default" as const, color: "text-green-600", bg: "bg-green-50" },
  REJEITADO: { label: "Rejeitado", icon: XCircle, variant: "destructive" as const, color: "text-destructive", bg: "bg-red-50" },
};

const periodOptions = [
  { value: "7", label: "7 dias" },
  { value: "14", label: "14 dias" },
  { value: "30", label: "30 dias" },
];

const VendorDashboard = () => {
  const { vendor, isLoading } = useVendor();
  const { data: metrics } = useVendorMetrics();
  const [salesPeriod, setSalesPeriod] = useState("14");
  const { data: salesHistory } = useVendorSalesHistory(Number(salesPeriod));
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  useEffect(() => {
    if (!isLoading && !vendor) {
      navigate("/vendor/onboarding", { replace: true });
    }
  }, [vendor, isLoading, navigate]);

  if (!vendor) {
    return null;
  }

  const status = statusConfig[vendor.status];
  const StatusIcon = status.icon;
  const isApproved = vendor.status === "APROVADO";
  const isPending = vendor.status === "PENDENTE";

  return (
    <AppLayout
      title="🏪 Área do Vendedor"
      headerRight={<Badge variant={status.variant}>{status.label}</Badge>}
    >
      <div className="container max-w-3xl py-8 space-y-6">
        {/* Company Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Store className="h-5 w-5 text-secondary" />
              {vendor.company_name}
            </CardTitle>
            <CardDescription>
              {vendor.cnpj ? `CNPJ: ${vendor.cnpj}` : "CNPJ não informado"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {vendor.description && (
              <p className="text-sm text-muted-foreground">{vendor.description}</p>
            )}

            <div className={`rounded-lg p-4 ${status.bg} flex items-start gap-3`}>
              <StatusIcon className={`h-5 w-5 mt-0.5 ${status.color}`} />
              <div>
                <p className={`font-semibold ${status.color}`}>
                  {isPending && "Cadastro em análise"}
                  {isApproved && "Empresa aprovada!"}
                  {vendor.status === "REJEITADO" && "Cadastro rejeitado"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isPending && "Seu cadastro está sendo analisado pela equipe. Você será notificado quando for aprovado."}
                  {isApproved && "Sua empresa está ativa! Você pode criar ofertas para seus clientes."}
                  {vendor.status === "REJEITADO" && "Entre em contato com o suporte para mais informações."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {isApproved && metrics && (
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
            <Card>
              <CardContent className="p-4 flex flex-col items-center text-center gap-1">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <p className="text-2xl font-bold text-foreground">{metrics.totalSold}</p>
                <p className="text-xs text-muted-foreground">Unidades Vendidas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col items-center text-center gap-1">
                <DollarSign className="h-5 w-5 text-primary" />
                <p className="text-2xl font-bold text-foreground">
                  R$ {metrics.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground">Receita Total</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col items-center text-center gap-1">
                <TrendingUp className="h-5 w-5 text-primary" />
                <p className="text-2xl font-bold text-foreground">{metrics.activeOffers}</p>
                <p className="text-xs text-muted-foreground">Ofertas Ativas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col items-center text-center gap-1">
                <BarChart3 className="h-5 w-5 text-primary" />
                <p className="text-2xl font-bold text-foreground">{metrics.pendingOrders}</p>
                <p className="text-xs text-muted-foreground">Reservas Pendentes</p>
              </CardContent>
            </Card>
          </div>
        )}

        {isApproved && salesHistory && salesHistory.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="font-display text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Evolução de Vendas
                </CardTitle>
                <ToggleGroup type="single" value={salesPeriod} onValueChange={(v) => v && setSalesPeriod(v)} size="sm" className="gap-0 border rounded-md overflow-hidden">
                  {periodOptions.map((opt) => (
                    <ToggleGroupItem key={opt.value} value={opt.value} className="rounded-none text-xs px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                      {opt.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
              <CardDescription>Unidades vendidas e receita por dia</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  vendas: { label: "Vendas", color: "hsl(var(--primary))" },
                  receita: { label: "Receita (R$)", color: "hsl(var(--secondary))" },
                }}
                className="h-[250px] w-full"
              >
                <AreaChart data={salesHistory} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fillVendas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-vendas)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-vendas)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="fillReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-receita)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-receita)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="vendas"
                    stroke="var(--color-vendas)"
                    fill="url(#fillVendas)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="receita"
                    stroke="var(--color-receita)"
                    fill="url(#fillReceita)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {isApproved && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="cursor-pointer border-2 border-transparent transition-all hover:border-primary/30 hover:shadow-md" onClick={() => navigate("/vendor/create-offer")}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-bold">Criar Oferta</h3>
                  <p className="text-sm text-muted-foreground">Nova oferta coletiva</p>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer border-2 border-transparent transition-all hover:border-secondary/30 hover:shadow-md" onClick={() => navigate("/vendor/my-offers")}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10">
                  <Package className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <h3 className="font-display font-bold">Minhas Ofertas</h3>
                  <p className="text-sm text-muted-foreground">Gerencie suas ofertas</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {isPending && (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center text-muted-foreground">
              <Clock className="mx-auto mb-3 h-10 w-10 text-yellow-500" />
              <p className="font-display font-bold text-foreground">Aguardando aprovação</p>
              <p className="mt-1 text-sm">
                Enquanto isso, prepare suas ofertas! Assim que aprovado, você poderá publicá-las imediatamente.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default VendorDashboard;
