import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useVendor } from "@/hooks/useVendor";
import { useWallet } from "@/hooks/useWallet";
import { useCreateWithdrawal } from "@/hooks/useWithdrawals";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowUpRight, Key } from "lucide-react";

interface WithdrawModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function WithdrawModal({ open, onOpenChange }: WithdrawModalProps) {
  const { vendor } = useVendor();
  const { data: wallet } = useWallet();
  const createWithdrawal = useCreateWithdrawal();
  const [amount, setAmount] = useState("");
  const [pixKey, setPixKey] = useState(vendor?.pix_key || "");
  const [saveKey, setSaveKey] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const balance = wallet?.balance ?? 0;
  const numAmount = Number(amount.replace(",", ".")) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor || numAmount < 1) return;
    if (numAmount > Number(balance)) {
      toast.error("Saldo insuficiente");
      return;
    }
    if (!pixKey.trim()) {
      toast.error("Informe a chave Pix");
      return;
    }

    setSubmitting(true);
    try {
      // Save pix_key to vendor profile if requested
      if (saveKey && pixKey.trim() !== (vendor.pix_key || "")) {
        await supabase
          .from("vendors")
          .update({ pix_key: pixKey.trim() } as any)
          .eq("id", vendor.id);
      }

      await createWithdrawal.mutateAsync({
        vendorId: vendor.id,
        amount: numAmount,
        pixKey: pixKey.trim(),
      });

      toast.success("Solicitação de saque enviada! Aguarde a aprovação do administrador.");
      setAmount("");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao solicitar saque");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5 text-primary" />
            Solicitar Saque via Pix
          </DialogTitle>
          <DialogDescription>
            O valor será analisado pelo administrador antes da transferência.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <span className="text-muted-foreground">Saldo disponível: </span>
            <span className="font-bold text-foreground">
              R$ {Number(balance).toFixed(2).replace(".", ",")}
            </span>
          </div>

          <div className="space-y-2">
            <Label>Valor do saque (R$)</Label>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9,\.]/g, ""))}
              required
            />
            {numAmount > Number(balance) && (
              <p className="text-xs text-destructive">Valor excede o saldo disponível</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5" /> Chave Pix
            </Label>
            <Input
              type="text"
              placeholder="CPF, e-mail, telefone ou chave aleatória"
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
              maxLength={100}
              required
            />
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={saveKey}
              onChange={(e) => setSaveKey(e.target.checked)}
              className="rounded border-input"
            />
            Salvar chave Pix no meu cadastro
          </label>

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 gap-2"
              disabled={submitting || numAmount < 1 || numAmount > Number(balance)}
            >
              {submitting ? "Enviando..." : "Solicitar Saque"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
