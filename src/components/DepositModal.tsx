import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/hooks/use-toast";
import { CreditCard, QrCode, Loader2, Wallet } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DepositModal({ open, onOpenChange }: Props) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"pix" | "card">("pix");
  const [loading, setLoading] = useState(false);

  const presetAmounts = [20, 50, 100, 200];
  const numAmount = parseFloat(amount.replace(",", ".")) || 0;

  const handleDeposit = async () => {
    if (numAmount < 1) {
      toast({ title: "Valor mínimo de R$ 1,00", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      // TODO: integrate with Mercado Pago edge function
      toast({
        title: "Funcionalidade em desenvolvimento",
        description: `Depósito de R$ ${numAmount.toFixed(2).replace(".", ",")} via ${method === "pix" ? "Pix" : "Cartão"} será processado em breve.`,
      });
      onOpenChange(false);
      setAmount("");
    } catch {
      toast({ title: "Erro ao processar depósito", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Depositar
          </DialogTitle>
          <DialogDescription>Adicione saldo à sua carteira</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Amount input */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Valor do depósito</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                R$
              </span>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9,\.]/g, ""))}
                className="pl-10 text-lg font-display font-bold"
              />
            </div>
            <div className="flex gap-2">
              {presetAmounts.map((v) => (
                <Button
                  key={v}
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => setAmount(v.toString())}
                >
                  R$ {v}
                </Button>
              ))}
            </div>
          </div>

          {/* Payment method */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Forma de pagamento</Label>
            <RadioGroup
              value={method}
              onValueChange={(v) => setMethod(v as "pix" | "card")}
              className="grid grid-cols-2 gap-3"
            >
              <Label
                htmlFor="pix"
                className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
              >
                <RadioGroupItem value="pix" id="pix" />
                <QrCode className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-sm font-medium">Pix</span>
                  <p className="text-xs text-muted-foreground">Instantâneo</p>
                </div>
              </Label>
              <Label
                htmlFor="card"
                className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
              >
                <RadioGroupItem value="card" id="card" />
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-sm font-medium">Cartão</span>
                  <p className="text-xs text-muted-foreground">Crédito/Débito</p>
                </div>
              </Label>
            </RadioGroup>
          </div>

          {/* Summary */}
          {numAmount > 0 && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <div className="flex justify-between font-display font-bold">
                <span>Total</span>
                <span className="text-primary">
                  R$ {numAmount.toFixed(2).replace(".", ",")}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleDeposit}
            disabled={loading || numAmount < 1}
            className="gap-2 font-bold"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : method === "pix" ? (
              <QrCode className="h-4 w-4" />
            ) : (
              <CreditCard className="h-4 w-4" />
            )}
            Depositar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
