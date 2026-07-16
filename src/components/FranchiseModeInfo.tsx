import { Building2, Percent, MapPin, Wallet, Shield, Info } from "lucide-react";

interface Props {
  commissionRate?: number; // total commission % configured for this franchise
  compact?: boolean;
}

/**
 * Painel que demonstra as condições do "Modo Franquia".
 * Regras:
 * - Franquia ativa em uma cidade => todas as ofertas daquela cidade seguem o split abaixo.
 * - Comissão total configurada por franquia (padrão 10%, entre 1% e 50%).
 * - 1% fixo sempre vai para a plataforma.
 * - Franqueado recebe (comissão total − 1%).
 * - Vendedor recebe (100% − comissão total).
 * - Sem franquia na cidade: 10% para a plataforma, 90% para o vendedor.
 * - Créditos são liquidados automaticamente na validação da oferta.
 */
export function FranchiseModeInfo({ commissionRate, compact }: Props) {
  const rate = commissionRate ?? 10;
  const platform = 1;
  const franchisee = Math.max(0, rate - platform);
  const vendor = Math.max(0, 100 - rate);

  return (
    <section className="rounded-xl border bg-gradient-to-br from-primary/5 via-card to-card p-5 shadow-sm">
      <header className="flex items-center gap-2">
        <Building2 className="h-5 w-5 text-primary" />
        <h3 className="font-display text-lg font-bold">Condições do Modo Franquia</h3>
      </header>

      <p className="mt-2 text-sm text-muted-foreground">
        Regras aplicadas automaticamente na validação da oferta em cidades com franquia ativa.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-background/60 p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Shield className="h-3.5 w-3.5" /> Plataforma
          </div>
          <div className="mt-1 text-2xl font-bold text-primary">{platform}%</div>
          <p className="text-[11px] text-muted-foreground">Taxa fixa retida</p>
        </div>
        <div className="rounded-lg border bg-background/60 p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" /> Franqueado
          </div>
          <div className="mt-1 text-2xl font-bold text-primary">{franchisee.toFixed(1)}%</div>
          <p className="text-[11px] text-muted-foreground">Comissão total − 1%</p>
        </div>
        <div className="rounded-lg border bg-background/60 p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Wallet className="h-3.5 w-3.5" /> Vendedor
          </div>
          <div className="mt-1 text-2xl font-bold text-primary">{vendor.toFixed(1)}%</div>
          <p className="text-[11px] text-muted-foreground">Valor líquido da venda</p>
        </div>
      </div>

      {!compact && (
        <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <Percent className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              Comissão total configurável por franquia (mín. 1% · máx. 50% · padrão 10%).
            </span>
          </li>
          <li className="flex gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              Aplicada apenas às ofertas das cidades vinculadas à franquia ativa.
            </span>
          </li>
          <li className="flex gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              Sem franquia na cidade: 10% para a plataforma e 90% para o vendedor.
            </span>
          </li>
          <li className="flex gap-2">
            <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              Créditos distribuídos automaticamente na carteira do vendedor e do franqueado ao validar a oferta.
            </span>
          </li>
        </ul>
      )}
    </section>
  );
}
