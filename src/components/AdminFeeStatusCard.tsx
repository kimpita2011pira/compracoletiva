import { useAdminFeeStatus } from "@/hooks/useAdminFee";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Clock, ShieldCheck, Info } from "lucide-react";

function money(n: number) {
  return `R$ ${Number(n).toFixed(2).replace(".", ",")}`;
}

export function AdminFeeStatusCard() {
  const { data, isLoading } = useAdminFeeStatus();
  if (isLoading || !data || data.kind === "hidden") return null;

  const monthLabel = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  if (data.kind === "exempt") {
    return (
      <div className="rounded-xl border bg-success/5 border-success/30 p-4 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-success shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-sm">Você está isento da taxa administrativa</p>
          <p className="text-xs text-muted-foreground">
            Nenhum débito de {money(data.fee)}/mês será feito na sua carteira.
          </p>
        </div>
      </div>
    );
  }

  if (data.kind === "charged") {
    return (
      <div className="rounded-xl border bg-success/5 border-success/30 p-4 flex items-start gap-3">
        <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-sm">Taxa administrativa de {monthLabel} paga</p>
          <p className="text-xs text-muted-foreground">
            {money(data.fee)} debitados em {new Date(data.chargedAt).toLocaleDateString("pt-BR")}.
          </p>
        </div>
      </div>
    );
  }

  if (data.kind === "pending_no_balance") {
    return (
      <div className="rounded-xl border bg-warning/5 border-warning/30 p-4 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-sm">Taxa de {monthLabel} pulada por falta de saldo</p>
          <p className="text-xs text-muted-foreground">
            Saldo atual {money(data.balance)} &lt; {money(data.fee)}. Ao recarregar sua carteira
            neste mês, {money(data.fee)} serão descontados. <strong>Meses passados não acumulam.</strong>
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] text-warning-foreground shrink-0">
          <Clock className="h-3 w-3 mr-1" /> Pendente
        </Badge>
      </div>
    );
  }

  // scheduled
  return (
    <div className="rounded-xl border bg-muted/40 p-4 flex items-start gap-3">
      <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold text-sm">Taxa de {monthLabel}: {money(data.fee)}</p>
        <p className="text-xs text-muted-foreground">
          Ainda não cobrada este mês. Será debitada automaticamente da carteira.
        </p>
      </div>
    </div>
  );
}
