import { useState } from "react";
import { useWallet, useWalletTransactions } from "@/hooks/useWallet";
import type { WalletTransaction } from "@/hooks/useWallet";
import { useVendor } from "@/hooks/useVendor";
import { useVendorWithdrawals } from "@/hooks/useWithdrawals";
import DepositModal from "@/components/DepositModal";
import WithdrawModal from "@/components/WithdrawModal";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Wallet,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";

const TX_CONFIG: Record<string, { label: string; icon: typeof ArrowDownLeft; colorClass: string }> = {
  DEPOSITO: { label: "Depósito", icon: ArrowDownLeft, colorClass: "text-success" },
  CREDITO: { label: "Crédito", icon: ArrowDownLeft, colorClass: "text-success" },
  ESTORNO: { label: "Estorno", icon: RotateCcw, colorClass: "text-success" },
  RESERVA: { label: "Reserva", icon: ArrowUpRight, colorClass: "text-destructive" },
  DEBITO: { label: "Débito", icon: ArrowUpRight, colorClass: "text-destructive" },
  COMISSAO: { label: "Comissão", icon: ArrowUpRight, colorClass: "text-destructive" },
};

export default function WalletPage() {
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [polling, setPolling] = useState(false);
  const { data: wallet, isLoading: walletLoading } = useWallet(polling);
  const { data: transactions, isLoading: txLoading } = useWalletTransactions(polling);
  const { vendor } = useVendor();
  const { data: withdrawals } = useVendorWithdrawals();
  const isVendor = !!vendor && vendor.status === "APROVADO";

  const balance = wallet?.balance ?? 0;

  return (
    <AppLayout title="💰 Minha Carteira">
      <main className="container max-w-2xl py-8 space-y-6">
        {/* Balance card */}
        <div className="rounded-2xl border bg-gradient-to-br from-primary/5 via-card to-secondary/5 p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wallet className="h-4 w-4" />
            Saldo disponível
          </div>
          {walletLoading ? (
            <div className="mt-2 h-10 w-40 animate-pulse rounded-lg bg-muted" />
          ) : (
            <p className="mt-1 font-display text-4xl font-bold text-primary">
              R$ {Number(balance).toFixed(2).replace(".", ",")}
            </p>
          )}
          <div className="flex gap-3 mt-4">
            <Button
              className="gap-2 font-bold"
              size="lg"
              onClick={() => setDepositOpen(true)}
            >
              <Plus className="h-4 w-4" /> Depositar
            </Button>
            {isVendor && (
              <Button
                variant="outline"
                className="gap-2 font-bold"
                size="lg"
                onClick={() => setWithdrawOpen(true)}
              >
                <ArrowUpRight className="h-4 w-4" /> Sacar via Pix
              </Button>
            )}
          </div>
        </div>

        {/* Withdrawal requests (vendor only) */}
        {isVendor && withdrawals && withdrawals.length > 0 && (
          <div>
            <h2 className="font-display text-lg font-bold mb-4">Solicitações de saque</h2>
            <div className="space-y-2">
              {withdrawals.map((w) => {
                const statusMap: Record<string, { label: string; icon: typeof Clock; color: string }> = {
                  PENDENTE: { label: "Pendente", icon: Clock, color: "text-warning-foreground" },
                  APROVADO: { label: "Aprovado", icon: CheckCircle, color: "text-success" },
                  REJEITADO: { label: "Rejeitado", icon: XCircle, color: "text-destructive" },
                };
                const s = statusMap[w.status] || statusMap.PENDENTE;
                const SIcon = s.icon;
                return (
                  <div key={w.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                    <div className="rounded-lg p-2 bg-primary/10">
                      <ArrowUpRight className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          Saque Pix − R$ {Number(w.amount).toFixed(2).replace(".", ",")}
                        </span>
                        <Badge variant="outline" className={`text-[10px] shrink-0 gap-1 ${s.color}`}>
                          <SIcon className="h-3 w-3" /> {s.label}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(w.created_at).toLocaleDateString("pt-BR")}
                      </span>
                      {w.admin_note && (
                        <p className="text-xs text-muted-foreground mt-0.5">Nota: {w.admin_note}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Transaction history */}
        <div>
          <h2 className="font-display text-lg font-bold mb-4">Histórico de transações</h2>

          {txLoading && (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          )}

          {!txLoading && (!transactions || transactions.length === 0) && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 py-16">
              <Clock className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="font-display font-bold text-muted-foreground">
                Nenhuma transação ainda
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Faça seu primeiro depósito para começar
              </p>
            </div>
          )}

          {transactions && transactions.length > 0 && (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} />
              ))}
            </div>
          )}
        </div>
      </main>

      <DepositModal open={depositOpen} onOpenChange={setDepositOpen} onPollingChange={setPolling} />
    </AppLayout>
  );
}

function TransactionRow({ tx }: { tx: WalletTransaction }) {
  const config = TX_CONFIG[tx.type] ?? {
    label: tx.type,
    icon: ArrowUpRight,
    colorClass: "text-foreground",
  };
  const Icon = config.icon;
  const isCredit = ["DEPOSITO", "CREDITO", "ESTORNO"].includes(tx.type);
  const date = new Date(tx.created_at);

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-muted/30">
      <div className={`rounded-lg p-2 ${isCredit ? "bg-success/10" : "bg-destructive/10"}`}>
        <Icon className={`h-4 w-4 ${config.colorClass}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold truncate">
            {tx.description || config.label}
          </span>
          <Badge variant="outline" className="text-[10px] shrink-0">
            {config.label}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">
          {date.toLocaleDateString("pt-BR")} às {date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
      <span className={`font-display font-bold text-sm ${config.colorClass}`}>
        {isCredit ? "+" : "−"}R$ {Number(tx.amount).toFixed(2).replace(".", ",")}
      </span>
    </div>
  );
}
