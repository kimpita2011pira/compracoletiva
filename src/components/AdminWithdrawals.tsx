import { useState, useEffect } from "react";
import { useAdminWithdrawals, useProcessWithdrawal } from "@/hooks/useWithdrawals";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CheckCircle, XCircle, Clock, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const statusStyles: Record<string, { label: string; class: string }> = {
  PENDENTE: { label: "Pendente", class: "bg-warning/15 text-warning-foreground border-warning/30" },
  APROVADO: { label: "Aprovado", class: "bg-success/15 text-success border-success/30" },
  REJEITADO: { label: "Rejeitado", class: "bg-destructive/15 text-destructive border-destructive/30" },
};

export function AdminWithdrawals() {
  const { data: withdrawals, isLoading } = useAdminWithdrawals();
  const processWithdrawal = useProcessWithdrawal();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const pending = (withdrawals ?? []).filter((w) => w.status === "PENDENTE");
  const processed = (withdrawals ?? []).filter((w) => w.status !== "PENDENTE");

  return (
    <div className="space-y-6">
      <h3 className="font-display text-lg font-bold flex items-center gap-2">
        <ArrowUpRight className="h-5 w-5 text-primary" />
        Solicitações de Saque ({pending.length} pendentes)
      </h3>

      {pending.length === 0 && processed.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 py-12">
          <ArrowUpRight className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="font-display font-bold text-muted-foreground">Nenhuma solicitação de saque</p>
        </div>
      )}

      {pending.length > 0 && (
        <div className="space-y-3">
          {pending.map((w) => (
            <WithdrawalCard key={w.id} withdrawal={w} onProcess={processWithdrawal} />
          ))}
        </div>
      )}

      {processed.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground">Processados</h4>
          {processed.map((w) => (
            <WithdrawalCard key={w.id} withdrawal={w} />
          ))}
        </div>
      )}
    </div>
  );
}

function WithdrawalCard({
  withdrawal: w,
  onProcess,
}: {
  withdrawal: any;
  onProcess?: ReturnType<typeof useProcessWithdrawal>;
}) {
  const [note, setNote] = useState("");
  const [processing, setProcessing] = useState(false);
  const [vendorName, setVendorName] = useState<string | null>(null);

  // Fetch vendor name
  useEffect(() => {
    supabase
      .from("vendors")
      .select("company_name")
      .eq("id", w.vendor_id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setVendorName(data.company_name);
      });
  }, [w.vendor_id]);

  const style = statusStyles[w.status] || statusStyles.PENDENTE;

  const handleProcess = async (status: "APROVADO" | "REJEITADO") => {
    if (!onProcess) return;
    setProcessing(true);
    try {
      // If approving, debit the vendor's wallet
      if (status === "APROVADO") {
        // Get vendor's wallet
        const { data: wallet } = await supabase
          .from("wallets")
          .select("id, balance")
          .eq("user_id", w.user_id)
          .maybeSingle();

        if (!wallet || Number(wallet.balance) < Number(w.amount)) {
          toast.error("Saldo insuficiente na carteira do vendedor");
          setProcessing(false);
          return;
        }

        // Debit wallet
        const { error: walletErr } = await supabase
          .from("wallets")
          .update({ balance: Number(wallet.balance) - Number(w.amount), updated_at: new Date().toISOString() } as any)
          .eq("id", wallet.id);

        if (walletErr) throw walletErr;

        // Record transaction
        const { error: txErr } = await supabase
          .from("wallet_transactions" as any)
          .insert({
            wallet_id: wallet.id,
            type: "DEBITO",
            amount: Number(w.amount),
            description: `Saque via Pix - Chave: ${w.pix_key}`,
            reference_id: w.id,
          });

        if (txErr) throw txErr;
      }

      await onProcess.mutateAsync({ id: w.id, status, adminNote: note || undefined });

      // Notify vendor
      await supabase.from("notifications").insert({
        user_id: w.user_id,
        title: status === "APROVADO" ? "Saque aprovado! ✅" : "Saque rejeitado ❌",
        message:
          status === "APROVADO"
            ? `Seu saque de R$ ${Number(w.amount).toFixed(2).replace(".", ",")} via Pix foi aprovado e será transferido.`
            : `Seu saque de R$ ${Number(w.amount).toFixed(2).replace(".", ",")} foi rejeitado.${note ? " Motivo: " + note : ""}`,
        reference_id: w.id,
      } as any);

      toast.success(status === "APROVADO" ? "Saque aprovado!" : "Saque rejeitado");
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar saque");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm">{vendorName || "Carregando..."}</p>
          <p className="text-2xl font-display font-bold text-primary mt-1">
            R$ {Number(w.amount).toFixed(2).replace(".", ",")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Chave Pix: <span className="font-mono">{w.pix_key}</span>
          </p>
          <p className="text-[10px] text-muted-foreground">
            {new Date(w.created_at).toLocaleDateString("pt-BR")} às{" "}
            {new Date(w.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <Badge variant="outline" className={style.class}>
          {w.status === "PENDENTE" ? <Clock className="h-3 w-3 mr-1" /> : w.status === "APROVADO" ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
          {style.label}
        </Badge>
      </div>

      {w.admin_note && (
        <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
          Nota: {w.admin_note}
        </p>
      )}

      {w.status === "PENDENTE" && onProcess && (
        <div className="space-y-2 border-t pt-3">
          <Input
            placeholder="Nota do admin (opcional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              className="gap-1.5 flex-1"
              disabled={processing}
              onClick={() => handleProcess("APROVADO")}
            >
              <CheckCircle className="h-3.5 w-3.5" /> Aprovar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 flex-1 text-destructive hover:text-destructive"
              disabled={processing}
              onClick={() => handleProcess("REJEITADO")}
            >
              <XCircle className="h-3.5 w-3.5" /> Rejeitar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
