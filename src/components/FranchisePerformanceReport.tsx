import { useFranchisePerformance } from "@/hooks/useFranchisePerformance";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, TrendingUp, DollarSign, Package, ShoppingCart } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function FranchisePerformanceReport() {
  const { data, isLoading } = useFranchisePerformance();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!data) return null;

  const totals = data.byFranchise.reduce(
    (acc, r) => ({
      revenue: acc.revenue + r.total_revenue,
      orders: acc.orders + r.total_orders,
      offers: acc.offers + r.total_offers,
      commission: acc.commission + r.franchisee_commission,
    }),
    { revenue: 0, orders: 0, offers: 0, commission: 0 }
  );
  totals.revenue += data.unassigned.total_revenue;
  totals.orders += data.unassigned.total_orders;
  totals.offers += data.unassigned.total_offers;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-lg font-bold">Relatório de Performance</h3>
        <p className="text-sm text-muted-foreground">Métricas consolidadas por franquia e cidade</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile icon={<Package className="h-4 w-4" />} label="Ofertas totais" value={String(totals.offers)} />
        <KpiTile icon={<ShoppingCart className="h-4 w-4" />} label="Pedidos" value={String(totals.orders)} />
        <KpiTile icon={<DollarSign className="h-4 w-4" />} label="Receita validada" value={fmtBRL(totals.revenue)} />
        <KpiTile icon={<TrendingUp className="h-4 w-4" />} label="Comissão franqueados" value={fmtBRL(totals.commission)} />
      </div>

      {/* Por franquia */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <h4 className="font-bold">Por franquia</h4>
        </div>
        {data.byFranchise.length === 0 && data.unassigned.total_offers === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhum dado disponível</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Franqueado</TableHead>
                  <TableHead className="text-center">Cidades</TableHead>
                  <TableHead className="text-center">Ofertas</TableHead>
                  <TableHead className="text-center">Validadas</TableHead>
                  <TableHead className="text-center">Pedidos</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Comissão Franqueado</TableHead>
                  <TableHead className="text-right">Comissão Plataforma</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.byFranchise.map((r) => (
                  <TableRow key={r.franchise_id}>
                    <TableCell>
                      <div className="font-medium">{r.franchise_name}</div>
                      <div className="text-xs text-muted-foreground">{r.commission_rate}% comissão</div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{r.cities.length}</Badge>
                    </TableCell>
                    <TableCell className="text-center">{r.total_offers}</TableCell>
                    <TableCell className="text-center">
                      <span className="text-success font-medium">{r.validated_offers}</span>
                    </TableCell>
                    <TableCell className="text-center">{r.total_orders}</TableCell>
                    <TableCell className="text-right font-semibold">{fmtBRL(r.total_revenue)}</TableCell>
                    <TableCell className="text-right text-primary font-medium">{fmtBRL(r.franchisee_commission)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{fmtBRL(r.platform_commission)}</TableCell>
                  </TableRow>
                ))}
                {data.unassigned.total_offers > 0 && (
                  <TableRow className="bg-muted/30">
                    <TableCell>
                      <div className="font-medium italic text-muted-foreground">{data.unassigned.franchise_name}</div>
                      <div className="text-xs text-muted-foreground">10% plataforma</div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{data.unassigned.cities.length}</Badge>
                    </TableCell>
                    <TableCell className="text-center">{data.unassigned.total_offers}</TableCell>
                    <TableCell className="text-center">
                      <span className="text-success font-medium">{data.unassigned.validated_offers}</span>
                    </TableCell>
                    <TableCell className="text-center">{data.unassigned.total_orders}</TableCell>
                    <TableCell className="text-right font-semibold">{fmtBRL(data.unassigned.total_revenue)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">—</TableCell>
                    <TableCell className="text-right text-muted-foreground">{fmtBRL(data.unassigned.platform_commission)}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Por cidade */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <h4 className="font-bold">Por cidade</h4>
        </div>
        {data.byCity.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma cidade com atividade</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Franqueado</TableHead>
                  <TableHead className="text-center">Ofertas</TableHead>
                  <TableHead className="text-center">Validadas</TableHead>
                  <TableHead className="text-center">Pedidos</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.byCity.map((r) => (
                  <TableRow key={r.city}>
                    <TableCell className="font-medium">{r.city}</TableCell>
                    <TableCell>
                      {r.franchise_name ? (
                        <Badge variant="secondary" className="font-normal">{r.franchise_name}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Sem franquia</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">{r.total_offers}</TableCell>
                    <TableCell className="text-center text-success">{r.validated_offers}</TableCell>
                    <TableCell className="text-center">{r.total_orders}</TableCell>
                    <TableCell className="text-right font-semibold">{fmtBRL(r.total_revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-3 shadow-sm">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 font-display text-lg font-bold">{value}</div>
    </div>
  );
}
