import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowDownLeft, Wallet } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface PlatformWithdrawModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platformBalance: number;
}

export function PlatformWithdrawModal({ 
  open, 
  onOpenChange, 
  platformBalance 
}: PlatformWithdrawModalProps) {
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const numAmount = Number(amount.replace(",", ".")) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numAmount <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    if (numAmount > platformBalance) {
      toast.error("Saldo insuficiente no caixa da plataforma");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("process_platform_withdrawal", {
        p_amount: numAmount
      });

      if (error) throw error;
      
      const result = data as any;
      if (!result.success) {
        throw new Error(result.message);
      }

      toast.success("Valor transferido para sua carteira com sucesso!");
      
      // Invalidate queries to refresh balances
      queryClient.invalidateQueries({ queryKey: ["admin-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["platform-wallet-ledger"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      
      setAmount("");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar transferência");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <ArrowDownLeft className="h-5 w-5 text-primary" />
            Transferir para minha carteira
          </DialogTitle>
          <DialogDescription>
            O valor sairá do <strong>Caixa da Plataforma</strong> e entrará na sua <strong>Carteira Pessoal</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <div className="flex justify-between items-center mb-1">
              <span className="text-muted-foreground flex items-center gap-1">
                <Wallet className="h-3 w-3" /> Saldo no Caixa:
              </span>
              <span className="font-bold text-foreground">
                R$ {platformBalance.toFixed(2).replace(".", ",")}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Valor da transferência (R$)</Label>
            <div className="relative group">
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                className="pr-20"
                value={amount}
                onChange={(e) => {
                  const val = e.target.value.replace(",", ".");
                  if (val === "" || /^\d*\.?\d*$/.test(val)) {
                    setAmount(e.target.value);
                  }
                }}
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-8 text-xs font-medium hover:bg-primary/10 hover:text-primary transition-colors"
                onClick={() => setAmount(platformBalance.toString().replace(".", ","))}
              >
                Tudo
              </Button>
            </div>
            {numAmount > platformBalance && (
              <p className="text-xs text-destructive">Valor excede o saldo disponível no caixa</p>
            )}
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 gap-2"
              disabled={submitting || numAmount <= 0 || numAmount > platformBalance}
            >
              {submitting ? "Processando..." : "Confirmar Transferência"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
