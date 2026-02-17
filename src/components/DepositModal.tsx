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
import { CreditCard, QrCode, Loader2, Wallet, Copy, Check, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPollingChange?: (polling: boolean) => void;
}

type Step = "form" | "pix" | "redirect";

interface PixData {
  pix_qr_code: string;
  pix_qr_code_base64: string;
  pix_copy_paste: string;
  payment_id: string;
}

export default function DepositModal({ open, onOpenChange, onPollingChange }: Props) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"pix" | "card">("pix");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const presetAmounts = [20, 50, 100, 200];
  const numAmount = parseFloat(amount.replace(",", ".")) || 0;

  const handleClose = (open: boolean) => {
    if (!open) {
      setStep("form");
      setPixData(null);
      setAmount("");
      setCopied(false);
      onPollingChange?.(false);
    }
    onOpenChange(open);
  };

  const handleDeposit = async () => {
    if (numAmount < 1) {
      toast({ title: "Valor mínimo de R$ 1,00", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        toast({ title: "Você precisa estar logado", variant: "destructive" });
        return;
      }

      const res = await supabase.functions.invoke("mercadopago-create-payment", {
        body: { amount: numAmount, method },
      });

      if (res.error) {
        throw new Error(res.error.message || "Erro ao processar pagamento");
      }

      const data = res.data;

      if (method === "pix" && data.pix_qr_code) {
        setPixData({
          pix_qr_code: data.pix_qr_code,
          pix_qr_code_base64: data.pix_qr_code_base64,
          pix_copy_paste: data.pix_copy_paste,
          payment_id: data.payment_id,
        });
        setStep("pix");
        onPollingChange?.(true);
        toast({
          title: "Pix gerado com sucesso!",
          description: "Escaneie o QR Code ou copie o código para pagar.",
        });
      } else if (method === "card" && data.init_point) {
        window.open(data.init_point, "_blank");
        setStep("redirect");
        onPollingChange?.(true);
        toast({
          title: "Redirecionando para pagamento",
          description: "Complete o pagamento na página do Mercado Pago.",
        });
      } else {
        throw new Error("Resposta inesperada do servidor");
      }
    } catch (err) {
      console.error("Deposit error:", err);
      toast({
        title: "Erro ao processar depósito",
        description: err instanceof Error ? err.message : "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyPixCode = async () => {
    if (pixData?.pix_copy_paste) {
      await navigator.clipboard.writeText(pixData.pix_copy_paste);
      setCopied(true);
      toast({ title: "Código Pix copiado!" });
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handlePixDone = () => {
    queryClient.invalidateQueries({ queryKey: ["wallet"] });
    queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
    handleClose(false);
    toast({
      title: "Aguardando confirmação",
      description: "Seu saldo será atualizado assim que o pagamento for confirmado.",
    });
  };

  // PIX step
  if (step === "pix" && pixData) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              Pague com Pix
            </DialogTitle>
            <DialogDescription>
              Escaneie o QR Code ou copie o código Pix para pagar R$ {numAmount.toFixed(2).replace(".", ",")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {pixData.pix_qr_code_base64 && (
              <div className="flex justify-center">
                <img
                  src={`data:image/png;base64,${pixData.pix_qr_code_base64}`}
                  alt="QR Code Pix"
                  className="h-48 w-48 rounded-lg border p-2"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Código Pix (copia e cola)</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={pixData.pix_copy_paste}
                  className="text-xs font-mono"
                />
                <Button variant="outline" size="icon" onClick={copyPixCode}>
                  {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
              <p>⏱ O pagamento Pix é processado em segundos. Após o pagamento, seu saldo será atualizado automaticamente.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStep("form")}>
              Voltar
            </Button>
            <Button onClick={handlePixDone} className="gap-2 font-bold">
              <Check className="h-4 w-4" /> Já paguei
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Redirect step (card)
  if (step === "redirect") {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Pagamento via Cartão
            </DialogTitle>
            <DialogDescription>
              Complete o pagamento na página do Mercado Pago
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-6">
            <ExternalLink className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-center text-sm text-muted-foreground">
              Uma nova aba foi aberta para você completar o pagamento. Após a confirmação, seu saldo será atualizado automaticamente.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStep("form")}>
              Voltar
            </Button>
            <Button
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["wallet"] });
                queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
                handleClose(false);
              }}
              className="gap-2 font-bold"
            >
              <Check className="h-4 w-4" /> Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Default form step
  return (
    <Dialog open={open} onOpenChange={handleClose}>
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
          <Button variant="outline" onClick={() => handleClose(false)}>
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
